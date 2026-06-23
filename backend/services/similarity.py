"""
services/similarity.py — Cosine similarity search over stored question embeddings.
"""
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np


def find_top_k(
    query_embedding: list[float],
    stored_questions: list[dict],
    k: int = 5,
    threshold: float = 0.3,
) -> list[dict]:
    """
    Find the top-k most similar stored questions above a similarity threshold.

    Args:
        query_embedding: The embedding of the incoming question (384-dim list).
        stored_questions: List of dicts, each with '_id', 'question_text', 'embedding'.
        k: Maximum number of results to return.
        threshold: Minimum cosine similarity score to include a result.

    Returns:
        List of dicts with 'question_id', 'question_text', 'score', sorted desc by score.
    """
    if not stored_questions:
        return []

    q_vec = np.array(query_embedding).reshape(1, -1)
    stored_vecs = np.array([q["embedding"] for q in stored_questions])

    scores = cosine_similarity(q_vec, stored_vecs)[0]

    results = []
    for i, score in enumerate(scores):
        if float(score) >= threshold:
            results.append({
                "question_id": str(stored_questions[i]["_id"]),
                "question_text": stored_questions[i]["question_text"],
                "score": round(float(score), 4),
            })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:k]
