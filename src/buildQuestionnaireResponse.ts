export type Primitive = string | number | boolean;
export type Coding = { system?: string; code?: string; display?: string };
export type Answer = Primitive | Coding | Array<Primitive | Coding> | null;

export type ItemModel = {
  linkId: string;
  type:
    | "group"
    | "string"
    | "text"
    | "integer"
    | "decimal"
    | "date"
    | "dateTime"
    | "time"
    | "choice"
    | "open-choice"
    | "boolean"
    | "display";
  children: ItemModel[];
};

export type RenderState = Record<string, Answer>;

function normalizeByType(type: ItemModel["type"], v: any): any {
  if (v === null || v === undefined || v === "") return null;
  if (type === "integer") return Math.trunc(Number(v));
  if (type === "decimal") return Number(v);
  if (type === "boolean") return Boolean(v);
  return v;
}

function valueX(type: ItemModel["type"], v: any): any {
  if (v === null || v === undefined) return null;
  switch (type) {
    case "string":
    case "text":
    case "open-choice":
      if (typeof v === "object" && v.code) return { valueCoding: v };
      return { valueString: String(v) };
    case "integer":
      return { valueInteger: Number(v) };
    case "decimal":
      return { valueDecimal: Number(v) };
    case "date":
      return { valueDate: String(v) };
    case "dateTime":
      return { valueDateTime: String(v) };
    case "time":
      return { valueTime: String(v) };
    case "choice":
      return { valueCoding: v };
    case "boolean":
      return { valueBoolean: Boolean(v) };
    default:
      return null;
  }
}

export function buildQuestionnaireResponse(
  questionnaireObj: any,
  modelRoot: ItemModel[],
  st: RenderState,
  isEnabled: (node: ItemModel, state: RenderState) => boolean
): any {
  const walk = (nodes: ItemModel[]): any[] => {
    const out: any[] = [];
    for (const n of nodes) {
      if (!isEnabled(n, st)) continue;

      if (n.type === "group") {
        const children = walk(n.children);
        if (children.length > 0) out.push({ linkId: n.linkId, item: children });
        continue;
      }

      if (n.type === "display") continue;

      const raw = st[n.linkId];
      const arr = Array.isArray(raw) ? raw : [raw];
      const answers = arr
        .map((v) => valueX(n.type, normalizeByType(n.type, v)))
        .filter((x) => !!x);
      const children = walk(n.children);
      if (answers.length > 0 || children.length > 0) {
        const item: any = { linkId: n.linkId };
        if (answers.length > 0) item.answer = answers;
        if (children.length > 0) item.item = children;
        out.push(item);
      }
    }
    return out;
  };

  return {
    resourceType: "QuestionnaireResponse",
    status: "in-progress",
    questionnaire: questionnaireObj.url || `Questionnaire/${questionnaireObj.id || "unknown"}`,
    item: walk(modelRoot)
  };
}

// Revision 4 custom authoring annotations. These values never enter expression evaluation.
export const baselineDemo = {
  resourceType: "Questionnaire", id: "synthetic-baseline-bp", status: "draft",
  title: "Baseline blood-pressure study / 血圧研究・ベースライン",
  description: "Original synthetic demonstration; no real patient data. Experimental authoring annotations, not standard JASPEHR or a finalized FHIR extension.",
  item: [
    { linkId: "identifiers", text: "Study and participant / 研究・参加者", type: "group", item: [
      { linkId: "study-id", text: "Study identifier / 研究ID", type: "string", required: true, initial: [{ valueString: "SYN-BP-001" }], sdtmVariableTarget: { domain: "DM", variable: "STUDYID" } },
      { linkId: "participant-id", text: "Study-local subject identifier / 研究内参加者ID", type: "string", required: true, initial: [{ valueString: "DEMO-001" }], sdtmVariableTarget: { domain: "DM", variable: "SUBJID" }, mappingNote: "Unique within this study only. DM.USUBJID (Unique Subject Identifier across studies) requires sponsor-managed identity resolution; this demo does not derive it." }
    ] },
    { linkId: "demographics", text: "Demographics / 人口統計", type: "group", item: [
      { linkId: "birth-date", text: "Birth date / 生年月日", type: "date", required: true, sdtmVariableTarget: { domain: "DM", variable: "BRTHDTC" } },
      { linkId: "reference-date", text: "Age reference date / 年齢基準日", type: "date", required: true, mappingNote: "Age-reference input only; not DM.RFSTDTC (Subject Reference Start Date/Time) or VS.VSDTC (vital signs collection date/time)." },
      { linkId: "sex", text: "Sex as collected / 性別", type: "choice", sdtmTarget: "SEX.SEX",
        extension: [{ url: "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl", valueCodeableConcept: { coding: [{ code: "drop-down" }] } }],
        answerOption: [
          { valueCoding: { code: "F", display: "F / Female / 女性" } },
          { valueCoding: { code: "INTERSEX", display: "INTERSEX / Intersex / インターセックス" } },
          { valueCoding: { code: "M", display: "M / Male / 男性" } },
          { valueCoding: { code: "U", display: "U / Unknown / 不明" } }
        ]
      }
    ], mappingIntent: {
      inputs: [{ linkId: "birth-date", role: "birthDate" }, { linkId: "reference-date", role: "referenceDate" }],
      output: { sdtmTarget: "AGE.AGE" },
      intent: "生年月日と研究基準日から、基準日時点の年齢を年単位で導出する",
      derivationDescription: "referenceDateからbirthDateを差し引いた期間を、基準日時点の年齢として年単位で表す。満年齢か小数年齢か、部分日付・閏日・丸め等の扱いは下流仕様で明示的に決定する。"
    } },
    { linkId: "vitals", text: "Seated baseline vitals / 座位バイタル", type: "group", item: [
      { linkId: "systolic-bp", text: "Systolic blood pressure (mmHg) / 収縮期血圧", type: "integer", required: true, minValue: { value: 40 }, maxValue: { value: 300 }, sdtmTarget: "SYSBP.VSORRES" },
      { linkId: "diastolic-bp", text: "Diastolic blood pressure (mmHg) / 拡張期血圧", type: "integer", minValue: { value: 20 }, maxValue: { value: 200 }, sdtmTarget: "DIABP.VSORRES" },
      { linkId: "pulse", text: "Pulse (beats/min) / 脈拍", type: "integer", minValue: { value: 20 }, maxValue: { value: 250 }, sdtmTarget: "PULSE.VSORRES" },
      { linkId: "notes", text: "Measurement notes / 測定メモ", type: "text", mappingNotMappedReason: "Demonstration-only free text; no submission variable or link to an individual vital signs record has been specified." }
    ] }
  ]
};

type AuthoringNode = Record<string, any>;
export type Annotation = { linkId: string; kind: "Direct" | "Derived" | "Not mapped" | "Note"; text: string; raw: unknown };
export type AnnotationResult = { annotations: Annotation[]; warnings: string[]; raw: unknown };
const literal = (v: unknown): string => typeof v === "string" ? v : JSON.stringify(v) ?? "(missing)";
export function exactExtension(item: AuthoringNode, canonical: string): any {
  return Array.isArray(item?.extension) ? item.extension.find((e: any) => e?.url === canonical) : undefined;
}
// Verified CDISC specialization identifiers only; base variables use a distinct attribute.
const specializationTargets = new Map([
  ["SYSBP.VSORRES", "VS.VSORRES (SYSBP specialization; VSTESTCD=SYSBP)"],
  ["DIABP.VSORRES", "VS.VSORRES (DIABP specialization; VSTESTCD=DIABP)"],
  ["PULSE.VSORRES", "VS.VSORRES (PULSE specialization; VSTESTCD=PULSE)"],
  ["SEX.SEX", "DM.SEX (SEX specialization; Sex; codelist C66731)"],
  ["AGE.AGE", "DM.AGE (AGE specialization)"]
]);
const baseVariableTargets = new Map([
  ["DM.STUDYID", "Study Identifier"],
  ["DM.SUBJID", "Subject Identifier for the Study"],
  ["DM.BRTHDTC", "Date/Time of Birth"]
]);
function targetLabel(v: unknown): string {
  return typeof v === "string" && specializationTargets.has(v) ? specializationTargets.get(v)! : `Unresolved target: ${literal(v)}`;
}
function baseVariableLabel(v: any): string {
  const key = `${literal(v?.domain)}.${literal(v?.variable)}`;
  return baseVariableTargets.has(key) ? `${key} (${baseVariableTargets.get(key)}; base SDTM variable, no specialization ID asserted)` : `Unresolved base variable target: ${literal(v)}`;
}
function mappingOutputLabel(output: any): string {
  if (output?.sdtmTarget !== undefined) return targetLabel(output.sdtmTarget);
  if (output?.sdtmVariableTarget !== undefined) return baseVariableLabel(output.sdtmVariableTarget);
  if (output?.cdiscConcept !== undefined) return `CDISC concept ${literal(output.cdiscConcept)} (domain unresolved)`;
  return "Unresolved target: missing output";
}
export function parseAnnotations(q: AuthoringNode): AnnotationResult {
  const nodes: AuthoringNode[] = [];
  const visit = (n: AuthoringNode) => { nodes.push(n); if (Array.isArray(n.item)) n.item.forEach(visit); };
  visit(q);
  const ids = new Map<string, number>();
  for (const n of nodes) if (typeof n.linkId === "string") ids.set(n.linkId, (ids.get(n.linkId) ?? 0) + 1);
  const warnings: string[] = [];
  const annotations: Annotation[] = [];
  for (const [id, count] of ids) if (count > 1) warnings.push(`Duplicate input linkId: ${id}`);
  for (const n of nodes) {
    if (n.sdtmTarget !== undefined || n.sdtmVariableTarget !== undefined || n.cdiscConcept !== undefined) {
      const target = mappingOutputLabel(n);
      annotations.push({ linkId: literal(n.linkId), kind: "Direct", text: `Direct → ${target}`, raw: { sdtmTarget: n.sdtmTarget, sdtmVariableTarget: n.sdtmVariableTarget, cdiscConcept: n.cdiscConcept } });
      if (n.sdtmTarget === "AGE.AGE" && (n.type === "date" || n.type === "dateTime")) warnings.push(`${literal(n.linkId)}: direct AGE mapping is unsuitable for a date input used in age derivation.`);
    }
    if (n.mappingNotMappedReason !== undefined) annotations.push({ linkId: literal(n.linkId), kind: "Not mapped", text: `Not mapped / demonstration-only: ${literal(n.mappingNotMappedReason)}`, raw: { mappingNotMappedReason: n.mappingNotMappedReason } });
    if (n.mappingNote !== undefined) annotations.push({ linkId: literal(n.linkId), kind: "Note", text: `Mapping note: ${literal(n.mappingNote)}`, raw: { mappingNote: n.mappingNote } });
    if (n.mappingIntent === undefined) continue;
    const m = n.mappingIntent;
    if (!m || typeof m !== "object" || !Array.isArray(m.inputs) || !m.inputs.length || !m.output || typeof m.output !== "object") {
      warnings.push(`Malformed mappingIntent on ${literal(n.linkId ?? "Questionnaire")}`); continue;
    }
    const target = mappingOutputLabel(m.output);
    if (m.output.sdtmTarget && !specializationTargets.has(m.output.sdtmTarget)) warnings.push(target);
    for (const input of m.inputs) {
      const id = input?.linkId;
      if (typeof id !== "string" || !ids.has(id)) warnings.push(`Missing input reference: ${literal(id)}`);
      const role = literal(input?.role);
      annotations.push({ linkId: literal(id), kind: "Derived", text: `Input ${literal(id)} [${role}] → used to derive ${target}; not a direct mapping.`, raw: m });
    }
  }
  for (const n of nodes) {
    if (typeof n.linkId !== "string" || !n.type || n.type === "group" || n.type === "display") continue;
    if (!annotations.some(a => a.linkId === n.linkId && a.kind !== "Note")) {
      annotations.push({ linkId: n.linkId, kind: "Not mapped", text: "Not mapped / demonstration-only: No mapping intent has been specified for this data-entry field.", raw: { mappingNotMappedReason: "No mapping intent specified" } });
    }
  }
  return { annotations, warnings, raw: q };
}
export function escapeCrf(value: unknown): string {
  return literal(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
export function annotatedCrfHtml(q: AuthoringNode): string {
  const parsed = parseAnnotations(q);
  const esc = escapeCrf;
  const fields = (items: AuthoringNode[] = []): string => items.map(n => {
    const annotations = parsed.annotations.filter(a => a.linkId === n.linkId);
    const heading = `<h3>${esc(n.text ?? n.linkId)}${n.required ? " *" : ""}</h3>`;
    if (n.type === "group") return `<section class="group">${heading}${fields(n.item)}</section>`;
    const options = Array.isArray(n.answerOption) ? n.answerOption.map((o: any) => esc(o.valueCoding?.display ?? o.valueString ?? o.valueCoding?.code)).join(" / ") : "";
    return `<article class="field">${heading}<small>${esc(n.linkId)} · ${esc(n.type)}${options ? ` · ${options}` : ""}</small>${n.type === "display" ? "" : '<div class="blank">&nbsp;</div>'}${annotations.map(a => `<p class="annotation">${esc(a.text)}</p>`).join("")}</article>${Array.isArray(n.item) ? fields(n.item) : ""}`;
  }).join("");
  const intents: AuthoringNode[] = [];
  const scan = (n: AuthoringNode) => { if (n.mappingIntent) intents.push(n.mappingIntent); if (Array.isArray(n.item)) n.item.forEach(scan); };
  scan(q);
  const rawDirectTargets = parsed.annotations.filter(a => a.kind === "Direct").map(a => JSON.stringify({ linkId: a.linkId, raw: a.raw })).join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src 'none'; base-uri 'none'; form-action 'none'"><title>Annotated CRF</title><style>
@page{size:A4;margin:16mm;@bottom-right{content:"Page " counter(page) " / " counter(pages);font-size:9pt;color:#526575}}
*{box-sizing:border-box}body{font:10pt "Noto Sans CJK JP","Noto Sans JP",sans-serif;color:#203548;margin:0;line-height:1.5;overflow-wrap:anywhere}h1{font-size:19pt;line-height:1.4;margin:0 0 8pt}h2{font-size:14pt;margin:16pt 0 8pt}h3{font-size:11pt;margin:0 0 4pt}header{border-bottom:3pt solid #167b85;padding-bottom:10pt}p{margin:5pt 0}small{color:#526575}.notice{background:#edf5f5;padding:9pt;border-left:3pt solid #167b85}.group>h3{background:#e9eff4;padding:6pt;margin-top:12pt;break-after:avoid}.field{border:1px solid #c9d4dd;padding:8pt;margin:6pt 0;break-inside:avoid}.blank{border-bottom:1px solid #879ba9;height:22pt}.annotation{color:#075862;border-left:2pt solid #167b85;padding-left:7pt;font-size:9pt}.appendix{break-before:page}pre{white-space:pre-wrap;font-size:7.5pt;line-height:1.25;overflow-wrap:anywhere}a{color:#075862}.warning{color:#973c15}footer{font-size:8pt;border-top:1px solid #c9d4dd;margin-top:12pt;padding-top:6pt}@media screen{body{max-width:780px;margin:24px auto;padding:24px;box-shadow:0 1px 12px #ccd4da}.appendix{margin-top:40px}}
</style></head><body><header><small>ORIGINAL SYNTHETIC STUDY · BLANK DEFINITION-BASED FORM</small><h1>${esc(q.title ?? "Questionnaire").replace(" / ", "<br>")}</h1><p>Annotated Case Report Form (CRF) · Study Data Tabulation Model (SDTM)</p></header>
<p class="notice">Experimental custom authoring annotations; not standard JASPEHR or a finalized Fast Healthcare Interoperability Resources (FHIR) extension. All fields are blank regardless of entered answers. No real patient data. * Required field.</p>
${fields(q.item)}
<section class="appendix"><h2>Mapping intent and review boundaries</h2><p>Clinical Data Interchange Standards Consortium (CDISC) Dataset Specialization targets: VS = Vital Signs; DM = Demographics; STUDYID = Study Identifier; SUBJID = Subject Identifier for the Study; USUBJID = Unique Subject Identifier across studies; BRTHDTC = Date/Time of Birth; SEX = Sex; PULSE = Pulse Rate; DIABP = diastolic blood pressure; VSORRES = original result; VSTESTCD = vital signs test short name; SYSBP = systolic blood pressure; AGE = age.</p>
<p class="notice">Derived is this demo’s intent. The official AGE specialization declares Collected. This demo does not claim full specialization compliance, execute derivations, or generate an SDTM dataset.</p>
${intents.map(m => `<article class="field"><h3>Derived direction</h3><p>${esc(Array.isArray(m.inputs) ? m.inputs.map((i: any) => `${literal(i?.linkId)} [${literal(i?.role)}]`).join(" + ") : "Missing inputs")} → ${esc(mappingOutputLabel(m.output))}</p><p>Intent: ${esc(m.intent ?? "Not provided")}</p><p>Optional derivation description (inert text): ${esc(m.derivationDescription ?? "Not provided")}</p></article>`).join("")}
<p>Unresolved downstream decisions: completed years versus fractional age; partial or missing dates; leap-day birthdays; timezone/date boundaries; invalid date order; rounding. No age is calculated in this demonstration.</p>
${parsed.warnings.map(w => `<p class="warning">Review warning: ${esc(w)}</p>`).join("")}
<h2>Raw authoring metadata</h2><p>The original attributes and unknown metadata are preserved in the downloadable Questionnaire JSON. This display never evaluates annotation content.</p><h3>Direct targets</h3><pre>${esc(rawDirectTargets)}</pre><h3>Mapping intents</h3><pre>${esc(intents.map(m => JSON.stringify(m)).join("\n\n"))}</pre>
<footer>Independent synthetic layout inspired only by the baseline blood-pressure research context of the <a href="https://biolincc.nhlbi.nih.gov/studies/sprint/">Systolic Blood Pressure Intervention Trial (SPRINT)</a>. No original form, logo, or affiliation. Source design: author-supplied revision 4 examples.</footer></section></body></html>`;
}
