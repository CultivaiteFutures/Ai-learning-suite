// Clean Token Manager - JWT Tokens issued exclusively by FastAPI POST /api/v1/auth/login
export function getToken() {
  return localStorage.getItem('token') || localStorage.getItem('ails_token');
}