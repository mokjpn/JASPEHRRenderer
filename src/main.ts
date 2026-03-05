import "./style.css";
import * as fhirpath from "fhirpath";
import { buildQuestionnaireResponse, type Answer, type Coding, type ItemModel, type Primitive, type RenderState } from "./buildQuestionnaireResponse";
import sampleQuestionnaireText from "./sample-questionnaire.json?raw";

type ItemType =
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

type AppItemModel = ItemModel & {
  linkId: string;
  text: string;
  type: ItemType;
  required?: boolean;
  readOnly?: boolean;
  repeats?: boolean;
  min?: number;
  max?: number;
  regex?: string;
  options: Coding[];
  control?: "radio" | "checkbox" | "dropdown" | "gtable";
  enableWhen?: Array<{
    question: string;
    operator?: string;
    answerCoding?: Coding;
    answerString?: string;
    answerInteger?: number;
    answerDecimal?: number;
    answerBoolean?: boolean;
    answerDate?: string;
    answerDateTime?: string;
    answerTime?: string;
  }>;
  enableBehavior?: "all" | "any";
  initial?: unknown;
  initialExpression?: { language?: string; expression?: string };
  calculatedExpression?: { language?: string; expression?: string };
  children: AppItemModel[];
};

type ValidationErr = { linkId: string; message: string };
const EXT = {
  itemControl: "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl",
  regex: "regex",
  initialExpression: "questionnaire-initialExpression",
  calculatedExpression: "questionnaire-calculatedExpression"
};

const LS_KEYS = {
  questionnaire: "jaspehr.q",
  state: "jaspehr.state",
  autosave: "jaspehr.autosave",
  source: "jaspehr.source"
};

let sampleText = "";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("app not found");

app.innerHTML = `
  <div class="app">
    <header class="header"><h1>FHIR SDC + JASPEHR v0.5.11 Questionnaire Renderer</h1></header>
    <main class="layout">
      <section class="panel" id="left"></section>
      <section class="panel" id="center"></section>
      <section class="panel" id="right"></section>
    </main>
  </div>
`;

const left = document.getElementById("left")!;
const center = document.getElementById("center")!;
const right = document.getElementById("right")!;

let questionnaire: any = null;
let modelRoot: AppItemModel[] = [];
let state: RenderState = {};
let errors: ValidationErr[] = [];
let schemaErrors: ValidationErr[] = [];
let autosave = localStorage.getItem(LS_KEYS.autosave) !== "off";
let questionnaireSource: "bundled" | "custom" = "bundled";
let tabNavigationInProgress = false;

document.addEventListener("keydown", (ev) => {
  if (ev.key === "Tab") tabNavigationInProgress = true;
});

document.addEventListener("keyup", (ev) => {
  if (ev.key === "Tab") tabNavigationInProgress = false;
});
function getExt(item: any, token: string): any | undefined {
  return item?.extension?.find((e: any) => typeof e.url === "string" && e.url.includes(token));
}

function mapControl(item: any): "radio" | "checkbox" | "dropdown" | "gtable" | undefined {
  const ext = getExt(item, EXT.itemControl);
  const code = ext?.valueCodeableConcept?.coding?.[0]?.code;
  if (code === "radio-button" || code === "radio") return "radio";
  if (code === "check-box" || code === "checkbox") return "checkbox";
  if (code === "drop-down" || code === "dropdown") return "dropdown";
  if (code === "gtable") return "gtable";
  return undefined;
}

function parseMinMax(item: any, key: "minValue" | "maxValue"): number | undefined {
  const mv = item?.[key];
  if (!mv) return undefined;
  if (typeof mv.value === "number") return mv.value;
  if (typeof mv.valueInteger === "number") return mv.valueInteger;
  if (typeof mv.valueDecimal === "number") return mv.valueDecimal;
  return undefined;
}

function buildModel(items: any[] = [], parent = ""): AppItemModel[] {
  return items.map((it) => {
    const type = it.type as ItemType;
    const initialExpr = getExt(it, EXT.initialExpression)?.valueExpression;
    const calcExpr = getExt(it, EXT.calculatedExpression)?.valueExpression;
    const regexExt = getExt(it, EXT.regex);

    const model: AppItemModel = {
      linkId: it.linkId,
      text: it.text || it.linkId,
      type,
      required: !!it.required,
      readOnly: !!it.readOnly,
      repeats: !!it.repeats,
      min: parseMinMax(it, "minValue"),
      max: parseMinMax(it, "maxValue"),
      regex: regexExt?.valueString,
      control: mapControl(it),
      options: (it.answerOption || [])
        .map((o: any) => o.valueCoding)
        .filter((x: any) => !!x),
      enableWhen: it.enableWhen,
      enableBehavior: it.enableBehavior,
      initial: it.initial?.[0],
      initialExpression: initialExpr,
      calculatedExpression: calcExpr,
      children: buildModel(it.item || [], `${parent}/${it.linkId}`)
    };
    return model;
  });
}

function validateQuestionnaireRules(nodes: AppItemModel[], out: ValidationErr[] = []): ValidationErr[] {
  for (const n of nodes) {
    if (n.type === "choice" && !n.control) {
      out.push({ linkId: n.linkId, message: "jsp-6: choice には itemControl が必須です。" });
    }
    if (n.initialExpression && n.calculatedExpression) {
      out.push({
        linkId: n.linkId,
        message: "jsp-7: initialExpression と calculatedExpression は同時指定できません。"
      });
    }
    if (n.repeats && n.type !== "group") {
      out.push({
        linkId: n.linkId,
        message: "JASPEHR制約: repeats=true は group のみ許容です。"
      });
    }
    if (n.enableWhen) {
      for (const ew of n.enableWhen) {
        if (ew.operator !== "=") {
          out.push({ linkId: n.linkId, message: "JASPEHR制約: enableWhen.operator は '=' のみ対応。" });
        }
        if (
          ew.answerCoding === undefined &&
          ew.answerString === undefined &&
          ew.answerInteger === undefined &&
          ew.answerDecimal === undefined &&
          ew.answerBoolean === undefined &&
          ew.answerDate === undefined &&
          ew.answerDateTime === undefined &&
          ew.answerTime === undefined
        ) {
          out.push({
            linkId: n.linkId,
            message: "enableWhen の answer[x] が未設定です。"
          });
        }
      }
    }
    validateQuestionnaireRules(n.children, out);
  }
  return out;
}

function codingEq(a?: Coding, b?: Coding): boolean {
  return !!a && !!b && a.code === b.code && a.system === b.system;
}

function toPrimitiveValue(value: any): Primitive | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return null;
}

function extractNum(v: Answer): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function getOptionLabel(c: Coding): string {
  return c.display || `${c.system || ""}|${c.code || ""}`;
}

function getValueByLinkId(linkId: string): any {
  const v = state[linkId];
  if (Array.isArray(v)) return v[0];
  return v;
}

function evalSimpleExpression(expression: string): unknown {
  let s = expression;
  s = s.replace(/linkId\('([^']+)'\)/g, (_m, lid) => JSON.stringify(getValueByLinkId(lid) ?? null));
  s = s.replace(/%([A-Za-z0-9_\-]+)/g, (_m, key) => JSON.stringify(getValueByLinkId(key) ?? null));

  if (!/^[\w\s+\-*/().,'":|%<>=!?&\[\]]+$/.test(s)) {
    return null;
  }
  try {
    return Function(`"use strict"; return (${s});`)();
  } catch {
    return null;
  }
}

function evalExpression(expr?: { language?: string; expression?: string }): unknown {
  if (!expr || !expr.expression) return null;
  if (expr.language && expr.language !== "text/fhirpath") return null;
  try {
    const env: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(state)) {
      env[k] = Array.isArray(v) ? v[0] : v;
    }
    const result = (fhirpath as any).evaluate({ resourceType: "QuestionnaireResponse" }, expr.expression, env);
    if (Array.isArray(result)) return result[0] ?? null;
    return result ?? null;
  } catch {
    return evalSimpleExpression(expr.expression);
  }
}

function assignInitialValues(nodes: AppItemModel[]) {
  for (const n of nodes) {
    if (n.type === "choice") {
      const rawOptions = questionnaire?.item ? findRawItem(questionnaire.item, n.linkId)?.answerOption : [];
      const selected = (rawOptions || []).filter((o: any) => o.initialSelected).map((o: any) => o.valueCoding);
      if (selected.length > 0) {
        state[n.linkId] = n.control === "checkbox" ? selected : selected[0];
      }
    }

    const iv: any = n.initial;
    if (iv) {
      const v =
        iv.valueString ??
        iv.valueInteger ??
        iv.valueDecimal ??
        iv.valueBoolean ??
        iv.valueDate ??
        iv.valueDateTime ??
        iv.valueTime ??
        null;
      if (v !== null) state[n.linkId] = v;
    }

    if (n.initialExpression) {
      const v = evalExpression(n.initialExpression);
      if (v !== null && v !== undefined) state[n.linkId] = v as Answer;
    }

    assignInitialValues(n.children);
  }
}

function recalcCalculated(nodes: AppItemModel[]) {
  for (const n of nodes) {
    if (n.calculatedExpression) {
      const v = evalExpression(n.calculatedExpression);
      if (v !== null && v !== undefined) {
        if (n.type === "integer") state[n.linkId] = Math.trunc(Number(v));
        else if (n.type === "decimal") state[n.linkId] = Number(v);
        else state[n.linkId] = v as Answer;
      }
    }
    recalcCalculated(n.children);
  }
}

function expectedEnableWhenValue(ew: NonNullable<AppItemModel["enableWhen"]>[number]): unknown {
  if (ew.answerCoding !== undefined) return ew.answerCoding;
  if (ew.answerString !== undefined) return ew.answerString;
  if (ew.answerInteger !== undefined) return ew.answerInteger;
  if (ew.answerDecimal !== undefined) return ew.answerDecimal;
  if (ew.answerBoolean !== undefined) return ew.answerBoolean;
  if (ew.answerDate !== undefined) return ew.answerDate;
  if (ew.answerDateTime !== undefined) return ew.answerDateTime;
  if (ew.answerTime !== undefined) return ew.answerTime;
  return undefined;
}

function enableWhenEquals(current: unknown, expected: unknown): boolean {
  if (expected === undefined) return false;
  if (typeof expected === "object" && expected !== null) {
    if (typeof current === "object" && current !== null) return codingEq(current as Coding, expected as Coding);
    return false;
  }
  return current === expected;
}

function isEnabled(n: AppItemModel, st: RenderState = state): boolean {
  if (!n.enableWhen || n.enableWhen.length === 0) return true;

  const results = n.enableWhen.map((ew) => {
    const current = st[ew.question];
    const expected = expectedEnableWhenValue(ew);
    if (Array.isArray(current)) return current.some((x) => enableWhenEquals(x, expected));
    return enableWhenEquals(current, expected);
  });

  const behavior = n.enableBehavior === "all" ? "all" : "any";
  return behavior === "all" ? results.every(Boolean) : results.some(Boolean);
}

function validateInputs(nodes: AppItemModel[], out: ValidationErr[] = []): ValidationErr[] {
  for (const n of nodes) {
    const enabled = isEnabled(n);
    if (!enabled) {
      continue;
    }

    const v = state[n.linkId];
    const empty =
      v === null ||
      v === undefined ||
      v === "" ||
      (Array.isArray(v) && v.length === 0);

    if (n.type !== "display" && n.required && empty) {
      out.push({ linkId: n.linkId, message: "必須項目です。" });
    }

    if ((n.type === "integer" || n.type === "decimal") && !empty) {
      const num = extractNum(v);
      if (num === null) {
        out.push({ linkId: n.linkId, message: "数値形式で入力してください。" });
      } else {
        if (n.min !== undefined && num < n.min) {
          out.push({ linkId: n.linkId, message: `最小値 ${n.min} 未満です。` });
        }
        if (n.max !== undefined && num > n.max) {
          out.push({ linkId: n.linkId, message: `最大値 ${n.max} を超えています。` });
        }
      }
    }

    if (n.regex && (n.type === "string" || n.type === "text") && typeof v === "string") {
      try {
        const re = new RegExp(n.regex);
        if (!re.test(v)) {
          out.push({ linkId: n.linkId, message: `正規表現に一致しません: ${n.regex}` });
        }
      } catch {
        out.push({ linkId: n.linkId, message: `正規表現が不正です: ${n.regex}` });
      }
    }

    validateInputs(n.children, out);
  }
  return out;
}

function findRawItem(items: any[], linkId: string): any | null {
  for (const item of items || []) {
    if (item.linkId === linkId) return item;
    const found = findRawItem(item.item || [], linkId);
    if (found) return found;
  }
  return null;
}

function rerenderCenterPreservingFocus() {
  const active = document.activeElement as HTMLElement | null;
  const focusKey = active?.dataset?.focusKey;

  renderCenter();

  if (!focusKey) return;
  const nodes = Array.from(center.querySelectorAll<HTMLElement>("[data-focus-key]"));
  const target = nodes.find((n) => n.dataset.focusKey === focusKey);
  target?.focus();
}
function renderInput(container: HTMLElement, n: AppItemModel, enabled: boolean) {
  const id = `item-${n.linkId}`;
  const wrap = document.createElement("div");
  wrap.className = "item" + (enabled ? "" : " hidden");
  wrap.id = id;

  const title = document.createElement("div");
  title.className = "field-title";
  title.textContent = `${n.text} (${n.type})${n.required ? " *" : ""}`;
  wrap.appendChild(title);

  const help = document.createElement("div");
  help.className = "help";
  help.textContent = `linkId: ${n.linkId}`;
  wrap.appendChild(help);

  const value = state[n.linkId];

  const updateState = (next: any, rerenderCenter: boolean, mode: "soft" | "hard" = "hard") => {
    state[n.linkId] = next;
    if (mode === "soft") {
      persistIfNeeded();
      return;
    }
    recalcCalculated(modelRoot);
    errors = [...schemaErrors, ...validateInputs(modelRoot)];
    if (rerenderCenter) rerenderCenterPreservingFocus();
    renderRight();
    persistIfNeeded();
  };

  const onChange = (next: any) => updateState(next, true, "hard");

  if (n.type === "choice") {
    if (n.control === "radio") {
      for (const opt of n.options) {
        const l = document.createElement("label");
        l.className = "field";
        const inp = document.createElement("input");
        inp.type = "radio";
        inp.name = n.linkId;
        inp.disabled = !enabled || !!n.readOnly;
        inp.checked = codingEq(value as Coding, opt);
        inp.dataset.focusKey = n.linkId;
        inp.onchange = () => onChange(opt);
        l.append(inp, document.createTextNode(" " + getOptionLabel(opt)));
        wrap.appendChild(l);
      }
    } else if (n.control === "checkbox") {
      const current = Array.isArray(value) ? (value as Coding[]) : [];
      for (const opt of n.options) {
        const l = document.createElement("label");
        l.className = "field";
        const inp = document.createElement("input");
        inp.type = "checkbox";
        inp.disabled = !enabled || !!n.readOnly;
        inp.checked = current.some((c) => codingEq(c, opt));
        inp.dataset.focusKey = n.linkId;
        inp.onchange = () => {
          const next = current.filter((c) => !codingEq(c, opt));
          if (inp.checked) next.push(opt);
          onChange(next);
        };
        l.append(inp, document.createTextNode(" " + getOptionLabel(opt)));
        wrap.appendChild(l);
      }
    } else {
      const sel = document.createElement("select");
      sel.disabled = !enabled || !!n.readOnly;
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "-- select --";
      sel.appendChild(empty);
      n.options.forEach((opt, idx) => {
        const o = document.createElement("option");
        o.value = String(idx);
        o.textContent = getOptionLabel(opt);
        if (codingEq(value as Coding, opt)) o.selected = true;
        sel.appendChild(o);
      });
      sel.dataset.focusKey = n.linkId;
      sel.onchange = () => {
        if (sel.value === "") onChange(null);
        else onChange(n.options[Number(sel.value)]);
      };
      wrap.appendChild(sel);
    }
  } else if (n.type === "boolean") {
    const inp = document.createElement("input");
    inp.type = "checkbox";
    inp.checked = !!value;
    inp.disabled = !enabled || !!n.readOnly;
    inp.dataset.focusKey = n.linkId;
    inp.onchange = () => onChange(inp.checked);
    wrap.appendChild(inp);
  } else if (n.type !== "group" && n.type !== "display") {
    const inp = n.type === "text" ? document.createElement("textarea") : document.createElement("input");
    if (inp instanceof HTMLInputElement) {
      inp.type =
        n.type === "integer" || n.type === "decimal"
          ? "number"
          : n.type === "date"
            ? "date"
            : n.type === "dateTime"
              ? "datetime-local"
              : n.type === "time"
                ? "time"
                : "text";
      if (n.min !== undefined && (n.type === "integer" || n.type === "decimal")) inp.min = String(n.min);
      if (n.max !== undefined && (n.type === "integer" || n.type === "decimal")) inp.max = String(n.max);
      if (n.regex) inp.pattern = n.regex;
    }

    const textInput = inp as HTMLInputElement | HTMLTextAreaElement;
    let composing = false;
    const useChangeEvent = n.type === "date" || n.type === "dateTime" || n.type === "time";
    const commitSoft = () => updateState(textInput.value, false, "soft");
    const commitHard = () => updateState(textInput.value, true, "hard");

    textInput.dataset.focusKey = n.linkId;
    textInput.disabled = !enabled || !!n.readOnly;
    textInput.value = value == null ? "" : String(value);
    textInput.addEventListener("compositionstart", () => {
      composing = true;
    });
    textInput.addEventListener("compositionend", () => {
      composing = false;
      commitSoft();
    });

    if (useChangeEvent) {
      textInput.addEventListener("change", commitHard);
    } else {
      textInput.addEventListener("input", () => {
        if (composing) return;
        commitSoft();
      });
      textInput.addEventListener("blur", () => {
        if (tabNavigationInProgress) {
          setTimeout(() => {
            commitHard();
          }, 0);
          return;
        }
        commitHard();
      });
    }

    wrap.appendChild(inp);
  }

  if (n.children.length > 0) {
    const childWrap = document.createElement("div");
    childWrap.className = "sub-items";
    for (const c of n.children) renderNode(childWrap, c);
    wrap.appendChild(childWrap);
  }

  const itemErrs = errors.filter((e) => e.linkId === n.linkId);
  for (const e of itemErrs) {
    const err = document.createElement("div");
    err.className = "error";
    err.textContent = e.message;
    wrap.appendChild(err);
  }

  container.appendChild(wrap);
}

function renderGroupTable(container: HTMLElement, group: AppItemModel, enabled: boolean) {
  const wrap = document.createElement("div");
  wrap.className = "gtable-wrap";

  if (group.repeats) {
    const note = document.createElement("div");
    note.className = "help";
    note.textContent = "gtable + repeats は表示のみ1行で描画します。";
    wrap.appendChild(note);
  }

  const table = document.createElement("table");
  table.className = "gtable";

  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  for (const child of group.children) {
    const th = document.createElement("th");
    th.textContent = child.text;
    hr.appendChild(th);
  }
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  const row = document.createElement("tr");
  for (const child of group.children) {
    const td = document.createElement("td");
    if (child.type === "display") {
      const txt = document.createElement("div");
      txt.className = "field-title";
      txt.textContent = child.text;
      td.appendChild(txt);
    } else if (child.type === "group") {
      renderNode(td, child);
    } else {
      renderInput(td, child, enabled && isEnabled(child));
    }
    row.appendChild(td);
  }
  tbody.appendChild(row);
  table.appendChild(tbody);

  wrap.appendChild(table);
  container.appendChild(wrap);
}
function renderNode(container: HTMLElement, n: AppItemModel) {
  const enabled = isEnabled(n);
  if (n.type === "group") {
    const g = document.createElement("section");
    g.className = "group" + (enabled ? "" : " hidden");
    const h = document.createElement("h3");
    h.textContent = n.text;
    g.appendChild(h);
    const m = document.createElement("div");
    m.className = "help";
    m.textContent = `group linkId: ${n.linkId}`;
    g.appendChild(m);
    if (n.control === "gtable") {
      renderGroupTable(g, n, enabled);
    } else {
      for (const c of n.children) renderNode(g, c);
    }
    container.appendChild(g);
    return;
  }
  renderInput(container, n, enabled);
}

function renderLeft() {
  left.innerHTML = "";
  const title = document.createElement("div");
  title.className = "panel-title";
  title.textContent = "Questionnaire JSON";
  left.appendChild(title);

  const ta = document.createElement("textarea");
  ta.value = questionnaire ? JSON.stringify(questionnaire, null, 2) : sampleText;
  left.appendChild(ta);

  const row = document.createElement("div");
  row.className = "row";

  const loadBtn = document.createElement("button");
  loadBtn.className = "primary";
  loadBtn.textContent = "JSONを読み込み";
  loadBtn.onclick = () => {
    try {
      questionnaire = JSON.parse(ta.value);
      const isBundledFromEditor = ta.value === sampleText;
      questionnaireSource = isBundledFromEditor ? "bundled" : "custom";
      modelRoot = buildModel(questionnaire.item || []);
      schemaErrors = validateQuestionnaireRules(modelRoot);
      state = {};
      assignInitialValues(modelRoot);
      recalcCalculated(modelRoot);
      render();
    } catch (e) {
      alert(`JSON parse error: ${(e as Error).message}`);
    }
  };
  row.appendChild(loadBtn);

  const file = document.createElement("input");
  file.type = "file";
  file.accept = ".json,application/json";
  file.onchange = async () => {
    const f = file.files?.[0];
    if (!f) return;
    ta.value = await f.text();
  };
  row.appendChild(file);

  const loadSample = document.createElement("button");
  loadSample.textContent = "サンプル";
  loadSample.onclick = () => {
    questionnaireSource = "bundled";
    ta.value = sampleText;
  };
  row.appendChild(loadSample);

  left.appendChild(row);

  const as = document.createElement("label");
  as.className = "field";
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.checked = autosave;
  cb.onchange = () => {
    autosave = cb.checked;
    localStorage.setItem(LS_KEYS.autosave, autosave ? "on" : "off");
  };
  as.append(cb, document.createTextNode(" localStorage 自動保存"));
  left.appendChild(as);
}

function renderCenter() {
  center.innerHTML = "";
  const title = document.createElement("div");
  title.className = "panel-title";
  title.textContent = "フォーム";
  center.appendChild(title);

  if (!questionnaire) {
    const p = document.createElement("div");
    p.textContent = "左側で Questionnaire JSON を読み込んでください。";
    center.appendChild(p);
    return;
  }

  errors = [...schemaErrors, ...validateInputs(modelRoot)];
  for (const n of modelRoot) renderNode(center, n);

  const row = document.createElement("div");
  row.className = "row";

  const outBtn = document.createElement("button");
  outBtn.className = "primary";
  outBtn.textContent = "QuestionnaireResponse を生成";
  outBtn.onclick = () => {
    const qr = buildQuestionnaireResponse(questionnaire, modelRoot, state, (node, st) => isEnabled(node as AppItemModel, st));
    const qrText = JSON.stringify(qr, null, 2);
    (document.getElementById("qr-preview") as HTMLPreElement).textContent = qrText;
    const blob = new Blob([qrText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "QuestionnaireResponse.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  row.appendChild(outBtn);

  const copyBtn = document.createElement("button");
  copyBtn.textContent = "QRをコピー";
  copyBtn.onclick = async () => {
    const qr = buildQuestionnaireResponse(questionnaire, modelRoot, state, (node, st) => isEnabled(node as AppItemModel, st));
    await navigator.clipboard.writeText(JSON.stringify(qr, null, 2));
  };
  row.appendChild(copyBtn);

  center.appendChild(row);
}

function renderRight() {
  right.innerHTML = "";
  const title = document.createElement("div");
  title.className = "panel-title";
  title.textContent = "Validation / Debug";
  right.appendChild(title);

  const errTitle = document.createElement("h3");
  errTitle.textContent = `エラー一覧 (${errors.length})`;
  right.appendChild(errTitle);

  const errList = document.createElement("div");
  errList.className = "error-list";
  for (const e of errors) {
    const b = document.createElement("button");
    b.textContent = `${e.linkId}: ${e.message}`;
    b.onclick = () => document.getElementById(`item-${e.linkId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    errList.appendChild(b);
  }
  right.appendChild(errList);

  const stTitle = document.createElement("h3");
  stTitle.textContent = "state";
  right.appendChild(stTitle);

  const stPre = document.createElement("pre");
  stPre.textContent = JSON.stringify(state, null, 2);
  right.appendChild(stPre);

  const qrTitle = document.createElement("h3");
  qrTitle.textContent = "QuestionnaireResponse Preview";
  right.appendChild(qrTitle);

  const qrPre = document.createElement("pre");
  qrPre.id = "qr-preview";
  if (questionnaire) {
    qrPre.textContent = JSON.stringify(
      buildQuestionnaireResponse(questionnaire, modelRoot, state, (node, st) => isEnabled(node as AppItemModel, st)),
      null,
      2
    );
  }
  right.appendChild(qrPre);
}

function persistIfNeeded() {
  if (!autosave || !questionnaire) return;
  localStorage.setItem(LS_KEYS.questionnaire, JSON.stringify(questionnaire));
  localStorage.setItem(LS_KEYS.state, JSON.stringify(state));
  localStorage.setItem(LS_KEYS.source, questionnaireSource);
}

function render() {
  renderLeft();
  renderCenter();
  renderRight();
  persistIfNeeded();
}

function boot() {
  sampleText = sampleQuestionnaireText || '{"resourceType":"Questionnaire","status":"active","item":[]}';
  doBoot();
}

function doBoot() {
  let bundledSample: any = { resourceType: "Questionnaire", status: "active", item: [] };
  try {
    bundledSample = JSON.parse(sampleText);
  } catch {
    // fallback to minimal questionnaire
  }

  const savedQ = localStorage.getItem(LS_KEYS.questionnaire);
  const savedSt = localStorage.getItem(LS_KEYS.state);
  const savedSource = localStorage.getItem(LS_KEYS.source);

  if (savedQ) {
    try {
      const savedQuestionnaire = JSON.parse(savedQ);
      const sameBundledIdentity =
        savedQuestionnaire?.resourceType === "Questionnaire" &&
        bundledSample?.resourceType === "Questionnaire" &&
        savedQuestionnaire?.id === bundledSample?.id &&
        savedQuestionnaire?.url === bundledSample?.url;

      const useBundledSample = sameBundledIdentity;

      questionnaire = useBundledSample ? bundledSample : savedQuestionnaire;
      questionnaireSource = useBundledSample ? "bundled" : "custom";
      modelRoot = buildModel(questionnaire.item || []);
      schemaErrors = validateQuestionnaireRules(modelRoot);

      state = savedSt ? JSON.parse(savedSt) : {};
      if (useBundledSample && Object.keys(state).length === 0) {
        assignInitialValues(modelRoot);
      }

      recalcCalculated(modelRoot);
      render();
      return;
    } catch {
      // ignore broken storage
    }
  }

  questionnaire = bundledSample;
  questionnaireSource = "bundled";
  modelRoot = buildModel(questionnaire.item || []);
  schemaErrors = validateQuestionnaireRules(modelRoot);
  state = {};
  assignInitialValues(modelRoot);
  recalcCalculated(modelRoot);
  render();
}
boot();














