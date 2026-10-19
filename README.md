# JASPEHR Questionnaire Renderer / JASPEHR Questionnaireレンダラ

Browser-only renderer for FHIR Questionnaire (SDC/JASPEHR-oriented).
FHIR Questionnaire JSON をブラウザ上でフォーム化し、QuestionnaireResponse JSON を生成します。

## Features / 主な機能
- Load Questionnaire JSON by paste or file upload / JSON貼り付け・ファイル読込
- Render nested items (group/item hierarchy) / 階層レンダリング
- Dynamic enable/disable by `enableWhen` / `enableWhen`による動的表示制御
- Validation (`required`, `min/max`, `regex`) / 入力バリデーション
- Generate, preview, download, and copy QuestionnaireResponse / 生成・表示・ダウンロード・コピー
- Local auto-save toggle / localStorage自動保存ON/OFF

## Requirements / 必要環境
- Node.js 18+ (LTS recommended)
- npm

## Setup / セットアップ
```bash
npm install
```

## Development / 開発実行
```bash
npm run dev
```
Open the shown localhost URL.
表示された `http://localhost:xxxx` を開いてください。

## Normal build / 通常ビルド
```bash
npm run build
```
Outputs are generated under `dist/`.
成果物は `dist/` に出力されます。

## Standalone file-open build (recommended for direct open) / 直開き用ビルド
```bash
npm run build:standalone
```
This generates:
- `dist/index.html` (normal Vite output)
- `dist/index.standalone.html` (single-file, `file://` direct-open friendly)

Use it by opening `dist/index.standalone.html` directly in your browser.
`dist/index.standalone.html` をブラウザで直接開くと、そのまま利用できます。

`index.standalone.html` inlines JS/CSS, so it avoids most `file://` CORS fetch issues.
`index.standalone.html` は JS/CSS を内包するため、`file://` 実行時の CORS/fetch 問題を回避しやすくなります。

## Notes / 注意
- If you need stable behavior across browsers, prefer `npm run preview` (`http://localhost`) over `file://`.
- `file://` behavior can differ by browser security policy.
- ブラウザ間でより安定した動作が必要な場合は、`file://` 直開きより `npm run preview`（`http://localhost`）を推奨します。
- `file://` 実行時の挙動は、ブラウザのセキュリティポリシーによって異なる場合があります。

## Experimental annotated CRF demo / 注釈付きCRFデモ

On this demo branch, select **Load baseline BP demo / 血圧デモ**, then **Annotated CRF preview / PDF…** and **Print / Save as PDF**. The original synthetic study uses proposed Study Data Tabulation Model (SDTM) annotations on a blank Case Report Form (CRF), independently of entered answers. The app remains browser-only with no PDF library. When opening an updated app, press **Load baseline BP demo** again: auto-save preserves previously loaded definitions.

- [Synthetic Questionnaire JSON](artifacts/baseline-bp-questionnaire.json)
- [Sample annotated CRF PDF](artifacts/annotated-crf.pdf)
- [Printable CRF HTML](artifacts/annotated-crf.html)
- [Standalone application](artifacts/index.standalone.html): download the raw file and open locally; GitHub's HTML source preview does not run the app.
- [Implementation, semantics, tests and limitations](artifacts/IMPLEMENTATION.md)

The direct systolic-pressure target resolves to `VS.VSORRES` with `VSTESTCD=SYSBP`. Sex, pulse, diastolic pressure and study/local subject IDs also have adjacent annotations. Birth/reference dates are inputs used to derive `DM.AGE`; birth date also maps to `DM.BRTHDTC`. The age reference date is not labeled as treatment start. The local subject identifier maps to `DM.SUBJID`, not `DM.USUBJID`; no globally unique subject identifier or age is calculated. Free-text notes show an explicit demonstration-only not-mapped reason, and every data-entry field has a visible mapping status. These are experimental custom authoring attributes, not standard JASPEHR extensions. This demo's **Derived** intent differs from the official AGE specialization's **Collected** declaration.

The supplied three-page PDF was generated separately using **WeasyPrint**, and its Japanese text and layout were inspected. **Actual browser Print / Save as PDF and standalone file opening remain unverified** because sandbox-enabled Chromium could not start. Browser pagination can differ. No deployment is provided.

### Plan 1 comparison / 案１との比較

Use **Load Plan 1: BC + DEC / 案１** to compare Biomedical Concept and Data Element Concept authoring with the existing Plan 2 demo. Both use identical input controls; switching resets answers. Plan 1 keeps the proposed concept annotations separate from an explicit experimental `crfMapping` for SDTM display. It never infers a unique SDTM variable from a concept pair. Identifier exceptions and every unmapped field are labeled.

See [comparison notes and both sets of JSON/HTML/PDF](artifacts/COMPARISON.md), or download [comparison.html](artifacts/comparison.html) for a self-contained annotation comparison. The two sample PDFs use WeasyPrint; actual browser printing remains unverified.
