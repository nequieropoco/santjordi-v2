import { useEffect, useMemo, useState } from "react";
import "../Admin/Admin.css"; // reutilizamos la estética del admin
import * as api from "../../api/sjApi";
import { Link } from "react-router-dom";

type Lang = "ca" | "es";
type DisplayMode = "bilingual" | "ca" | "es";

type LangText = api.LangText;

type Department = {
  id: string;
  title: LangText;
  order: number;
  items: Array<{
    id: string;
    departmentId: string;
    title: LangText;
    price: number;
    order: number;
    allergens: string[];
  }>;
};

type SupplementGroup = {
  id: string;
  title: LangText;
  order: number;
  items: Array<{
    id: string;
    groupId: string;
    title: LangText;
    price: number;
    order: number;
    allergens: string[];
  }>;
};

type Allergen = {
  id: string;
  code: string;
  label: LangText;
};

const DISPLAY_KEY = "sj_admin_displayMode"; // compartimos el modo con Admin

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

export default function Carta() {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("bilingual");
  const [loading, setLoading] = useState(true);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [supplementGroups, setSupplementGroups] = useState<SupplementGroup[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(DISPLAY_KEY);
    if (saved === "bilingual" || saved === "ca" || saved === "es") {
      setDisplayMode(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(DISPLAY_KEY, displayMode);
  }, [displayMode]);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getMenu();
      setDepartments(
        [...data.departments]
          .sort((a, b) => a.order - b.order)
          .map((d) => ({
            ...d,
            items: [...d.items].sort((x, y) => x.order - y.order),
          }))
      );
      setSupplementGroups(
        [...data.supplementGroups]
          .sort((a, b) => a.order - b.order)
          .map((g) => ({
            ...g,
            items: [...g.items].sort((x, y) => x.order - y.order),
          }))
      );
      setAllergens(data.allergens);
    } catch (e: any) {
      alert(e?.message ?? "Error carregant la carta");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const primaryLang = primaryLangFrom(displayMode);
  const secondaryLang = otherLang(primaryLang);

  // Mapa rápido para pintar chips de alérgenos en filas
  const allergenById = useMemo(() => {
    const m = new Map<string, Allergen>();
    for (const a of allergens) m.set(a.id, a);
    return m;
  }, [allergens]);

  return (
    <div className="sj-admin">
      <div className="sj-admin__paper">
        <header className="sj-admin__top">
        <Link to="/" className="sj-admin__brandLink" aria-label="Tornar a l'inici">
          <div className="sj-admin__brand">
            <div className="sj-admin__brandName">BAR SANT JORDI</div>
            <div className="sj-admin__brandSub">Carta</div>
          </div>
        </Link>

          <div className="sj-admin__actions">
            <div className="seg">
              <button
                className={`seg__btn ${displayMode === "bilingual" ? "is-on" : ""}`}
                onClick={() => setDisplayMode("bilingual")}
                type="button"
              >
                CA/ES
              </button>
              <button
                className={`seg__btn ${displayMode === "ca" ? "is-on" : ""}`}
                onClick={() => setDisplayMode("ca")}
                type="button"
              >
                CA
              </button>
              <button
                className={`seg__btn ${displayMode === "es" ? "is-on" : ""}`}
                onClick={() => setDisplayMode("es")}
                type="button"
              >
                ES
              </button>
            </div>
          </div>
        </header>

        <div className="sj-admin__rule" />

        {loading ? (
          <div style={{ padding: 16, opacity: 0.7 }}>Carregant…</div>
        ) : (
          <div className="sj-admin__grid sj-admin__grid--stack">
            <div className="sj-admin__col">
              {departments.map((d) => (
                <MenuSectionReadOnly
                  key={d.id}
                  title={d.title}
                  displayMode={displayMode}
                  primaryLang={primaryLang}
                  secondaryLang={secondaryLang}
                  items={d.items}
                  allergenById={allergenById}
                />
              ))}

              {supplementGroups.length > 0 && (
                <div className="sj-admin__suppWrap">
                  {supplementGroups.map((g) => (
                    <SupplementBoxReadOnly
                      key={g.id}
                      title={g.title}
                      displayMode={displayMode}
                      primaryLang={primaryLang}
                      secondaryLang={secondaryLang}
                      items={g.items}
                      allergenById={allergenById}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <footer className="sj-admin__footer">
          <div className="sj-admin__footerTitle">{headingFor({ ca: "Al·lèrgens", es: "Alérgenos" }, displayMode)}</div>

          <div className="sj-admin__allergenLegend">
            {allergens.map((a) => {
              const ca = pickText(a.label, "ca");
              const es = pickText(a.label, "es");
              const txt =
                displayMode === "bilingual"
                  ? ca && es
                    ? `${ca} / ${es}`
                    : ca || es || "—"
                  : pickText(a.label, displayMode) || (displayMode === "ca" ? es : ca) || "—";

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
    </div>
  );
}

function MenuSectionReadOnly(props: {
  title: LangText;
  displayMode: DisplayMode;
  primaryLang: Lang;
  secondaryLang: Lang;
  items: Array<{
    id: string;
    title: LangText;
    price: number;
    allergens: string[];
  }>;
  allergenById: Map<string, Allergen>;
}) {
  const heading = headingFor(props.title, props.displayMode);

  return (
    <section className="menuSection">
      <div className="menuSection__head">
        <div className="menuSection__headLeft">
          <div className="menuSection__title">{heading}</div>
        </div>
      </div>

      <div className="menuSection__rule" />

      {props.items.length === 0 ? (
        <div className="menuEmpty" style={{ opacity: 0.7 }}>
          —
        </div>
      ) : (
        <div className="menuList">
          {props.items.map((it) => (
            <MenuRowReadOnly
              key={it.id}
              displayMode={props.displayMode}
              primaryLang={props.primaryLang}
              secondaryLang={props.secondaryLang}
              title={it.title}
              price={it.price}
              allergenIds={it.allergens}
              allergenById={props.allergenById}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SupplementBoxReadOnly(props: {
  title: LangText;
  displayMode: DisplayMode;
  primaryLang: Lang;
  secondaryLang: Lang;
  items: Array<{
    id: string;
    title: LangText;
    price: number;
    allergens: string[];
  }>;
  allergenById: Map<string, Allergen>;
}) {
  const heading = headingFor(props.title, props.displayMode);

  return (
    <section className="suppBox">
      <div className="suppBox__head">
        <div className="suppBox__title">{heading}</div>
      </div>

      <div className="suppBox__list">
        {props.items.length === 0 ? (
          <div className="menuEmpty" style={{ opacity: 0.7 }}>
            —
          </div>
        ) : (
          props.items.map((it) => (
            <MenuRowReadOnly
              key={it.id}
              displayMode={props.displayMode}
              primaryLang={props.primaryLang}
              secondaryLang={props.secondaryLang}
              title={it.title}
              price={it.price}
              allergenIds={it.allergens}
              allergenById={props.allergenById}
              compact
            />
          ))
        )}
      </div>
    </section>
  );
}

function MenuRowReadOnly(props: {
  displayMode: DisplayMode;
  primaryLang: Lang;
  secondaryLang: Lang;
  title: LangText;
  price: number;
  allergenIds: string[];
  allergenById: Map<string, Allergen>;
  compact?: boolean;
}) {
  const main = pickText(props.title, props.primaryLang) || pickText(props.title, otherLang(props.primaryLang)) || "—";
  const second = pickText(props.title, props.secondaryLang);

  const chips = props.allergenIds
    .map((id) => props.allergenById.get(id))
    .filter(Boolean) as Allergen[];

  return (
    <button className={`menuRow ${props.compact ? "is-compact" : ""}`} type="button">
      <div className="menuRow__left">
        {chips.length > 0 && (
          <div className="aInline">
            {chips.slice(0, 5).map((a) => (
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
