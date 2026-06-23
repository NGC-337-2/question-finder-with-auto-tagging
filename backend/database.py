"""
database.py — Async MongoDB connection using Motor.
The `db` object is imported by routers/services to access collections.
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/questiondb")

client = AsyncIOMotorClient(MONGO_URI)
db = client.get_default_database("questiondb")


async def create_indexes():
    """Create necessary indexes for performance. Called on app startup."""
    await db["users"].create_index("email", unique=True)
    await db["questions"].create_index("user_id")
    await db["questions"].create_index("topic_tag")
    await db["questions"].create_index([("created_at", -1)])

    # Auto-delete expired sessions — MongoDB runs this cleanup every 60 seconds
    await db["sessions"].create_index(
        "expires_at",
        expireAfterSeconds=0    # delete document when expires_at < now
    )
    await db["sessions"].create_index("token_hash", unique=True)
    await db["sessions"].create_index("user_id")

