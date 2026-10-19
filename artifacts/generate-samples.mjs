import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {baselineDemo,annotatedCrfHtml}=await import(pathToFileURL(process.argv[2]));
writeFileSync('artifacts/baseline-bp-questionnaire.json',JSON.stringify(baselineDemo,null,2)+'\n');
writeFileSync('artifacts/annotated-crf.html',annotatedCrfHtml(baselineDemo));
const stress=structuredClone(baselineDemo);
stress.item.push({linkId:'pagination',type:'group',text:'Pagination stress / 改ページ検証',item:Array.from({length:40},(_,i)=>({linkId:`extra-${i}`,type:'string',text:`Additional synthetic field ${i} / 追加項目 ${i}`}))});
writeFileSync('/tmp/jaspehr-stress.html',annotatedCrfHtml(stress));
