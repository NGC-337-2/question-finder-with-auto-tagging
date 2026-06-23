"""
routers/auth.py — Authentication endpoints: signup and login.
"""
from fastapi import APIRouter, HTTPException, status
from pymongo.errors import DuplicateKeyError

from database import db
from auth_utils import hash_password, verify_password, create_access_token, get_current_user
from models.user import SignupRequest, LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(body: SignupRequest):
    """
    Register a new user.
    - Hashes the password with bcrypt.
    - Inserts user into the `users` collection.
    - Returns 409 if email is already registered.
    """
    from datetime import datetime, timezone

    hashed = hash_password(body.password)
    user_doc = {
        "email": body.email,
        "password_hash": hashed,
        "created_at": datetime.now(timezone.utc),
    }

    try:
        await db["users"].insert_one(user_doc)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    return {"message": "Account created successfully"}


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    """
    Authenticate a user.
    - Looks up user by email.
    - Verifies bcrypt password hash.
    - Returns a signed JWT on success.
    """
    user = await db["users"].find_one({"email": body.email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(str(user["_id"]))
    return {"access_token": token, "token_type": "bearer"}


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
