import { createContext, useContext, useState, useEffect, useRef } from "react";
import { generateId } from "../utils/generateId";
import { generateTutorResponse } from "../services/tutorAIService";

const TutorChatContext = createContext(null);

const SESSIONS_KEY = "ails_tutor_sessions";
const THEME_KEY = "ails_tutor_theme";
const WORD_REVEAL_MS = 28;

function loadInitial(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function createEmptySession() {
  return {
    id: generateId(),
    title: "New Chat",
    messages: [],
    createdAt: new Date().toISOString(),
  };
}

export function TutorChatProvider({ children }) {
  const [sessions, setSessions] = useState(() => {
    const stored = loadInitial(SESSIONS_KEY, null);
    return stored && stored.length > 0 ? stored : [createEmptySession()];
  });
  const [activeSessionId, setActiveSessionId] = useState(() => sessions[0].id);
  const [isDark, setIsDark] = useState(() => loadInitial(THEME_KEY, false));
  const [isSending, setIsSending] = useState(false);
  const revealTimerRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, JSON.stringify(isDark));
  }, [isDark]);

  useEffect(() => {
    return () => {
      if (revealTimerRef.current) clearInterval(revealTimerRef.current);
    };
  }, []);

  function toggleTheme() {
    setIsDark((prev) => !prev);
  }

  function updateSession(sessionId, updater) {
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? updater(s) : s)));
  }

  function createNewChat() {
    const fresh = createEmptySession();
    setSessions((prev) => [fresh, ...prev]);
    setActiveSessionId(fresh.id);
  }

  function selectSession(sessionId) {
    setActiveSessionId(sessionId);
  }

  function deriveTitle(text) {
    const trimmed = text.trim();
    return trimmed.length > 42 ? trimmed.slice(0, 42) + "…" : trimmed;
  }

  async function sendMessage(text, attachment, context) {
    const trimmed = text.trim();
    if (!trimmed && !attachment) return;

    const sessionId = activeSessionId;
    const priorMessages = (sessions.find((s) => s.id === sessionId)?.messages || []);
    // Real multi-turn context for the AI, not just the single new question --
    // capped to the last 10 turns so the prompt doesn't grow unbounded.
    const conversationHistory = priorMessages
      .filter((m) => !m.isTyping && m.content)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    const userMessage = {
      id: generateId(),
      role: "user",
      content: trimmed,
      attachment: attachment || null,
      timestamp: new Date().toISOString(),
    };

    updateSession(sessionId, (s) => ({
      ...s,
      title: s.messages.length === 0 ? deriveTitle(trimmed || "Image question") : s.title,
      messages: [...s.messages, userMessage],
    }));

    const assistantId = generateId();
    const placeholder = {
      id: assistantId,
      role: "assistant",
      content: "",
      isTyping: true,
      timestamp: new Date().toISOString(),
    };
    updateSession(sessionId, (s) => ({ ...s, messages: [...s.messages, placeholder] }));

    setIsSending(true);
    const fullResponse = await generateTutorResponse(
      trimmed || "Explain the attached image",
      context || {},
      conversationHistory
    );

    // Reveal word by word for a ChatGPT-style typing animation
    const words = fullResponse.split(" ");
    let currentIndex = 0;

    await new Promise((resolve) => {
      revealTimerRef.current = setInterval(() => {
        currentIndex += 1;
        const partial = words.slice(0, currentIndex).join(" ");

        updateSession(sessionId, (s) => ({
          ...s,
          messages: s.messages.map((m) =>
            m.id === assistantId ? { ...m, content: partial, isTyping: currentIndex < words.length } : m
          ),
        }));

        if (currentIndex >= words.length) {
          clearInterval(revealTimerRef.current);
          resolve();
        }
      }, WORD_REVEAL_MS);
    });

    setIsSending(false);
  }

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  return (
    <TutorChatContext.Provider
      value={{
        sessions,
        activeSession,
        activeSessionId,
        createNewChat,
        selectSession,
        sendMessage,
        isSending,
        isDark,
        toggleTheme,
      }}
    >
      {children}
    </TutorChatContext.Provider>
  );
}

export function useTutorChat() {
  const ctx = useContext(TutorChatContext);
  if (!ctx) throw new Error("useTutorChat must be used within TutorChatProvider");
  return ctx;
}