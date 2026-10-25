import {normalizePrint} from './prints.mjs?v=1.1.0';
export const SAVE_KEY='margin-tide-v1';
export const DEFAULT_SETTINGS={audio:true,motion:true};
export function normalize(value){const data=value&&typeof value==='object'?value:{};return {version:2,last:Number.isInteger(data.last)?Math.max(0,Math.min(7,data.last)):0,best:Array.from({length:8},(_,i)=>{const b=data.best?.[i];return b&&Number.isInteger(b.shots)&&b.shots>=0&&b.shots<=100000&&Number.isInteger(b.tears)&&b.tears>=0?{shots:b.shots,tears:b.tears,medals:Math.max(1,Math.min(3,Math.round(b.medals)||1))}:null;}),prints:Array.from({length:8},(_,i)=>normalizePrint(data.prints?.[i],i)),settings:{audio:typeof data.settings?.audio==='boolean'?data.settings.audio:true,motion:typeof data.settings?.motion==='boolean'?data.settings.motion:true}};}
export class Logbook{
 constructor(storage){this.storage=storage;this.failed=false;try{this.data=normalize(JSON.parse(storage.getItem(SAVE_KEY)||'null'));}catch{this.data=normalize(null);this.failed=true;}}
 save(){try{this.storage.setItem(SAVE_KEY,JSON.stringify(this.data));this.failed=false;return true;}catch{this.failed=true;return false;}}
 keepPrint(print){const page=normalizePrint(print);if(!page)return false;this.data.prints[page.index]=page;return this.save();}
 finish(index,result,print=null){const old=this.data.best[index];const record={shots:Math.max(0,Math.round(result.shots)),tears:Math.max(0,Math.round(result.tears)),medals:Math.max(1,Math.min(3,result.medals))};if(!old||record.medals>old.medals||record.medals===old.medals&&record.shots<old.shots)this.data.best[index]=record;const page=normalizePrint(print,index);if(page)this.data.prints[index]=page;this.data.last=Math.min(7,index+1);return this.save();}
}
