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

## Complete field coverage and verified targets

All nine demo data-entry fields now have an adjacent mapping annotation or an explicit not-mapped reason. For other loaded questionnaires, the print renderer shows a **Not mapped / demonstration-only** fallback whenever no direct or derived intent is present; a note alone does not count as a mapping.

| Entry field | Mapping choice | Meaning and boundary |
| --- | --- | --- |
| Study identifier | Base variable `DM.STUDYID` | Identifies this study; not a subject identifier. |
| Study-local subject identifier | Base variable `DM.SUBJID` | Unique within the study. It is not `DM.USUBJID`. |
| Birth date | Base variable `DM.BRTHDTC`, and input to derived `DM.AGE` | The birth date is collected directly; its use in AGE derivation is a separate annotation. |
| Age reference date | Input to derived `DM.AGE` | Age-reference only; no direct `DM.RFSTDTC` or `VS.VSDTC` mapping is claimed. |
| Sex as collected | `SEX.SEX` specialization → `DM.SEX` | Choice codes `F`, `INTERSEX`, `M`, `U`, from SEX codelist `C66731` in the pinned metadata. |
| Systolic pressure | `SYSBP.VSORRES` → `VS.VSORRES` | `VSTESTCD=SYSBP`, label unit mmHg. |
| Diastolic pressure | `DIABP.VSORRES` → `VS.VSORRES` | `VSTESTCD=DIABP`, label unit mmHg. |
| Pulse rate | `PULSE.VSORRES` → `VS.VSORRES` | `VSTESTCD=PULSE`, label unit beats/min. |
| Measurement notes | Not mapped / demonstration-only | No submission variable or linkage to an individual vital-sign record has been specified. |

No unique subject identifier is generated. `DM.USUBJID` identifies a subject across studies/applications/submissions involving the product and requires sponsor-managed identity resolution. Merely relabeling `SUBJID` or concatenating two fields is not asserted to satisfy that requirement. There is no USUBJID derivation in this demo; consequently no speculative identifier `mappingIntent` is added.

The original revision 4 `sdtmTarget` notation remains reserved for **specialization ID + variable**. The additional local authoring attribute `sdtmVariableTarget: { "domain": "DM", "variable": "STUDYID" }` represents a base SDTM variable without asserting an official specialization ID; `SUBJID` and `BRTHDTC` use the same distinct representation. `mappingNote` and `mappingNotMappedReason` are additional inert local authoring text attributes. These companion attributes are experimental demo conventions, not additions claimed to be in the original proposal or a FHIR/JASPEHR standard. The raw JSON preserves them; QuestionnaireResponse does not copy them.

Official metadata was checked on 2026-10-19. The CDISC Conceptual and Operational Standards Metadata Services (COSMoS) source is pinned to commit `031429b1d14823721991cd23ee88a11616686ce3`:

- [SEX specialization, package 2025-04-01](https://github.com/cdisc-org/COSMoS/blob/031429b1d14823721991cd23ee88a11616686ce3/yaml/20250401_r11/sdtm/sdtm_sex.yaml): confirms specialization `SEX`, domain `DM`, variable `SEX`, codelist and four allowed values, and Collected origin.
- [PULSE specialization, package 2026-05-26](https://github.com/cdisc-org/COSMoS/blob/031429b1d14823721991cd23ee88a11616686ce3/yaml/20260526_r17/sdtm/sdtm_pulse.yaml): confirms specialization `PULSE`, domain `VS`, variable `VSORRES`, assigned test code `PULSE`, and unit beats/min.
- [DIABP specialization, package 2026-05-26](https://github.com/cdisc-org/COSMoS/blob/031429b1d14823721991cd23ee88a11616686ce3/yaml/20260526_r17/sdtm/sdtm_diabp.yaml): confirms specialization `DIABP`, domain `VS`, variable `VSORRES`, assigned test code `DIABP`, and unit mmHg.
- [Pinned official specialization export](https://github.com/cdisc-org/COSMoS/blob/031429b1d14823721991cd23ee88a11616686ce3/export/cdisc_sdtm_dataset_specializations_latest.csv): cross-checked the above rows, SYSBP, and AGE. No STUDYID/SUBJID/USUBJID specialization ID is assumed from their variable names.
- [Official SDTM Implementation Guide v3.3, section 5.2 Demographics](https://www.cdisc.org/standards/foundational/sdtmig/sdtmig-v3-3/html): checked the definitions of `STUDYID`, `SUBJID`, `USUBJID`, `BRTHDTC`, `RFSTDTC`, and `SEX`. The age-reference date in this demo has no treatment-start semantics, so it is not labeled RFSTDTC.

Metadata content based on [CDISC COSMoS](https://github.com/cdisc-org/COSMoS), used under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); the mappings, labels, and experimental authoring conventions here are this demonstration's adaptations. This is proposed annotation intent, not a complete submission specification: normalization, units, timing, origin, privacy, and other required domain variables still require downstream review.

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

Both builds passed; Vite retains its existing bundle-size warning. Nineteen focused tests passed for direct/derived semantics, missing/duplicate references, optional/malformed mapping descriptions, exact canonical URL matching, escaping/nonexecution, Japanese/blank output/compliance caveats, unresolved targets/concepts, and original response hierarchy.

The jsdom Document Object Model (DOM) integration test passed against the built application: original calculated expressions update on blur, enableWhen visibility, required/min/max/regular-expression validation, load-demo, answer export, preview generation, answer independence, malicious annotation escaping, and rejection of lookalike expression extensions. This tests application behavior without a real browser and does not verify browser rendering or print APIs.

The final sample is three A4 pages. All three page images were visually inspected: Japanese glyphs render, no fields or annotations clip, vital signs begin on page 2, and intent/raw metadata fit on page 3. PDF text extraction verifies Japanese and direct/derived targets, blank answer values, and absence of PDF form fields. A nine-page stress document retains all forty extra synthetic fields. Fonts are embedded by WeasyPrint using locally installed Noto CJK fonts; Fontconfig emitted cache warnings but rendering succeeded.

## Remaining verification gap

Sandbox-enabled Chromium aborts because `/usr/lib/chromium/chrome-sandbox` is owned by `nobody` rather than root. No `--no-sandbox`, sandbox-disabling option, ownership repair, or security-setting change was used. Real-browser form layout, file-input interaction, standalone file-open operation, and the browser Print/Save-as-PDF dialog remain unverified. WeasyPrint PDF rendering, three-page visual inspection, DOM behavior, and both builds were completed independently. Browser print engines may paginate differently. This demo branch is intended for review and download; no deployment or merge is included.

## Final focused review

Two review findings were fixed: direct AGE warnings now apply only to date/dateTime inputs, allowing a legitimately collected numeric AGE target; concept-only derived outputs use the same unresolved-domain label in both field annotations and the appendix. Additional tests confirm annotation metadata never leaks into QuestionnaireResponse and parsing/printing never mutates the source definition. The annotation parser reads only authoring attributes; the existing expression engine reads only explicitly recognized initial/calculated-expression extensions. The print generator accepts no answer state. Both builds and all nineteen focused tests plus DOM/PDF checks passed after these fixes. Actual browser printing remains unverified.

The field-coverage correction adds tests for all nine adjacent annotations, base-variable versus specialization notation, identifier scope, explicit fallback/reason text, sex choice export, and escaping/nonexecution of the companion metadata. All updated form fields and annotations were visually inspected in the three-page regenerated WeasyPrint PDF. Browser printing is still unverified.

## Plan 1 comparison addition

See [COMPARISON.md](COMPARISON.md) for the same-field Plan 1/Plan 2 comparison, exact verified BC/DEC pairs, identifier/date-role exceptions, deliverables, and the separation between CDISC identifiers, revision 4 authoring proposals, and the additional experimental `crfMapping`. `conceptDemo` is a clone of `baselineDemo` with identical controls, direct concept annotations and concept output for age; SDTM display targets are moved into a separate explicit map. The parser never resolves a concept pair through a registry. Its concept-only state remains unresolved when the map is removed. Existing Plan 2 fields/targets and the original bundled sample remain available.

The updated test suite has 19 focused checks, plus built-app DOM switching/answer export/coverage and a separate comparison-HTML toggle test. The generated Plan 1 PDF has four visually inspected A4 pages; Plan 2 remains three pages. Both retain blank fields and Japanese text. Re-running `generate-samples.mjs` now produces both plans, the standalone comparison HTML, and the explicit mapping JSON; `verify-pdf.py` renders and checks both sample PDFs. No runtime PDF dependency was added. Actual browser printing remains unverified. The comparison is provided on the demo branch for review and download; no merge or deployment is included.
