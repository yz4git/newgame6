import {validateSave} from './model.mjs?v=2.0.0';
export const SAVE_KEY='nocturne-eclipse-save-v2',BACKUP_KEY=SAVE_KEY+'-backup',SETTINGS_KEY='nocturne-eclipse-settings-v2';
const LEGACY_KEY='nocturne-eclipse-save-v1';
export const DEFAULT_SETTINGS={difficulty:'standard',music:.6,effects:.8,shake:true,reducedMotion:false,contrast:false,quality:'auto',touchScale:1,touchOpacity:.72,leftHanded:false};
export function normalizeSettings(raw={}){
  const out={...DEFAULT_SETTINGS};for(const k of ['shake','reducedMotion','contrast','leftHanded'])if(typeof raw[k]==='boolean')out[k]=raw[k];
  for(const [k,min,max] of [['music',0,1],['effects',0,1],['touchScale',.85,1.2],['touchOpacity',.25,1]])if(Number.isFinite(raw[k]))out[k]=Math.max(min,Math.min(max,raw[k]));
  if(['standard','story'].includes(raw.difficulty))out.difficulty=raw.difficulty;if(['auto','high','battery'].includes(raw.quality))out.quality=raw.quality;return out;
}
function hash(text){let n=2166136261;for(let i=0;i<text.length;i++){n^=text.charCodeAt(i);n=Math.imul(n,16777619);}return(n>>>0).toString(16);}
export function packSave(data){const clean=validateSave(data);if(!clean)throw new Error('保存データの形式が正しくありません');return JSON.stringify({format:'nocturne-save',revision:2,savedAt:new Date().toISOString(),checksum:hash(JSON.stringify(clean)),data:clean});}
export function unpackSave(text){
  if(typeof text!=='string'||text.length>100000)throw new Error('保存データを読み込めません');const raw=JSON.parse(text);
  if(raw?.format==='nocturne-save'){if(raw.revision!==2||hash(JSON.stringify(raw.data))!==raw.checksum)throw new Error('保存データが壊れています');const data=validateSave(raw.data);if(!data)throw new Error('対応していない保存データです');return data;}
  const data=validateSave(raw);if(!data)throw new Error('対応していない保存データです');return data;
}
export class SaveStore{
  constructor(storage){this.storage=storage;this.ok=true;this.recovered=false;this.savedAt=null;}
  load(){
    for(const key of [SAVE_KEY,BACKUP_KEY,LEGACY_KEY]){try{const raw=this.storage?.getItem(key);if(!raw)continue;const data=unpackSave(raw);this.recovered=key===BACKUP_KEY;this.savedAt=JSON.parse(raw).savedAt||null;return data;}catch{this.ok=false;}}
    return null;
  }
  save(data){
    try{const packed=packSave(data),previous=this.storage.getItem(SAVE_KEY);if(previous){try{unpackSave(previous);this.storage.setItem(BACKUP_KEY,previous);}catch{}}
      this.storage.setItem(SAVE_KEY,packed);this.savedAt=JSON.parse(packed).savedAt;this.ok=true;return true;
    }catch{this.ok=false;return false;}
  }
  readSettings(){try{return normalizeSettings(JSON.parse(this.storage?.getItem(SETTINGS_KEY)||'{}'));}catch{return {...DEFAULT_SETTINGS};}}
  writeSettings(settings){try{this.storage.setItem(SETTINGS_KEY,JSON.stringify(normalizeSettings(settings)));return true;}catch{return false;}}
}
