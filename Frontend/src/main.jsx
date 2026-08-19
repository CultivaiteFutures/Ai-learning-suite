import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// Purge stale client-side mock cache keys from localStorage
[
  "ails_schools",
  "ails_subscriptions",
  "ails_golden_templates",
  "ails_activity_logs",
  "ails_school_admins",
  "ails_courses",
  "ails_assignments",
  "ails_student_enrolled_courses",
  "ails_student_lessons",
  "ails_student_stats",
].forEach((k) => localStorage.removeItem(k));

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);