import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {baselineDemo,conceptDemo,sexCtSource,sexCodeSystem,sexValueSet,resolveChoiceOptions,validateBoundChoice,buildQuestionnaireResponse,annotatedCrfHtml}=await import(pathToFileURL(process.argv[2]));
let count=0;const test=(name,run)=>{run();count++;console.log('PASS '+name)};
const sex=q=>q.item[1].item.find(n=>n.linkId==='sex');
const clone=()=>structuredClone(baselineDemo);
const model=items=>items.map(n=>({...n,children:model(n.item??[])}));
const response=(q,value)=>buildQuestionnaireResponse(q,model(q.item),{sex:value},()=>true);
const valid=resolveChoiceOptions(baselineDemo,sex(baselineDemo)).options[2];
test('both demos use contained ValueSet and R4 que-4 exclusivity',()=>{
 for(const q of [baselineDemo,conceptDemo]){
  const item=sex(q);assert.equal(item.type,'choice');assert.equal(item.answerValueSet,'#demo-sex-values');assert.equal(item.answerOption,undefined);
  assert.deepEqual(resolveChoiceOptions(q,item).errors,[]);assert.deepEqual(resolveChoiceOptions(q,item).options.map(c=>c.code),['F','INTERSEX','M','U']);
 }
 const bad=clone();sex(bad).answerOption=[{valueCoding:{code:'X'}}];assert.match(resolveChoiceOptions(bad,sex(bad)).errors[0],/que-4/);assert.throws(()=>response(bad,valid),/que-4/);
});
test('full fixed CT identity distinguishes Submission Values and NCI identifiers',()=>{
 assert.equal(sexCtSource.release,'2025-03-28');assert.match(sexCtSource.coverage,/Full four-member/);
 assert.deepEqual(sexCtSource.terms.map(c=>[c.code,c.nciCode]),[['F','C16576'],['INTERSEX','C45908'],['M','C20197'],['U','C17998']]);
 assert.ok(sexCodeSystem.url.startsWith('https://example.org/'));assert.equal(sexCodeSystem.version,'2025-03-28');
 assert.notEqual(sexValueSet.version,sexCodeSystem.version);
 assert.deepEqual(sexCodeSystem.concept.map(c=>c.property[0].valueCode),sexCtSource.terms.map(c=>c.nciCode));
});
test('invalid code, NCI-code mixing, wrong system, missing or wrong version and free text fail closed',()=>{
 for(const value of [{...valid,code:'X'},{...valid,code:'NOT REPORTED'},{...valid,code:'FEMALE'},{...valid,code:'C20197'},{...valid,system:'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl'},{...valid,version:undefined},{...valid,version:sexValueSet.version},'M']){
  assert.match(validateBoundChoice(resolveChoiceOptions(baselineDemo,sex(baselineDemo)),value),/outside/);
  assert.throws(()=>response(baselineDemo,value),/outside/);
 }
});
test('export preserves code/system/CodeSystem version and normalizes the display from the snapshot',()=>{
 const r=response(baselineDemo,{...valid,display:'<script>not authoritative</script>',privateProperty:'discard me'});
 const c=r.item[0].item[0].answer[0].valueCoding;
 assert.deepEqual(c,valid);assert.ok(!JSON.stringify(r).includes('privateProperty'));
 assert.throws(()=>response(baselineDemo,[valid,valid]),/single Coding/);
 for(const key of ['contained','compose','expansion','crfMapping','sdtmTarget'])assert.ok(!JSON.stringify(r).includes(key));
});
test('missing, duplicate and non-ValueSet contained references fail',()=>{
 for(const mutate of [q=>{q.contained=[]},q=>{q.contained.push(structuredClone(q.contained[0]))},q=>{q.contained[0].resourceType='CodeSystem'}]){
  const q=clone();mutate(q);assert.match(resolveChoiceOptions(q,sex(q)).errors[0],/reference/);assert.throws(()=>response(q,null),/reference/);
 }
});
test('external canonical URLs and compose-only sets never trigger network resolution',()=>{
 const q=clone();sex(q).answerValueSet={toString:'inert text, not callable'};assert.match(resolveChoiceOptions(q,sex(q)).errors[0],/exact contained/);sex(q).answerValueSet='https://example.org/ValueSet/missing|1';assert.match(resolveChoiceOptions(q,sex(q)).errors[0],/external resolution is disabled/);
 sex(q).answerValueSet='#demo-sex-values';delete q.contained[0].expansion;assert.match(resolveChoiceOptions(q,sex(q)).errors[0],/compose-only/);
 assert.throws(()=>response(q,null),/compose-only/);
});
test('partial, malformed, duplicate and unverifiable snapshots are rejected',()=>{
 for(const mutate of [e=>{e.offset=1},e=>{e.total=10},e=>{delete e.total},e=>{e.contains[0].system=undefined},e=>{e.contains[0].version=5},e=>{e.contains[0].inactive='true'},e=>{e.contains[1]=structuredClone(e.contains[0])}]){
  const q=clone();mutate(q.contained[0].expansion);assert.ok(resolveChoiceOptions(q,sex(q)).errors.length);assert.throws(()=>response(q,valid));
 }
});
test('nested headers and inactive codes are nonselectable while versioned entries remain exact',()=>{
 const q=clone();const e=q.contained[0].expansion;e.contains=[{abstract:true,display:'Group',contains:e.contains}];e.contains[0].contains[0].inactive=true;
 const r=resolveChoiceOptions(q,sex(q));assert.deepEqual(r.errors,[]);assert.deepEqual(r.options.map(c=>c.code),['INTERSEX','M','U']);
 assert.ok(validateBoundChoice(r,{...valid,code:'F'}));
});
test('annotations show local binding provenance and errors; hostile display stays inert',()=>{
 const q=clone();let html=annotatedCrfHtml(q);assert.match(html,/Contained ValueSet/);assert.match(html,/2025-03-28-demo-1/);assert.match(html,/CodeSystem version 2025-03-28/);assert.match(html,/F \/ Female/);
 q.contained[0].expansion.contains[0].display='<script>globalThis.pwned=1</script>';html=annotatedCrfHtml(q);assert.ok(!html.includes('<script>'));assert.equal(globalThis.pwned,undefined);
 delete q.contained[0].expansion;assert.match(annotatedCrfHtml(q),/Binding error:.*compose-only/);
});
test('legacy answerOption and hidden-item response behavior remain available',()=>{
 const q={id:'legacy',item:[{linkId:'old',type:'choice',answerOption:[{valueCoding:{code:'yes',display:'Yes'}}]}]};
 assert.equal(resolveChoiceOptions(q,q.item[0]).options[0].code,'yes');assert.equal(buildQuestionnaireResponse(q,model(q.item),{old:{code:'yes',display:'Yes'}},()=>true).item[0].answer[0].valueCoding.code,'yes');
 const bad=clone();bad.contained=[];assert.deepEqual(buildQuestionnaireResponse(bad,model(bad.item),{sex:valid},n=>n.linkId!=='sex').item,[]);
});
console.log(`${count} contained-ValueSet checks passed`);
