import * as React from "react";
import type { ResumeDocument as Doc, SectionKey, TemplateId } from "@/lib/validation";
import { formatDateRange, normalizeSectionOrder, splitBullets } from "@/lib/resume-utils";

export const PAGE_SIZES = { A4: { w: 794, h: 1123 }, Letter: { w: 816, h: 1056 } } as const;

const FONT_STACKS: Record<Doc["settings"]["fontFamily"], string> = {
  inter: "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif",
  helvetica: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
  garamond: "'EB Garamond', Garamond, 'Times New Roman', serif",
  "roboto-mono": "'Roboto Mono', 'SF Mono', Menlo, Consolas, monospace",
  lato: "Lato, 'Segoe UI', Helvetica, Arial, sans-serif",
};
const FONT_SCALE = { small: 0.92, medium: 1, large: 1.1 };
const SPACE_SCALE = { compact: 0.78, comfortable: 1, spacious: 1.28 };

type Theme = {
  primary: string;
  text: string;
  muted: string;
  font: string;
  headingFont: string;
  base: number; // px
  sp: number; // spacing unit px
};

function hexToRgb(hex: string) {
  const m = hex.replace("#", "");
  const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function tint(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
function isDark(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}

const Block = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div data-block className="resume-avoid-break" style={style}>
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Shared section content renderers
// ---------------------------------------------------------------------------
function Bullets({ text, t, color }: { text: string; t: Theme; color?: string }) {
  const lines = splitBullets(text);
  if (!lines.length) return null;
  if (lines.length === 1)
    return <p style={{ margin: `${t.sp * 0.3}px 0 0`, lineHeight: 1.45, color: color ?? t.text }}>{lines[0]}</p>;
  return (
    <ul style={{ margin: `${t.sp * 0.3}px 0 0`, paddingLeft: 16, lineHeight: 1.45, color: color ?? t.text }}>
      {lines.map((l, i) => (
        <li key={i} style={{ marginBottom: t.sp * 0.15 }}>
          {l}
        </li>
      ))}
    </ul>
  );
}

function ItemHeader({ title, sub, meta, right, t, titleColor }: { title: string; sub?: string; meta?: string; right?: string; t: Theme; titleColor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: t.base * 1.05, color: titleColor ?? t.text }}>{title || "Untitled"}</div>
        {(sub || meta) && (
          <div style={{ color: t.muted, fontSize: t.base * 0.95 }}>
            {sub}
            {sub && meta ? " · " : ""}
            {meta}
          </div>
        )}
      </div>
      {right && <div style={{ whiteSpace: "nowrap", color: t.muted, fontSize: t.base * 0.9 }}>{right}</div>}
    </div>
  );
}

type SectionRenderer = (doc: Doc, t: Theme, opts: { onColor?: string; compact?: boolean }) => React.ReactNode | null;

const gap = (t: Theme) => t.sp * 0.9;

export const sectionBodies: Record<SectionKey, SectionRenderer> = {
  summary: (doc, t, o) =>
    doc.summary.trim() ? <p style={{ margin: 0, lineHeight: 1.5, color: o.onColor ?? t.text, whiteSpace: "pre-wrap" }}>{doc.summary}</p> : null,
  experience: (doc, t) =>
    doc.experience.length ? (
      <div style={{ display: "flex", flexDirection: "column", gap: gap(t) }}>
        {doc.experience.map((e) => (
          <Block key={e.id}>
            <ItemHeader title={e.position} sub={e.company} meta={e.location} right={formatDateRange(e.startDate, e.endDate, e.current)} t={t} />
            <Bullets text={e.description} t={t} />
          </Block>
        ))}
      </div>
    ) : null,
  education: (doc, t) =>
    doc.education.length ? (
      <div style={{ display: "flex", flexDirection: "column", gap: gap(t) }}>
        {doc.education.map((e) => (
          <Block key={e.id}>
            <ItemHeader title={[e.degree, e.field].filter(Boolean).join(" in ") || e.institution} sub={[e.degree, e.field].some(Boolean) ? e.institution : undefined} meta={e.location} right={formatDateRange(e.startDate, e.endDate)} t={t} />
            <Bullets text={e.description} t={t} />
          </Block>
        ))}
      </div>
    ) : null,
  skills: (doc, t, o) => {
    const items = doc.skills.filter((s) => s.name.trim());
    if (!items.length) return null;
    if (o.compact)
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: t.sp * 0.25 }}>
          {items.map((s) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, color: o.onColor ?? t.text }}>
              <span>{s.name}</span>
              {s.level && <span style={{ opacity: 0.7, fontSize: t.base * 0.85 }}>{s.level}</span>}
            </div>
          ))}
        </div>
      );
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((s) => (
          <span key={s.id} style={{ border: `1px solid ${tint(t.primary, 0.35)}`, background: tint(t.primary, 0.06), borderRadius: 3, padding: "2px 8px", fontSize: t.base * 0.9, color: t.text }}>
            {s.name}
            {s.level ? <span style={{ color: t.muted }}> · {s.level}</span> : null}
          </span>
        ))}
      </div>
    );
  },
  projects: (doc, t) =>
    doc.projects.length ? (
      <div style={{ display: "flex", flexDirection: "column", gap: gap(t) }}>
        {doc.projects.map((p) => (
          <Block key={p.id}>
            <ItemHeader title={p.name} sub={p.technologies} meta={p.url} right={formatDateRange(p.startDate, p.endDate)} t={t} />
            <Bullets text={p.description} t={t} />
          </Block>
        ))}
      </div>
    ) : null,
  certifications: (doc, t, o) =>
    doc.certifications.length ? (
      <div style={{ display: "flex", flexDirection: "column", gap: t.sp * 0.4 }}>
        {doc.certifications.map((c) => (
          <Block key={c.id} style={{ color: o.onColor ?? t.text }}>
            <div style={{ fontWeight: 600 }}>{c.name}</div>
            <div style={{ fontSize: t.base * 0.9, opacity: o.onColor ? 0.8 : 1, color: o.onColor ?? t.muted }}>{[c.issuer, c.date].filter(Boolean).join(" · ")}</div>
          </Block>
        ))}
      </div>
    ) : null,
  languages: (doc, t, o) =>
    doc.languages.length ? (
      <div style={{ display: "flex", flexDirection: o.compact ? "column" : "row", flexWrap: "wrap", gap: o.compact ? t.sp * 0.25 : 14, color: o.onColor ?? t.text }}>
        {doc.languages.map((l) => (
          <div key={l.id} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontWeight: 500 }}>{l.language}</span>
            {l.proficiency && <span style={{ opacity: 0.75 }}>{o.compact ? l.proficiency : `— ${l.proficiency}`}</span>}
          </div>
        ))}
      </div>
    ) : null,
  awards: (doc, t) =>
    doc.awards.length ? (
      <div style={{ display: "flex", flexDirection: "column", gap: t.sp * 0.6 }}>
        {doc.awards.map((a) => (
          <Block key={a.id}>
            <ItemHeader title={a.title} sub={a.issuer} right={a.date} t={t} />
            <Bullets text={a.description} t={t} />
          </Block>
        ))}
      </div>
    ) : null,
  volunteer: (doc, t) =>
    doc.volunteer.length ? (
      <div style={{ display: "flex", flexDirection: "column", gap: gap(t) }}>
        {doc.volunteer.map((v) => (
          <Block key={v.id}>
            <ItemHeader title={v.role} sub={v.organization} right={formatDateRange(v.startDate, v.endDate)} t={t} />
            <Bullets text={v.description} t={t} />
          </Block>
        ))}
      </div>
    ) : null,
  custom: () => null, // custom sections render individually
};

// ---------------------------------------------------------------------------
// Contact line
// ---------------------------------------------------------------------------
function contactItems(doc: Doc) {
  const p = doc.profile;
  return [p.email, p.phone, p.location, p.website, p.linkedin, p.github].map((v) => v.trim()).filter(Boolean);
}

function Photo({ doc, size, round = true }: { doc: Doc; size: number; round?: boolean }) {
  if (!doc.settings.showPhoto || !doc.profile.profileImage) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={doc.profile.profileImage} alt="" width={size} height={size} style={{ width: size, height: size, objectFit: "cover", borderRadius: round ? "50%" : 4, flexShrink: 0 }} />;
}

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------
type HeadingStyle = (title: string, t: Theme, onColor?: string) => React.ReactNode;

const headings: Record<TemplateId, HeadingStyle> = {
  modern: (title, t) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: t.sp * 0.5 }}>
      <span style={{ width: 4, height: t.base * 1.1, background: t.primary, borderRadius: 1 }} />
      <h2 style={{ margin: 0, fontSize: t.base * 0.95, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: t.primary }}>{title}</h2>
    </div>
  ),
  minimal: (title, t) => (
    <h2 style={{ margin: `0 0 ${t.sp * 0.5}px`, fontSize: t.base * 0.8, fontWeight: 600, letterSpacing: 2.5, textTransform: "uppercase", color: t.muted }}>{title}</h2>
  ),
  executive: (title, t) => (
    <h2 style={{ margin: `0 0 ${t.sp * 0.6}px`, fontFamily: t.headingFont, fontSize: t.base * 1.15, fontWeight: 700, color: t.primary, borderBottom: `2px solid ${t.primary}`, paddingBottom: 3, letterSpacing: 0.5 }}>{title}</h2>
  ),
  classic: (title, t) => (
    <h2 style={{ margin: `0 0 ${t.sp * 0.5}px`, fontFamily: t.headingFont, fontSize: t.base * 1, fontWeight: 700, fontVariant: "small-caps", letterSpacing: 1.5, color: t.text, borderBottom: `1px solid ${t.text}`, paddingBottom: 2 }}>{title}</h2>
  ),
  creative: (title, t, onColor) => (
    <h2 style={{ margin: `0 0 ${t.sp * 0.5}px`, fontSize: t.base * 0.85, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: onColor ?? t.primary, paddingBottom: 4, borderBottom: `2px solid ${onColor ? tint(onColor, 0.35) : tint(t.primary, 0.3)}` }}>{title}</h2>
  ),
  technical: (title, t) => (
    <h2 style={{ margin: `0 0 ${t.sp * 0.5}px`, fontFamily: FONT_STACKS["roboto-mono"], fontSize: t.base * 0.85, fontWeight: 700, color: t.primary }}>
      <span style={{ opacity: 0.5 }}>{"// "}</span>
      {title.toLowerCase().replace(/\s+/g, "_")}
    </h2>
  ),
  elegant: (title, t) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: t.sp * 0.6 }}>
      <span style={{ flex: 1, height: 1, background: tint(t.primary, 0.4) }} />
      <h2 style={{ margin: 0, fontFamily: t.headingFont, fontSize: t.base * 0.85, fontWeight: 500, letterSpacing: 3, textTransform: "uppercase", color: t.primary }}>{title}</h2>
      <span style={{ flex: 1, height: 1, background: tint(t.primary, 0.4) }} />
    </div>
  ),
  ats: (title, t) => <h2 style={{ margin: `0 0 ${t.sp * 0.4}px`, fontSize: t.base * 1.05, fontWeight: 700, textTransform: "uppercase", color: "#000", borderBottom: "1px solid #000", paddingBottom: 2 }}>{title}</h2>,
};

const sectionTitles: Record<SectionKey, string> = {
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  certifications: "Certifications",
  languages: "Languages",
  awards: "Awards",
  volunteer: "Volunteer Experience",
  custom: "",
};

function Section({ k, doc, t, template, onColor, compact }: { k: SectionKey; doc: Doc; t: Theme; template: TemplateId; onColor?: string; compact?: boolean }) {
  if (k === "custom") {
    return (
      <>
        {doc.custom
          .filter((c) => c.title.trim() || c.content.trim())
          .map((c) => (
            <section key={c.id} style={{ marginBottom: t.sp * 1.4 }}>
              <Block>{headings[template](c.title || "Additional", t, onColor)}</Block>
              <Bullets text={c.content} t={t} color={onColor} />
            </section>
          ))}
      </>
    );
  }
  const body = sectionBodies[k](doc, t, { onColor, compact });
  if (!body) return null;
  return (
    <section style={{ marginBottom: t.sp * 1.4 }}>
      <Block>{headings[template](sectionTitles[k], t, onColor)}</Block>
      {body}
    </section>
  );
}

function ContactLine({ doc, t, color, sep = " · ", vertical }: { doc: Doc; t: Theme; color?: string; sep?: string; vertical?: boolean }) {
  const items = contactItems(doc);
  if (!items.length) return null;
  if (vertical)
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: t.sp * 0.3, fontSize: t.base * 0.9, color: color ?? t.muted, wordBreak: "break-word" }}>
        {items.map((i, idx) => (
          <div key={idx}>{i}</div>
        ))}
      </div>
    );
  return (
    <div style={{ fontSize: t.base * 0.9, color: color ?? t.muted, lineHeight: 1.6 }}>
      {items.map((i, idx) => (
        <span key={idx}>
          {idx > 0 && <span style={{ opacity: 0.6 }}>{sep}</span>}
          {i}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function buildTheme(doc: Doc): Theme {
  const s = doc.settings;
  const base = 14 * FONT_SCALE[s.fontSize];
  const templateHeading: Partial<Record<TemplateId, string>> = { executive: FONT_STACKS.georgia, classic: FONT_STACKS.georgia, elegant: FONT_STACKS.garamond };
  return {
    primary: doc.templateId === "ats" ? "#000000" : s.primaryColor,
    text: "#1f2937",
    muted: "#4b5563",
    font: FONT_STACKS[s.fontFamily],
    headingFont: templateHeading[doc.templateId] ?? FONT_STACKS[s.fontFamily],
    base,
    sp: 14 * SPACE_SCALE[s.spacing],
  };
}

export function ResumeDocument({ doc, minHeight }: { doc: Doc; minHeight?: number }) {
  const t = buildTheme(doc);
  const order = normalizeSectionOrder(doc.settings.sectionOrder);
  const size = PAGE_SIZES[doc.settings.pageSize];
  const pad = 48 * SPACE_SCALE[doc.settings.spacing] * 0.9;
  const name = doc.profile.fullName.trim() || "Your Name";
  const root: React.CSSProperties = {
    width: size.w,
    minHeight: minHeight ?? size.h,
    background: "#fff",
    color: t.text,
    fontFamily: t.font,
    fontSize: t.base,
    lineHeight: 1.4,
    boxSizing: "border-box",
    position: "relative",
  };
  const tpl = doc.templateId;
  const render = (keys: SectionKey[], onColor?: string, compact?: boolean) => keys.map((k) => <Section key={k} k={k} doc={doc} t={t} template={tpl} onColor={onColor} compact={compact} />);

  // ----- Sidebar layouts -----------------------------------------------------
  if (tpl === "creative" || tpl === "technical") {
    const sideKeys: SectionKey[] = tpl === "creative" ? ["skills", "languages", "certifications"] : ["skills", "languages", "certifications", "awards"];
    const side = order.filter((k) => sideKeys.includes(k));
    const main = order.filter((k) => !sideKeys.includes(k));
    const sideBg = tpl === "creative" ? t.primary : tint(t.primary, 0.07);
    const onColor = tpl === "creative" ? (isDark(t.primary) ? "#ffffff" : "#111827") : undefined;
    const sideW = 230;
    return (
      <div className="resume-page" style={{ ...root, display: "flex", flexDirection: tpl === "creative" ? "row" : "row-reverse" }}>
        <aside style={{ width: sideW, flexShrink: 0, background: sideBg, color: onColor ?? t.text, padding: `${pad}px ${pad * 0.6}px`, boxSizing: "border-box" }}>
          {tpl === "creative" && (
            <Block style={{ marginBottom: t.sp * 1.5 }}>
              <Photo doc={doc} size={110} />
              <h1 style={{ margin: `${t.sp}px 0 4px`, fontSize: t.base * 1.9, lineHeight: 1.1, fontWeight: 800, color: onColor, wordBreak: "break-word" }}>{name}</h1>
              {doc.profile.headline && <div style={{ fontSize: t.base * 0.95, opacity: 0.85 }}>{doc.profile.headline}</div>}
            </Block>
          )}
          <section style={{ marginBottom: t.sp * 1.4 }}>
            <Block>{headings[tpl]("Contact", t, onColor)}</Block>
            <ContactLine doc={doc} t={t} color={onColor} vertical />
          </section>
          {render(side, onColor, true)}
        </aside>
        <main style={{ flex: 1, minWidth: 0, padding: pad, boxSizing: "border-box" }}>
          {tpl === "technical" && (
            <Block style={{ marginBottom: t.sp * 1.6, display: "flex", gap: 16, alignItems: "center" }}>
              <Photo doc={doc} size={72} round={false} />
              <div>
                <h1 style={{ margin: 0, fontFamily: FONT_STACKS["roboto-mono"], fontSize: t.base * 2, fontWeight: 700, color: t.primary, lineHeight: 1.1 }}>{name}</h1>
                {doc.profile.headline && <div style={{ fontSize: t.base * 1.05, color: t.muted, marginTop: 4 }}>{doc.profile.headline}</div>}
              </div>
            </Block>
          )}
          {render(main)}
        </main>
      </div>
    );
  }

  // ----- Single-column layouts ------------------------------------------------
  let header: React.ReactNode;
  switch (tpl) {
    case "modern": {
      const onColor = isDark(t.primary) ? "#fff" : "#111827";
      header = (
        <Block style={{ background: t.primary, color: onColor, padding: `${pad * 0.8}px ${pad}px`, display: "flex", alignItems: "center", gap: 20, justifyContent: "space-between" }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: t.base * 2.2, fontWeight: 800, lineHeight: 1.1, letterSpacing: -0.5 }}>{name}</h1>
            {doc.profile.headline && <div style={{ fontSize: t.base * 1.1, opacity: 0.9, marginTop: 4 }}>{doc.profile.headline}</div>}
            <div style={{ marginTop: t.sp * 0.6 }}>
              <ContactLine doc={doc} t={t} color={onColor} sep="  |  " />
            </div>
          </div>
          <Photo doc={doc} size={84} />
        </Block>
      );
      break;
    }
    case "minimal":
      header = (
        <Block style={{ padding: `${pad}px ${pad}px 0`, display: "flex", justifyContent: "space-between", gap: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: t.base * 2.4, fontWeight: 300, letterSpacing: -1, lineHeight: 1.05, color: t.text }}>{name}</h1>
            {doc.profile.headline && <div style={{ fontSize: t.base, color: t.primary, marginTop: 6, fontWeight: 500 }}>{doc.profile.headline}</div>}
            <div style={{ marginTop: t.sp * 0.6 }}>
              <ContactLine doc={doc} t={t} sep="   " />
            </div>
          </div>
          <Photo doc={doc} size={80} round={false} />
        </Block>
      );
      break;
    case "executive":
      header = (
        <Block style={{ padding: `${pad}px ${pad}px 0`, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Photo doc={doc} size={90} />
          </div>
          <h1 style={{ margin: `${doc.profile.profileImage && doc.settings.showPhoto ? 10 : 0}px 0 4px`, fontFamily: t.headingFont, fontSize: t.base * 2.3, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: t.primary }}>{name}</h1>
          {doc.profile.headline && <div style={{ fontSize: t.base * 1.05, letterSpacing: 1.5, textTransform: "uppercase", color: t.muted }}>{doc.profile.headline}</div>}
          <div style={{ margin: `${t.sp * 0.7}px auto 0`, borderTop: `1px solid ${t.primary}`, borderBottom: `1px solid ${t.primary}`, padding: "6px 0" }}>
            <ContactLine doc={doc} t={t} sep="   •   " />
          </div>
        </Block>
      );
      break;
    case "classic":
      header = (
        <Block style={{ padding: `${pad}px ${pad}px 0`, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, borderBottom: `3px double ${t.text}`, paddingBottom: t.sp * 0.6, margin: `0 ${pad}px`, paddingLeft: 0, paddingRight: 0 }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: t.headingFont, fontSize: t.base * 2.1, fontWeight: 700, color: t.text }}>{name}</h1>
            {doc.profile.headline && <div style={{ fontSize: t.base * 1.05, color: t.primary, fontStyle: "italic" }}>{doc.profile.headline}</div>}
          </div>
          <div style={{ textAlign: "right", display: "flex", gap: 14, alignItems: "center" }}>
            <ContactLine doc={doc} t={t} vertical />
            <Photo doc={doc} size={76} round={false} />
          </div>
        </Block>
      );
      break;
    case "elegant":
      header = (
        <Block style={{ padding: `${pad * 1.1}px ${pad}px 0`, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Photo doc={doc} size={88} />
          </div>
          <h1 style={{ margin: `${doc.profile.profileImage && doc.settings.showPhoto ? 12 : 0}px 0 2px`, fontFamily: t.headingFont, fontSize: t.base * 2.6, fontWeight: 400, letterSpacing: 4, color: t.primary }}>{name}</h1>
          {doc.profile.headline && <div style={{ fontSize: t.base * 0.95, letterSpacing: 3, textTransform: "uppercase", color: t.muted, marginTop: 4 }}>{doc.profile.headline}</div>}
          <div style={{ marginTop: t.sp * 0.7 }}>
            <ContactLine doc={doc} t={t} sep="  ·  " />
          </div>
        </Block>
      );
      break;
    default: // ats
      header = (
        <Block style={{ padding: `${pad}px ${pad}px 0` }}>
          <h1 style={{ margin: 0, fontSize: t.base * 1.9, fontWeight: 700, color: "#000" }}>{name}</h1>
          {doc.profile.headline && <div style={{ fontSize: t.base * 1.05, color: "#000", marginTop: 2 }}>{doc.profile.headline}</div>}
          <div style={{ marginTop: 6 }}>
            <ContactLine doc={doc} t={t} color="#000" sep=" | " />
          </div>
        </Block>
      );
  }

  return (
    <div className="resume-page" style={root}>
      {header}
      <div style={{ padding: `${t.sp * 1.4}px ${pad}px ${pad}px` }}>{render(order)}</div>
    </div>
  );
}

/** Describes the sidebar column (if any) so paginators can paint page masks correctly. */
export function getSidebarInfo(doc: Doc): { side: "left" | "right"; width: number; color: string } | null {
  if (doc.templateId === "creative") return { side: "left", width: 230, color: doc.settings.primaryColor };
  if (doc.templateId === "technical") return { side: "right", width: 230, color: tint(doc.settings.primaryColor, 0.07) };
  return null;
}
