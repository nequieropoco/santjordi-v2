import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

export type AdminTokenPayload = {
  sub: string; // username
  role: "admin";
};

export function signAdminToken(username: string) {
  const payload: AdminTokenPayload = { sub: username, role: "admin" };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AdminTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AdminTokenPayload;
}
