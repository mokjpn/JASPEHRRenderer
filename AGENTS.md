# AGENTS.md

## Purpose
This repository is a browser-only FHIR Questionnaire renderer (SDC + JASPEHR-oriented constraints).
The app reads a Questionnaire JSON, renders a form, validates input, and exports QuestionnaireResponse JSON.

## Source of truth
- Edit source files only:
  - `src/main.ts`
  - `src/buildQuestionnaireResponse.ts`
  - `src/style.css`
  - `src/sample-questionnaire.json`
- Do not manually edit generated files under `dist/`.

## Build and run
- Dev server:
  - `npm install`
  - `npm run dev`
- Production build:
  - `npm run build`
- Standalone file-open build (no local HTTP server):
  - `npm run build:standalone`
  - Open `dist/index.standalone.html` directly in a browser.

## Validation checklist before commit
- `npm run build` succeeds without errors.
- `npm run build:standalone` succeeds.
- Basic UI checks:
  - Questionnaire load (paste + file input)
  - `enableWhen` visibility behavior
  - required/min/max/regex validation display
  - calculatedExpression update on blur
  - QuestionnaireResponse generation and download

## Implementation notes
- `enableWhen` currently supports JASPEHR-oriented `operator =` handling.
- Choice options are treated as Coding-based values.
- Hidden (not enabled) items should not be validated as required.
- Preserve `linkId` hierarchy when building QuestionnaireResponse.

## Git workflow
- Work on `main` unless a branch is explicitly requested.
- Use clear commit messages focused on behavior change.
- Typical flow:
  - `git pull --ff-only origin main`
  - implement changes
  - `git add -A`
  - `git commit -m "..."`
  - `git push origin main`

## Notes for maintainers (JP)
- このリポジトリは「直開き運用」を重視しています。
- 利用者配布時は `dist/index.standalone.html` を案内してください。
- `src/sample-questionnaire.json` がサンプルの唯一の正本です。
