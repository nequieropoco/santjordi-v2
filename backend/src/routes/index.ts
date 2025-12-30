import { Router } from "express";
import { menuRouter } from "./menu";
import { adminRouter } from "./admin";
import { suggestionsRouter } from "./suggestions";
import { authRouter } from "./auth";
import { requireAdmin } from "../middlewares/requireAdmin";

export const router = Router();

router.use("/menu", menuRouter);
router.use("/suggestions", suggestionsRouter);

router.use("/auth", authRouter);

// 👇 todo lo que cuelga de /admin requiere token
router.use("/admin", requireAdmin, adminRouter);
