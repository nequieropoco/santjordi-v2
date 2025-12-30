import { Router } from "express";
import { prisma } from "../prisma";

export const suggestionsRouter = Router();

suggestionsRouter.get("/current", async (_req, res) => {
  const sheet = await prisma.suggestionSheet.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
    include: { items: { orderBy: [{ section: "asc" }, { order: "asc" }] } },
  });

  if (!sheet) return res.json({ sheet: null });

  const food = sheet.items.filter((i) => i.section === "FOOD");
  const desserts = sheet.items.filter((i) => i.section === "DESSERT");
  const other = sheet.items.filter((i) => i.section === "OTHER");

  res.json({
    sheet: {
      id: sheet.id,
      dateFrom: sheet.dateFrom,
      dateTo: sheet.dateTo,
      sections: {
        food: food.map((i) => ({ id: i.id, title: { ca: i.titleCa, es: i.titleEs }, price: Number(i.price), order: i.order })),
        desserts: desserts.map((i) => ({ id: i.id, title: { ca: i.titleCa, es: i.titleEs }, price: Number(i.price), order: i.order })),
        other: other.map((i) => ({ id: i.id, title: { ca: i.titleCa, es: i.titleEs }, price: Number(i.price), order: i.order })),
      },
    },
  });
});
