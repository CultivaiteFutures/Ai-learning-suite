import { aiAPI } from "./api";

export async function generateTutorResponse(message, contextInfo = {}, conversationHistory = []) {
  try {
    const payload = {
      question: message,
      course_id: contextInfo.courseId || null,
      lesson_id: contextInfo.lessonId || null,
      conversation_history: conversationHistory
    };

    const res = await aiAPI.tutorChat(payload);
    return res.data?.reply || "AI configuration required: No response received.";
  } catch (err) {
    const errorMsg = err.response?.data?.detail || "AI configuration required: Anthropic Claude API key is not configured on the server.";
    return errorMsg;
  }
}