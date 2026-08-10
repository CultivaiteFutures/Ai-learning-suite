/**
 * Produces a fake JWT-shaped string (header.payload.signature) so the rest
 * of the app — localStorage storage, expiry checks, etc. — can treat it
 * exactly like a real token would work once FastAPI issues one.
 * This is NOT cryptographically signed. Never treat it as secure.
 */
export function generateMockToken(user) {
  const header = { alg: "none", typ: "MOCK" };
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    schoolName: user.schoolName,
    iat: Date.now(),
    exp: Date.now() + 1000 * 60 * 60 * 8, // 8 hour mock session
  };

  const encode = (obj) => btoa(JSON.stringify(obj));
  return `${encode(header)}.${encode(payload)}.mocksignature`;
}