"""
routers/auth.py — Authentication endpoints: signup, login, refresh, logout, and me.
"""
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, status, Depends, Response, Cookie, Request
from pymongo.errors import DuplicateKeyError
from bson import ObjectId

from database import db
from auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    create_refresh_token,
    hash_refresh_token,
    limiter
)
from models.user import SignupRequest, LoginRequest

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_TOKEN_EXPIRE_DAYS = 7
COOKIE_NAME = "refresh_token"


@router.post("/signup", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def signup(request: Request, body: SignupRequest):
    """
    Register a new user.
    - Hashes the password.
    - Inserts user into the `users` collection.
    - Returns 409 if email is already registered.
    """
    hashed = hash_password(body.password)
    user_doc = {
        "email": body.email,
        "password_hash": hashed,
        "created_at": datetime.now(timezone.utc),
        "is_active": True,
    }

    try:
        result = await db["users"].insert_one(user_doc)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    return {"message": "Account created successfully", "user_id": str(result.inserted_id)}


@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, body: LoginRequest, response: Response):
    """
    Authenticate a user.
    - Verifies credentials.
    - Generates short-lived access token + long-lived refresh token.
    - Stores refresh token hash in DB.
    - Sets refresh token as httpOnly cookie.
    """
    user = await db["users"].find_one({"email": body.email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account disabled",
        )

    user_id = str(user["_id"])
    access_token = create_access_token(user_id)
    raw_refresh, hashed_refresh = create_refresh_token()

    # Store refresh token hash in MongoDB
    expire_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    await db["sessions"].insert_one({
        "user_id": ObjectId(user_id),
        "token_hash": hashed_refresh,
        "expires_at": expire_at,
        "created_at": datetime.now(timezone.utc),
    })

    # Set refresh token as httpOnly cookie
    # secure=False is used for local dev unless VITE/FastAPI is running over HTTPS,
    # but we can set secure=False for compatibility, or allow it. Let's use secure=False
    # for local dev compatibility, or handle it gracefully. 
    # Let's set secure=False so it works on http://localhost out-of-the-box, or samesite="lax"
    # which works on localhost without HTTPS.
    response.set_cookie(
        key=COOKIE_NAME,
        value=raw_refresh,
        httponly=True,
        secure=False,          # Set to True in production with HTTPS
        samesite="lax",
        max_age=60 * 60 * 24 * REFRESH_TOKEN_EXPIRE_DAYS,
        path="/auth",         # Cookie only sent to /auth/* routes
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/refresh")
@limiter.limit("30/minute")
async def refresh(request: Request, response: Response, refresh_token: str | None = Cookie(default=None, alias=COOKIE_NAME)):
    """
    Exchange refresh token for a new access token and rotate the refresh token.
    """
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token provided",
        )

    token_hash = hash_refresh_token(refresh_token)
    session = await db["sessions"].find_one({"token_hash": token_hash})

    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    # Convert to aware datetime for safe comparison
    expires_at = session["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < datetime.now(timezone.utc):
        await db["sessions"].delete_one({"_id": session["_id"]})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired",
        )

    # Rotate: delete old session, issue new pair
    await db["sessions"].delete_one({"_id": session["_id"]})

    user_id = str(session["user_id"])
    new_access = create_access_token(user_id)
    new_raw, new_hashed = create_refresh_token()

    expire_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    await db["sessions"].insert_one({
        "user_id": session["user_id"],
        "token_hash": new_hashed,
        "expires_at": expire_at,
        "created_at": datetime.now(timezone.utc),
    })

    response.set_cookie(
        key=COOKIE_NAME,
        value=new_raw,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=60 * 60 * 24 * REFRESH_TOKEN_EXPIRE_DAYS,
        path="/auth",
    )

    return {"access_token": new_access, "token_type": "bearer"}


@router.post("/logout")
async def logout(response: Response, refresh_token: str | None = Cookie(default=None, alias=COOKIE_NAME)):
    """
    Revoke current refresh token and clear client cookies.
    """
    if refresh_token:
        token_hash = hash_refresh_token(refresh_token)
        await db["sessions"].delete_one({"token_hash": token_hash})

    response.delete_cookie(key=COOKIE_NAME, path="/auth")
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_me(user=Depends(get_current_user)):
    """
    Get profile details of the current logged-in user.
    """
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "created_at": user["created_at"].isoformat() if "created_at" in user else None
    }
