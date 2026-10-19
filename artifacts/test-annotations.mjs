import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { baselineDemo, parseAnnotations, annotatedCrfHtml, exactExtension, buildQuestionnaireResponse } = await import(pathToFileURL(process.argv[2]));
let checks = 0;
const test = (name, run) => { run(); checks++; console.log(`PASS ${name}`); };
const q = structuredClone(baselineDemo);
test('direct SYSBP and multi-input derived AGE semantics', () => {
 const p = parseAnnotations(q);
 assert.equal(p.annotations.filter(a=>a.kind==='Direct').length,7); assert.deepEqual(p.warnings,[]);
 assert.match(p.annotations.find(a=>a.linkId==='systolic-bp'&&a.kind==='Direct').text,/VS\.VSORRES.*VSTESTCD=SYSBP/);
 for(const id of ['birth-date','reference-date']) assert.match(p.annotations.find(a=>a.linkId===id&&a.kind==='Derived').text,/used to derive DM\.AGE/);
 assert.equal(p.raw,q); assert.equal(p.annotations.find(a=>a.linkId==='birth-date'&&a.kind==='Derived').raw,q.item[1].mappingIntent);
});
test('missing references and duplicate identifiers warn without throwing', () => {
 const bad=structuredClone(q); bad.item[1].mappingIntent.inputs.push({linkId:'missing',role:'referenceDate'});
 bad.item[1].item.push({linkId:'birth-date',type:'date'});
 const p=parseAnnotations(bad); assert.ok(p.warnings.some(w=>w.includes('Missing input reference: missing')));
 assert.ok(p.warnings.some(w=>w.includes('Duplicate input linkId: birth-date')));
 assert.match(annotatedCrfHtml(bad),/Review warning/);
});
test('optional derivation description and malformed mapping', () => {
 const optional=structuredClone(q); delete optional.item[1].mappingIntent.derivationDescription;
 assert.match(annotatedCrfHtml(optional),/Not provided/);
 optional.item[1].mappingIntent={inputs:'bad'};
 assert.match(parseAnnotations(optional).warnings[0],/Malformed/);
});
test('exact canonical extension matching rejects substring lookalikes', () => {
 const url='http://hl7.org/fhir/StructureDefinition/questionnaire-calculatedExpression';
 const fake={url:'https://attacker.test/'+url,valueExpression:{expression:'globalThis.pwned=1'}};
 const real={url,valueExpression:{expression:'1'}};
 assert.equal(exactExtension({extension:[fake]},url),undefined);
 assert.equal(exactExtension({extension:[fake,real]},url),real);
});
test('annotation text is escaped and never evaluated', () => {
 const hostile=structuredClone(q); const payload='</pre><script>globalThis.pwned=1</script><img src=x onerror="globalThis.pwned=2">';
 hostile.title=payload; hostile.item[1].mappingIntent.intent=payload;
 hostile.item[1].mappingIntent.derivationDescription='Function("globalThis.pwned=3")(); '+payload;
 const html=annotatedCrfHtml(hostile);
 assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<script>')); assert.ok(!html.includes('<img'));
 assert.equal(globalThis.pwned,undefined); assert.match(html,/default-src &#39;none&#39;|default-src 'none'/);
 assert.equal(parseAnnotations(hostile).raw.item[1].mappingIntent.intent,payload);
});
test('Japanese, blank form, boundaries and compliance caveat', () => {
 const html=annotatedCrfHtml(q);
 assert.match(html,/生年月日/); assert.match(html,/official AGE specialization declares Collected/);
 assert.match(html,/partial or missing dates/); assert.match(html,/No age is calculated/);
 assert.ok(!html.includes('SYN-BP-001')); assert.ok(!html.includes('DEMO-001'));
 assert.match(html,/break-inside:avoid/); assert.match(html,/break-before:page/);
});
test('unknown concepts and targets remain inert and unresolved', () => {
 const p=parseAnnotations({item:[{linkId:'concept',cdiscConcept:{bc:'C25298',dec:'C70856'}},{linkId:'x',mappingIntent:{inputs:[{linkId:'concept',role:'birthDate'}],output:{sdtmTarget:'UNKNOWN.AGE'}}}]});
 assert.match(p.annotations[0].text,/domain unresolved/); assert.match(p.warnings[0],/Unresolved/);
});
test('original response builder still preserves hierarchy', () => {
 const original=JSON.parse(readFileSync('src/sample-questionnaire.json','utf8'));
 const models=items=>items.map(n=>({...n,children:models(n.item??[])}));
 const response=buildQuestionnaireResponse(original,models(original.item),{age:30,roman_name:'SYNTHETIC'},()=>true);
 assert.equal(response.resourceType,'QuestionnaireResponse');
 assert.ok(JSON.stringify(response).includes('roman_name'));
});
test('numeric collected AGE is accepted; dates used directly as AGE warn', () => {
 assert.deepEqual(parseAnnotations({item:[{linkId:'age',type:'integer',sdtmTarget:'AGE.AGE'}]}).warnings,[]);
 assert.match(parseAnnotations({item:[{linkId:'birth',type:'date',sdtmTarget:'AGE.AGE'}]}).warnings[0],/unsuitable for a date/);
});
test('concept-only derived output is consistent in field and appendix', () => {
 const concept={item:[{linkId:'birth',type:'date'}],mappingIntent:{inputs:[{linkId:'birth',role:'birthDate'}],output:{cdiscConcept:{bc:'C69260',dec:'C170981'}}}};
 const html=annotatedCrfHtml(concept);
 assert.ok(!html.includes('Unresolved target: (missing)'));
 assert.ok((html.match(/domain unresolved/g)??[]).length>=2);
});
test('annotations never leak into QuestionnaireResponse or mutate definition', () => {
 const before=JSON.stringify(q);
 const models=items=>items.map(n=>({...n,children:models(n.item??[])}));
 const response=buildQuestionnaireResponse(q,models(q.item),{'birth-date':'1970-01-01','reference-date':'2026-10-19','systolic-bp':132},()=>true);
 const text=JSON.stringify(response);
 for(const field of ['mappingIntent','derivationDescription','sdtmTarget','sdtmVariableTarget','mappingNotMappedReason','mappingNote','cdiscConcept','birthDate','referenceDate']) assert.ok(!text.includes(field),field);
 assert.ok(!text.includes('AGE.AGE')); assert.ok(!text.includes('SYSBP.VSORRES'));
 parseAnnotations(q);annotatedCrfHtml(q);assert.equal(JSON.stringify(q),before);
});
test('all nine demo data-entry fields have visible mapping coverage', () => {
 const p=parseAnnotations(q);
 const flatten=items=>items.flatMap(n=>n.type==='group'?flatten(n.item??[]):[n]);
 const fields=flatten(q.item);assert.equal(fields.length,9);
 const html=annotatedCrfHtml(q);
 for(const n of fields){
  const a=p.annotations.filter(a=>a.linkId===n.linkId&&a.kind!=='Note');assert.ok(a.length,n.linkId);
  const article=html.split('<article class="field">').find(s=>s.includes(`<small>${n.linkId} ·`));
  assert.ok(article,n.linkId);assert.match(article.split('</article>')[0],/class="annotation"/);
 }
 for(const [id,target] of [['sex','DM.SEX'],['study-id','DM.STUDYID'],['participant-id','DM.SUBJID'],['birth-date','DM.BRTHDTC']]) assert.ok(p.annotations.some(a=>a.linkId===id&&a.kind==='Direct'&&a.text.includes(target)),id);
 for(const [id,testcd] of [['pulse','PULSE'],['diastolic-bp','DIABP'],['systolic-bp','SYSBP']]) assert.ok(p.annotations.some(a=>a.linkId===id&&a.kind==='Direct'&&a.text.includes('VS.VSORRES')&&a.text.includes('VSTESTCD='+testcd)),id);
 assert.ok(p.annotations.some(a=>a.linkId==='notes'&&a.kind==='Not mapped'&&a.text.includes('free text')));
 assert.ok(!p.annotations.some(a=>a.kind==='Direct'&&a.text.includes('DM.USUBJID')));
 assert.ok(p.annotations.some(a=>a.linkId==='reference-date'&&a.kind==='Note'&&a.text.includes('not DM.RFSTDTC')));
});
test('unannotated and note-only inputs never silently omit a mapping status', () => {
 const q={item:[{linkId:'unknown',type:'string'},{linkId:'note-only',type:'integer',mappingNote:'Requires review'}]};
 for(const id of ['unknown','note-only']) assert.ok(parseAnnotations(q).annotations.some(a=>a.linkId===id&&a.kind==='Not mapped'));
 assert.match(annotatedCrfHtml(q),/No mapping intent has been specified/);
});
test('identifier and unmapped metadata remain escaped inert text', () => {
 const q={item:[{linkId:'id',type:'string',sdtmVariableTarget:{domain:'DM',variable:'SUBJID'},mappingNote:'<script>globalThis.pwned=1</script>'},{linkId:'memo',type:'text',mappingNotMappedReason:'<img src=x onerror="globalThis.pwned=1">'}]};
 const html=annotatedCrfHtml(q);assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));assert.equal(globalThis.pwned,undefined);
 assert.match(parseAnnotations({item:[{linkId:'bad',type:'string',sdtmTarget:'DM.STUDYID'}]}).annotations[0].text,/Unresolved target/);
});
console.log(`${checks} focused checks passed`);
