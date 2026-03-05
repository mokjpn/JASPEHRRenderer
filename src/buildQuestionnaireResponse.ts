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
