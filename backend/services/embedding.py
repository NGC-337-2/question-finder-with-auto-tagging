"""
services/embedding.py — Sentence-Transformers wrapper.
Uses lazy loading so the model is only downloaded/loaded on the first call,
avoiding slow startup times on Render's free tier.
"""
from sentence_transformers import SentenceTransformer
import numpy as np

_model = None  # Lazy load — only loads once on first call


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("BAAI/bge-small-en-v1.5")
    return _model


def embed(text: str) -> list[float]:
    """Embed a single string, returning a normalized 384-dim float list."""
    model = get_model()
    vector = model.encode(text, normalize_embeddings=True)
    return vector.tolist()


def embed_batch(texts: list[str]) -> np.ndarray:
    """Embed a list of strings, returning a 2D numpy array (N × 384)."""
    model = get_model()
    return model.encode(texts, normalize_embeddings=True)
