import { useEffect, useMemo, useState } from "react";
import "./Admin.css";
import * as api from "../../api/sjApi";
import { Link } from "react-router-dom";
type Lang = "ca" | "es";
type LangText = api.LangText;

type Department = { id: string; title: LangText; order: number };

type MenuItem = {
  id: string;
  departmentId: string;
  title: LangText;
  price: number;
  allergens: string[];
  order: number;
};

type SupplementGroup = { id: string; title: LangText; order: number };

type SupplementItem = {
  id: string;
  groupId: string;
  title: LangText;
  price: number;
  allergens: string[];
  order: number;
};

type Allergen = { id: string; code: string; label: LangText };

type DisplayMode = "bilingual" | "ca" | "es";

type PersistedState = {
  displayMode: DisplayMode;
  departments: Department[];
  items: MenuItem[];
  supplementGroups: SupplementGroup[];
  supplementItems: SupplementItem[];
  allergens: Allergen[];
};

type Dialog =
  | null
  | { type: "dept"; id?: string }
  | { type: "item"; deptId: string; id?: string }
  | { type: "suppGroup"; id?: string }
  | { type: "suppItem"; groupId: string; id?: string }
  | { type: "allergens" };

type DragState =
  | null
  | { kind: "dept"; deptId: string }
  | { kind: "item"; itemId: string; fromDeptId: string }
  | { kind: "suppItem"; itemId: string; fromGroupId: string };

const DISPLAY_KEY = "sj_admin_displayMode";

function fmtEUR(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `${v.toFixed(2).replace(".", ",")}€`;
}

function otherLang(lang: Lang): Lang {
  return lang === "ca" ? "es" : "ca";
}

function primaryLangFrom(mode: DisplayMode): Lang {
  return mode === "bilingual" ? "ca" : mode;
}

function pickText(t: LangText, lang: Lang) {
  return (t?.[lang] ?? "").trim();
}

function headingFor(t: LangText, mode: DisplayMode) {
  const ca = pickText(t, "ca");
  const es = pickText(t, "es");
  if (mode === "bilingual") {
    if (ca && es) return `${ca} / ${es}`;
    return ca || es || "—";
  }
  const one = pickText(t, mode);
  return one || (mode === "ca" ? es : ca) || "—";
}

function reorder<T>(arr: T[], from: number, to: number) {
  const copy = [...arr];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}

export default function Admin() {
  const [state, setState] = useState<PersistedState>({
    displayMode: "bilingual",
    departments: [],
    items: [],
    supplementGroups: [],
    supplementItems: [],
    allergens: [],
  });

  const [dialog, setDialog] = useState<Dialog>(null);

  // DnD UI
  const [drag, setDrag] = useState<DragState>(null);
  const [dropDeptId, setDropDeptId] = useState<string | null>(null);
  const [dropItemId, setDropItemId] = useState<string | null>(null);
  const [dropSuppItemId, setDropSuppItemId] = useState<string | null>(null);
  const [dropGroupId, setDropGroupId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  async function loadMenu() {
    setLoading(true);
    try {
      const data = await api.getMenu();
      setState((p) => ({
        ...p,
        departments: data.departments.map((d) => ({ id: d.id, title: d.title, order: d.order })),
        items: data.departments.flatMap((d) => d.items),
        supplementGroups: data.supplementGroups.map((g) => ({ id: g.id, title: g.title, order: g.order })),
        supplementItems: data.supplementGroups.flatMap((g) => g.items),
        allergens: data.allergens,
      }));
    } catch (e: any) {
      alert(e?.message ?? "Error carregant la carta");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem(DISPLAY_KEY);
    if (saved === "bilingual" || saved === "ca" || saved === "es") {
      setState((p) => ({ ...p, displayMode: saved }));
    }
    void loadMenu();
  }, []);

  useEffect(() => {
    localStorage.setItem(DISPLAY_KEY, state.displayMode);
  }, [state.displayMode]);

  const departments = useMemo(() => [...state.departments].sort((a, b) => a.order - b.order), [state.departments]);
  const supplementGroups = useMemo(
    () => [...state.supplementGroups].sort((a, b) => a.order - b.order),
    [state.supplementGroups]
  );

  const itemsByDept = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const it of state.items) {
      const arr = map.get(it.departmentId) ?? [];
      arr.push(it);
      map.set(it.departmentId, arr);
    }
    for (const [k, arr] of map.entries()) {
      map.set(k, [...arr].sort((a, b) => a.order - b.order));
    }
    return map;
  }, [state.items]);

  const suppItemsByGroup = useMemo(() => {
    const map = new Map<string, SupplementItem[]>();
    for (const it of state.supplementItems) {
      const arr = map.get(it.groupId) ?? [];
      arr.push(it);
      map.set(it.groupId, arr);
    }
    for (const [k, arr] of map.entries()) {
      map.set(k, [...arr].sort((a, b) => a.order - b.order));
    }
    return map;
  }, [state.supplementItems]);

  const editingDept = dialog?.type === "dept" && dialog.id ? state.departments.find((d) => d.id === dialog.id) : undefined;
  const editingItem = dialog?.type === "item" && dialog.id ? state.items.find((it) => it.id === dialog.id) : undefined;

  const editingSuppGroup =
    dialog?.type === "suppGroup" && dialog.id ? state.supplementGroups.find((g) => g.id === dialog.id) : undefined;

  const editingSuppItem =
    dialog?.type === "suppItem" && dialog.id ? state.supplementItems.find((it) => it.id === dialog.id) : undefined;

  const primaryLang = primaryLangFrom(state.displayMode);
  const secondaryLang = otherLang(primaryLang);

  // =========================
  // DnD persistence helpers
  // =========================
  async function persistDeptOrder(next: Department[]) {
    try {
      await api.reorderDepartments(next.map((d) => d.id));
    } catch (e: any) {
      alert(e?.message ?? "Error guardant ordre de departaments");
      await loadMenu();
    }
  }

  async function persistItemsOrder(deptId: string, ids: string[]) {
    try {
      await api.reorderItems(deptId, ids);
    } catch (e: any) {
      alert(e?.message ?? "Error guardant ordre de plats");
      await loadMenu();
    }
  }

  async function persistSuppItemsOrder(groupId: string, ids: string[]) {
    try {
      await api.reorderSupplementItems(groupId, ids);
    } catch (e: any) {
      alert(e?.message ?? "Error guardant ordre de suplements");
      await loadMenu();
    }
  }

  // =========================
  // DnD: Departments reorder
  // =========================
  function dropDepartmentOn(targetDeptId: string) {
    if (!drag || drag.kind !== "dept") return;
    if (drag.deptId === targetDeptId) return;

    const sorted = [...departments];
    const from = sorted.findIndex((d) => d.id === drag.deptId);
    const to = sorted.findIndex((d) => d.id === targetDeptId);
    if (from < 0 || to < 0) return;

    const next = reorder(sorted, from, to).map((d, idx) => ({ ...d, order: idx }));
    setState((p) => ({ ...p, departments: next }));
    void persistDeptOrder(next);
  }

  // =========================
  // DnD: Items reorder/move
  // =========================
  function dropItemOn(targetDeptId: string, targetItemId?: string) {
    if (!drag || drag.kind !== "item") return;

    const dragged = state.items.find((x) => x.id === drag.itemId);
    if (!dragged) return;

    const sourceDeptId = dragged.departmentId;
    const sameDept = sourceDeptId === targetDeptId;

    const sourceList = [...(itemsByDept.get(sourceDeptId) ?? [])].filter((x) => x.id !== dragged.id);
    const targetList = sameDept ? sourceList : [...(itemsByDept.get(targetDeptId) ?? [])];

    const insertAt = targetItemId ? Math.max(0, targetList.findIndex((x) => x.id === targetItemId)) : targetList.length;

    const moved: MenuItem = { ...dragged, departmentId: targetDeptId };
    const targetList2 = [...targetList];
    targetList2.splice(insertAt, 0, moved);

    const sourceIds = sourceList.map((x) => x.id);
    const targetIds = targetList2.map((x) => x.id);

    // Update local state orders
    const sourceOrder = new Map(sourceIds.map((id, i) => [id, i]));
    const targetOrder = new Map(targetIds.map((id, i) => [id, i]));

    setState((p) => ({
      ...p,
      items: p.items.map((it) => {
        if (it.id === moved.id) {
          return { ...it, departmentId: targetDeptId, order: targetOrder.get(it.id) ?? it.order };
        }
        if (sameDept && it.departmentId === targetDeptId) {
          return { ...it, order: targetOrder.get(it.id) ?? it.order };
        }
        if (!sameDept && it.departmentId === sourceDeptId) {
          return { ...it, order: sourceOrder.get(it.id) ?? it.order };
        }
        if (!sameDept && it.departmentId === targetDeptId) {
          return { ...it, order: targetOrder.get(it.id) ?? it.order };
        }
        return it;
      }),
    }));

    // Persist
    void (async () => {
      if (!sameDept) await persistItemsOrder(sourceDeptId, sourceIds);
      await persistItemsOrder(targetDeptId, targetIds);
    })();
  }

  // =========================
  // DnD: Supplement items reorder/move
  // =========================
  function dropSuppItemOn(targetGroupId: string, targetItemId?: string) {
    if (!drag || drag.kind !== "suppItem") return;

    const dragged = state.supplementItems.find((x) => x.id === drag.itemId);
    if (!dragged) return;

    const sourceGroupId = dragged.groupId;
    const sameGroup = sourceGroupId === targetGroupId;

    const sourceList = [...(suppItemsByGroup.get(sourceGroupId) ?? [])].filter((x) => x.id !== dragged.id);
    const targetList = sameGroup ? sourceList : [...(suppItemsByGroup.get(targetGroupId) ?? [])];

    const insertAt = targetItemId ? Math.max(0, targetList.findIndex((x) => x.id === targetItemId)) : targetList.length;

    const moved: SupplementItem = { ...dragged, groupId: targetGroupId };
    const targetList2 = [...targetList];
    targetList2.splice(insertAt, 0, moved);

    const sourceIds = sourceList.map((x) => x.id);
    const targetIds = targetList2.map((x) => x.id);

    const sourceOrder = new Map(sourceIds.map((id, i) => [id, i]));
    const targetOrder = new Map(targetIds.map((id, i) => [id, i]));

    setState((p) => ({
      ...p,
      supplementItems: p.supplementItems.map((it) => {
        if (it.id === moved.id) {
          return { ...it, groupId: targetGroupId, order: targetOrder.get(it.id) ?? it.order };
        }
        if (sameGroup && it.groupId === targetGroupId) {
          return { ...it, order: targetOrder.get(it.id) ?? it.order };
        }
        if (!sameGroup && it.groupId === sourceGroupId) {
          return { ...it, order: sourceOrder.get(it.id) ?? it.order };
        }
        if (!sameGroup && it.groupId === targetGroupId) {
          return { ...it, order: targetOrder.get(it.id) ?? it.order };
        }
        return it;
      }),
    }));

    void (async () => {
      if (!sameGroup) await persistSuppItemsOrder(sourceGroupId, sourceIds);
      await persistSuppItemsOrder(targetGroupId, targetIds);
    })();
  }

  function clearDnD() {
    setDrag(null);
    setDropDeptId(null);
    setDropItemId(null);
    setDropSuppItemId(null);
    setDropGroupId(null);
  }

  return (
    <div className="sj-admin">
      <div className="sj-admin__paper">
        <header className="sj-admin__top">
          <Link to="/" className="sj-admin__brandLink" aria-label="Tornar a l'inici">
            <div className="sj-admin__brand">
              <div className="sj-admin__brandName">BAR SANT JORDI</div>
              <div className="sj-admin__brandSub">Admin Carta</div>
            </div>
          </Link>

          <div className="sj-admin__actions">
            <div className="seg">
              <button
                className={`seg__btn ${state.displayMode === "bilingual" ? "is-on" : ""}`}
                onClick={() => setState((p) => ({ ...p, displayMode: "bilingual" }))}
                type="button"
              >
                CA/ES
              </button>
              <button
                className={`seg__btn ${state.displayMode === "ca" ? "is-on" : ""}`}
                onClick={() => setState((p) => ({ ...p, displayMode: "ca" }))}
                type="button"
              >
                CA
              </button>
              <button
                className={`seg__btn ${state.displayMode === "es" ? "is-on" : ""}`}
                onClick={() => setState((p) => ({ ...p, displayMode: "es" }))}
                type="button"
              >
                ES
              </button>
            </div>

            <button className="btn btn--primary" onClick={() => setDialog({ type: "dept" })} type="button">
              Crear nou departament
            </button>
            <button className="btn" onClick={() => setDialog({ type: "suppGroup" })} type="button">
              Crear suplements
            </button>
            <button className="btn" onClick={() => setDialog({ type: "allergens" })} type="button">
              {headingFor({ ca: "Al·lèrgens", es: "Alérgenos" }, state.displayMode)}
            </button>
          </div>
        </header>

        <div className="sj-admin__rule" />

        {loading ? (
          <div style={{ padding: 16, opacity: 0.7 }}>Carregant…</div>
        ) : (
          <div className="sj-admin__grid sj-admin__grid--stack">
            <div className="sj-admin__col">
              {departments.map((d) => (
                <MenuSection
                  key={d.id}
                  deptId={d.id}
                  title={d.title}
                  displayMode={state.displayMode}
                  primaryLang={primaryLang}
                  secondaryLang={secondaryLang}
                  items={(itemsByDept.get(d.id) ?? []).filter(Boolean)}
                  allergens={state.allergens}
                  isDrop={dropDeptId === d.id && drag?.kind === "dept"}
                  onAdd={() => setDialog({ type: "item", deptId: d.id })}
                  onEdit={() => setDialog({ type: "dept", id: d.id })}
                  onEditItem={(id) => setDialog({ type: "item", deptId: d.id, id })}
                  // dept dnd
                  onDeptDragStart={() => setDrag({ kind: "dept", deptId: d.id })}
                  onDeptDragEnd={clearDnD}
                  onDeptDragOver={() => {
                    if (drag?.kind === "dept") setDropDeptId(d.id);
                  }}
                  onDeptDrop={() => {
                    dropDepartmentOn(d.id);
                    clearDnD();
                  }}
                  // item dnd
                  drag={drag}
                  dropItemId={dropItemId}
                  setDropItemId={setDropItemId}
                  onItemDrop={(targetItemId) => {
                    dropItemOn(d.id, targetItemId);
                    clearDnD();
                  }}
                  onItemDropEnd={() => {
                    dropItemOn(d.id, undefined);
                    clearDnD();
                  }}
                  onItemDragStart={(itemId) => setDrag({ kind: "item", itemId, fromDeptId: d.id })}
                />
              ))}

              {supplementGroups.length > 0 && (
                <div className="sj-admin__suppWrap">
                  {supplementGroups.map((g) => (
                    <SupplementBox
                      key={g.id}
                      groupId={g.id}
                      title={g.title}
                      displayMode={state.displayMode}
                      primaryLang={primaryLang}
                      secondaryLang={secondaryLang}
                      items={(suppItemsByGroup.get(g.id) ?? []).filter(Boolean)}
                      allergens={state.allergens}
                      isDrop={dropGroupId === g.id && drag?.kind === "suppItem"}
                      onAdd={() => setDialog({ type: "suppItem", groupId: g.id })}
                      onEdit={() => setDialog({ type: "suppGroup", id: g.id })}
                      onEditItem={(id) => setDialog({ type: "suppItem", groupId: g.id, id })}
                      drag={drag}
                      dropSuppItemId={dropSuppItemId}
                      setDropSuppItemId={setDropSuppItemId}
                      onSuppItemDragStart={(itemId) => setDrag({ kind: "suppItem", itemId, fromGroupId: g.id })}
                      onSuppDragOver={() => {
                        if (drag?.kind === "suppItem") setDropGroupId(g.id);
                      }}
                      onSuppDropEnd={() => {
                        dropSuppItemOn(g.id, undefined);
                        clearDnD();
                      }}
                      onSuppItemDrop={(targetId) => {
                        dropSuppItemOn(g.id, targetId);
                        clearDnD();
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <footer className="sj-admin__footer">
          <div className="sj-admin__footerTitle">{headingFor({ ca: "Al·lèrgens", es: "Alérgenos" }, state.displayMode)}</div>
          <div className="sj-admin__allergenLegend">
            {state.allergens.map((a) => {
              const ca = pickText(a.label, "ca");
              const es = pickText(a.label, "es");
              const txt =
                state.displayMode === "bilingual"
                  ? ca && es
                    ? `${ca} / ${es}`
                    : ca || es || "—"
                  : pickText(a.label, state.displayMode) || (state.displayMode === "ca" ? es : ca) || "—";

              return (
                <div key={a.id} className="legendItem">
                  <span className="aDot">{a.code}</span>
                  <span className="legendText">{txt}</span>
                </div>
              );
            })}
          </div>
        </footer>
      </div>

      {dialog && <div className="dlg__backdrop" onMouseDown={() => setDialog(null)} />}

      {/* Dept */}
      {dialog?.type === "dept" && (
        <Dialog title={editingDept ? "Editar departament" : "Nou departament"} onClose={() => setDialog(null)}>
          <DeptForm
            initial={editingDept}
            onCancel={() => setDialog(null)}
            onDelete={
              editingDept
                ? () => {
                    void (async () => {
                      if (!confirm("Borrar departament i els seus plats?")) return;
                      try {
                        await api.deleteDepartment(editingDept.id);
                        await loadMenu();
                        setDialog(null);
                      } catch (e: any) {
                        alert(e?.message ?? "Error");
                      }
                    })();
                  }
                : undefined
            }
            onSave={(payload) => {
              void (async () => {
                try {
                  if (editingDept) await api.updateDepartment(editingDept.id, payload);
                  else await api.createDepartment(payload);
                  await loadMenu();
                  setDialog(null);
                } catch (e: any) {
                  alert(e?.message ?? "Error");
                }
              })();
            }}
          />
        </Dialog>
      )}

      {/* Item */}
      {dialog?.type === "item" && (
        <Dialog title={editingItem ? "Editar plat" : "Afegir plat"} onClose={() => setDialog(null)}>
          <ItemForm
            allergens={state.allergens}
            initial={editingItem}
            onCancel={() => setDialog(null)}
            onDelete={
              editingItem
                ? () => {
                    void (async () => {
                      if (!confirm("Borrar aquest plat?")) return;
                      try {
                        await api.deleteItem(editingItem.id);
                        await loadMenu();
                        setDialog(null);
                      } catch (e: any) {
                        alert(e?.message ?? "Error");
                      }
                    })();
                  }
                : undefined
            }
            onSave={(payload) => {
              void (async () => {
                try {
                  if (editingItem) {
                    await api.updateItem(editingItem.id, payload);
                  } else {
                    const list = itemsByDept.get(dialog.deptId) ?? [];
                    const nextOrder = list.length ? Math.max(...list.map((x) => x.order)) + 1 : 0;
                    await api.createItem({ departmentId: dialog.deptId, ...payload, order: nextOrder });
                  }
                  await loadMenu();
                  setDialog(null);
                } catch (e: any) {
                  alert(e?.message ?? "Error");
                }
              })();
            }}
          />
        </Dialog>
      )}

      {/* Supp group */}
      {dialog?.type === "suppGroup" && (
        <Dialog title={editingSuppGroup ? "Editar suplements" : "Nou grup de suplements"} onClose={() => setDialog(null)}>
          <SuppGroupForm
            initial={editingSuppGroup}
            onCancel={() => setDialog(null)}
            onDelete={
              editingSuppGroup
                ? () => {
                    void (async () => {
                      if (!confirm("Borrar grup i els seus suplements?")) return;
                      try {
                        await api.deleteSupplementGroup(editingSuppGroup.id);
                        await loadMenu();
                        setDialog(null);
                      } catch (e: any) {
                        alert(e?.message ?? "Error");
                      }
                    })();
                  }
                : undefined
            }
            onSave={(payload) => {
              void (async () => {
                try {
                  if (editingSuppGroup) await api.updateSupplementGroup(editingSuppGroup.id, payload);
                  else await api.createSupplementGroup(payload);
                  await loadMenu();
                  setDialog(null);
                } catch (e: any) {
                  alert(e?.message ?? "Error");
                }
              })();
            }}
          />
        </Dialog>
      )}

      {/* Supp item */}
      {dialog?.type === "suppItem" && (
        <Dialog title={editingSuppItem ? "Editar suplement" : "Afegir suplement"} onClose={() => setDialog(null)}>
          <SuppItemForm
            allergens={state.allergens}
            initial={editingSuppItem}
            onCancel={() => setDialog(null)}
            onDelete={
              editingSuppItem
                ? () => {
                    void (async () => {
                      if (!confirm("Borrar aquest suplement?")) return;
                      try {
                        await api.deleteSupplementItem(editingSuppItem.id);
                        await loadMenu();
                        setDialog(null);
                      } catch (e: any) {
                        alert(e?.message ?? "Error");
                      }
                    })();
                  }
                : undefined
            }
            onSave={(payload) => {
              void (async () => {
                try {
                  if (editingSuppItem) {
                    await api.updateSupplementItem(editingSuppItem.id, payload);
                  } else {
                    const list = suppItemsByGroup.get(dialog.groupId) ?? [];
                    const nextOrder = list.length ? Math.max(...list.map((x) => x.order)) + 1 : 0;
                    await api.createSupplementItem({ groupId: dialog.groupId, ...payload, order: nextOrder });
                  }
                  await loadMenu();
                  setDialog(null);
                } catch (e: any) {
                  alert(e?.message ?? "Error");
                }
              })();
            }}
          />
        </Dialog>
      )}

      {/* Allergens */}
      {dialog?.type === "allergens" && (
        <Dialog title={headingFor({ ca: "Al·lèrgens", es: "Alérgenos" }, state.displayMode)} onClose={() => setDialog(null)}>
          <AllergensEditor
            allergens={state.allergens}
            onCreate={(payload) => {
              void (async () => {
                try {
                  await api.createAllergen(payload);
                  await loadMenu();
                } catch (e: any) {
                  alert(e?.message ?? "Error");
                }
              })();
            }}
            onDelete={(id) => {
              void (async () => {
                if (!confirm("Borrar aquest al·lergen? També s'eliminarà dels plats/suplements que el tinguin.")) return;
                try {
                  await api.deleteAllergen(id);
                  await loadMenu();
                } catch (e: any) {
                  alert(e?.message ?? "Error");
                }
              })();
            }}
          />
          <div className="dlg__actions">
            <button className="btn btn--ghost" type="button" onClick={() => setDialog(null)}>
              Tancar
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

/* =========================
   UI Components (igual que antes)
========================= */

function MenuSection(props: {
  deptId: string;
  title: LangText;
  displayMode: DisplayMode;
  primaryLang: Lang;
  secondaryLang: Lang;
  items: MenuItem[];
  allergens: Allergen[];
  isDrop: boolean;

  onAdd: () => void;
  onEdit: () => void;
  onEditItem: (id: string) => void;

  onDeptDragStart: () => void;
  onDeptDragEnd: () => void;
  onDeptDragOver: () => void;
  onDeptDrop: () => void;

  drag: DragState;
  dropItemId: string | null;
  setDropItemId: (v: string | null) => void;
  onItemDragStart: (itemId: string) => void;
  onItemDrop: (targetItemId: string) => void;
  onItemDropEnd: () => void;
}) {
  const heading = headingFor(props.title, props.displayMode);

  return (
    <section
      className={`menuSection ${props.isDrop ? "is-drop" : ""}`}
      onDragOver={(e) => {
        if (props.drag?.kind === "dept") {
          e.preventDefault();
          props.onDeptDragOver();
        }
        if (props.drag?.kind === "item") {
          e.preventDefault();
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (props.drag?.kind === "dept") props.onDeptDrop();
        if (props.drag?.kind === "item") props.onItemDropEnd();
      }}
    >
      <div className="menuSection__head">
        <div className="menuSection__headLeft">
          <span
            className="dragHandle"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              props.onDeptDragStart();
            }}
            onDragEnd={props.onDeptDragEnd}
            title="Arrossega per reordenar departaments"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            ⠿
          </span>

          <div className="menuSection__title">{heading}</div>
        </div>

        <div className="menuSection__headBtns">
          <button className="iconBtn" type="button" onClick={props.onAdd} title="Afegir plat">
            +
          </button>
          <button className="iconBtn" type="button" onClick={props.onEdit} title="Editar departament">
            ✎
          </button>
        </div>
      </div>

      <div className="menuSection__rule" />

      {props.items.length === 0 ? (
        <div className="menuEmpty">Sense plats encara. Clica “+” o arrossega un plat aquí.</div>
      ) : (
        <div className="menuList">
          {props.items.map((it) => (
            <div
              key={it.id}
              className={`menuRowWrap ${props.dropItemId === it.id ? "is-drop" : ""}`}
              onDragOver={(e) => {
                if (props.drag?.kind !== "item") return;
                e.preventDefault();
                props.setDropItemId(it.id);
              }}
              onDragLeave={() => {
                if (props.dropItemId === it.id) props.setDropItemId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                props.onItemDrop(it.id);
              }}
            >
              <span
                className="dragHandle dragHandle--row"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  props.onItemDragStart(it.id);
                }}
                onDragEnd={() => props.setDropItemId(null)}
                title="Arrossega per reordenar plats"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                ⠿
              </span>

              <MenuRow
                displayMode={props.displayMode}
                primaryLang={props.primaryLang}
                secondaryLang={props.secondaryLang}
                title={it.title}
                price={it.price}
                allergenIds={it.allergens}
                allergens={props.allergens}
                onClick={() => props.onEditItem(it.id)}
              />
            </div>
          ))}

          <div
            className="dropZone"
            onDragOver={(e) => {
              if (props.drag?.kind !== "item") return;
              e.preventDefault();
              props.setDropItemId(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              props.onItemDropEnd();
            }}
          />
        </div>
      )}
    </section>
  );
}

function SupplementBox(props: {
  groupId: string;
  title: LangText;
  displayMode: DisplayMode;
  primaryLang: Lang;
  secondaryLang: Lang;
  items: SupplementItem[];
  allergens: Allergen[];
  isDrop: boolean;

  onAdd: () => void;
  onEdit: () => void;
  onEditItem: (id: string) => void;

  drag: DragState;
  dropSuppItemId: string | null;
  setDropSuppItemId: (v: string | null) => void;
  onSuppItemDragStart: (itemId: string) => void;
  onSuppDragOver: () => void;
  onSuppDropEnd: () => void;
  onSuppItemDrop: (targetId: string) => void;
}) {
  const heading = headingFor(props.title, props.displayMode);

  return (
    <section
      className={`suppBox ${props.isDrop ? "is-drop" : ""}`}
      onDragOver={(e) => {
        if (props.drag?.kind !== "suppItem") return;
        e.preventDefault();
        props.onSuppDragOver();
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (props.drag?.kind === "suppItem") props.onSuppDropEnd();
      }}
    >
      <div className="suppBox__head">
        <div className="suppBox__title">{heading}</div>
        <div className="suppBox__btns">
          <button className="iconBtn" type="button" onClick={props.onAdd} title="Afegir suplement">
            +
          </button>
          <button className="iconBtn" type="button" onClick={props.onEdit} title="Editar grup">
            ✎
          </button>
        </div>
      </div>

      <div className="suppBox__list">
        {props.items.length === 0 ? (
          <div className="menuEmpty">Sense suplements. Arrossega un suplement aquí.</div>
        ) : (
          props.items.map((it) => (
            <div
              key={it.id}
              className={`menuRowWrap ${props.dropSuppItemId === it.id ? "is-drop" : ""}`}
              onDragOver={(e) => {
                if (props.drag?.kind !== "suppItem") return;
                e.preventDefault();
                props.setDropSuppItemId(it.id);
              }}
              onDragLeave={() => {
                if (props.dropSuppItemId === it.id) props.setDropSuppItemId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                props.onSuppItemDrop(it.id);
              }}
            >
              <span
                className="dragHandle dragHandle--row"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  props.onSuppItemDragStart(it.id);
                }}
                onDragEnd={() => props.setDropSuppItemId(null)}
                title="Arrossega per reordenar suplements"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                ⠿
              </span>

              <MenuRow
                displayMode={props.displayMode}
                primaryLang={props.primaryLang}
                secondaryLang={props.secondaryLang}
                title={it.title}
                price={it.price}
                allergenIds={it.allergens}
                allergens={props.allergens}
                onClick={() => props.onEditItem(it.id)}
                compact
              />
            </div>
          ))
        )}

        <div
          className="dropZone"
          onDragOver={(e) => {
            if (props.drag?.kind !== "suppItem") return;
            e.preventDefault();
            props.setDropSuppItemId(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            props.onSuppDropEnd();
          }}
        />
      </div>
    </section>
  );
}

function MenuRow(props: {
  displayMode: DisplayMode;
  primaryLang: Lang;
  secondaryLang: Lang;
  title: LangText;
  price: number;
  allergenIds: string[];
  allergens: Allergen[];
  onClick: () => void;
  compact?: boolean;
}) {
  const main = pickText(props.title, props.primaryLang) || pickText(props.title, otherLang(props.primaryLang)) || "—";
  const second = pickText(props.title, props.secondaryLang);

  const iconAllergens = props.allergenIds.map((id) => props.allergens.find((a) => a.id === id)).filter(Boolean) as Allergen[];

  return (
    <button className={`menuRow ${props.compact ? "is-compact" : ""}`} onClick={props.onClick} type="button">
      <div className="menuRow__left">
        {iconAllergens.length > 0 && (
          <div className="aInline">
            {iconAllergens.slice(0, 5).map((a) => (
              <span key={a.id} className="aDot aDot--mini" title={`${a.label.ca} / ${a.label.es}`}>
                {a.code}
              </span>
            ))}
          </div>
        )}

        <div className="menuRow__titleLine">
          <span className="menuRow__title">{main}</span>
          <span className="menuRow__leader" />
          <span className="menuRow__price">{fmtEUR(props.price)}</span>
        </div>

        {props.displayMode === "bilingual" && second && <div className="menuRow__subItalic">{second}</div>}
      </div>
    </button>
  );
}

function Dialog(props: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="dlg" role="dialog" aria-modal="true">
      <div className="dlg__head">
        <div className="dlg__title">{props.title}</div>
        <button className="iconBtn" type="button" onClick={props.onClose} title="Tancar">
          ✕
        </button>
      </div>
      <div className="dlg__body">{props.children}</div>
    </div>
  );
}

/* =========================
   Forms (igual que antes)
========================= */

function DeptForm(props: {
  initial?: Department;
  onCancel: () => void;
  onSave: (payload: { title: LangText; order: number }) => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState<LangText>(props.initial?.title ?? { ca: "", es: "" });
  const [order, setOrder] = useState<number>(props.initial?.order ?? 0);

  return (
    <form
      className="dlg__p"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.ca.trim() && !title.es.trim()) return;
        props.onSave({ title, order: Number.isFinite(order) ? order : 0 });
      }}
    >
      <div className="formGrid">
        <label className="field">
          <span>Títol (CA)</span>
          <input value={title.ca} onChange={(e) => setTitle((p) => ({ ...p, ca: e.target.value }))} />
        </label>
        <label className="field">
          <span>Título (ES)</span>
          <input value={title.es} onChange={(e) => setTitle((p) => ({ ...p, es: e.target.value }))} />
        </label>
        <label className="field field--small">
          <span>Ordre</span>
          <input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
        </label>
      </div>

      <div className="dlg__actions">
        {props.onDelete && (
          <button className="btn btn--danger" type="button" onClick={props.onDelete}>
            Borrar
          </button>
        )}
        <div className="dlg__actionsRight">
          <button className="btn btn--ghost" type="button" onClick={props.onCancel}>
            Cancel·lar
          </button>
          <button className="btn btn--primary" type="submit">
            Guardar
          </button>
        </div>
      </div>
    </form>
  );
}

function ItemForm(props: {
  initial?: MenuItem;
  allergens: Allergen[];
  onCancel: () => void;
  onSave: (payload: { title: LangText; price: number; allergens: string[] }) => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState<LangText>(props.initial?.title ?? { ca: "", es: "" });
  const [price, setPrice] = useState<number>(props.initial?.price ?? 0);
  const [allergens, setAllergens] = useState<string[]>(props.initial?.allergens ?? []);

  function toggleAllergen(id: string) {
    setAllergens((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  return (
    <form
      className="dlg__p"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.ca.trim() && !title.es.trim()) return;
        props.onSave({ title, price: Number(price) || 0, allergens });
      }}
    >
      <div className="formGrid">
        <label className="field">
          <span>Nom (CA)</span>
          <input value={title.ca} onChange={(e) => setTitle((p) => ({ ...p, ca: e.target.value }))} />
        </label>
        <label className="field">
          <span>Nombre (ES)</span>
          <input value={title.es} onChange={(e) => setTitle((p) => ({ ...p, es: e.target.value }))} />
        </label>
        <label className="field field--small">
          <span>Preu (€)</span>
          <input type="number" step="0.01" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        </label>
      </div>

      <div className="blockTitle">Al·lèrgens</div>
      <div className="allergenPick">
        {props.allergens.map((a) => {
          const on = allergens.includes(a.id);
          return (
            <button key={a.id} className={`aPick ${on ? "is-on" : ""}`} type="button" onClick={() => toggleAllergen(a.id)}>
              <span className="aDot">{a.code}</span>
              <span className="aPick__txt">
                <span className="aPick__top">{a.label.ca}</span>
                <span className="aPick__sub">{a.label.es}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="dlg__actions">
        {props.onDelete && (
          <button className="btn btn--danger" type="button" onClick={props.onDelete}>
            Borrar
          </button>
        )}
        <div className="dlg__actionsRight">
          <button className="btn btn--ghost" type="button" onClick={props.onCancel}>
            Cancel·lar
          </button>
          <button className="btn btn--primary" type="submit">
            Guardar
          </button>
        </div>
      </div>
    </form>
  );
}

function SuppGroupForm(props: {
  initial?: SupplementGroup;
  onCancel: () => void;
  onSave: (payload: { title: LangText; order: number }) => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState<LangText>(props.initial?.title ?? { ca: "", es: "" });
  const [order, setOrder] = useState<number>(props.initial?.order ?? 0);

  return (
    <form
      className="dlg__p"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.ca.trim() && !title.es.trim()) return;
        props.onSave({ title, order: Number.isFinite(order) ? order : 0 });
      }}
    >
      <div className="formGrid">
        <label className="field">
          <span>Títol (CA)</span>
          <input value={title.ca} onChange={(e) => setTitle((p) => ({ ...p, ca: e.target.value }))} />
        </label>
        <label className="field">
          <span>Título (ES)</span>
          <input value={title.es} onChange={(e) => setTitle((p) => ({ ...p, es: e.target.value }))} />
        </label>
        <label className="field field--small">
          <span>Ordre</span>
          <input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
        </label>
      </div>

      <div className="dlg__actions">
        {props.onDelete && (
          <button className="btn btn--danger" type="button" onClick={props.onDelete}>
            Borrar
          </button>
        )}
        <div className="dlg__actionsRight">
          <button className="btn btn--ghost" type="button" onClick={props.onCancel}>
            Cancel·lar
          </button>
          <button className="btn btn--primary" type="submit">
            Guardar
          </button>
        </div>
      </div>
    </form>
  );
}

function SuppItemForm(props: {
  initial?: SupplementItem;
  allergens: Allergen[];
  onCancel: () => void;
  onSave: (payload: { title: LangText; price: number; allergens: string[] }) => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState<LangText>(props.initial?.title ?? { ca: "", es: "" });
  const [price, setPrice] = useState<number>(props.initial?.price ?? 0);
  const [allergens, setAllergens] = useState<string[]>(props.initial?.allergens ?? []);

  function toggleAllergen(id: string) {
    setAllergens((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  return (
    <form
      className="dlg__p"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.ca.trim() && !title.es.trim()) return;
        props.onSave({ title, price: Number(price) || 0, allergens });
      }}
    >
      <div className="formGrid">
        <label className="field">
          <span>Nom (CA)</span>
          <input value={title.ca} onChange={(e) => setTitle((p) => ({ ...p, ca: e.target.value }))} />
        </label>
        <label className="field">
          <span>Nombre (ES)</span>
          <input value={title.es} onChange={(e) => setTitle((p) => ({ ...p, es: e.target.value }))} />
        </label>
        <label className="field field--small">
          <span>Preu (€)</span>
          <input type="number" step="0.01" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        </label>
      </div>

      <div className="blockTitle">Al·lèrgens</div>
      <div className="allergenPick">
        {props.allergens.map((a) => {
          const on = allergens.includes(a.id);
          return (
            <button key={a.id} className={`aPick ${on ? "is-on" : ""}`} type="button" onClick={() => toggleAllergen(a.id)}>
              <span className="aDot">{a.code}</span>
              <span className="aPick__txt">
                <span className="aPick__top">{a.label.ca}</span>
                <span className="aPick__sub">{a.label.es}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="dlg__actions">
        {props.onDelete && (
          <button className="btn btn--danger" type="button" onClick={props.onDelete}>
            Borrar
          </button>
        )}
        <div className="dlg__actionsRight">
          <button className="btn btn--ghost" type="button" onClick={props.onCancel}>
            Cancel·lar
          </button>
          <button className="btn btn--primary" type="submit">
            Guardar
          </button>
        </div>
      </div>
    </form>
  );
}

function AllergensEditor(props: {
  allergens: Allergen[];
  onCreate: (payload: { code: string; label: LangText }) => void;
  onDelete: (id: string) => void;
}) {
  const [code, setCode] = useState("");
  const [ca, setCa] = useState("");
  const [es, setEs] = useState("");

  function validCode(v: string) {
    const x = v.trim().toUpperCase();
    return /^[A-Z0-9]{1,3}$/.test(x);
  }

  return (
    <div className="dlg__p">
      <div className="blockTitle">Crear nou al·lergen</div>

      <div className="formGrid formGrid--3">
        <label className="field field--small">
          <span>Inicials</span>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={3} placeholder="G / CR / FS" />
          <span className="fieldHint">1–3 (A–Z / 0–9)</span>
        </label>

        <label className="field">
          <span>Nom (CA)</span>
          <input value={ca} onChange={(e) => setCa(e.target.value)} />
        </label>

        <label className="field">
          <span>Nombre (ES)</span>
          <input value={es} onChange={(e) => setEs(e.target.value)} />
        </label>
      </div>

      <div className="dlg__actions">
        <button
          className="btn btn--primary"
          type="button"
          onClick={() => {
            if (!validCode(code)) return alert("Inicials invàlides (A–Z/0–9, 1–3).");
            if (!ca.trim() && !es.trim()) return alert("Posa almenys el nom en CA o ES.");
            props.onCreate({ code, label: { ca, es } });
            setCode("");
            setCa("");
            setEs("");
          }}
        >
          Afegir
        </button>
      </div>

      <div className="blockTitle">Llista</div>

      <div className="allergenList">
        {props.allergens.map((a) => (
          <div key={a.id} className="allergenRow">
            <div className="allergenRow__left">
              <span className="aDot aDot--big">{a.code}</span>
              <div className="allergenRow__txt">
                <div className="allergenRow__name">{a.label.ca || "—"}</div>
                <div className="allergenRow__sub">{a.label.es || "—"}</div>
              </div>
            </div>

            <button className="iconBtn iconBtn--danger" type="button" title="Borrar" onClick={() => props.onDelete(a.id)}>
              🗑
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
