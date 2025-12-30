import { useEffect, useMemo, useState } from "react";
import "../Admin/Admin.css";
import * as api from "../../api/sjApi";
import { Link } from "react-router-dom";
type DisplayMode = "bilingual" | "ca" | "es";
type LangText = api.LangText;
type Section = api.SuggestionSection;

const DISPLAY_KEY = "sj_admin_displayMode";

function fmtEUR(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `${v.toFixed(2).replace(".", ",")}€`;
}

function pickText(t: LangText, lang: "ca" | "es") {
  return (t?.[lang] ?? "").trim();
}

function headingFor(t: LangText, mode: DisplayMode) {
  const ca = pickText(t, "ca");
  const es = pickText(t, "es");
  if (mode === "bilingual") return ca && es ? `${ca} / ${es}` : ca || es || "—";
  return (t?.[mode] ?? "").trim() || (mode === "ca" ? es : ca) || "—";
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

type Item = { id: string; section: Section; title: LangText; price: number; order: number };

type Drag = null | { itemId: string; from: Section };

export default function SugerenciasAdmin() {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("bilingual");
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<api.AdminSuggestionsCurrent["sheet"]>(null);

  // editor sheet
  const [dateFrom, setDateFrom] = useState<string>(isoDate(new Date()));
  const [dateTo, setDateTo] = useState<string>(isoDate(new Date(Date.now() + 2 * 86400000)));

  // modal item
  const [dlg, setDlg] = useState<null | { section: Section; editing?: Item }>(null);
  const [titleCa, setTitleCa] = useState("");
  const [titleEs, setTitleEs] = useState("");
  const [price, setPrice] = useState<number>(0);

  // DnD
  const [drag, setDrag] = useState<Drag>(null);
  const [drop, setDrop] = useState<null | { section: Section; beforeId?: string }>(null);

  useEffect(() => {
    const saved = localStorage.getItem(DISPLAY_KEY);
    if (saved === "bilingual" || saved === "ca" || saved === "es") setDisplayMode(saved);
  }, []);
  useEffect(() => localStorage.setItem(DISPLAY_KEY, displayMode), [displayMode]);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getAdminSuggestionsCurrent();
      setSheet(data.sheet);

      if (data.sheet) {
        setDateFrom(String(data.sheet.dateFrom).slice(0, 10));
        setDateTo(String(data.sheet.dateTo).slice(0, 10));
      }
    } catch (e: any) {
      alert(e?.message ?? "Error carregant suggerències (admin)");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const food = useMemo(() => sheet?.sections.food ?? [], [sheet]);
  const desserts = useMemo(() => sheet?.sections.desserts ?? [], [sheet]);
  const other = useMemo(() => sheet?.sections.other ?? [], [sheet]);

  function openNewItem(section: Section) {
    setDlg({ section });
    setTitleCa("");
    setTitleEs("");
    setPrice(0);
  }

  function openEditItem(item: Item) {
    setDlg({ section: item.section, editing: item });
    setTitleCa(item.title.ca);
    setTitleEs(item.title.es);
    setPrice(item.price);
  }

  async function createSheet() {
    try {
      await api.createSuggestionSheet({ dateFrom, dateTo, isActive: true });
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Error creant full de suggerències");
    }
  }

  async function saveSheetDates() {
    if (!sheet) return;
    try {
      await api.updateSuggestionSheet(sheet.id, { dateFrom, dateTo });
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Error guardant dates");
    }
  }

  async function saveItem() {
    if (!sheet || !dlg) return;
    try {
      const payload = { title: { ca: titleCa, es: titleEs }, price: Number(price) || 0 };

      if (dlg.editing) {
        await api.updateSuggestionItem(dlg.editing.id, payload);
      } else {
        await api.createSuggestionItem({
          sheetId: sheet.id,
          section: dlg.section,
          ...payload,
        });
      }

      setDlg(null);
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Error guardant item");
    }
  }

  async function removeItem(id: string) {
    if (!confirm("Borrar aquest item?")) return;
    try {
      await api.deleteSuggestionItem(id);
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Error borrant item");
    }
  }

  function listFor(section: Section): Item[] {
    if (!sheet) return [];
    if (section === "FOOD") return food as any;
    if (section === "DESSERT") return desserts as any;
    return other as any;
  }

  async function persistMoveOrReorder(from: Section, to: Section, nextToIds: string[], nextFromIds?: string[]) {
    if (!sheet) return;
    try {
      if (nextFromIds) {
        await api.reorderSuggestionItems(sheet.id, from, nextFromIds);
      }
      await api.reorderSuggestionItems(sheet.id, to, nextToIds);
    } catch (e: any) {
      alert(e?.message ?? "Error guardant ordre");
      await load();
    }
  }

  function onDropInto(section: Section, beforeId?: string) {
    if (!sheet || !drag) return;

    const from = drag.from;
    const to = section;

    const fromList = listFor(from).map((x) => x.id);
    const toList = listFor(to).map((x) => x.id);

    const itemId = drag.itemId;

    // remove from source
    const fromIds = fromList.filter((id) => id !== itemId);
    const toIdsBase = from === to ? fromIds : toList;

    // insert into target
    const insertIndex = beforeId ? Math.max(0, toIdsBase.indexOf(beforeId)) : toIdsBase.length;
    const toIds = [...toIdsBase];
    if (!toIds.includes(itemId)) toIds.splice(insertIndex, 0, itemId);

    // optimistic state (solo para UI; recargamos tras persist si quieres)
    setSheet((prev) => {
      if (!prev) return prev;
      const all = [...prev.sections.food, ...prev.sections.desserts, ...prev.sections.other];
      const map = new Map(all.map((x) => [x.id, x]));
      const build = (sec: Section, ids: string[]) =>
        ids.map((id, idx) => {
          const it = map.get(id)!;
          return { ...it, section: sec, order: idx };
        });

      const nextFood = secIds("FOOD", from, to, fromIds, toIds, prev.sections.food.map((x) => x.id), build);
      const nextDess = secIds("DESSERT", from, to, fromIds, toIds, prev.sections.desserts.map((x) => x.id), build);
      const nextOther = secIds("OTHER", from, to, fromIds, toIds, prev.sections.other.map((x) => x.id), build);

      return {
        ...prev,
        sections: {
          food: nextFood as any,
          desserts: nextDess as any,
          other: nextOther as any,
        },
      };
    });

    // persist
    void (async () => {
      if (from === to) {
        await persistMoveOrReorder(from, to, toIds);
      } else {
        await persistMoveOrReorder(from, to, toIds, fromIds);
      }
      setDrag(null);
      setDrop(null);
      // si quieres, puedes recargar siempre:
      await load();
    })();
  }

  return (
    <div className="sj-admin">
      <div className="sj-admin__paper">
        <header className="sj-admin__top">
          <Link to="/" className="sj-admin__brandLink" aria-label="Tornar a l'inici">
            <div className="sj-admin__brand">
              <div className="sj-admin__brandName">BAR SANT JORDI</div>
              <div className="sj-admin__brandSub">Admin Sugerencias</div>
            </div>
          </Link>


          <div className="sj-admin__actions">
            <div className="seg">
              <button className={`seg__btn ${displayMode === "bilingual" ? "is-on" : ""}`} onClick={() => setDisplayMode("bilingual")} type="button">CA/ES</button>
              <button className={`seg__btn ${displayMode === "ca" ? "is-on" : ""}`} onClick={() => setDisplayMode("ca")} type="button">CA</button>
              <button className={`seg__btn ${displayMode === "es" ? "is-on" : ""}`} onClick={() => setDisplayMode("es")} type="button">ES</button>
            </div>
          </div>
        </header>

        <div className="sj-admin__rule" />

        {loading ? (
          <div style={{ padding: 16, opacity: 0.7 }}>Carregant…</div>
        ) : (
          <div style={{ padding: 16 }}>
            <div className="formGrid formGrid--3">
              <label className="field field--small">
                <span>Data inici</span>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </label>
              <label className="field field--small">
                <span>Data fi</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </label>

              <div className="dlg__actions" style={{ justifyContent: "flex-end", marginTop: 22 }}>
                {!sheet ? (
                  <button className="btn btn--primary" type="button" onClick={createSheet}>
                    Crear full
                  </button>
                ) : (
                  <button className="btn btn--primary" type="button" onClick={saveSheetDates}>
                    Guardar dates
                  </button>
                )}
              </div>
            </div>

            {!sheet ? (
              <div style={{ marginTop: 16, opacity: 0.7 }}>No hi ha cap full actiu.</div>
            ) : (
              <div className="sj-admin__grid sj-admin__grid--stack" style={{ marginTop: 16 }}>
                <div className="sj-admin__col">
                  <SectionBlock
                    title={{ ca: "Menjar", es: "Comida" }}
                    displayMode={displayMode}
                    section="FOOD"
                    items={food}
                    drag={drag}
                    drop={drop}
                    onAdd={() => openNewItem("FOOD")}
                    onEdit={openEditItem}
                    onDelete={removeItem}
                    onDragStart={(itemId) => setDrag({ itemId, from: "FOOD" })}
                    onDragEnd={() => { setDrag(null); setDrop(null); }}
                    onDragOver={(beforeId) => setDrop({ section: "FOOD", beforeId })}
                    onDrop={(beforeId) => onDropInto("FOOD", beforeId)}
                    onDropEnd={() => onDropInto("FOOD", undefined)}
                  />

                  <SectionBlock
                    title={{ ca: "Postres", es: "Postres" }}
                    displayMode={displayMode}
                    section="DESSERT"
                    items={desserts}
                    drag={drag}
                    drop={drop}
                    onAdd={() => openNewItem("DESSERT")}
                    onEdit={openEditItem}
                    onDelete={removeItem}
                    onDragStart={(itemId) => setDrag({ itemId, from: "DESSERT" })}
                    onDragEnd={() => { setDrag(null); setDrop(null); }}
                    onDragOver={(beforeId) => setDrop({ section: "DESSERT", beforeId })}
                    onDrop={(beforeId) => onDropInto("DESSERT", beforeId)}
                    onDropEnd={() => onDropInto("DESSERT", undefined)}
                  />

                  <SectionBlock
                    title={{ ca: "Altres", es: "Otros" }}
                    displayMode={displayMode}
                    section="OTHER"
                    items={other}
                    drag={drag}
                    drop={drop}
                    onAdd={() => openNewItem("OTHER")}
                    onEdit={openEditItem}
                    onDelete={removeItem}
                    onDragStart={(itemId) => setDrag({ itemId, from: "OTHER" })}
                    onDragEnd={() => { setDrag(null); setDrop(null); }}
                    onDragOver={(beforeId) => setDrop({ section: "OTHER", beforeId })}
                    onDrop={(beforeId) => onDropInto("OTHER", beforeId)}
                    onDropEnd={() => onDropInto("OTHER", undefined)}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {dlg && (
        <>
          <div className="dlg__backdrop" onMouseDown={() => setDlg(null)} />
          <div className="dlg" role="dialog" aria-modal="true">
            <div className="dlg__head">
              <div className="dlg__title">{dlg.editing ? "Editar item" : "Nou item"}</div>
              <button className="iconBtn" type="button" onClick={() => setDlg(null)} title="Tancar">✕</button>
            </div>

            <div className="dlg__body">
              <div className="dlg__p">
                <div className="formGrid">
                  <label className="field">
                    <span>Nom (CA)</span>
                    <input value={titleCa} onChange={(e) => setTitleCa(e.target.value)} />
                  </label>
                  <label className="field">
                    <span>Nombre (ES)</span>
                    <input value={titleEs} onChange={(e) => setTitleEs(e.target.value)} />
                  </label>
                  <label className="field field--small">
                    <span>Preu (€)</span>
                    <input type="number" step="0.01" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
                  </label>
                </div>

                <div className="dlg__actions">
                  {dlg.editing && (
                    <button className="btn btn--danger" type="button" onClick={() => removeItem(dlg.editing!.id)}>
                      Borrar
                    </button>
                  )}

                  <div className="dlg__actionsRight">
                    <button className="btn btn--ghost" type="button" onClick={() => setDlg(null)}>Cancel·lar</button>
                    <button className="btn btn--primary" type="button" onClick={saveItem}>Guardar</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SectionBlock(props: {
  title: LangText;
  displayMode: DisplayMode;
  section: Section;
  items: Item[];

  drag: Drag;
  drop: null | { section: Section; beforeId?: string };

  onAdd: () => void;
  onEdit: (it: Item) => void;
  onDelete: (id: string) => void;

  onDragStart: (itemId: string) => void;
  onDragEnd: () => void;

  onDragOver: (beforeId?: string) => void;
  onDrop: (beforeId?: string) => void;
  onDropEnd: () => void;
}) {
  const heading = headingFor(props.title, props.displayMode);

  const isSectionDrop = props.drop?.section === props.section && !props.drop.beforeId;

  return (
    <section
      className={`menuSection ${isSectionDrop ? "is-drop" : ""}`}
      onDragOver={(e) => {
        if (!props.drag) return;
        e.preventDefault();
        props.onDragOver(undefined);
      }}
      onDrop={(e) => {
        e.preventDefault();
        props.onDropEnd();
      }}
    >
      <div className="menuSection__head">
        <div className="menuSection__headLeft">
          <div className="menuSection__title">{heading}</div>
        </div>

        <div className="menuSection__headBtns">
          <button className="iconBtn" type="button" onClick={props.onAdd} title="Afegir">+</button>
        </div>
      </div>

      <div className="menuSection__rule" />

      {props.items.length === 0 ? (
        <div className="menuEmpty">Sense items. Arrossega aquí o clica “+”.</div>
      ) : (
        <div className="menuList">
          {props.items.map((it) => {
            const isDropBefore = props.drop?.section === props.section && props.drop.beforeId === it.id;
            return (
              <div
                key={it.id}
                className={`menuRowWrap ${isDropBefore ? "is-drop" : ""}`}
                onDragOver={(e) => {
                  if (!props.drag) return;
                  e.preventDefault();
                  props.onDragOver(it.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  props.onDrop(it.id);
                }}
              >
                <span
                  className="dragHandle dragHandle--row"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    props.onDragStart(it.id);
                  }}
                  onDragEnd={props.onDragEnd}
                  title="Arrossega"
                >
                  ⠿
                </span>

                <button className="menuRow" type="button" onClick={() => props.onEdit(it)}>
                  <div className="menuRow__left">
                    <div className="menuRow__titleLine">
                      <span className="menuRow__title">- {headingFor(it.title, props.displayMode)}</span>
                      <span className="menuRow__leader" />
                      <span className="menuRow__price">{fmtEUR(it.price)}</span>
                    </div>
                    {props.displayMode === "bilingual" && pickText(it.title, "es") && pickText(it.title, "ca") && (
                      <div className="menuRow__subItalic">{pickText(it.title, "es")}</div>
                    )}
                  </div>
                </button>

                <button className="iconBtn iconBtn--danger" type="button" title="Borrar" onClick={() => props.onDelete(it.id)}>
                  🗑
                </button>
              </div>
            );
          })}

          <div
            className="dropZone"
            onDragOver={(e) => {
              if (!props.drag) return;
              e.preventDefault();
              props.onDragOver(undefined);
            }}
            onDrop={(e) => {
              e.preventDefault();
              props.onDropEnd();
            }}
          />
        </div>
      )}
    </section>
  );
}

function secIds(
  sec: Section,
  from: Section,
  to: Section,
  fromIds: string[],
  toIds: string[],
  originalIds: string[],
  build: (sec: Section, ids: string[]) => Item[]
) {
  if (sec === to) return build(sec, toIds);
  if (sec === from) return build(sec, fromIds);
  return build(sec, originalIds);
}
