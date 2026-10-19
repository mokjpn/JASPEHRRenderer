import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {baselineDemo,conceptDemo,annotatedCrfHtml}=await import(pathToFileURL(process.argv[2]));
writeFileSync('artifacts/baseline-bp-questionnaire.json',JSON.stringify(baselineDemo,null,2)+'\n');
writeFileSync('artifacts/annotated-crf.html',annotatedCrfHtml(baselineDemo));
const stress=structuredClone(baselineDemo);
stress.item.push({linkId:'pagination',type:'group',text:'Pagination stress / 改ページ検証',item:Array.from({length:40},(_,i)=>({linkId:`extra-${i}`,type:'string',text:`Additional synthetic field ${i} / 追加項目 ${i}`}))});
writeFileSync('/tmp/jaspehr-stress.html',annotatedCrfHtml(stress));

writeFileSync('artifacts/baseline-bp-questionnaire-concept.json',JSON.stringify(conceptDemo,null,2)+'\n');
writeFileSync('artifacts/concept-crf-mapping.json',JSON.stringify(conceptDemo.crfMapping,null,2)+'\n');
writeFileSync('artifacts/annotated-crf-concept.html',annotatedCrfHtml(conceptDemo));
const plans=JSON.stringify([annotatedCrfHtml(conceptDemo),annotatedCrfHtml(baselineDemo)]).replace(/</g,'\\u003c');
writeFileSync('artifacts/comparison.html',`<!doctype html><html lang="ja"><meta charset="utf-8"><title>案１・案２ CRF comparison</title><style>body{font:16px sans-serif;margin:18px;color:#203548}button{font:inherit;padding:8px;margin:4px}iframe{width:100%;height:82vh;border:1px solid #ccd4da}p{font-size:14px}</style><h1>同じ入力項目の注釈比較 / Same-field annotation comparison</h1><button id="concept">案１ / Plan 1: BC + DEC</button><button id="target">案２ / Plan 2: Specialization</button><button id="print">Print / Save as PDF</button><p id="status"></p><p>Blank definition-based forms. Plan 1 uses a separate explicit experimental CRF mapping; BC + DEC alone does not determine an SDTM variable. Official codes do not standardize these authoring attributes. 実ブラウザの印刷は未検証です。</p><iframe title="Annotated CRF comparison" sandbox="allow-same-origin allow-modals"></iframe><script>const plans=${plans};const frame=document.querySelector('iframe');const print=document.querySelector('#print');const show=i=>{print.disabled=true;frame.srcdoc=plans[i];document.querySelector('#status').textContent=i===0?'案１ / Plan 1: Concept authoring + separate explicit CRF mapping':'案２ / Plan 2: Dataset Specialization target authoring'};frame.onload=()=>{print.disabled=false};document.querySelector('#concept').onclick=()=>show(0);document.querySelector('#target').onclick=()=>show(1);print.onclick=()=>{frame.contentWindow.focus();frame.contentWindow.print()};show(0);</script></html>`);
