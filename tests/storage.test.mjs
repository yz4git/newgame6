import test from 'node:test';import assert from 'node:assert/strict';
import {freshProgress} from '../dist/model.mjs';import {SaveStore,packSave,unpackSave,SAVE_KEY,BACKUP_KEY,normalizeSettings} from '../dist/storage.mjs';
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};};
test('export/import round-trip retains upgrades, lore and checkpoints, detects corruption',()=>{const p=freshProgress();p.upgrades.edge=2;p.gold=235;p.lore=['arrival'];const text=packSave(p),read=unpackSave(text);assert.equal(read.upgrades.edge,2);assert.equal(read.gold,235);assert.deepEqual(read.lore,['arrival']);assert.throws(()=>unpackSave(text.replace('235','236')));assert.throws(()=>unpackSave('{}'));});
test('backup recovers a corrupted primary and inaccessible storage fails gracefully',()=>{const storage=memory(),store=new SaveStore(storage),p=freshProgress();store.save(p);p.gold=100;store.save(p);assert(storage.getItem(BACKUP_KEY));storage.setItem(SAVE_KEY,'broken');const read=store.load();assert.equal(read.gold,0);assert(store.recovered);const blocked=new SaveStore({getItem(){throw Error('blocked');},setItem(){throw Error('quota');}});assert.equal(blocked.load(),null);assert.equal(blocked.save(p),false);assert.equal(blocked.ok,false);});
test('legacy local save migrates without erasing the source and settings reject bad values',()=>{const storage=memory();storage.setItem('nocturne-eclipse-save-v1',JSON.stringify({...freshProgress(),version:1,gold:150}));const s=new SaveStore(storage);assert.equal(s.load().gold,150);assert(s.save(s.load()));assert(storage.getItem('nocturne-eclipse-save-v1'));const settings=normalizeSettings({music:99,quality:'unknown',difficulty:'story',touchScale:0,shake:'yes'});assert.equal(settings.music,1);assert.equal(settings.quality,'auto');assert.equal(settings.difficulty,'story');assert.equal(settings.touchScale,.85);assert.equal(settings.shake,true);});

test('title preview and title submenus cannot overwrite a real journey on page exit',async()=>{
 const {JourneySession}=await import('../dist/storage.mjs');const {GameModel}=await import('../dist/model.mjs');
 const storage=memory(),store=new SaveStore(storage),saved=freshProgress();saved.room=3;saved.gold=650;saved.level=3;store.save(saved);
 const session=new JourneySession(store),preview=new GameModel();assert(preview.room.id===0);assert.equal(session.save(),null);assert.equal(store.load().room,3);assert.equal(store.load().gold,650);
 const journey=new GameModel(store.load());session.start(journey);journey.progress.gold=600;assert(session.save().ok);session.stop();assert.equal(session.save(),null);assert.equal(store.load().gold,600);assert.equal(store.load().room,3);
});
test('repeated identical saves keep the previous backup available for recovery',()=>{
 const storage=memory(),store=new SaveStore(storage),p=freshProgress();p.gold=90;store.save(p);p.gold=140;store.save(p);store.save(p);assert.equal(store.readBackup().gold,90);assert.equal(store.load().gold,140);
});
