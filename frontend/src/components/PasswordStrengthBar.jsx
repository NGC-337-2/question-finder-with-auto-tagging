import React from "react";

const rules = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "Contains a letter",      test: (p) => /[A-Za-z]/.test(p) },
  { label: "Contains a number",      test: (p) => /\d/.test(p) },
];

export default function PasswordStrengthBar({ password }) {
  if (!password) return null;

  const passed = rules.filter((r) => r.test(password)).length;
  
  // Custom styling using inline styles or tailwind if available, but let's look at the existing styling:
  // CSS styling in frontend/src/index.css could also have rules, but let's use tailwind classes if the project uses them or write inline styles/flexible classes.
  // Wait, let's check if the project uses Tailwind. Let's look at frontend/src/index.css or frontend/package.json.
  // The system uses vanilla CSS by default. The user prompt shows:
  // colors = ["bg-red-400", "bg-yellow-400", "bg-green-500"]; etc.
  // But wait, if Tailwind is not in package.json, these tailwind classes like bg-red-400, w-1/3 etc. won't render unless Tailwind is set up. Let's check package.json in the frontend.
