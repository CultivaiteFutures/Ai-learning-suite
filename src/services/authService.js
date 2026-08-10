import { getAllMockUsers, MOCK_PASSWORD } from "../data/mockUsers";
import { generateMockToken } from "../utils/mockAuthToken";

/**
 * MOCK AUTH SERVICE — frontend-only, no backend yet.
 * TODO (Backend integration): replace login()'s body with a real call to
 * POST /api/v1/auth/login via api.js. Return shape ({ access_token, user })
 * must stay identical — every consumer depends only on that contract.
 */

const MOCK_NETWORK_DELAY_MS = 600;

class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthError";
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const authService = {
  async login(email, password) {
    await delay(MOCK_NETWORK_DELAY_MS);

    const normalizedEmail = (email || "").trim().toLowerCase();
    const user = getAllMockUsers().find((u) => u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      throw new AuthError("No account found with that email address.");
    }
    if (!password || password.trim().length === 0) {
      throw new AuthError("Password is required.");
    }
    if (password !== MOCK_PASSWORD && password.trim().length < 4) {
      throw new AuthError("Incorrect password. Try 'password123' for any demo account.");
    }

    const access_token = generateMockToken(user);
    return { access_token, user };
  },

  async logout() {
    await delay(150);
  },
};