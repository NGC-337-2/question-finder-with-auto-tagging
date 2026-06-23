import { useState } from "react";
import client from "../api/client";

const TAG_COLORS = {
  Biology: { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
  Physics: { bg: "#dbeafe", color: "#1e40af", border: "#bfdbfe" },
  Mathematics: { bg: "#fef9c3", color: "#854d0e", border: "#fef08a" },
  History: { bg: "#fce7f3", color: "#9d174d", border: "#fbcfe8" },
  Chemistry: { bg: "#ede9fe", color: "#5b21b6", border: "#ddd6fe" },
  "Computer Science": { bg: "#ccfbf1", color: "#065f46", border: "#99f6e4" },
  Geography: { bg: "#ffedd5", color: "#9a3412", border: "#fed7aa" },
  Economics: { bg: "#f0fdf4", color: "#14532d", border: "#bbf7d0" },
  default: { bg: "#f3f4f6", color: "#374151", border: "#e5e7eb" },
};

export default function Search() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const query = question.trim();
    if (!query) return;

    setLoading(true);
    setError(null);

    try {
      const res = await client.post("/questions/search", { question: query });
      setResult(res.data);
    } catch (err) {
      setError(
        err.response?.data?.detail || "An error occurred while analyzing the question. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleReset = () => {
    setQuestion("");
    setResult(null);
    setError(null);
  };

  const tagStyle = result ? (TAG_COLORS[result.topic_tag] || TAG_COLORS.default) : TAG_COLORS.default;

  return (
    <div className="page-container">
      <div className="search-hero">
        <h1 className="page-title">Find Similar Questions</h1>
        <p className="page-subtitle">
          Enter your study question. We will auto-tag it with a topic and find similar questions from our database.
        </p>
      </div>

      <form id="search-form" onSubmit={handleSubmit} className="search-form">
        <div
          className="openai-input-container"
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "1rem",
            padding: "0.75rem 1rem",
          }}
        >
          <textarea
            id="question-input"
            className="question-textarea"
            placeholder="Type or paste your question here..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            maxLength={1000}
            style={{
              paddingBottom: 0,
              minHeight: "36px",
              height: "36px",
              overflowY: "auto",
              flex: 1,
            }}
          />
          <button
            type="submit"
            id="submit-question"
            className="btn-submit-icon"
            disabled={loading || !question.trim()}
            style={{ flexShrink: 0 }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "0.5rem",
            padding: "0 0.5rem",
          }}
        >
          <span className="char-count" style={{ position: "static" }}>
            {question.length}/1000 characters
          </span>
          {result && (
            <button
              type="button"
              onClick={handleReset}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: "0.8rem",
                textDecoration: "underline",
              }}
            >
              Clear Search
            </button>
          )}
        </div>
      </form>

      {loading && (
        <div className="loading-container">
          <div className="spinner-large" />
          <p className="loading-text">Analyzing your question and finding matches...</p>
          <p className="loading-hint">This might take a moment if the machine learning model is loading for the first time</p>
        </div>
      )}

      {error && (
        <div style={{ maxWidth: "768px", margin: "1.5rem auto 0" }}>
          <div className="error-alert" role="alert">
            {error}
          </div>
        </div>
      )}

      {result && !loading && (
        <div className="results-section" style={{ marginTop: "2rem" }}>
          <div className="similar-section">
            {/* Auto Tag Box */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1.5rem",
                padding: "0.75rem 1rem",
                background: "rgba(255, 255, 255, 0.02)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
              }}
            >
              <span
                className="result-label"
                style={{
                  margin: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 600,
                }}
              >
                Auto Tagged Topic:
              </span>
              <span
                className="tag-badge"
                style={{
                  backgroundColor: tagStyle.bg,
                  color: tagStyle.color,
                  border: `1px solid ${tagStyle.border}`,
                  fontSize: "0.85rem",
                  padding: "0.25rem 0.75rem",
                  borderRadius: "999px",
                  fontWeight: 600,
                }}
              >
                {result.topic_tag}
              </span>
            </div>

            {/* Similar Questions List (FAQ Style) */}
            <h3 className="similar-title">Similar Questions</h3>
            {result.similar_questions && result.similar_questions.length > 0 ? (
              <div
                className="faq-list"
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.5rem 1.5rem",
                  background: "var(--bg-card)",
                }}
              >
                {result.similar_questions.map((q, idx) => (
                  <div
                    key={q.question_id || idx}
                    className="faq-list-item"
                    style={{
                      borderBottom:
                        idx === result.similar_questions.length - 1
                          ? "none"
                          : "1px solid var(--border)",
                      padding: "1rem 0",
                    }}
                  >
                    <div className="faq-question-text" style={{ padding: "0.25rem 0" }}>
                      {q.question_text}
                    </div>
                    <span
                      className={`score-badge ${
                        Math.round(q.score * 100) >= 70
                          ? "score-high"
                          : Math.round(q.score * 100) >= 50
                          ? "score-medium"
                          : "score-low"
                      }`}
                      style={{
                        flexShrink: 0,
                        marginLeft: "1rem",
                        alignSelf: "center",
                      }}
                    >
                      {Math.round(q.score * 100)}% match
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="empty-state"
                style={{
                  padding: "2rem 0",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-card)",
                }}
              >
                <p className="empty-text">
                  No similar questions with match score &ge; 30% were found in the database.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
