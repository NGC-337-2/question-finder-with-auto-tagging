/**
 * QuestionCard — Reusable card component used in both Search results and History.
 *
 * Props:
 *   question (string) — the question text
 *   tag (string) — topic tag (e.g. "Biology")
 *   score (number|null) — similarity score 0–1, shown as % (null = not a similar result)
 *   date (string|null) — ISO date string for history cards
 *   similarCount (number|null) — number of similar matches found (history cards)
 */

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

export default function QuestionCard({
  question,
  tag,
  score = null,
  date = null,
  similarCount = null,
}) {
  const tagStyle = TAG_COLORS[tag] || TAG_COLORS.default;
  const scorePercent = score !== null ? Math.round(score * 100) : null;

  return (
    <div className="question-card">
      <div className="question-card-header">
        {tag && (
          <span
            className="tag-badge"
            style={{
              backgroundColor: tagStyle.bg,
              color: tagStyle.color,
              border: `1px solid ${tagStyle.border}`,
            }}
          >
            {tag}
          </span>
        )}
        {scorePercent !== null && (
          <span
            className={`score-badge ${
              scorePercent >= 70
                ? "score-high"
                : scorePercent >= 50
                ? "score-medium"
                : "score-low"
            }`}
          >
            {scorePercent}% match
          </span>
        )}
        {date && (
          <span className="date-badge">
            {new Date(date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        )}
      </div>

      <p className="question-text">{question}</p>

      {similarCount !== null && (
        <div className="similar-count">
          <span className="similar-count-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          </span>
          {similarCount} similar question{similarCount !== 1 ? "s" : ""} found
        </div>
      )}
    </div>
  );
}
