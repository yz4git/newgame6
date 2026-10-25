import { readdirSync, unlinkSync } from 'node:fs';
for(const name of readdirSync('dist')) if(name.startsWith('_qa-')) unlinkSync(`dist/${name}`);
console.log('Temporary QA files removed.');
