import "dotenv/config";
import express from "express";
import cors from "cors";
import { router } from "./routes";
import { prisma } from "./prisma";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
      : true, // <-- si no hay env, permite el origin del navegador
  })
);


app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api", router);

// Seed opcional (dev): crea alérgenos por defecto si la tabla está vacía
async function ensureDefaultAllergens() {
  const count = await prisma.allergen.count();
  if (count > 0) return;

  await prisma.allergen.createMany({
    data: [
      { id: "gluten", code: "G", labelCa: "Gluten", labelEs: "Gluten" },
      { id: "peix", code: "P", labelCa: "Peix", labelEs: "Pescado" },
      { id: "lactics", code: "L", labelCa: "Làctics", labelEs: "Lácteos" },
      { id: "moluscs", code: "M", labelCa: "Moluscs", labelEs: "Moluscos" },
      { id: "crustacis", code: "CR", labelCa: "Crustacis", labelEs: "Crustáceos" },
      { id: "fruits_secs", code: "FS", labelCa: "Fruits secs", labelEs: "Frutos secos" },
      { id: "soja", code: "SO", labelCa: "Soja", labelEs: "Soja" },
      { id: "sulfits", code: "SU", labelCa: "Sulfits", labelEs: "Sulfitos" },
      { id: "ou", code: "H", labelCa: "Ou", labelEs: "Huevo" },
      { id: "api", code: "AP", labelCa: "Api", labelEs: "Apio" },
    ],
    skipDuplicates: true,
  });
}

const port = Number(process.env.PORT || 4000);

ensureDefaultAllergens()
  .then(() => {
    app.listen(port, () => console.log(`API: http://localhost:${port}`));
  })
  .catch((err) => {
    console.error("Bootstrap error:", err);
    process.exit(1);
  });
