import jwt from "jsonwebtoken";

export function signAdminToken(payload: { username: string }) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET missing");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function requireAdmin(req: any, res: any, next: any) {
  const auth = req.headers.authorization || "";
  const [, token] = auth.split(" ");

  if (!token) return res.status(401).json({ error: "missing_token" });

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET missing");

    const decoded = jwt.verify(token, secret);
    (req as any).user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}
