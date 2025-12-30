import { Router } from "express";
import { prisma } from "../prisma";

export const menuRouter = Router();

menuRouter.get("/", async (_req, res) => {
  const [departments, supplementGroups, allergens] = await Promise.all([
    prisma.department.findMany({
      orderBy: { order: "asc" },
      include: {
        items: {
          orderBy: { order: "asc" },
          include: { allergens: true },
        },
      },
    }),
    prisma.supplementGroup.findMany({
      orderBy: { order: "asc" },
      include: {
        items: {
          orderBy: { order: "asc" },
          include: { allergens: true },
        },
      },
    }),
    prisma.allergen.findMany({ orderBy: { code: "asc" } }),
  ]);

  res.json({
    departments: departments.map((d) => ({
      id: d.id,
      title: { ca: d.titleCa, es: d.titleEs },
      order: d.order,
      items: d.items.map((it) => ({
        id: it.id,
        departmentId: it.departmentId,
        title: { ca: it.titleCa, es: it.titleEs },
        price: Number(it.price),
        order: it.order,
        allergens: it.allergens.map((a) => a.allergenId),
      })),
    })),
    supplementGroups: supplementGroups.map((g) => ({
      id: g.id,
      title: { ca: g.titleCa, es: g.titleEs },
      order: g.order,
      items: g.items.map((it) => ({
        id: it.id,
        groupId: it.groupId,
        title: { ca: it.titleCa, es: it.titleEs },
        price: Number(it.price),
        order: it.order,
        allergens: it.allergens.map((a) => a.allergenId),
      })),
    })),
    allergens: allergens.map((a) => ({
      id: a.id,
      code: a.code,
      label: { ca: a.labelCa, es: a.labelEs },
    })),
  });
});
