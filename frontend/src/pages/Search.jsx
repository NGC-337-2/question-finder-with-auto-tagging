import { useState } from "react";
import client from "../api/client";
import QuestionCard from "../components/QuestionCard";

const TOPIC_LABELS = [
  "Biology",
  "Physics",
  "Mathematics",
  "History",
  "Chemistry",
  "Computer Science",
  "Geography",
  "Economics",
];

export default function Search() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null); // { question_id, topic_tag, similar_questions }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await client.post("/questions/search", {
        question: question.trim(),
      });
      setResult(res.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setQuestion("");
    setError(null);
  };

  return (
    <div className="page-container">
      {/* Hero section */}
      <div className="search-hero">
        <h1 className="page-title">Find Similar Questions</h1>
        <p className="page-subtitle">
          Submit your study question — our AI will find similar ones and tag it
          automatically.
        </p>
      </div>

      {/* Input form */}
      {!result && (
        <form id="search-form" onSubmit={handleSubmit} className="search-form">
          <div className="openai-input-container">
            <textarea
              id="question-input"
              className="question-textarea"
              placeholder="What do you want to learn today?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              disabled={loading}
              maxLength={500}
            />
            
            <div className="input-actions-row">
              <span className="char-count">{question.length}/500</span>
              
              <button
                id="search-submit"
                type="submit"
                className="btn-submit-icon"
                disabled={loading || !question.trim()}
              >
                {loading ? (
                  <span className="btn-spinner" style={{ width: '14px', height: '14px', borderColor: 'rgba(0,0,0,0.2)', borderTopColor: 'black' }} />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-alert" role="alert" style={{ marginTop: '1rem' }}>
              {error}
            </div>
          )}

          {loading && (
            <p className="loading-hint" style={{ marginTop: '1rem' }}>
              First request may take 20–30 seconds to warm up the AI model.
            </p>
          )}
        </form>
      )}

      {/* Results section */}
      {result && (
        <div className="results-section">
          {/* Your question + tag */}
          <div className="result-header">
            <div className="result-question-box">
              <p className="result-label">Your question</p>
              <p className="result-question-text">{question}</p>
            </div>
            <div className="tag-result">
              <p className="result-label">Auto-tagged as</p>
              <span
                className="tag-result-badge"
                style={{ backgroundColor: getTagColor(result.topic_tag) }}
              >
                {result.topic_tag}
              </span>
            </div>
          </div>

          {/* Similar questions */}
          <div className="similar-section">
            <h2 className="similar-title">
              {result.similar_questions.length > 0
                ? `${result.similar_questions.length} Similar Question${result.similar_questions.length !== 1 ? "s" : ""
                } Found`
                : "No Similar Questions Yet"}
            </h2>

            {result.similar_questions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon" style={{ color: "#10b981", marginBottom: "1rem" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></svg>
                </div>
                <p className="empty-text">
                  You're one of the first to ask this! Your question has been
                  saved and will help future users.
                </p>
              </div>
            ) : (
              <div className="cards-grid">
                {result.similar_questions.map((sq) => (
                  <QuestionCard
                    key={sq.question_id}
                    question={sq.question_text}
                    tag={null}
                    score={sq.score}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            id="search-reset"
            className="btn-secondary"
            onClick={handleReset}
          >
            ← Ask another question
          </button>
        </div>
      )}
    </div>
  );
}

function getTagColor(tag) {
  const colors = {
    Biology: "#dcfce7",
    Physics: "#dbeafe",
    Mathematics: "#fef9c3",
    History: "#fce7f3",
    Chemistry: "#ede9fe",
    "Computer Science": "#ccfbf1",
    Geography: "#ffedd5",
    Economics: "#f0fdf4",
  };
  return colors[tag] || "#f3f4f6";
}
