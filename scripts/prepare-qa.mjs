import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
copyFileSync('tests/phone.html','dist/_qa-phone.html');
copyFileSync('tests/qa-bridge.mjs','dist/_qa-bridge.mjs');
writeFileSync('dist/_qa-game.html',readFileSync('dist/index.html','utf8').replace('</head>','<script type="module" src="./_qa-bridge.mjs?r=release"></script></head>'));
console.log('Temporary local fixture: /_qa-phone.html. Remove all dist/_qa-* files before packaging.');
