"""
services/tagger.py — Zero-shot topic auto-tagging via label embedding comparison.

Improvements over v1:
- Label descriptions use question-mimicking sentences (higher accuracy)
- Returns TagResult dataclass with confidence score + full ranking
- Thread-safe lazy loading via double-checked locking
- warmup() for pre-loading at app startup
- Low-confidence fallback to "General"
"""
from __future__ import annotations

import threading
from dataclasses import dataclass, field

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from services.embedding import embed_batch

TOPIC_LABELS = [
    "Biology",
    "Physics",
    "Mathematics",
    "History",
    "Chemistry",
    "Computer Science",
    "Geography",
    "Economics",
]

TOPIC_DESCRIPTIONS = [
    "Why do cells divide? How does DNA replication work? What is natural selection? "
    "Explain photosynthesis and how plants produce energy. How do vaccines trigger immunity?",

    "What is Newton's second law? How does gravity affect orbits? "
    "Explain the relationship between energy and mass. How do electric fields work?",

    "How do you solve a quadratic equation? What is the derivative of a function? "
    "Explain matrix multiplication. How does integration relate to area under a curve?",

    "What caused World War I? Who was Napoleon Bonaparte? "
    "Explain the causes of the French Revolution. When did the Roman Empire fall?",

    "How do ionic bonds form? What happens during a chemical reaction? "
    "Explain the structure of an atom. What is the difference between an acid and a base?",

    "How does a sorting algorithm work? What is recursion in programming? "
    "Explain how neural networks learn. What is time complexity in algorithms?",

    "Why do tectonic plates move? How are mountains formed? "
    "What causes ocean currents? Explain the water cycle and climate zones.",

    "What is supply and demand? How does inflation affect purchasing power? "
    "Explain GDP and what causes a recession. How do central banks work?",
]

LOW_CONFIDENCE_LABEL = "General"
CONFIDENCE_THRESHOLD = 0.22

_label_embeddings: np.ndarray | None = None
_lock = threading.Lock()


@dataclass
class TagResult:
    label: str
    confidence: float
    all_scores: dict[str, float] = field(default_factory=dict)


def get_label_embeddings() -> np.ndarray:
    global _label_embeddings
    if _label_embeddings is not None:
        return _label_embeddings
    with _lock:
        if _label_embeddings is None:
            _label_embeddings = embed_batch(TOPIC_DESCRIPTIONS)
    return _label_embeddings


def assign_tag(
    question_embedding: list[float],
    include_all_scores: bool = False,
) -> TagResult:
    """
    Compare the question embedding against each topic description embedding.
    Returns the best-matching label with its confidence score.
    Falls back to LOW_CONFIDENCE_LABEL if no label clears CONFIDENCE_THRESHOLD.
    """
    q_vec = np.array(question_embedding).reshape(1, -1)
    label_vecs = get_label_embeddings()
    scores = cosine_similarity(q_vec, label_vecs)[0]

    best_index = int(np.argmax(scores))
    best_score = float(scores[best_index])
    best_label = TOPIC_LABELS[best_index] if best_score >= CONFIDENCE_THRESHOLD else LOW_CONFIDENCE_LABEL

    all_scores = (
        {TOPIC_LABELS[i]: round(float(scores[i]), 4) for i in range(len(TOPIC_LABELS))}
        if include_all_scores
        else {}
    )

    return TagResult(label=best_label, confidence=round(best_score, 4), all_scores=all_scores)


def warmup() -> None:
    """Pre-load label embeddings at app startup to avoid cold-start latency."""
    get_label_embeddings()