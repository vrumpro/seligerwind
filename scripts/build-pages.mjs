import {mkdir,copyFile,cp,writeFile} from 'node:fs/promises';
const files=['index.html','styles.css','app.js','booking.js','booking-ui.js','booking-icons.js','booking-snapshot.js','catalog.js','custom-fields.js','icons.js','liquid-glass.js','robots.txt','LUCIDE-LICENSE.txt'];
await mkdir('dist',{recursive:true});
for(const file of files)await copyFile(file,'dist/'+file);
await cp('assets','dist/assets',{recursive:true});
await writeFile('dist/.nojekyll','');
await writeFile('dist/404.html','<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title>Страница не найдена</title></head><body><h1>Страница не найдена</h1><a href="./">На главную</a></body></html>');
console.log('Static site ready in dist');