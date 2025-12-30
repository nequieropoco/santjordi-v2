import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../auth";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ error: "No auth token" });
    }

    const payload = verifyToken(token);
    if (payload.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    // opcional: lo dejamos en req para usarlo si quieres
    (req as any).admin = payload;

    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
