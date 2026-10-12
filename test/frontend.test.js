import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { makeServer } from '../server.js';
import { h,normalize,transpose,chordMarkup,lyricsMarkup,filterSongs,setlistCSV,moveItem,safeLink,mediaSource,youtubeId,baseKey,keyLabel,keyChoicesFor } from '../src/lib.js';
import * as view from '../src/views.js';
import { songForm,setlistForm,adminPage,memberForm,temporaryPasswordView,coverPicker } from '../src/admin.js';
import { logo } from '../src/icons.js';

test('untrusted titles and lyrics are escaped in HTML and chord markup',()=>{
  assert.equal(h('<img src=x onerror="alert(1)">'),'&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  const out=chordMarkup('[C] <script>boom</script>');assert.ok(!out.includes('<script>'));assert.ok(out.includes('<b class="chord">C</b>'));
  assert.equal(safeLink('javascript:alert(1)'),'#');assert.equal(safeLink('https://example.com'),'https://example.com');
});
test('musical transposition handles sharps, flats, minor suffixes and slash bass',()=>{
  assert.equal(transpose('[C] [Am7] [G/B]',2),'[D] [Bm7] [A/C#]');
  assert.equal(transpose('[Bb] [F/A]',-1),'[A] [E/G#]');
  assert.equal(transpose('[Couplet]\n[C] Bonjour',-12),'[Couplet]\n[C] Bonjour');
  assert.equal(transpose('[Couplet] [Bridge] [Cmaj7] [Gsus4] [Am7b5] [C7(b9)]',1),'[Couplet] [Bridge] [C#maj7] [G#sus4] [A#m7b5] [C#7(b9)]');
  const sheet=chordMarkup('[Couplet]\n[C] Bonjour',1);assert.ok(sheet.startsWith('<div class="cp-section">Couplet</div>'));assert.ok(sheet.includes('<b class="chord">C#</b><span> Bonjour</span>'));
  // French notation: recognised, transposed in French, laid out above the syllables.
  assert.equal(transpose('[Sol]Il est né le di[Ré]vin En[Sol]fant [Mim] [Sib] [Lam7/Do]',2),'[La]Il est né le di[Mi]vin En[La]fant [Fa#m] [Do] [Sim7/Ré]');
  const fr=chordMarkup('Refrain\n[Sol]Il est né le di[Ré]vin En[Sol]fant\nUne ligne de paroles seule.');
  assert.ok(fr.startsWith('<div class="cp-section">Refrain</div>'));assert.ok(fr.includes('<b class="chord">Ré</b><span>vin En</span>'));assert.ok(fr.includes('<b class="chord blank"></b><span>Une ligne de paroles seule.</span>'));
  assert.equal(transpose('[Bb] [F/A]',0),'[Bb] [F/A]');
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
  const form=songForm(s);for(const name of ['title','artist','lyrics','chords','reference_url','categories'])assert.ok(form.includes(`name="${name}"`));assert.ok(!form.includes('name="audio_url"'));assert.ok(!form.includes('name="video_url"'));
  assert.ok(setlistForm(s).includes('name="event_id"'));
  const picker=coverPicker('/assets/cover-gold.jpg');assert.equal((picker.match(/class="cover-choice/g)||[]).length,8);assert.ok(picker.includes('data-cover="/assets/cover-gold.jpg" role="radio" aria-checked="true"'));assert.ok(coverPicker('/api/media/x.jpg').includes('Pochette importée'));
  assert.ok(!view.songList(s,new URLSearchParams(),true).includes('data-action="new-song"'),'pas de bouton « + » sur Mes favoris');
  assert.ok(view.pendingPage().includes('#login'));assert.ok(memberForm().includes('name="email"'));
  const members=adminPage({...s,user:{id:'me',name:'Alice',role:'admin'}},{songs:[],audit:[],users:[{id:'p',name:'<b>Paul</b>',email:'p@x.fr',role:'member',status:'pending',created_at:'2026-10-01'},{id:'me',name:'Alice',email:'a@x.fr',role:'admin',status:'active'}]},'members');
  assert.ok(members.includes('data-action="approve-member"'));assert.ok(!members.includes('<b>Paul</b>'));assert.ok(!members.includes('data-action="member-menu" data-id="me"'));
  assert.ok(!temporaryPasswordView({name:'<i>x</i>',email:'e'},'<pw>').includes('<pw>'));
  const malicious=view.songRows([{id:'safe',title:'<script>evil</script>',artist:'Test'}]);assert.ok(!malicious.includes('<script>'));
});
test('the single reference link drives the player: audio, video, embeds or an outbound card',()=>{
  assert.equal(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10'),'dQw4w9WgXcQ');assert.equal(youtubeId('https://youtu.be/dQw4w9WgXcQ'),'dQw4w9WgXcQ');assert.equal(youtubeId('https://example.com/watch?v=dQw4w9WgXcQ'),'');
  assert.equal(mediaSource({reference_url:'https://x.fr/chant.mp3'}).kind,'audio');
  assert.equal(mediaSource({reference_url:'/api/media/v.mp4'}).kind,'video');
  assert.equal(mediaSource({reference_url:'https://youtu.be/dQw4w9WgXcQ'}).embed,'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0');
  assert.equal(mediaSource({reference_url:'https://www.tiktok.com/@louange/video/7312345678901234567'}).embed,'https://www.tiktok.com/player/v1/7312345678901234567?rel=0');
  assert.equal(mediaSource({reference_url:'https://www.instagram.com/reel/Cx1_abc/'}).embed,'https://www.instagram.com/p/Cx1_abc/embed/');
  assert.equal(mediaSource({reference_url:'https://deezer.com/x'}).kind,'link');assert.equal(mediaSource({audio_url:'/api/media/a.mp3'}).kind,'audio','legacy field still honoured');
  assert.equal(mediaSource({}).kind,'none');
  const s={user:{name:'A',role:'member'},categories:[],playingSong:null,route:{params:new URLSearchParams()}};
  const base={id:'s',title:'T',artist:'A',categories:[],history:[],lyrics:'La la',chords:''};
  const page=view.songDetail(s,{...base,reference_url:'https://youtu.be/dQw4w9WgXcQ'});
  assert.ok(page.includes('<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0"'));assert.ok(page.includes('id="song-panel"'));
  // Lyrics open inside the panel, under the same media frame.
  const lyrics=view.songDetail(s,{...base,reference_url:'https://youtu.be/dQw4w9WgXcQ'},'lyrics');assert.ok(lyrics.includes('<iframe'));assert.ok(lyrics.includes('id="lyrics-reader"'));assert.ok(lyrics.includes('La la'));
  assert.ok(view.songDetail(s,{...base,reference_url:'https://deezer.com/x'}).includes('Écouter le chant de référence'));
  assert.ok(view.songDetail(s,{...base,reference_url:'javascript:alert(1)'}).includes('Lien du chant de référence à ajouter'));
});
test('the key picker lists every key in the sheet notation and remembers the chosen one',()=>{
  const key=baseKey({musical_key:'G',chords:'[Sol]Il est'});assert.equal(keyLabel(key,0,'fr'),'Sol');assert.equal(keyLabel(key,2,'fr'),'La');assert.equal(keyLabel(key,-1,'en'),'F#');
  assert.equal(keyLabel(baseKey({musical_key:'Em',chords:''}),3,'fr'),'Solm');
  assert.equal(baseKey({musical_key:'',chords:'[Mim]Depuis'}).root,'Mi');assert.equal(baseKey({musical_key:'',chords:'aucun'}),null);
  const choices=keyChoicesFor(key,'fr');assert.equal(choices.length,12);assert.equal(choices[0].steps,-5);assert.equal(choices.find(c=>c.steps===0).label,'Sol');
  const s={user:{name:'A',role:'member'},categories:[],playingSong:null,route:{params:new URLSearchParams()},transpose:2};
  const html=view.songDetail(s,{id:'s',title:'T',artist:'',categories:[],history:[],lyrics:'',chords:'[Sol]Il est né',musical_key:'G'},'chords');
  const info=view.songDetail(s,{id:'s',title:'T',artist:'',categories:[],history:[],lyrics:'',chords:'[Sol]Il est né',musical_key:'G',tempo:158});assert.ok(info.includes('Tonalité Sol'));assert.ok(info.includes('Jouée en La'));assert.ok(info.includes('158 BPM'));
  assert.ok(html.includes('<option value="2" selected>La</option>'));assert.ok(html.includes('<b class="chord">La</b>'));assert.ok(html.includes('origine Sol'));
});
test('lyrics turn bracketed or named sections into titles and escape the rest',()=>{
  const out=lyricsMarkup('[Couplet 1]\nAu dessus de tous les noms\n\nRefrain\n<b>Tu es élevé</b>');
  assert.ok(out.startsWith('<div class="cp-section">Couplet 1</div><div class="ly-line">Au dessus de tous les noms</div><div class="cp-gap"></div><div class="cp-section">Refrain</div>'));
  assert.ok(out.includes('&lt;b&gt;Tu es élevé&lt;/b&gt;'));
});
test('logo is a true vector monogram, not a pixel trace',()=>{
  const svg=logo();assert.ok(svg.includes('stroke="currentColor"'));assert.ok(!/h1v1|M\d+ \d+h\d+v1/.test(svg));assert.ok(svg.length<1500);
});
test('frontend serves app assets, rejects secrets/traversal and proxies real sessions',async()=>{
  const upstream=createServer(async(req,res)=>{
    let body='';for await(const chunk of req)body+=chunk;
    res.setHeader('Content-Type','application/json');res.setHeader('Set-Cookie','pr_session=test; HttpOnly; Path=/; SameSite=Lax');res.end(JSON.stringify({host:req.headers['x-forwarded-host'],path:req.url,cookie:req.headers.cookie,ip:req.headers['x-forwarded-for'],method:req.method,body:JSON.parse(body||'{}')}));
  });upstream.listen(0,'127.0.0.1');await once(upstream,'listening');
  const server=makeServer({api:'http://127.0.0.1:'+upstream.address().port,trustProxy:false});server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
  try{
    const root=await fetch(base+'/');assert.equal(root.status,200);assert.match(await root.text(),/lang="fr"/);assert.match(root.headers.get('content-security-policy'),/frame-ancestors 'none'/);
    for(const path of ['/src/app.js','/src/styles.css','/assets/app-icon.png','/assets/favicon.svg','/assets/icon-maskable-512.png','/assets/cover-purple.jpg','/manifest.webmanifest'])assert.equal((await fetch(base+path)).status,200,path);
    for(const path of ['/.env','/.git/config','/server.js','/src/%2e%2e%2fserver.js'])assert.equal((await fetch(base+path)).status,404,path);
    const response=await fetch(base+'/api/auth/login?test=1',{method:'POST',headers:{'Content-Type':'application/json',Cookie:'pr_session=old'},body:JSON.stringify({email:'test@example.test'})});
    const data=await response.json();assert.equal(data.path,'/api/auth/login?test=1');assert.equal(data.cookie,'pr_session=old');assert.equal(data.body.email,'test@example.test');assert.equal(data.host,new URL(base).host);assert.match(response.headers.get('set-cookie'),/HttpOnly/);
    const spoof=await (await fetch(base+'/api/health',{headers:{'X-Real-IP':'198.51.100.7','X-Forwarded-For':'203.0.113.9'}})).json();assert.equal(spoof.ip,'127.0.0.1');
  }finally{await Promise.all([new Promise(r=>server.close(r)),new Promise(r=>upstream.close(r))]);}
});

test('trusted edge preserves distinct client IPs for rate limits and rejects malformed headers',async()=>{
  const upstream=createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ip:req.headers['x-forwarded-for']}));});upstream.listen(0,'127.0.0.1');await once(upstream,'listening');
  const server=makeServer({api:'http://127.0.0.1:'+upstream.address().port,trustProxy:true});server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
  try{
    for(const ip of ['198.51.100.7','203.0.113.9','2001:db8::1']){const data=await (await fetch(base+'/api/health',{headers:{'X-Real-IP':ip,'X-Forwarded-For':'spoof'}})).json();assert.equal(data.ip,ip);}
    const invalid=await (await fetch(base+'/api/health',{headers:{'X-Real-IP':'198.51.100.7,spoof'}})).json();assert.equal(invalid.ip,'127.0.0.1');
  }finally{await Promise.all([new Promise(r=>server.close(r)),new Promise(r=>upstream.close(r))]);}
});
