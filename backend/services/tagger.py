"""
services/tagger.py — Zero-shot topic auto-tagging via label embedding comparison.

How it works:
- Each topic label string (e.g. "Biology") is embedded into the same 384-dim
  vector space as questions.
- When a question embedding arrives, it's compared against all label embeddings
  using cosine similarity.
- The label with the highest similarity score is assigned as the tag.
- No training data required — this works purely through the geometric structure
  of the pre-trained embedding space.
"""
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
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

# Provide richer context to match the sentence structure of user questions
TOPIC_DESCRIPTIONS = [
    "A question about biology, life sciences, living organisms, cells, photosynthesis, plants, and animals.",
    "A question about physics, forces, energy, quantum mechanics, relativity, and laws of nature.",
    "A question about mathematics, math, numbers, matrices, algebra, geometry, equations, and calculus.",
    "A question about history, past events, the French Revolution, wars, dates, and historical figures.",
    "A question about chemistry, molecules, atoms, chemical reactions, and the periodic table.",
    "A question about computer science, programming, software, algorithms, artificial intelligence, machine learning, neural networks, and encoders.",
    "A question about geography, the earth, environment, sky, oceans, countries, and maps.",
    "A question about economics, money, markets, finance, wealth, and trade."
]

# Pre-compute label embeddings once at module load (lazy)
_label_embeddings = None


def get_label_embeddings() -> np.ndarray:
    global _label_embeddings
    if _label_embeddings is None:
        # Embed the descriptive sentences instead of the single-word labels
        _label_embeddings = embed_batch(TOPIC_DESCRIPTIONS)
    return _label_embeddings


def assign_tag(question_embedding: list[float]) -> str:
    """
    Compare the question embedding against each topic label embedding.
    Returns the label whose embedding has the highest cosine similarity.
    """
    q_vec = np.array(question_embedding).reshape(1, -1)
    label_vecs = get_label_embeddings()
    scores = cosine_similarity(q_vec, label_vecs)[0]
    best_index = int(np.argmax(scores))
    return TOPIC_LABELS[best_index]
