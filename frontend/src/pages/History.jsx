import { useState, useEffect } from "react";
import client from "../api/client";
import QuestionCard from "../components/QuestionCard";

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

export default function History() {
  const [questions, setQuestions] = useState([]);
  const [activeTag, setActiveTag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
  };

  return (
    <div className="page-container">
      <div className="history-hero">
        <h1 className="page-title">Your Question History</h1>
        <p className="page-subtitle">
          Browse all the questions you've submitted, filtered by topic.
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
          <div className="cards-grid">
            {questions.map((q) => (
              <QuestionCard
                key={q._id}
                question={q.question_text}
                tag={q.topic_tag}
                date={q.created_at}
                similarCount={q.similar_questions?.length ?? 0}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
