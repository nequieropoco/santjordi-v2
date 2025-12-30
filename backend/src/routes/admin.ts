import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { adminSuggestionsRouter } from "./adminSuggestions";


export const adminRouter = Router();
adminRouter.use("/suggestions", adminSuggestionsRouter);

/* -------------------------
   Helpers
-------------------------- */
const langText = z.object({
  ca: z.string().default(""),
  es: z.string().default(""),
});

const reorderSchema = z.object({
  ids: z.array(z.string()).min(1),
});

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

/* -------------------------
   Schemas
-------------------------- */
const deptCreate = z.object({
  title: langText,
  order: z.number().int().nonnegative().default(0),
});

const deptPatch = deptCreate.partial();

const itemCreate = z.object({
  departmentId: z.string().min(1),
  title: langText,
  price: z.number().nonnegative(),
  allergens: z.array(z.string()).default([]),
  order: z.number().int().nonnegative().default(0),
});

const itemPatch = itemCreate.partial();

const suppGroupCreate = z.object({
  title: langText,
  order: z.number().int().nonnegative().default(0),
});

const suppGroupPatch = suppGroupCreate.partial();

const suppItemCreate = z.object({
  groupId: z.string().min(1),
  title: langText,
  price: z.number().nonnegative(),
  allergens: z.array(z.string()).default([]),
  order: z.number().int().nonnegative().default(0),
});

const suppItemPatch = suppItemCreate.partial();

const allergenCreate = z.object({
  code: z.string().min(1).max(3),
  label: langText,
});

/* =========================================================
   Departments
========================================================= */
adminRouter.get("/departments", async (_req, res) => {
  const data = await prisma.department.findMany({ orderBy: { order: "asc" } });
  res.json(data.map((d) => ({ id: d.id, title: { ca: d.titleCa, es: d.titleEs }, order: d.order })));
});

adminRouter.post("/departments", async (req, res, next) => {
  try {
    const body = parseBody(deptCreate, req.body);
    const created = await prisma.department.create({
      data: { titleCa: body.title.ca, titleEs: body.title.es, order: body.order },
    });
    res.status(201).json({ id: created.id });
  } catch (e) {
    next(e);
  }
});

adminRouter.patch("/departments/:id", async (req, res, next) => {
  try {
    const body = parseBody(deptPatch, req.body);
    await prisma.department.update({
      where: { id: req.params.id },
      data: {
        ...(body.title ? { titleCa: body.title.ca, titleEs: body.title.es } : {}),
        ...(typeof body.order === "number" ? { order: body.order } : {}),
      },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

adminRouter.delete("/departments/:id", async (req, res, next) => {
  try {
    await prisma.department.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Reorder departments by ids array
adminRouter.post("/reorder/departments", async (req, res, next) => {
  try {
    const { ids } = parseBody(reorderSchema, req.body);
    await prisma.$transaction(
      ids.map((id, idx) => prisma.department.update({ where: { id }, data: { order: idx } }))
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* =========================================================
   Items (department menu items)
========================================================= */
adminRouter.post("/items", async (req, res, next) => {
  try {
    const body = parseBody(itemCreate, req.body);

    const created = await prisma.item.create({
      data: {
        departmentId: body.departmentId,
        titleCa: body.title.ca,
        titleEs: body.title.es,
        price: body.price,
        order: body.order,
        allergens: {
          create: body.allergens.map((allergenId) => ({ allergenId })),
        },
      },
    });

    res.status(201).json({ id: created.id });
  } catch (e) {
    next(e);
  }
});

adminRouter.patch("/items/:id", async (req, res, next) => {
  try {
    const body = parseBody(itemPatch, req.body);

    await prisma.$transaction(async (tx) => {
      if (body.allergens) {
        await tx.itemAllergen.deleteMany({ where: { itemId: req.params.id } });
        if (body.allergens.length) {
          await tx.itemAllergen.createMany({
            data: body.allergens.map((allergenId) => ({ itemId: req.params.id, allergenId })),
            skipDuplicates: true,
          });
        }
      }

      await tx.item.update({
        where: { id: req.params.id },
        data: {
          ...(body.departmentId ? { departmentId: body.departmentId } : {}),
          ...(body.title ? { titleCa: body.title.ca, titleEs: body.title.es } : {}),
          ...(typeof body.price === "number" ? { price: body.price } : {}),
          ...(typeof body.order === "number" ? { order: body.order } : {}),
        },
      });
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

adminRouter.delete("/items/:id", async (req, res, next) => {
  try {
    await prisma.item.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Reorder items inside a department (and can move items into this department)
adminRouter.post("/reorder/items/:departmentId", async (req, res, next) => {
  try {
    const { ids } = parseBody(reorderSchema, req.body);
    const departmentId = req.params.departmentId;

    await prisma.$transaction(
      ids.map((id, idx) =>
        prisma.item.update({
          where: { id },
          data: { departmentId, order: idx },
        })
      )
    );

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* =========================================================
   Supplement Groups
========================================================= */
adminRouter.post("/supplement-groups", async (req, res, next) => {
  try {
    const body = parseBody(suppGroupCreate, req.body);
    const created = await prisma.supplementGroup.create({
      data: { titleCa: body.title.ca, titleEs: body.title.es, order: body.order },
    });
    res.status(201).json({ id: created.id });
  } catch (e) {
    next(e);
  }
});

adminRouter.patch("/supplement-groups/:id", async (req, res, next) => {
  try {
    const body = parseBody(suppGroupPatch, req.body);
    await prisma.supplementGroup.update({
      where: { id: req.params.id },
      data: {
        ...(body.title ? { titleCa: body.title.ca, titleEs: body.title.es } : {}),
        ...(typeof body.order === "number" ? { order: body.order } : {}),
      },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

adminRouter.delete("/supplement-groups/:id", async (req, res, next) => {
  try {
    await prisma.supplementGroup.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* =========================================================
   Supplement Items
========================================================= */
adminRouter.post("/supplement-items", async (req, res, next) => {
  try {
    const body = parseBody(suppItemCreate, req.body);

    const created = await prisma.supplementItem.create({
      data: {
        groupId: body.groupId,
        titleCa: body.title.ca,
        titleEs: body.title.es,
        price: body.price,
        order: body.order,
        allergens: {
          create: body.allergens.map((allergenId) => ({ allergenId })),
        },
      },
    });

    res.status(201).json({ id: created.id });
  } catch (e) {
    next(e);
  }
});

adminRouter.patch("/supplement-items/:id", async (req, res, next) => {
  try {
    const body = parseBody(suppItemPatch, req.body);

    await prisma.$transaction(async (tx) => {
      if (body.allergens) {
        await tx.supplementItemAllergen.deleteMany({ where: { supplementItemId: req.params.id } });
        if (body.allergens.length) {
          await tx.supplementItemAllergen.createMany({
            data: body.allergens.map((allergenId) => ({ supplementItemId: req.params.id, allergenId })),
            skipDuplicates: true,
          });
        }
      }

      await tx.supplementItem.update({
        where: { id: req.params.id },
        data: {
          ...(body.groupId ? { groupId: body.groupId } : {}),
          ...(body.title ? { titleCa: body.title.ca, titleEs: body.title.es } : {}),
          ...(typeof body.price === "number" ? { price: body.price } : {}),
          ...(typeof body.order === "number" ? { order: body.order } : {}),
        },
      });
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

adminRouter.delete("/supplement-items/:id", async (req, res, next) => {
  try {
    await prisma.supplementItem.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Reorder supplement items inside a group (and can move items into this group)
adminRouter.post("/reorder/supplement-items/:groupId", async (req, res, next) => {
  try {
    const { ids } = parseBody(reorderSchema, req.body);
    const groupId = req.params.groupId;

    await prisma.$transaction(
      ids.map((id, idx) =>
        prisma.supplementItem.update({
          where: { id },
          data: { groupId, order: idx },
        })
      )
    );

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* =========================================================
   Allergens
========================================================= */
adminRouter.get("/allergens", async (_req, res) => {
  const data = await prisma.allergen.findMany({ orderBy: { code: "asc" } });
  res.json(data.map((a) => ({ id: a.id, code: a.code, label: { ca: a.labelCa, es: a.labelEs } })));
});

adminRouter.post("/allergens", async (req, res, next) => {
  try {
    const body = parseBody(allergenCreate, req.body);
    const created = await prisma.allergen.create({
      data: {
        code: body.code.trim().toUpperCase(),
        labelCa: body.label.ca,
        labelEs: body.label.es,
      },
    });
    res.status(201).json({ id: created.id });
  } catch (e) {
    next(e);
  }
});

adminRouter.delete("/allergens/:id", async (req, res, next) => {
  try {
    await prisma.allergen.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* =========================================================
   Error handler (must be last)
========================================================= */
adminRouter.use((err: any, _req: any, res: any, _next: any) => {
  const status = err?.status ?? 500;
  res.status(status).json({ error: err?.message ?? "Server error" });
});
