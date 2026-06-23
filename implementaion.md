# Project B: Similar Question Finder with Auto-Tagging
## Implementation Plan

**Deadline:** June 25, 2026
**Stack:** React + Tailwind · FastAPI · MongoDB Atlas · sentence-transformers · scikit-learn
**Deployment:** Vercel (frontend) · Render (backend)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Folder Structure](#3-folder-structure)
4. [Database Schema](#4-database-schema)
5. [Backend Implementation](#5-backend-implementation)
6. [Frontend Implementation](#6-frontend-implementation)
7. [AI/ML Core — How It Works](#7-aiml-core--how-it-works)
8. [Authentication Flow](#8-authentication-flow)
9. [Day-by-Day Build Plan](#9-day-by-day-build-plan)
10. [Deployment Checklist](#10-deployment-checklist)
11. [README Template](#11-readme-template)
12. [Risk Register](#12-risk-register)

---

## 1. Project Overview

A web application where logged-in students submit study questions. The backend:

- Converts the question into a **vector embedding** using `sentence-transformers`
- Finds **similar past questions** using cosine similarity
- **Auto-tags** the question with a topic (Biology, Physics, Math, etc.) via label-embedding comparison
- Saves the question, its tag, and the similar questions returned to MongoDB

Users also have a **history page** showing all their past questions, filterable by topic tag.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (Vercel)                     │
│   React + Tailwind + React Router                           │
│                                                             │
│   /login  /signup  /search  /history                        │
└──────────────────────┬──────────────────────────────────────┘
                       │  HTTPS + JWT Bearer Token
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                       BACKEND (Render)                       │
│   FastAPI + Python 3.11                                     │
│                                                             │
│   POST /auth/signup      POST /auth/login                   │
│   POST /questions/search                                    │
│   GET  /questions/history                                   │
└──────────┬──────────────────────────┬───────────────────────┘
           │                          │
           ▼                          ▼
┌─────────────────┐       ┌──────────────────────────────┐
│  MongoDB Atlas  │       │  ML Layer                    │
│  (Free Tier)    │       │  sentence-transformers       │
│                 │       │  all-MiniLM-L6-v2  (~90MB)  │
│  users          │       │  cosine_similarity           │
│  questions      │       │  zero-shot topic labelling   │
└─────────────────┘       └──────────────────────────────┘
```

---

## 3. Folder Structure

```
project-b/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── requirements.txt
│   ├── .env.example
│   ├── routers/
│   │   ├── auth.py              # /auth/signup, /auth/login
│   │   └── questions.py         # /questions/search, /questions/history
│   ├── models/
│   │   ├── user.py              # Pydantic schemas
│   │   └── question.py
│   ├── services/
│   │   ├── embedding.py         # sentence-transformers wrapper
│   │   ├── similarity.py        # cosine similarity + top-k search
│   │   └── tagger.py            # zero-shot auto-tagging
│   ├── database.py              # MongoDB connection (Motor async)
│   └── auth_utils.py            # JWT encode/decode, bcrypt helpers
│
├── frontend/
│   ├── package.json
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx              # React Router setup
│   │   ├── api/
│   │   │   └── client.js        # Axios instance + interceptors
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # JWT storage + login/logout
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── Search.jsx       # Main question input + results
│   │   │   └── History.jsx      # Past questions + tag filter
│   │   └── components/
│   │       ├── NavBar.jsx
│   │       ├── QuestionCard.jsx
│   │       └── ProtectedRoute.jsx
│
├── README.md
└── .gitignore
```

---

## 4. Database Schema

### `users` collection

```json
{
  "_id": "ObjectId",
  "email": "string (unique, indexed)",
  "password_hash": "string (bcrypt)",
  "created_at": "datetime"
}
```

### `questions` collection

```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId (ref: users)",
  "question_text": "string",
  "embedding": "[float] (384-dim vector)",
  "topic_tag": "string (Biology | Physics | Math | History | Chemistry | Computer Science)",
  "similar_questions": [
    {
      "question_id": "ObjectId",
      "question_text": "string",
      "score": "float"
    }
  ],
  "created_at": "datetime"
}
```

**Indexes:**
- `user_id` — for history queries
- `topic_tag` — for tag-filter queries
- `created_at` (descending) — for history ordering

---

## 5. Backend Implementation

### 5.1 `requirements.txt`

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
motor==3.4.0              # async MongoDB driver
pymongo==4.7.2
sentence-transformers==2.7.0
scikit-learn==1.4.2
numpy==1.26.4
python-jose[cryptography]==3.3.0   # JWT
bcrypt==4.1.3
passlib[bcrypt]==1.7.4
python-dotenv==1.0.1
pydantic[email]==2.7.1
```

### 5.2 `embedding.py` — Embedding Service

```python
from sentence_transformers import SentenceTransformer
import numpy as np

_model = None  # Lazy load — only loads once on first call

def get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model

def embed(text: str) -> list[float]:
    model = get_model()
    vector = model.encode(text, normalize_embeddings=True)
    return vector.tolist()

def embed_batch(texts: list[str]) -> np.ndarray:
    model = get_model()
    return model.encode(texts, normalize_embeddings=True)
```

> **Why lazy load?** Render's free tier spins up slowly. Loading the model at startup increases cold-start time. Lazy load defers this until the first real request.

### 5.3 `tagger.py` — Zero-Shot Topic Tagging

```python
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from .embedding import embed_batch

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

# Pre-compute label embeddings once at module load
_label_embeddings = None

def get_label_embeddings():
    global _label_embeddings
    if _label_embeddings is None:
        _label_embeddings = embed_batch(TOPIC_LABELS)
    return _label_embeddings

def assign_tag(question_embedding: list[float]) -> str:
    """
    Compare the question embedding against each topic label embedding.
    Return the label whose embedding has the highest cosine similarity.
    """
    q_vec = np.array(question_embedding).reshape(1, -1)
    label_vecs = get_label_embeddings()
    scores = cosine_similarity(q_vec, label_vecs)[0]
    best_index = int(np.argmax(scores))
    return TOPIC_LABELS[best_index]
```

**How this works in plain English:**
Each topic label (e.g. "Biology") is itself embedded into the same 384-dimensional vector space as questions. When a question arrives, its embedding is compared to every label embedding via cosine similarity. The label sitting closest in that space is assigned as the tag — no training data required.

### 5.4 `similarity.py` — Finding Similar Questions

```python
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

def find_top_k(
    query_embedding: list[float],
    stored_questions: list[dict],
    k: int = 5,
    threshold: float = 0.3,
) -> list[dict]:
    """
    stored_questions: list of dicts, each with 'embedding', '_id', 'question_text'
    Returns top-k most similar questions above threshold, sorted by score desc.
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
```

### 5.5 `routers/questions.py` — Core Endpoint

```python
from fastapi import APIRouter, Depends, HTTPException
from ..database import db
from ..auth_utils import get_current_user
from ..services.embedding import embed
from ..services.similarity import find_top_k
from ..services.tagger import assign_tag
from ..models.question import QuestionSearchRequest, QuestionSearchResponse
from datetime import datetime, timezone

router = APIRouter(prefix="/questions", tags=["questions"])

@router.post("/search", response_model=QuestionSearchResponse)
async def search_questions(
    body: QuestionSearchRequest,
    user=Depends(get_current_user)
):
    question_text = body.question.strip()
    if not question_text:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # 1. Embed the incoming question
    q_embedding = embed(question_text)

    # 2. Fetch all stored questions (excluding current user's — optional)
    stored = await db["questions"].find(
        {}, {"_id": 1, "question_text": 1, "embedding": 1}
    ).to_list(length=5000)

    # 3. Find similar questions
    similar = find_top_k(q_embedding, stored, k=5)

    # 4. Auto-tag
    tag = assign_tag(q_embedding)

    # 5. Persist
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
    query = {"user_id": user["_id"]}
    if tag:
        query["topic_tag"] = tag

    questions = await db["questions"].find(
        query,
        {"embedding": 0}   # exclude large embedding field from history
    ).sort("created_at", -1).to_list(length=200)

    for q in questions:
        q["_id"] = str(q["_id"])
        q["user_id"] = str(q["user_id"])

    return {"questions": questions}
```

---

## 6. Frontend Implementation

### 6.1 Key Pages

#### `Search.jsx` — Main feature page

**State:**
- `question` (string) — controlled input
- `result` (object | null) — `{ topic_tag, similar_questions }`
- `loading` (bool)
- `error` (string | null)

**UI Elements:**
- Textarea for question input
- Submit button (disabled while loading)
- Tag badge (coloured by topic)
- List of similar questions with similarity score percentage
- "Ask another" reset button

#### `History.jsx` — Past questions

**State:**
- `questions` (array) — fetched on mount
- `activeTag` (string | null) — filter selection

**UI Elements:**
- Tag filter bar (all known tags as pills)
- Question cards showing text, tag, date, and similar matches count
- Empty state message

### 6.2 `api/client.js` — Axios Setup

```javascript
import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Attach JWT to every request automatically
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default client;
```

---

## 7. AI/ML Core — How It Works

This section is what you'll explain in the interview. Keep it sharp.

### Step 1 — Sentence Embedding

`all-MiniLM-L6-v2` maps any sentence to a 384-dimensional float vector. Sentences with similar meaning end up geometrically close in that vector space.

```
"Why does photosynthesis need light?"   →  [0.12, -0.34, 0.88, ...]  (384 values)
"What is the role of sunlight in plant food production?"  →  [0.13, -0.31, 0.85, ...]
```

These two vectors are close; a question about Newton's laws would be far away.

### Step 2 — Cosine Similarity

Cosine similarity measures the **angle** between two vectors, not their magnitude. Score of 1.0 = identical meaning; 0.0 = unrelated; negative values = opposite meaning (rare with normalized embeddings).

```
similarity = (A · B) / (||A|| × ||B||)
```

Because embeddings are L2-normalized at encode time (`normalize_embeddings=True`), this simplifies to a dot product, which is fast.

### Step 3 — Auto-Tagging (Zero-Shot)

Topic labels are themselves embedded:

```
"Biology"           →  [label vector 1]
"Physics"           →  [label vector 2]
"Mathematics"       →  [label vector 3]
...
```

The question embedding is compared to all label embeddings. The label with the highest cosine similarity wins. No training, no labelled data — just the geometric structure of the embedding space.

```
similarity("Why does photosynthesis need light?", "Biology") = 0.71  ✓ highest
similarity("Why does photosynthesis need light?", "Chemistry") = 0.48
similarity("Why does photosynthesis need light?", "Physics") = 0.31
```

### Why this satisfies the brief's "real processing" requirement

- The model runs **locally on the backend** — no external API calls
- The embedding is a genuine neural transformation, not keyword extraction
- Similarity is computed mathematically, not by string matching
- The tagging uses the same vector space, demonstrating you understand embeddings are general-purpose

---

## 8. Authentication Flow

```
SIGNUP
  client → POST /auth/signup { email, password }
         ← 201 { message: "Account created" }

LOGIN
  client → POST /auth/login { email, password }
  server:  bcrypt.verify(password, stored_hash)
         ← 200 { access_token, token_type: "bearer" }

PROTECTED REQUESTS
  client → GET /questions/history
           Header: Authorization: Bearer <token>
  server:  jwt.decode(token, SECRET_KEY)
           → extract user_id → proceed
         ← 200 { questions: [...] }
         ← 401 if token invalid/expired
```

**JWT payload:**
```json
{ "sub": "<user_id>", "exp": <unix_timestamp> }
```

**Token expiry:** 24 hours (adjust in `auth_utils.py` via `ACCESS_TOKEN_EXPIRE_MINUTES`)

---

## 9. Day-by-Day Build Plan

### Day 1 — Auth + Backend Skeleton (June 22)

| # | Task | Est. Time |
|---|------|-----------|
| 1 | Scaffold FastAPI app, install deps, connect MongoDB Atlas | 45 min |
| 2 | `POST /auth/signup` — hash password, insert user, handle duplicate email | 45 min |
| 3 | `POST /auth/login` — verify password, issue JWT | 30 min |
| 4 | `get_current_user` dependency (JWT decode middleware) | 20 min |
| 5 | Scaffold frontend: Vite + React + Tailwind + React Router | 30 min |
| 6 | Login + Signup pages wired to backend | 60 min |
| 7 | `ProtectedRoute` + `AuthContext` (store token, expose user) | 30 min |
| 8 | Smoke test: sign up, log in, receive token, 401 on bad token | 20 min |

**End of Day 1 goal:** Auth fully working, token stored in `localStorage`, protected route redirects to login.

---

### Day 2 — ML Core (June 23)

| # | Task | Est. Time |
|---|------|-----------|
| 1 | Install `sentence-transformers`, test `embed()` locally | 30 min |
| 2 | Build `embedding.py` with lazy model load | 20 min |
| 3 | Build `tagger.py` — label embeddings + `assign_tag()` | 40 min |
| 4 | Build `similarity.py` — `find_top_k()` with threshold | 40 min |
| 5 | Build `POST /questions/search` end-to-end | 60 min |
| 6 | Build `GET /questions/history` with optional tag filter | 30 min |
| 7 | Test with `curl` or Postman — verify embeddings stored, tags assigned correctly | 30 min |

**End of Day 2 goal:** Posting a question returns `{ topic_tag, similar_questions }` and saves to DB.

---

### Day 3 — Frontend Feature Pages (June 24)

| # | Task | Est. Time |
|---|------|-----------|
| 1 | `Search.jsx` — textarea, submit, loading spinner | 45 min |
| 2 | Display result: tag badge + similar question cards with score % | 45 min |
| 3 | `History.jsx` — fetch on mount, render question cards | 45 min |
| 4 | Tag filter bar — pill buttons, active state, re-fetch on select | 30 min |
| 5 | NavBar with logout, route links | 20 min |
| 6 | `QuestionCard` component — reusable across Search + History | 20 min |
| 7 | Basic responsive layout, mobile usability check | 30 min |

**End of Day 3 goal:** Full user journey works locally end-to-end.

---

### Day 4 — Deployment + Polish (June 25)

| # | Task | Est. Time |
|---|------|-----------|
| 1 | Push to GitHub (public repo) | 10 min |
| 2 | Deploy backend to Render (set env vars: `MONGO_URI`, `JWT_SECRET`) | 45 min |
| 3 | Verify cold start, test `/health` endpoint | 15 min |
| 4 | Deploy frontend to Vercel (set `VITE_API_URL` to Render URL) | 20 min |
| 5 | End-to-end test on deployed URLs (signup → search → history) | 30 min |
| 6 | Write README (use template in Section 11) | 30 min |
| 7 | Submit both links | 5 min |

**End of Day 4 goal:** Both links live, README complete, submission sent.

---

## 10. Deployment Checklist

### Backend — Render

- [ ] Web service, Python 3.11, free tier
- [ ] Build command: `pip install -r requirements.txt`
- [ ] Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- [ ] Environment variables set:
  - `MONGO_URI` — MongoDB Atlas connection string
  - `JWT_SECRET` — random 32-char string
  - `JWT_EXPIRE_MINUTES` — `1440`
- [ ] Add `/health` GET endpoint returning `{"status": "ok"}` — Render uses this for health checks
- [ ] Confirm the model downloads on first request (check logs)

### Frontend — Vercel

- [ ] Connect GitHub repo
- [ ] Framework: Vite
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Environment variable: `VITE_API_URL=https://your-app.onrender.com`
- [ ] Test deployed URL: can sign up, log in, search, see history

### CORS

Add to `main.py`:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-app.vercel.app", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 11. README Template

```markdown
# Similar Question Finder

## Option Chosen
Option B — Similar Question Finder with Auto-Tagging

## Tech Stack
- **Frontend:** React 18, Tailwind CSS, React Router, Axios · Deployed on Vercel
- **Backend:** FastAPI, Python 3.11, Motor (async MongoDB driver) · Deployed on Render
- **Database:** MongoDB Atlas (free tier)
- **ML:** sentence-transformers (`all-MiniLM-L6-v2`), scikit-learn cosine similarity

## Live Links
- Frontend: https://your-app.vercel.app
- Backend: https://your-api.onrender.com

## Running Locally

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # fill in MONGO_URI and JWT_SECRET
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
```

## How the AI/ML Part Works

1. **Embedding:** When a user submits a question, the backend passes it through
   `sentence-transformers` (`all-MiniLM-L6-v2`), which converts the text into a
   384-dimensional float vector. Semantically similar sentences produce vectors
   that are geometrically close in this space.

2. **Similarity search:** The question's embedding is compared against every
   previously stored question using cosine similarity (via scikit-learn). The
   top 5 questions with a similarity score above 0.3 are returned.

3. **Auto-tagging:** A fixed list of topic labels (Biology, Physics, etc.) are
   themselves embedded into the same vector space. The topic whose embedding is
   closest to the question embedding (highest cosine similarity) is assigned as
   the tag — no training data required.
```

---

## 12. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Render free tier cold start (~50s) | High | Medium | Add `/health` ping; display loading message in frontend |
| Model download slow on first Render deploy | Medium | Medium | Check Render logs; model caches after first download |
| MongoDB Atlas IP whitelist blocking Render | Medium | High | Set Atlas network access to `0.0.0.0/0` (allow all) for free tier |
| CORS errors after deploying frontend | Medium | High | Add exact Vercel URL to `allow_origins` in FastAPI CORS middleware |
| `sentence-transformers` install > Render build timeout | Low | High | Pin version in requirements.txt; consider caching with Render disk |
| Empty question bank = no similar results | High | Low | Expected and acceptable; the pipeline still runs. Seed 10–15 sample questions into DB |
| JWT secret accidentally committed to GitHub | Low | Critical | Use `.env` file, add `.env` to `.gitignore` before first commit |

---
note: use:git version contreol properly.each file creation/modification commit with proper commit message.use git add and git commit properly


*Last updated: June 22, 2026*