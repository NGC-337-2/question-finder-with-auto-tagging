"""
models/question.py — Pydantic schemas for question-related requests/responses.
"""
from pydantic import BaseModel
from typing import List, Optional


class QuestionSearchRequest(BaseModel):
    question: str


class SimilarQuestion(BaseModel):
    question_id: str
    question_text: str
    score: float


class QuestionSearchResponse(BaseModel):
    question_id: str
    topic_tag: str
    similar_questions: List[SimilarQuestion]
