# Experimental annotated case report form demonstration

This browser-only demonstration renders a synthetic baseline blood-pressure study from a Fast Healthcare Interoperability Resources (FHIR) Questionnaire. It exports the existing QuestionnaireResponse and previews a blank annotated Case Report Form (CRF) for browser Print → Save as Portable Document Format (PDF). JavaScript Object Notation (JSON) authoring attributes follow the author-supplied revision 4 design. They express proposed Study Data Tabulation Model (SDTM) mapping intent, not executable transformations or a validated SDTM submission.

## Review the demonstration

Run `npm run dev`, open the shown local URL, and select **Load baseline BP demo / 血圧デモ**. The form includes synthetic study and participant identifiers, demographics, a reference date, and vital signs. Birth/reference dates and measurements start empty; no real patient data is included. Existing sample behavior remains available through **サンプル**, then **JSONを読み込み**.

Select **Annotated CRF preview / PDF…**. It previews the loaded definition with blank fields, regardless of entered answers. **Print / Save as PDF** invokes the browser print dialog; choose A4, Save as PDF, and turn off browser headers/footers. The print button enables after the preview frame loads. **Download annotated CRF HTML** saves a self-contained printable document; **Download Questionnaire JSON** preserves the complete loaded object, including unknown annotation metadata. QuestionnaireResponse export remains an answer-only resource.

For direct file opening, run `npm run build:standalone` and open `dist/index.standalone.html`. This generated file contains the existing sample, demo, scripts, and styles. No new runtime package, service, or external font fetch is required. The sample PDF supplied here is a real PDF generated with WeasyPrint from the same HTML function; it is not evidence that Chromium's print dialog was exercised.

## Annotation semantics

The Clinical Data Interchange Standards Consortium (CDISC) Dataset Specialization plan uses these exact custom authoring attributes:

- `sdtmTarget: "SYSBP.VSORRES"` means the SYSBP (systolic blood pressure) specialization, resolving to `VS.VSORRES`: Vital Signs domain, original result variable, with `VSTESTCD=SYSBP` (vital signs test short name).
- `mappingIntent.inputs` contains `birth-date` with role `birthDate` and `reference-date` with role `referenceDate`. Its output is `sdtmTarget: "AGE.AGE"`, resolving to `DM.AGE`: Demographics domain, age variable.
- Each date field is annotated **used to derive DM.AGE**, and the appendix shows both inputs flowing toward the output. Neither date is directly assigned to AGE.
- `intent` and optional `derivationDescription` are inert author text. The latter may be natural language or pseudocode. Neither is evaluated, interpreted as FHIRPath, or passed to `eval` or `Function`. No age calculation is performed.

The demo explicitly labels its intent **Derived**, while the official AGE specialization declares **Collected**. It makes no full specialization-compliance claim. Completed versus fractional years, partial/missing dates, leap-day birthdays, timezone/date boundaries, invalid date order, and rounding remain downstream decisions.

`cdiscConcept` objects are retained and displayed as concept metadata with unresolved domains; they are not inferred into unverified specialization targets. Unknown targets stay unresolved. Missing references, duplicate identifiers, and malformed mapping intents produce review warnings. This is a focused proposal demonstration, not a general FHIR validator or complete SDTM target registry.

These are **experimental custom authoring attributes**, not standard JASPEHR attributes or a finalized FHIR extension. No invented canonical URL or extension serialization is introduced. The renderer now parses recognized existing extensions by exact canonical URL, accepting the bundled legacy expression URLs and the Structured Data Capture (SDC) expression URLs explicitly. Unknown and lookalike URLs remain raw metadata. Existing genuine calculatedExpression behavior is preserved; annotation fields have no path into its evaluator. HTML text is escaped, and the preview frame has no script permission plus a restrictive Content Security Policy.

## Source and independent design

The custom authoring attributes follow the [revision 4 proposal](https://nc.okadajp.org/s/g5d7CAjXf32icFy). Only the synthetic demonstration and its annotation metadata are included; the original report and example collection are not redistributed.

Research-context inspiration: [Systolic Blood Pressure Intervention Trial (SPRINT)](https://biolincc.nhlbi.nih.gov/studies/sprint/). The original [forms PDF](https://biolincc.nhlbi.nih.gov/media/studies/sprint/SPRINT_Forms.pdf) could not be retrieved. No original form, publication layout, or logo was copied or annotated. The study, participant identifiers, layout, and labels here are independent synthetic material, without affiliation. See the [National Heart, Lung, and Blood Institute trademark policy](https://www.nhlbi.nih.gov/about/contact/trademark-branding-and-logo).

## Implementation and files

Only the three permitted source files were edited: `src/main.ts` adds load-demo/definition-download/preview/print controls and exact extension parsing; `src/buildQuestionnaireResponse.ts` adds the synthetic demo, pure annotation parser, escaping, and printable HTML generator alongside the unchanged response builder; `src/style.css` adds dialog styling. The original `src/sample-questionnaire.json` is unchanged. No generated `dist/` file was manually edited. The selected deliverables under `artifacts/` are implementation documentation, focused test scripts, synthetic sample JSON, printable HTML, a sample PDF, and a generated standalone application. Temporary review files and report excerpts are excluded from the demo commit.

## Reproduce validation

From repository root:

```sh
npm run build
npm run build:standalone
npx tsc src/buildQuestionnaireResponse.ts --target ES2022 --module ES2022 --outDir /tmp/jaspehr-test --skipLibCheck
cp /tmp/jaspehr-test/buildQuestionnaireResponse.js /tmp/jaspehr-test/buildQuestionnaireResponse.mjs
node artifacts/test-annotations.mjs /tmp/jaspehr-test/buildQuestionnaireResponse.mjs
npm install --prefix /tmp/jaspehr-ui --cache /tmp/jaspehr-npm-cache jsdom --no-audit --no-fund
node artifacts/test-ui.mjs
node artifacts/generate-samples.mjs /tmp/jaspehr-test/buildQuestionnaireResponse.mjs
python -m pip install --target /tmp/jaspehr-pdf-tools weasyprint==70.0 pypdf
PYTHONPATH=/tmp/jaspehr-pdf-tools python artifacts/verify-pdf.py
pdftoppm -scale-to 1200 -png artifacts/annotated-crf.pdf artifacts/crf-page
```

Both builds passed; Vite retains its existing bundle-size warning. Eleven focused tests passed for direct/derived semantics, missing/duplicate references, optional/malformed mapping descriptions, exact canonical URL matching, escaping/nonexecution, Japanese/blank output/compliance caveats, unresolved targets/concepts, and original response hierarchy.

The jsdom Document Object Model (DOM) integration test passed against the built application: original calculated expressions update on blur, enableWhen visibility, required/min/max/regular-expression validation, load-demo, answer export, preview generation, answer independence, malicious annotation escaping, and rejection of lookalike expression extensions. This tests application behavior without a real browser and does not verify browser rendering or print APIs.

The final sample is three A4 pages. All three page images were visually inspected: Japanese glyphs render, no fields or annotations clip, vital signs begin on page 2, and intent/raw metadata fit on page 3. PDF text extraction verifies Japanese and direct/derived targets, blank answer values, and absence of PDF form fields. A seven-page stress document retains all forty extra synthetic fields. Fonts are embedded by WeasyPrint using locally installed Noto CJK fonts; Fontconfig emitted cache warnings but rendering succeeded.

## Remaining verification gap

Sandbox-enabled Chromium aborts because `/usr/lib/chromium/chrome-sandbox` is owned by `nobody` rather than root. No `--no-sandbox`, sandbox-disabling option, ownership repair, or security-setting change was used. Real-browser form layout, file-input interaction, standalone file-open operation, and the browser Print/Save-as-PDF dialog remain unverified. WeasyPrint PDF rendering, three-page visual inspection, DOM behavior, and both builds were completed independently. Browser print engines may paginate differently. This demo branch is intended for review and download; no deployment or merge is included.

## Final focused review

Two review findings were fixed: direct AGE warnings now apply only to date/dateTime inputs, allowing a legitimately collected numeric AGE target; concept-only derived outputs use the same unresolved-domain label in both field annotations and the appendix. Additional tests confirm annotation metadata never leaks into QuestionnaireResponse and parsing/printing never mutates the source definition. The annotation parser reads only authoring attributes; the existing expression engine reads only explicitly recognized initial/calculated-expression extensions. The print generator accepts no answer state. Both builds and all eleven focused tests plus DOM/PDF checks passed after these fixes. Actual browser printing remains unverified.
