import {mkdir,copyFile,cp,writeFile,readFile} from 'node:fs/promises';
const files=['index.html','styles.css','app.js','booking.js','booking-ui.js','booking-icons.js','booking-snapshot.js','catalog.js','custom-fields.js','icons.js','liquid-glass.js','robots.txt','LUCIDE-LICENSE.txt'];
await mkdir('dist',{recursive:true});
for(const file of files){
 if(file.endsWith('.css')){
  const css=await readFile(file,'utf8');
  await writeFile('dist/'+file,css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\r?\n\s*/g,''));
 }else await copyFile(file,'dist/'+file);
}
const source=(await Promise.all(files.filter(f=>/\.(html|css|js)$/.test(f)).map(f=>readFile(f,'utf8')))).join('\n');
const videoFiles=new Set([...source.matchAll(/assets\/([\w-]+\.mp4)/g)].map(m=>m[1]));
await cp('assets','dist/assets',{recursive:true,filter:path=>{
 const name=path.replaceAll('\\','/').split('/').pop();
 if(name.endsWith('.jpg'))return source.includes('assets/'+name);
 if(name.endsWith('.mp4'))return videoFiles.has(name);
 return !/^logo-(selected|modern|variant-)/.test(name);
}});
await writeFile('dist/.nojekyll','');
await writeFile('dist/404.html','<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title>Страница не найдена</title></head><body><h1>Страница не найдена</h1><a href="./">На главную</a></body></html>');
console.log('Static site ready in dist');