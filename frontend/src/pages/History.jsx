import { useState, useEffect } from "react";
import client from "../api/client";

const ALL_TAGS = [
  "Biology",
  "Physics",
  "Mathematics",
  "History",
  "Chemistry",
  "Computer Science",
  "Geography",
  "Economics",
];

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

export default function History() {
  const [questions, setQuestions] = useState([]);
  const [activeTag, setActiveTag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const fetchHistory = async (tag = null) => {
    setLoading(true);
    setError(null);
    try {
      const params = tag ? { tag } : {};
      const res = await client.get("/questions/history", { params });
      setQuestions(res.data.questions);
    } catch (err) {
      setError("Failed to load history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleTagFilter = (tag) => {
    const newTag = tag === activeTag ? null : tag;
    setActiveTag(newTag);
    fetchHistory(newTag);
    setExpandedId(null); // Collapse any expanded item on filter change
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="page-container">
      <div className="history-hero">
        <h1 className="page-title">Your Question History</h1>
        <p className="page-subtitle">
          Browse all the questions you've submitted, filtered by topic. Click on a question to view similar matches.
        </p>
      </div>

      {/* Tag filter pills */}
      <div className="tag-filter-bar" id="tag-filter-bar">
        <button
          id="filter-all"
          className={`tag-pill ${activeTag === null ? "active" : ""}`}
          onClick={() => handleTagFilter(null)}
        >
          All Topics
        </button>
        {ALL_TAGS.map((tag) => (
          <button
            key={tag}
            id={`filter-${tag.toLowerCase().replace(/\s/g, "-")}`}
            className={`tag-pill ${activeTag === tag ? "active" : ""}`}
            onClick={() => handleTagFilter(tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner-large" />
          <p className="loading-text">Loading your questions…</p>
        </div>
      ) : error ? (
        <div className="error-alert" role="alert">
          {error}
        </div>
      ) : questions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" style={{ color: "#6366f1", marginBottom: "1rem" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
          </div>
          <p className="empty-text">
            {activeTag
              ? `No questions tagged as "${activeTag}" yet.`
              : "You haven't asked any questions yet."}
          </p>
          <a href="/search" className="btn-primary" style={{ display: "inline-block", marginTop: "1rem" }}>
            Ask your first question →
          </a>
        </div>
      ) : (
        <>
          <p className="results-count">
            {questions.length} question{questions.length !== 1 ? "s" : ""}
            {activeTag ? ` tagged as "${activeTag}"` : ""}
          </p>
          <div
            className="faq-list"
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "0.5rem 1.5rem",
              background: "var(--bg-card)",
            }}
          >
            {questions.map((q, idx) => {
              const tagStyle = TAG_COLORS[q.topic_tag] || TAG_COLORS.default;
              const isExpanded = expandedId === q._id;
              return (
                <div
                  key={q._id || idx}
                  className="faq-list-item"
                  onClick={() => toggleExpand(q._id)}
                  style={{
                    borderBottom:
                      idx === questions.length - 1 ? "none" : "1px solid var(--border)",
                    padding: "1.25rem 0",
                    display: "block",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "1.5rem",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        className="faq-question-text"
                        style={{
                          padding: "0",
                          fontSize: "1.05rem",
                          fontWeight: "500",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <span
                          style={{
                            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                            transition: "transform 0.2s",
                            display: "inline-block",
                            fontSize: "0.7rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          ▶
                        </span>
                        {q.question_text}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                          marginTop: "0.5rem",
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                          paddingLeft: "1.2rem",
                        }}
                      >
                        <span>
                          {new Date(q.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span>•</span>
                        <span>
                          {q.similar_questions?.length ?? 0} similar match
                          {(q.similar_questions?.length ?? 0) !== 1 ? "es" : ""} found
                        </span>
                      </div>
                    </div>

                    <span
                      className="tag-badge"
                      style={{
                        backgroundColor: tagStyle.bg,
                        color: tagStyle.color,
                        border: `1px solid ${tagStyle.border}`,
                        fontSize: "0.75rem",
                        padding: "0.2rem 0.65rem",
                        borderRadius: "999px",
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {q.topic_tag}
                    </span>
                  </div>

                  {/* Dropdown Section */}
                  {isExpanded && (
                    <div
                      style={{
                        marginTop: "1rem",
                        marginLeft: "1.2rem",
                        padding: "1rem 1.25rem",
                        background: "rgba(255, 255, 255, 0.02)",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border)",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h4
                        style={{
                          margin: "0 0 0.75rem 0",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Similar Questions Found
                      </h4>
                      {q.similar_questions && q.similar_questions.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                          {q.similar_questions.map((subQ, subIdx) => (
                            <div
                              key={subQ.question_id || subIdx}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                paddingBottom:
                                  subIdx === q.similar_questions.length - 1
                                    ? 0
                                    : "0.75rem",
                                borderBottom:
                                  subIdx === q.similar_questions.length - 1
                                    ? "none"
                                    : "1px solid rgba(255, 255, 255, 0.04)",
                              }}
                            >
                              <span style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>
                                {subQ.question_text}
                              </span>
                              <span
                                className={`score-badge ${
                                  Math.round(subQ.score * 100) >= 70
                                    ? "score-high"
                                    : Math.round(subQ.score * 100) >= 50
                                    ? "score-medium"
                                    : "score-low"
                                }`}
                                style={{ flexShrink: 0, marginLeft: "1rem" }}
                              >
                                {Math.round(subQ.score * 100)}% match
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)" }}>
                          No similar questions were found in the database.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
