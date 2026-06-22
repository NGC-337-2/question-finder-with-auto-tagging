"""
routers/questions.py — Core ML endpoints: search and history.
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone

from database import db
from auth_utils import get_current_user
from services.embedding import embed
from services.similarity import find_top_k
from services.tagger import assign_tag
from models.question import QuestionSearchRequest, QuestionSearchResponse

router = APIRouter(prefix="/questions", tags=["questions"])


@router.post("/search", response_model=QuestionSearchResponse)
async def search_questions(
    body: QuestionSearchRequest,
    user=Depends(get_current_user),
):
    """
    Main ML endpoint — processes a user's question:
    1. Embeds the question using sentence-transformers
    2. Finds similar past questions using cosine similarity
    3. Auto-tags the question with a topic label
    4. Persists the question + results to MongoDB
    """
    question_text = body.question.strip()
    if not question_text:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # 1. Embed the incoming question
    q_embedding = embed(question_text)

    # 2. Fetch all stored questions for similarity comparison
    #    (projection excludes heavy fields we don't need to return)
    stored = await db["questions"].find(
        {}, {"_id": 1, "question_text": 1, "embedding": 1}
    ).to_list(length=5000)

    # 3. Find similar questions via cosine similarity
    similar = find_top_k(q_embedding, stored, k=5)

    # 4. Auto-tag using zero-shot label embedding comparison
    tag_result = assign_tag(q_embedding)
    tag = tag_result.label

    # 5. Persist to MongoDB
    doc = {
        "user_id": user["_id"],
        "question_text": question_text,
        "embedding": q_embedding,
        "topic_tag": tag,
        "similar_questions": similar,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db["questions"].insert_one(doc)

    return {
        "question_id": str(result.inserted_id),
        "topic_tag": tag,
        "similar_questions": similar,
    }


@router.get("/history")
async def get_history(tag: str | None = None, user=Depends(get_current_user)):
    """
    Return the current user's question history, newest first.
    Optionally filter by topic tag via ?tag=Biology
    Embedding field is excluded from the response (too large).
    """
    query: dict = {"user_id": user["_id"]}
    if tag:
        query["topic_tag"] = tag

    questions = await db["questions"].find(
        query,
        {"embedding": 0},  # exclude the 384-dim float array from history
    ).sort("created_at", -1).to_list(length=200)

    for q in questions:
        q["_id"] = str(q["_id"])
        q["user_id"] = str(q["user_id"])
        # Ensure similar_questions ids are strings
        for sq in q.get("similar_questions", []):
            if "question_id" in sq:
                sq["question_id"] = str(sq["question_id"])

    return {"questions": questions}
