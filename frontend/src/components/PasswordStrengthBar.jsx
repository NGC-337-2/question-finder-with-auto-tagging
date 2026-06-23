import React from "react";

const rules = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "Contains a letter",      test: (p) => /[A-Za-z]/.test(p) },
  { label: "Contains a number",      test: (p) => /\d/.test(p) },
];

export default function PasswordStrengthBar({ password }) {
  if (!password) return null;

  const passed = rules.filter((r) => r.test(password)).length;
  
  // Custom theme-aware colors mapping to our CSS variables:
  // 1 pass = red (error), 2 passes = orange (warning), 3 passes = green (success)
  const colors = ["var(--error)", "var(--warning)", "var(--success)"];
  const widths = ["33.3%", "66.6%", "100%"];

  const activeColor = passed > 0 ? colors[passed - 1] : "transparent";
  const activeWidth = passed > 0 ? widths[passed - 1] : "0%";

  return (
    <div style={{ marginTop: "0.5rem" }}>
      {/* Progress Bar Container */}
      <div style={{
        height: "4px",
        width: "100%",
        borderRadius: "2px",
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        overflow: "hidden",
        marginBottom: "0.5rem"
      }}>
        <div style={{
          height: "100%",
          width: activeWidth,
          backgroundColor: activeColor,
          transition: "width 0.3s ease, background-color 0.3s ease"
        }} />
      </div>

      {/* Rules list */}
      <ul style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem"
      }}>
        {rules.map((r) => {
          const isPassed = r.test(password);
          return (
            <li key={r.label} style={{
              fontSize: "0.75rem",
              color: isPassed ? "var(--success)" : "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              transition: "color 0.2s ease"
            }}>
              <span style={{ fontSize: "0.85rem" }}>
                {isPassed ? "✓" : "○"}
              </span>
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
