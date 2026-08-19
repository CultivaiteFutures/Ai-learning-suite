import { authAPI } from "./api";

class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthError";
  }
}

export const authService = {
  async login(email, password) {
    const normalizedEmail = (email || "").trim().toLowerCase();
    
    try {
      const data = await authAPI.login(normalizedEmail, password);
      return { access_token: data.access_token, user: data.user };
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        throw new AuthError(err.response.data.detail);
      }
      throw new AuthError("Invalid email or password. Please check your credentials.");
    }
  },

  async logout() {
    authAPI.logout();
  },
};