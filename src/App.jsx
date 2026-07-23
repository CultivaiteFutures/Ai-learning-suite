import { Routes, Route } from "react-router-dom";

import Home from "./pages/landing/Home";
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";

import AdminDashboard from "./pages/admin/Dashboard";
import TeacherDashboard from "./pages/teacher/Dashboard";
import StudentDashboard from "./pages/student/Dashboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/login" element={<Login />} />

      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route path="/admin" element={<AdminDashboard />} />

      <Route path="/teacher" element={<TeacherDashboard />} />

      <Route path="/student" element={<StudentDashboard />} />
    </Routes>
  );
}

export default App;