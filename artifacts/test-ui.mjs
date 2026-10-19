import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire('/tmp/jaspehr-ui/package.json');
const {JSDOM}=require('jsdom');
const index=readFileSync('dist/index.html','utf8');
const asset=index.match(/src="([^" ]+\.js)"/)[1];
const dom=new JSDOM('<div id="app"></div>',{url:'https://synthetic.test',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;
w.fetch=()=>Promise.reject(new Error('No network in UI test'));
w.alert=message=>{throw new Error(message)};
w.URL.createObjectURL=()=> 'blob:synthetic';w.URL.revokeObjectURL=()=>{};
w.HTMLAnchorElement.prototype.click=function(){};
w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
w.HTMLDialogElement.prototype.close=function(){this.open=false;this.onclose?.()};
w.eval(readFileSync('dist/'+asset,'utf8'));
const d=w.document;
const button=label=>[...d.querySelectorAll('button')].find(b=>b.textContent.includes(label));
const input=id=>d.querySelector(`#item-${id} input`);
const set=(id,value)=>{const n=input(id); n.value=value; n.dispatchEvent(new w.Event('input',{bubbles:true}));n.dispatchEvent(new w.Event('change',{bubbles:true}));n.dispatchEvent(new w.FocusEvent('blur'));};
assert.ok(input('age')); // original demo preserved
set('roman_name','日本語');assert.ok(d.querySelector('#right').textContent.includes('正規表現に一致'));
set('height_cm','1');assert.ok(d.querySelector('#right').textContent.includes('最小値 50'));
set('height_cm','170');set('weight_kg','70');
assert.ok(Number(input('score').value)>24);
assert.equal(d.querySelector('#item-pregnancy_week').classList.contains('hidden'),false);
const male=d.querySelector('input[name="gender"]');male.checked=true;male.dispatchEvent(new w.Event('change',{bubbles:true}));
assert.equal(d.querySelector('#item-pregnancy_week').classList.contains('hidden'),true);
button('Load baseline BP demo').click();
assert.equal(input('study-id').value,'SYN-BP-001');
assert.ok(d.querySelector('#right').textContent.includes('必須'));
set('systolic-bp','999');
assert.ok(d.querySelector('#right').textContent.includes('300'));
const sex=d.querySelector('#item-sex select');sex.value='2';sex.dispatchEvent(new w.Event('change',{bubbles:true}));
set('birth-date','1970-01-01');set('reference-date','2026-10-19');set('systolic-bp','132');
button('QuestionnaireResponse を生成').click();
const response=JSON.parse(d.querySelector('#qr-preview').textContent);
assert.equal(response.item[0].item[0].answer[0].valueString,'SYN-BP-001');
assert.ok(JSON.stringify(response).includes('1970-01-01'));
const sexCoding=response.item[1].item.find(i=>i.linkId==='sex').answer[0].valueCoding;
assert.equal(sexCoding.code,'M');assert.equal(sexCoding.system,'https://example.org/jaspehr-demo/CodeSystem/cdisc-sex');assert.equal(sexCoding.version,'2025-03-28');assert.equal(sexCoding.display,'Male');
for(const name of ['sdtmTarget','sdtmVariableTarget','mappingNotMappedReason','mappingNote','mappingIntent']) assert.ok(!JSON.stringify(response).includes(name));
button('Annotated CRF preview').click();
let html=d.querySelector('iframe').srcdoc;
assert.ok(html.includes('DM.AGE'));assert.ok(!html.includes('1970-01-01'));
const preview=new JSDOM(html);const articles=[...preview.window.document.querySelectorAll('article.field')];
for(const id of ['study-id','participant-id','birth-date','reference-date','sex','systolic-bp','diastolic-bp','pulse','notes']){
 const article=articles.find(a=>a.querySelector('small')?.textContent.startsWith(id+' ·'));
 assert.ok(article?.querySelector('.annotation'),id);
 if(id==='sex') assert.ok(article.textContent.includes('DM.SEX'));
 if(id==='pulse') assert.ok(article.textContent.includes('VSTESTCD=PULSE'));
 if(id==='study-id') assert.ok(article.textContent.includes('DM.STUDYID'));
 if(id==='participant-id') assert.ok(article.textContent.includes('DM.SUBJID'));
 if(id==='notes') assert.ok(article.textContent.includes('Not mapped / demonstration-only'));
}
preview.window.close();
assert.equal(d.querySelector('iframe').getAttribute('sandbox'),'allow-same-origin allow-modals');
button('Close').click();
set('birth-date','1980-02-02');button('Annotated CRF preview').click();
assert.equal(d.querySelector('iframe').srcdoc,html);button('Close').click();
const ta=d.querySelector('#left textarea');
const raw=JSON.parse(ta.value);raw.item[1].mappingIntent.derivationDescription='globalThis.pwned=123; </script><img src=x onerror=alert(1)>';
raw.item[2].item[0].extension=[{url:'https://invalid.test/questionnaire-calculatedExpression',valueExpression:{language:'text/fhirpath',expression:'900'}}];
ta.value=JSON.stringify(raw);button('JSONを読み込み').click();
assert.equal(input('systolic-bp').value,'');assert.equal(w.pwned,undefined);
button('Annotated CRF preview').click();assert.ok(!d.querySelector('iframe').srcdoc.includes('<img'));
console.log('PASS UI DOM integration: original calculatedExpression, enableWhen, required/max validation, load-demo, response export, preview, answer independence, escaping, nonexecution, exact extension URLs');
button('Close').click();
button('Load Plan 1:').click();
const plan1=JSON.parse(d.querySelector('#left textarea').value);
assert.equal(plan1.annotationPlan,'concept');assert.ok(plan1.crfMapping.direct.length===7);
assert.ok(d.querySelector('#left').textContent.includes('案１ / Plan 1'));
set('systolic-bp','132');button('QuestionnaireResponse を生成').click();
for(const key of ['crfMapping','cdiscConcept','conceptNotMappedReason','annotationPlan'])assert.ok(!d.querySelector('#qr-preview').textContent.includes(key));
button('Annotated CRF preview').click();
const conceptHtml=d.querySelector('iframe').srcdoc;
assert.ok(conceptHtml.includes('C25298'));assert.ok(conceptHtml.includes('C170981'));
assert.ok(conceptHtml.includes('separate experimental CRF mapping'));assert.ok(!conceptHtml.includes('1970-01-01'));
for(const text of ['DM.SEX','VSTESTCD=PULSE','DM.STUDYID','DM.SUBJID','BC/DEC exception','Not mapped / demonstration-only'])assert.ok(conceptHtml.includes(text),text);
button('Close').click();button('Load baseline BP demo').click();assert.equal(JSON.parse(d.querySelector('#left textarea').value).annotationPlan,'target');assert.equal(input('systolic-bp').value,'');
console.log('PASS Plan 1/2 UI switching, separate mapping display, all-field coverage, answer reset and metadata isolation');
dom.window.close();

const comparison=new JSDOM(readFileSync('artifacts/comparison.html','utf8'),{runScripts:'dangerously',url:'https://synthetic.test'});
const cd=comparison.window.document;
assert.ok(cd.querySelector('iframe').srcdoc.includes('PLAN 1'));
cd.querySelector('#target').click();assert.ok(!cd.querySelector('iframe').srcdoc.includes('PLAN 1'));
cd.querySelector('#concept').click();assert.ok(cd.querySelector('iframe').srcdoc.includes('Separate explicit CRF mapping'));
comparison.window.close();
console.log('PASS standalone comparison HTML toggles Plan 1 and Plan 2 without a network request');

// Invalid restored answers must show errors and block both downloads and copy.
for(const [label,mutate,expected] of [
 ['wrong version',(q,state)=>{state.sex={system:'https://example.org/jaspehr-demo/CodeSystem/cdisc-sex',version:'2025-03-28-demo-1',code:'M'}},'outside the contained ValueSet'],
 ['missing ValueSet',(q,state)=>{q.contained=[]},'reference'],
 ['que-4',(q,state)=>{q.item[1].item.find(n=>n.linkId==='sex').answerOption=[{valueCoding:{code:'M'}}]},'que-4'],
 ['compose-only',(q,state)=>{delete q.contained[0].expansion},'compose-only'],
 ['external URL',(q,state)=>{q.item[1].item.find(n=>n.linkId==='sex').answerValueSet='https://example.org/unavailable'},'external resolution is disabled']
]){
 const q=JSON.parse(readFileSync('artifacts/baseline-bp-questionnaire.json','utf8'));const state={};mutate(q,state);
 const testDom=new JSDOM('<div id="app"></div>',{url:'https://offline.test',runScripts:'outside-only',pretendToBeVisual:true});const tw=testDom.window;
 let downloads=0,copies=0,network=0;const alerts=[];
 tw.localStorage.setItem('jaspehr.q',JSON.stringify(q));tw.localStorage.setItem('jaspehr.state',JSON.stringify(state));
 tw.alert=m=>alerts.push(m);tw.fetch=()=>{network++;return Promise.reject(new Error('No networking allowed'))};
 tw.URL.createObjectURL=()=>{downloads++;return 'blob:test'};tw.URL.revokeObjectURL=()=>{};
 Object.defineProperty(tw.navigator,'clipboard',{value:{writeText:async()=>{copies++}}});
 tw.eval(readFileSync('dist/'+asset,'utf8'));const td=tw.document;
 assert.ok(td.querySelector('#right').textContent.includes(expected),label+' '+td.querySelector('#right').textContent);
 const btn=t=>[...td.querySelectorAll('button')].find(b=>b.textContent.includes(t));
 btn('QuestionnaireResponse を生成').click();btn('QRをコピー').click();
 assert.ok(alerts.length===2,label);assert.equal(downloads,0,label);assert.equal(copies,0,label);assert.equal(network,0,label);
 if(label==='wrong version')assert.equal(td.querySelector('#item-sex select').value,'');
 else assert.equal(td.querySelector('#item-sex select').disabled,true);
 testDom.window.close();
}
console.log('PASS offline ValueSet UI: wrong-version restored answers, missing/compose-only/external references and que-4 visibly fail; download/copy blocked; zero network calls');
for(const validVersion of [true,false]){
 const q=JSON.parse(readFileSync('artifacts/baseline-bp-questionnaire.json','utf8'));
 const sex=q.item[1].item.find(n=>n.linkId==='sex');
 sex.initial=[{valueCoding:{system:'https://example.org/jaspehr-demo/CodeSystem/cdisc-sex',version:validVersion?'2025-03-28':'old-version',code:'M',display:'Male'}}];
 const testDom=new JSDOM('<div id="app"></div>',{url:'https://initial.test',runScripts:'outside-only',pretendToBeVisual:true});const tw=testDom.window;const alerts=[];
 tw.alert=m=>alerts.push(m);tw.fetch=()=>Promise.reject(new Error('offline'));tw.URL.createObjectURL=()=> 'blob:initial';tw.URL.revokeObjectURL=()=>{};tw.HTMLAnchorElement.prototype.click=function(){};
 tw.eval(readFileSync('dist/'+asset,'utf8'));const td=tw.document;
 td.querySelector('#left textarea').value=JSON.stringify(q);const btn=s=>[...td.querySelectorAll('button')].find(b=>b.textContent.includes(s));btn('JSONを読み込み').click();
 assert.equal(td.querySelector('#item-sex select').value,validVersion?'2':'');btn('QuestionnaireResponse を生成').click();
 if(validVersion){assert.equal(alerts.length,0);const r=JSON.parse(td.querySelector('#qr-preview').textContent);assert.equal(r.item[1].item[0].answer[0].valueCoding.version,'2025-03-28');}
 else{assert.ok(alerts[0].includes('outside the contained ValueSet'));assert.ok(td.querySelector('#qr-preview').textContent.includes('Preview blocked'));}
 testDom.window.close();
}
console.log('PASS contained ValueSet initial.valueCoding: valid version selected and exported; invalid version remains visible and blocked');
