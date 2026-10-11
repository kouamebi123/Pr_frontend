import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { makeServer } from '../server.js';
import { h,normalize,transpose,chordMarkup,filterSongs,setlistCSV,moveItem,safeLink } from '../src/lib.js';
import * as view from '../src/views.js';
import { songForm,setlistForm } from '../src/admin.js';

test('untrusted titles and lyrics are escaped in HTML and chord markup',()=>{
  assert.equal(h('<img src=x onerror="alert(1)">'),'&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  const out=chordMarkup('[C] <script>boom</script>');assert.ok(!out.includes('<script>'));assert.ok(out.includes('<b class="chord">C</b>'));
  assert.equal(safeLink('javascript:alert(1)'),'#');assert.equal(safeLink('https://example.com'),'https://example.com');
});
test('musical transposition handles sharps, flats, minor suffixes and slash bass',()=>{
  assert.equal(transpose('[C] [Am7] [G/B]',2),'[D] [Bm7] [A/C#]');
  assert.equal(transpose('[Bb] [F/A]',-1),'[A] [E/G#]');
  assert.equal(transpose('[Couplet]\n[C] Bonjour',-12),'[Couplet]\n[C] Bonjour');
  assert.equal(transpose('[F#m7] [Eb/G]',1),'[Gm7] [E/G#]');
});
test('catalogue search and multiple category filters compose without accent sensitivity',()=>{
  const songs=[{id:'a',title:'Élève',artist:'Dan',lyrics:'Grâce',notes:'',categories:['ev','sub'],favorite:true},{id:'b',title:'Autre',categories:['ev'],favorite:false}];
  const categories=[{id:'ev',name:'CGA'},{id:'style',name:'Louange'},{id:'sub',name:'Seben',parent_id:'style'}];
  assert.equal(filterSongs(songs,categories,{q:'eleve'}).length,1);assert.equal(filterSongs(songs,categories,{q:'grace'}).length,1);
  assert.equal(filterSongs(songs,categories,{event:'ev',style:'style',favorites:true})[0].id,'a');
  assert.equal(filterSongs(songs,categories,{style:'missing'}).length,0);
});
test('reordering keeps all songs and CSV neutralizes spreadsheet formula injection',()=>{
  const items=[{id:'1',title:'=HYPERLINK("evil")',artist:'A',musical_key:'C',notes:'a;b'},{id:'2',title:'Chant',artist:'B'}];
  assert.equal(moveItem(items,'2',-1)[0].id,'2');assert.equal(moveItem(items,'1',-1)[0].id,'1');assert.equal(items[0].id,'1');
  const csv=setlistCSV({items});assert.ok(csv.startsWith('\ufeff'));assert.ok(csv.includes('"\'=HYPERLINK('));assert.ok(csv.includes('"a;b"'));
});
test('screens expose the reference navigation plus repertoire and administrative forms',()=>{
  const s={user:{name:'Alice',role:'admin'},songs:[],categories:[{id:'ev',name:'CGA',kind:'event',color:'#351164',icon:'calendar'},{id:'style',name:'Louange',kind:'style',color:'#351164',icon:'music'}],events:[],route:{params:new URLSearchParams()},searches:[],dashboard:null};
  const home=view.home(s);for(const href of ['#events','#styles','#search','#favorites','#songs','#setlists'])assert.ok(home.includes(href));
  const form=songForm(s);for(const name of ['title','artist','lyrics','chords','audio_url','video_url','reference_url','categories'])assert.ok(form.includes(`name="${name}"`));
  assert.ok(setlistForm(s).includes('name="event_id"'));
  const malicious=view.songRows([{id:'safe',title:'<script>evil</script>',artist:'Test'}]);assert.ok(!malicious.includes('<script>'));
});
test('frontend serves app assets, rejects secrets/traversal and proxies real sessions',async()=>{
  const upstream=createServer(async(req,res)=>{
    let body='';for await(const chunk of req)body+=chunk;
    res.setHeader('Content-Type','application/json');res.setHeader('Set-Cookie','pr_session=test; HttpOnly; Path=/; SameSite=Lax');res.end(JSON.stringify({path:req.url,cookie:req.headers.cookie,method:req.method,body:JSON.parse(body||'{}')}));
  });upstream.listen(0,'127.0.0.1');await once(upstream,'listening');
  const server=makeServer({api:'http://127.0.0.1:'+upstream.address().port});server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
  try{
    const root=await fetch(base+'/');assert.equal(root.status,200);assert.match(await root.text(),/lang="fr"/);assert.match(root.headers.get('content-security-policy'),/frame-ancestors 'none'/);
    for(const path of ['/src/app.js','/src/styles.css','/assets/app-icon.png','/manifest.webmanifest'])assert.equal((await fetch(base+path)).status,200,path);
    for(const path of ['/.env','/.git/config','/server.js','/src/%2e%2e%2fserver.js'])assert.equal((await fetch(base+path)).status,404,path);
    const response=await fetch(base+'/api/auth/login?test=1',{method:'POST',headers:{'Content-Type':'application/json',Cookie:'pr_session=old'},body:JSON.stringify({email:'test@example.test'})});
    const data=await response.json();assert.equal(data.path,'/api/auth/login?test=1');assert.equal(data.cookie,'pr_session=old');assert.equal(data.body.email,'test@example.test');assert.match(response.headers.get('set-cookie'),/HttpOnly/);
  }finally{await Promise.all([new Promise(r=>server.close(r)),new Promise(r=>upstream.close(r))]);}
});
