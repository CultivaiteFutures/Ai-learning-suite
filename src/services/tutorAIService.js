/**
 * Mock AI Tutor response generator.
 * TODO: Replace with a real call to a backend endpoint, e.g.
 *   POST /api/v1/ai/tutor-chat
 * which proxies securely to the Claude API (never call Claude directly
 * from the frontend — the API key must stay server-side). The backend
 * should also pass conversation history + the student's active lesson
 * context so responses are grounded in real course material.
 */

const RESPONSE_BANK = {
  explain: (topic) =>
    `Sure! Let's break "${topic}" down step by step.\n\nAt its core, this concept is about understanding the relationship between the key ideas involved and how they connect to what you've already learned. Think of it like building blocks — each part supports the next.\n\nHere's a simple way to think about it:\n1. Start with what you already know\n2. Notice the new idea being introduced\n3. See how it connects to the bigger picture\n\nWould you like me to walk through a specific example, or simplify this even further?`,
  summarize: (topic) =>
    `Here's a quick summary of "${topic}":\n\n• The main idea centers on understanding core concepts and how they apply in practice\n• Key terms to remember are the foundational vocabulary introduced early in the lesson\n• The most important takeaway is how each concept builds on the previous one\n\nWant me to turn this into flashcards or give you a few practice examples?`,
  examples: (topic) =>
    `Great question! Here are a few examples related to "${topic}":\n\n**Example 1:** A straightforward case that shows the basic idea in action.\n\n**Example 2:** A slightly trickier case that adds one more layer of complexity.\n\n**Example 3:** A real-world scenario where you'd actually use this concept.\n\nTry working through Example 2 on your own — I can check your reasoning if you'd like!`,
  quiz: (topic) =>
    `Here's a short quiz on "${topic}" to check your understanding:\n\n**Q1.** What is the main idea behind this concept?\n**Q2.** Can you give one real-world example where this applies?\n**Q3.** True or False: This concept only applies in one specific situation.\n**Q4.** What would happen if you changed one of the key variables?\n**Q5.** Explain this concept in your own words, as if teaching a friend.\n\nTry answering these, and I'll let you know how you're doing!`,
  simplify: (topic) =>
    `Let's make "${topic}" as simple as possible.\n\nImagine you're explaining it to someone much younger. In plain terms: it's really just about noticing a pattern and using it to solve a problem. No complicated language needed — just the core idea.\n\nDoes that make more sense? I can add a bit more detail back in if you'd like.`,
  translate: (topic) =>
    `Here's the idea behind "${topic}" — I can translate this into Hindi, Spanish, French, or Tamil. Just let me know which language you'd like, and I'll translate the full explanation for you!\n\n(For now, here's the concept in English so we're on the same page before translating.)`,
  default: (message) =>
    `That's a great question about "${message}". Let me help you work through it.\n\nThe key thing to focus on is breaking the problem into smaller, manageable pieces. Start by identifying what you already know, then figure out what's actually being asked.\n\nWant me to explain this differently, give you an example, or generate a quick practice quiz on this topic?`,
};

function detectIntent(message) {
  const lower = message.toLowerCase();
  if (lower.includes("explain")) return "explain";
  if (lower.includes("summar")) return "summarize";
  if (lower.includes("example")) return "examples";
  if (lower.includes("quiz")) return "quiz";
  if (lower.includes("simplify") || lower.includes("simpler") || lower.includes("grade")) return "simplify";
  if (lower.includes("translat")) return "translate";
  return "default";
}

function extractTopic(message) {
  const cleaned = message
    .replace(/can you|explain|summarize|summarise|give me|examples?|generate|a quiz|simplify|for my grade|translate|this|please|\?/gi, "")
    .trim();
  return cleaned.length > 2 ? cleaned : "this topic";
}

export async function generateTutorResponse(message) {
  // simulate network + thinking delay
  await new Promise((resolve) => setTimeout(resolve, 700 + Math.random() * 500));

  const intent = detectIntent(message);
  const topic = extractTopic(message);

  if (intent === "default") {
    return RESPONSE_BANK.default(message.length > 60 ? message.slice(0, 60) + "…" : message);
  }
  return RESPONSE_BANK[intent](topic);
}