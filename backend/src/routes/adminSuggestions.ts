import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { Prisma } from "@prisma/client";

export const adminSuggestionsRouter = Router();

function parseBody<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  const r = schema.safeParse(body);
  if (!r.success) {
    const msg = r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" | ");
    const err: any = new Error(msg);
    err.status = 400;
    throw err;
  }
  return r.data;
}

const langText = z.object({
  ca: z.string().default(""),
  es: z.string().default(""),
});

const sectionEnum = z.enum(["FOOD", "DESSERT", "OTHER"]);

const sheetCreateSchema = z.object({
  dateFrom: z.string().min(1),
  dateTo: z.string().min(1),
  isActive: z.boolean().optional().default(true),
});

const sheetPatchSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  isActive: z.boolean().optional(),
});

const itemCreateSchema = z.object({
  sheetId: z.string().min(1),
  section: sectionEnum,
  title: langText,
  price: z.number().nonnegative(),
  order: z.number().int().nonnegative().optional(),
});

const itemPatchSchema = z.object({
  section: sectionEnum.optional(),
  title: langText.optional(),
  price: z.number().nonnegative().optional(),
  order: z.number().int().nonnegative().optional(),
});

const reorderSchema = z.object({
  ids: z.array(z.string()).min(1),
});

/* -------------------------
   GET current (admin)
-------------------------- */
adminSuggestionsRouter.get("/current", async (_req, res) => {
  const sheet = await prisma.suggestionSheet.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
    include: { items: { orderBy: [{ section: "asc" }, { order: "asc" }] } },
  });

  if (!sheet) return res.json({ sheet: null });

  const by = (s: "FOOD" | "DESSERT" | "OTHER") =>
    sheet.items
      .filter((i) => i.section === s)
      .sort((a, b) => a.order - b.order)
      .map((i) => ({
        id: i.id,
        section: i.section,
        title: { ca: i.titleCa, es: i.titleEs },
        price: Number(i.price),
        order: i.order,
      }));

  res.json({
    sheet: {
      id: sheet.id,
      dateFrom: sheet.dateFrom,
      dateTo: sheet.dateTo,
      isActive: sheet.isActive,
      sections: {
        food: by("FOOD"),
        desserts: by("DESSERT"),
        other: by("OTHER"),
      },
    },
  });
});

/* -------------------------
   Create sheet
-------------------------- */
adminSuggestionsRouter.post("/sheets", async (req, res, next) => {
  try {
    const body = parseBody(sheetCreateSchema, req.body);
    const dateFrom = new Date(body.dateFrom);
    const dateTo = new Date(body.dateTo);

    if (Number.isNaN(dateFrom.getTime()) || Number.isNaN(dateTo.getTime())) {
      const err: any = new Error("Dates invàlides");
      err.status = 400;
      throw err;
    }

    const created = await prisma.$transaction(async (tx) => {
      if (body.isActive) {
        await tx.suggestionSheet.updateMany({ data: { isActive: false } });
      }
      return tx.suggestionSheet.create({
        data: { dateFrom, dateTo, isActive: body.isActive },
      });
    });

    res.status(201).json({ id: created.id });
  } catch (e) {
    next(e);
  }
});

/* -------------------------
   Update sheet
-------------------------- */
adminSuggestionsRouter.patch("/sheets/:id", async (req, res, next) => {
  try {
    const body = parseBody(sheetPatchSchema, req.body);

    await prisma.$transaction(async (tx) => {
      if (body.isActive === true) {
        await tx.suggestionSheet.updateMany({
          where: { id: { not: req.params.id } },
          data: { isActive: false },
        });
      }

      await tx.suggestionSheet.update({
        where: { id: req.params.id },
        data: {
          ...(body.dateFrom ? { dateFrom: new Date(body.dateFrom) } : {}),
          ...(body.dateTo ? { dateTo: new Date(body.dateTo) } : {}),
          ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
        },
      });
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* -------------------------
   Delete sheet
-------------------------- */
adminSuggestionsRouter.delete("/sheets/:id", async (req, res, next) => {
  try {
    await prisma.suggestionSheet.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* -------------------------
   Create item
-------------------------- */
adminSuggestionsRouter.post("/items", async (req, res, next) => {
  try {
    const body = parseBody(itemCreateSchema, req.body);

    const nextOrder =
      typeof body.order === "number"
        ? body.order
        : (await prisma.suggestionItem.aggregate({
            where: { sheetId: body.sheetId, section: body.section },
            _max: { order: true },
          }))._max.order ?? -1 + 1;

    const created = await prisma.suggestionItem.create({
      data: {
        sheetId: body.sheetId,
        section: body.section,
        titleCa: body.title.ca,
        titleEs: body.title.es,
        price: new Prisma.Decimal(body.price),
        order: nextOrder,
      },
    });

    res.status(201).json({ id: created.id });
  } catch (e) {
    next(e);
  }
});

/* -------------------------
   Update item
-------------------------- */
adminSuggestionsRouter.patch("/items/:id", async (req, res, next) => {
  try {
    const body = parseBody(itemPatchSchema, req.body);

    await prisma.suggestionItem.update({
      where: { id: req.params.id },
      data: {
        ...(body.section ? { section: body.section } : {}),
        ...(body.title ? { titleCa: body.title.ca, titleEs: body.title.es } : {}),
        ...(typeof body.price === "number" ? { price: new Prisma.Decimal(body.price) } : {}),
        ...(typeof body.order === "number" ? { order: body.order } : {}),
      },
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* -------------------------
   Delete item
-------------------------- */
adminSuggestionsRouter.delete("/items/:id", async (req, res, next) => {
  try {
    await prisma.suggestionItem.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* -------------------------
   Reorder / Move items within/between sections
   POST /reorder/:sheetId/:section  { ids: [...] }
   -> setea order = idx y section = :section
-------------------------- */
adminSuggestionsRouter.post("/reorder/:sheetId/:section", async (req, res, next) => {
  try {
    const { ids } = parseBody(reorderSchema, req.body);
    const section = sectionEnum.parse(req.params.section);

    await prisma.$transaction(
      ids.map((id, idx) =>
        prisma.suggestionItem.update({
          where: { id },
          data: { sheetId: req.params.sheetId, section, order: idx },
        })
      )
    );

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* -------------------------
   Error handler
-------------------------- */
adminSuggestionsRouter.use((err: any, _req: any, res: any, _next: any) => {
  const status = err?.status ?? 500;
  res.status(status).json({ error: err?.message ?? "Server error" });
});
