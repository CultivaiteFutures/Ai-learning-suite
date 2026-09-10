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
        // A real response came back from the server (401/400/etc) -- its
        // detail message is accurate, show it as-is.
        throw new AuthError(err.response.data.detail);
      }
      if (err.request) {
        // The request was sent but no response ever came back (server down,
        // wrong port, network/CORS failure, etc). This is NOT a credentials
        // problem -- telling the user "invalid email or password" here would
        // be actively misleading, since the backend was never actually asked.
        throw new AuthError("Can't reach the server right now. Please check your connection and try again in a moment.");
      }
      throw new AuthError("Invalid email or password. Please check your credentials.");
    }
  },

  async logout() {
    authAPI.logout();
  },
};