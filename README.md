# Similar Question Finder

## Tech Stack
- **Frontend:** React 18, React Router v6, Axios · Deployed on Vercel
- **Backend:** FastAPI, Python 3.11, Motor (async MongoDB driver) · Deployed on Render
- **Database:** MongoDB Atlas (free tier)
- **ML:** sentence-transformers (`all-MiniLM-L6-v2`), scikit-learn cosine similarity

## Live Links
- Frontend: _https://your-app.vercel.app_ (update after deployment)
- Backend API: _https://your-api.onrender.com_ (update after deployment)
- API Docs: _https://your-api.onrender.com/docs_

---

## Running Locally

### Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env: fill in MONGO_URI and JWT_SECRET

# Start the server
uvicorn main:app --reload
# API available at http://localhost:8000
# Interactive docs at http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:8000


npm run dev
# App available at http://localhost:5173
```

---

## How the AI/ML Part Works

### 1. Sentence Embedding
When a user submits a question, the backend passes it through `sentence-transformers` (`all-MiniLM-L6-v2`), which converts the text into a **384-dimensional float vector**. Semantically similar sentences produce vectors that are geometrically close in this space.

```
"Why does photosynthesis need light?"                     → [0.12, -0.34, 0.88, ...]
"What is the role of sunlight in plant food production?"  → [0.13, -0.31, 0.85, ...]
```

### 2. Similarity Search
The question's embedding is compared against every previously stored question using **cosine similarity** (via scikit-learn). The top 5 questions with a similarity score above 0.3 are returned. Because embeddings are L2-normalized, cosine similarity reduces to a fast dot product.

### 3. Auto-Tagging (Zero-Shot)
A fixed list of topic labels (Biology, Physics, Mathematics, etc.) are themselves embedded into the **same vector space**. The topic whose embedding is closest to the question embedding (highest cosine similarity) is assigned as the tag — **no training data required**.

```
similarity("Why does photosynthesis need light?", "Biology")     = 0.71 ✓ highest
similarity("Why does photosynthesis need light?", "Chemistry")   = 0.48
similarity("Why does photosynthesis need light?", "Physics")     = 0.31
```

---

## Architecture

```
Frontend (Vercel)          Backend (Render)           MongoDB Atlas
React + React Router  ──►  FastAPI + Python 3.11  ──►  users collection
                           │                           questions collection
                           ▼
                       ML Layer
                       sentence-transformers
                       all-MiniLM-L6-v2 (~90MB)
                       cosine_similarity (sklearn)
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/signup` | None | Create account |
| POST | `/auth/login` | None | Get JWT token |
| POST | `/questions/search` | JWT | Find similar questions + auto-tag |
| GET | `/questions/history` | JWT | Get user's question history |
| GET | `/questions/history?tag=Biology` | JWT | Filter history by tag |
| GET | `/health` | None | Health check (Render) |

---

## Deployment Notes

### Backend (Render)
- Build: `pip install -r requirements.txt`
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Env vars: `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRE_MINUTES=1440`, `ALLOWED_ORIGINS=https://your-app.vercel.app`

### Frontend (Vercel)
- Framework: Vite
- Build: `npm run build`
- Output: `dist`
- Env var: `VITE_API_URL=https://your-api.onrender.com`

> **Note:** First request to the backend may take ~20–50 seconds due to Render's free tier cold start + model download.
