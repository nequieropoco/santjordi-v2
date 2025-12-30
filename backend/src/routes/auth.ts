import { Router } from "express";
import { z } from "zod";
import { signAdminToken } from "../auth";

export const authRouter = Router();

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post("/login", (req, res) => {
  const r = schema.safeParse(req.body);
  if (!r.success) return res.status(400).json({ error: "Bad body" });

  const { username, password } = r.data;

  const ADMIN_USER = process.env.ADMIN_USER || "admin";
  const ADMIN_PASS = process.env.ADMIN_PASS || "admin";

  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signAdminToken(username);
  res.json({ token });
});

authRouter.post("/logout", (_req, res) => {
  // JWT stateless: el cliente borra el token
  res.json({ ok: true });
});
