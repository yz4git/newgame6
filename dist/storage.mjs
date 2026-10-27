import {CHASSIS,META,OBJECTIVES,MODS,RELICS,CONTRACTS,contractProgress,chassisUnlocked,metaCost,metaSpent} from './catalog.mjs?v=lumen-4.5.0';
const KEY='lumen-wing-v1';
const integer=(n,max=1e9)=>Math.max(0,Math.min(max,Number.isFinite(Number(n))?Math.floor(Number(n)):0));
export function normalizeRecord(v={}){
 if(!v||typeof v!=='object')v={};
 const meta=Object.fromEntries(Object.entries(META).map(([key,u])=>[key,integer(v.meta?.[key],u.max)]));
 const relics=Array.isArray(v.relics)?[...new Set(v.relics.filter(k=>RELICS[k]))]:[];
 const r={version:4,relics,relicCount:relics.length,totalContracts:integer(v.totalContracts),mod:MODS[v.mod]?v.mod:'standard',contract:CONTRACTS[v.contract]?v.contract:'survey',runs:integer(v.runs),bestTime:integer(v.bestTime),bestKills:integer(v.bestKills),wins:integer(v.wins),sound:v.sound===true,
 credits:integer(v.credits),totalKills:Math.max(integer(v.totalKills),integer(v.bestKills)),totalElites:integer(v.totalElites),totalEvolutions:integer(v.totalEvolutions),
 meta,selected:CHASSIS[v.selected]?v.selected:'lancer',heat:v.heat===2&&integer(v.wins)>0?2:1,
 claimed:Array.isArray(v.claimed)?[...new Set(v.claimed.filter(id=>OBJECTIVES.some(o=>o.id===id)))]:[],
 recentRuns:Array.isArray(v.recentRuns)?v.recentRuns.filter(x=>typeof x==='string').slice(-16):[]};
 if(!chassisUnlocked(r,r.selected))r.selected='lancer';return r;
}
export function loadRecord(storage){try{storage||=globalThis.localStorage;return normalizeRecord(JSON.parse(storage.getItem(KEY)||'{}'));}catch{return normalizeRecord();}}
export function saveRecord(record,storage){try{storage||=globalThis.localStorage;storage.setItem(KEY,JSON.stringify(normalizeRecord(record)));return true;}catch{return false;}}
export function runReward(f){return Math.max(1,Math.floor((Math.floor((f.time||0)/5)+Math.floor((f.kills||0)/3)+(f.eliteKills||0)*5+Object.values(f.evolutions||{}).filter(Boolean).length*4+(f.status==='won'?30:0))*(f.heat===2?1.4:1)*(1+(f.skills?.salvage||0)*.1+(f.relics?.includes('courier')?.2:0))*(f.expedition?f.sectorRewards/f.sectorCount:1))+Math.min(150,Math.max(0,Math.floor(f.flightBonusParts||0))));}
export function settleRun(previous,f){
 const old=normalizeRecord(previous);const id=f.runId||`${f.time}:${f.kills}:${f.status}`;
 if(old.recentRuns.includes(id))return {record:old,reward:0,bonus:0,completed:[],unlocks:[]};
 const reward=runReward(f);let r={...old,runs:old.runs+1,wins:old.wins+Number(f.status==='won'),bestTime:Math.max(old.bestTime,Math.floor(f.time||0)),bestKills:Math.max(old.bestKills,f.kills||0),
 relics:[...new Set([...old.relics,...(f.relics||[])])],totalContracts:old.totalContracts+Number(contractProgress(f)>=(CONTRACTS[f.contract]?.goal||Infinity)),
 totalKills:old.totalKills+(f.kills||0),totalElites:old.totalElites+(f.eliteKills||0),totalEvolutions:old.totalEvolutions+Object.values(f.evolutions||{}).filter(Boolean).length,
 credits:old.credits+reward,claimed:[...old.claimed],recentRuns:[...old.recentRuns,id].slice(-16)};
 r.relicCount=r.relics.length;
 const completed=OBJECTIVES.filter(o=>!r.claimed.includes(o.id)&&r[o.field]>=o.goal);const contractBonus=contractProgress(f)>=(CONTRACTS[f.contract]?.goal||Infinity)?CONTRACTS[f.contract].reward:0;const bonus=completed.reduce((sum,o)=>sum+o.reward,0)+contractBonus;
 r.credits+=bonus;r.claimed.push(...completed.map(o=>o.id));
 const unlocks=Object.keys(CHASSIS).filter(k=>!chassisUnlocked(old,k)&&chassisUnlocked(r,k));if(!old.wins&&r.wins)unlocks.push('heat');
 return {record:normalizeRecord(r),reward,bonus,contractBonus,completed,unlocks};
}
export function finishRecord(r,f){return settleRun(r,f).record;}
export function purchaseUpgrade(previous,key){const r=normalizeRecord(previous),u=META[key];if(!u||r.meta[key]>=u.max)return {record:r,ok:false};const cost=metaCost(key,r.meta[key]);if(r.credits<cost)return {record:r,ok:false};r.credits-=cost;r.meta[key]++;return {record:r,ok:true};}
export function refundUpgrades(previous){const r=normalizeRecord(previous);const refund=metaSpent(r.meta);r.credits+=refund;for(const k of Object.keys(META))r.meta[k]=0;return {record:r,refund};}
export function selectChassis(previous,key){const r=normalizeRecord(previous);if(chassisUnlocked(r,key))r.selected=key;return r;}
export function flightOptions(r){r=normalizeRecord(r);return {chassis:r.selected,heat:r.heat,meta:{...r.meta},mod:r.mod,contract:r.contract,routes:true};}
