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

`index.standalone.html` inlines JS/CSS, so it avoids most `file://` CORS fetch issues.
`index.standalone.html` は JS/CSS を内包するため、`file://` 実行時の CORS/fetch 問題を回避しやすくなります。

## GitHub publishing policy / GitHub公開方針
This repository is intended to publish source code only.
このリポジトリはソース公開を前提としています。

- Ignore `node_modules/` and build artifacts (`dist/`) via `.gitignore`.
- Users clone the repo and run `npm install` + `npm run build:standalone` locally.

## Notes / 注意
- If you need stable behavior across browsers, prefer `npm run preview` (`http://localhost`) over `file://`.
- `file://` behavior can differ by browser security policy.
