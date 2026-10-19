from weasyprint import HTML
from pypdf import PdfReader
HTML(filename='artifacts/annotated-crf.html').write_pdf('artifacts/annotated-crf.pdf')
r = PdfReader('artifacts/annotated-crf.pdf')
assert len(r.pages) == 3
text = '\n'.join(p.extract_text() for p in r.pages)
for value in ['生年月日', '研究基準日', 'VS.VSORRES', 'DM.AGE', 'Collected', 'Derived', 'birthDate', 'referenceDate', 'DM.SEX', 'VSTESTCD=PULSE', 'VSTESTCD=DIABP', 'DM.STUDYID', 'DM.SUBJID', 'DM.BRTHDTC', 'Not mapped / demonstration-only', 'DM.USUBJID']:
    assert value in text, value
for value in ['SYN-BP-001', 'DEMO-001']:
    assert value not in text, value
assert r.get_fields() is None
assert '/JavaScript' not in str(r.trailer)
assert 'Systolic blood pressure' in r.pages[1].extract_text()
field_checks = {
    'study-id · string': 'Direct → DM.STUDYID',
    'participant-id · string': 'Direct → DM.SUBJID',
    'birth-date · date': 'Direct → DM.BRTHDTC',
    'reference-date · date': 'used to derive DM.AGE',
    'sex · choice': 'Direct → DM.SEX',
    'systolic-bp · integer': 'VSTESTCD=SYSBP',
    'diastolic-bp · integer': 'VSTESTCD=DIABP',
    'pulse · integer': 'VSTESTCD=PULSE',
    'notes · text': 'Not mapped / demonstration-only',
}
for field, annotation in field_checks.items():
    assert any(field in p.extract_text() and annotation in p.extract_text() for p in r.pages[:2]), field
# All nine entry fields and their annotations remain together on a form page.
assert 'requires sponsor-managed identity' in ' '.join(text.split())
assert 'does not derive it' in text
assert 'not DM.RFSTDTC' in text
for page in r.pages:
    assert abs(float(page.mediabox.width) - 595.276) < .01
    assert abs(float(page.mediabox.height) - 841.89) < .01
HTML(filename='/tmp/jaspehr-stress.html').write_pdf('/tmp/jaspehr-stress.pdf')
stress = PdfReader('/tmp/jaspehr-stress.pdf')
stress_text = '\n'.join(p.extract_text() for p in stress.pages)
for index in range(40):
    assert f'Additional synthetic field {index} ' in stress_text, index
assert len(stress.pages) > 3
print(f'PASS PDF: 3-page A4 sample, Japanese, blank fields, all 9 fields annotated, ID distinction; {len(stress.pages)}-page stress retains 40 added fields')

HTML(filename='artifacts/annotated-crf-concept.html').write_pdf('artifacts/annotated-crf-concept.pdf')
concept = PdfReader('artifacts/annotated-crf-concept.pdf')
assert len(concept.pages) == 4
concept_text = '\n'.join(p.extract_text() for p in concept.pages)
for value in ['C25298', 'C70856', 'C25299', 'C49676', 'C28421', 'C83217', 'C69260', 'C170981', 'Separate explicit CRF mapping', 'not inferred from BC/DEC', 'BC/DEC exception', '性別', '脈拍']:
    assert value in concept_text, value
for field, annotation in field_checks.items():
    assert any(field in p.extract_text() and annotation in p.extract_text() for p in concept.pages[:3]), field
assert 'SYN-BP-001' not in concept_text and 'DEMO-001' not in concept_text
assert 'No age is calculated' in concept_text
assert '/JavaScript' not in str(concept.trailer)
print('PASS Plan 1 PDF: four A4 pages; all nine fields, concept IDs, separate explicit mappings, exceptions and Japanese text')
