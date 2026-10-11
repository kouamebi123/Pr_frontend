import { mkdirSync,rmSync,cpSync } from 'node:fs';
rmSync('dist',{recursive:true,force:true});mkdirSync('dist',{recursive:true});
for(const path of ['index.html','src','public','server.js','package.json'])cpSync(path,`dist/${path}`,{recursive:true});
console.log('Application compilée dans dist/. Démarrer avec node dist/server.js ; API_URL doit pointer vers le backend.');
