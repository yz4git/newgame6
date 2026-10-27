import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
assert.ok(!readdirSync('dist').some(f=>f.startsWith('_qa-')), 'Remove temporary QA files before shipping');
for (const file of readdirSync('dist').filter(f => /\.(mjs|js)$/.test(f))) execFileSync(process.execPath, ['--check', `dist/${file}`]);
const html = readFileSync('dist/index.html', 'utf8'), app = readFileSync('dist/app.mjs', 'utf8');
const ids = [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]); assert.equal(new Set(ids).size, ids.length);
for (const m of app.matchAll(/\$\('([^']+)'\)/g)) assert.ok(ids.includes(m[1]), `Missing UI: ${m[1]}`);
const sw = readFileSync('dist/sw.js', 'utf8');
const core = [...sw.matchAll(/'\.\/([^']*)'/g)].map(m => m[1].split('?')[0] || 'index.html');
for (const file of core) assert.ok(existsSync(`dist/${file}`), `Offline asset missing: ${file}`);
for (const file of readdirSync('dist').filter(f => /\.(mjs|html)$/.test(f))) { const text = readFileSync(`dist/${file}`, 'utf8'); for (const m of text.matchAll(/(?:from |src=|href=)["']\.\/([^"']+)["']/g)) { const path = m[1].split('?')[0]; assert.ok(existsSync(`dist/${path}`)); assert.ok(core.includes(path), `Not cached: ${path}`); } }
assert.ok(!html.includes('margin-tide')); assert.ok(html.includes('LUMEN')); assert.equal(JSON.parse(readFileSync('.openai/hosting.json')).static.directory, 'dist');
const atlas=JSON.parse(readFileSync('dist/assets/arcade-atlas-v3.json','utf8'));assert.equal(Object.keys(atlas.frames).length,9);for(const [name,[x,y,w,h]]of Object.entries(atlas.frames)){assert.ok(w>0&&h>0&&x>=0&&y>=0&&x+w<=atlas.size[0]&&y+h<=atlas.size[1],`Invalid sprite: ${name}`);}assert.equal(readFileSync('dist/assets/arcade-atlas-v3.webp').toString('ascii',0,4),'RIFF');
console.log('JavaScript, UI bindings, 9 arcade frames, manifest and complete offline asset graph verified.');

const newEnemies=JSON.parse(readFileSync('dist/assets/enemies-v4.json','utf8'));assert.equal(Object.keys(newEnemies.frames).length,6);for(const frame of Object.values(newEnemies.frames)){const [x,y,w,h]=frame;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=newEnemies.size[0]&&y+h<=newEnemies.size[1]);}
const visuals=JSON.parse(readFileSync('dist/assets/visuals-v6.json','utf8'));
assert.equal(visuals.original_artworks,570);assert.equal(visuals.presentations_per_artwork,5);
assert.equal(Object.keys(visuals.atlases).length,40);
let visualFrames=0;
for(const atlas of Object.values(visuals.atlases)){
 assert.ok(core.includes(`assets/${atlas.file}`),`Not cached: ${atlas.file}`);
 const data=readFileSync(`dist/assets/${atlas.file}`);assert.equal(data.toString('ascii',0,4),'RIFF');assert.ok(data.length>20000);
 for(const [x,y,w,h] of atlas.frames){assert.ok(w>0&&h>0&&x>=0&&y>=0&&x+w<=atlas.size[0]&&y+h<=atlas.size[1]);visualFrames++;}
}
assert.equal(visualFrames,570);
