from weasyprint import HTML
from pypdf import PdfReader
HTML(filename='artifacts/annotated-crf.html').write_pdf('artifacts/annotated-crf.pdf')
r = PdfReader('artifacts/annotated-crf.pdf')
assert len(r.pages) == 3
text = '\n'.join(p.extract_text() for p in r.pages)
for value in ['生年月日', '研究基準日', 'VS.VSORRES', 'DM.AGE', 'Collected', 'Derived', 'birthDate', 'referenceDate']:
    assert value in text, value
for value in ['SYN-BP-001', 'DEMO-001']:
    assert value not in text, value
assert r.get_fields() is None
assert '/JavaScript' not in str(r.trailer)
assert 'Systolic blood pressure' in r.pages[1].extract_text()
for page in r.pages:
    assert abs(float(page.mediabox.width) - 595.276) < .01
    assert abs(float(page.mediabox.height) - 841.89) < .01
HTML(filename='/tmp/jaspehr-stress.html').write_pdf('/tmp/jaspehr-stress.pdf')
stress = PdfReader('/tmp/jaspehr-stress.pdf')
stress_text = '\n'.join(p.extract_text() for p in stress.pages)
for index in range(40):
    assert f'Additional synthetic field {index} ' in stress_text, index
assert len(stress.pages) > 3
print(f'PASS PDF: 3-page A4 sample, Japanese, blank fields, direct/derived; {len(stress.pages)}-page stress retains 40 added fields')
