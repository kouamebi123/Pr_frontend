export const h=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const dateLabel=value=>value?new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric'}).format(new Date(value.slice(0,10)+'T12:00:00')):'Date à définir';
export const shortDate=value=>value?new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'short'}).format(new Date(value.slice(0,10)+'T12:00:00')):'À venir';
export const timeLabel=seconds=>`${Math.floor((seconds||0)/60)}:${String(Math.floor((seconds||0)%60)).padStart(2,'0')}`;
export const keyChoices=['','C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B','Cm','C#m','Dm','Ebm','Em','Fm','F#m','Gm','G#m','Am','Bbm','Bm'];
export const statusLabel=value=>({draft:'Brouillon',ready:'Prêt',completed:'Joué',planned:'À venir',cancelled:'Annulé'})[value]||value;
// Chords between brackets, in English (C, Am7, G/B) or French (Do, Lam7, Sol/Si) notation.
const SUFFIX='((?:(?:maj|min|dim|aug|sus|add|omit|no|m|M|Δ|°|ø|\\+|-|\\d+|[#b]\\d+|\\((?:[#b]?\\d+,?)+\\)))*)';
const ROOT='(Do|Ré|Re|Mi|Fa|Sol|La|Si|[A-G])([#b]?)';
const chordPattern=new RegExp('^'+ROOT+SUFFIX+'(?:\\/'+ROOT+')?$');
const SEMITONE={C:0,D:2,E:4,F:5,G:7,A:9,B:11,Do:0,Re:2,'Ré':2,Mi:4,Fa:5,Sol:7,La:9,Si:11};
const NAMES={en:['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'],fr:['Do','Do#','Ré','Ré#','Mi','Fa','Fa#','Sol','Sol#','La','La#','Si']};
export function parseChord(label){
  const m=String(label).match(chordPattern);if(!m)return null;
  const [,root,acc,suffix,bassRoot,bassAcc]=m;
  return {root,acc,suffix,bassRoot:bassRoot||'',bassAcc:bassAcc||'',system:root.length>1?'fr':'en'};
}
export const isChord=label=>!!parseChord(label);
const shiftNote=(root,acc,steps,system)=>NAMES[system][(SEMITONE[root]+(acc==='#'?1:acc==='b'?-1:0)+steps%12+24)%12];
export function transposeChord(label,steps=0){
  const c=parseChord(label);if(!c||steps%12===0)return label;
  return shiftNote(c.root,c.acc,steps,c.system)+c.suffix+(c.bassRoot?'/'+shiftNote(c.bassRoot,c.bassAcc,steps,c.system):'');
}
export function transpose(text,steps=0){return String(text).replace(/\[([^\]\n]+)\]/g,(token,label)=>isChord(label)?'['+transposeChord(label,steps)+']':token);}
const SECTION=/^(refrain|couplet|pont|bridge|intro|outro|final|chorus|verse|pré-refrain|pre-refrain|pre-chorus|interlude|coda|instrumental|tag)\b/i;
// ChordPro-style rendering: each chord sits above the syllable it is written before.
export function chordMarkup(text,steps=0){
  return String(text).split('\n').map(line=>{
    const tokens=line.split(/(\[[^\]\n]+\])/);
    const hasChord=tokens.some(t=>t.startsWith('[')&&isChord(t.slice(1,-1)));
    const plain=line.trim();
    if(!hasChord){
      if(!plain)return '<div class="cp-gap"></div>';
      const label=plain.match(/^\[([^\]]+)\]$/)?.[1]||(SECTION.test(plain)?plain:'');
      return label?`<div class="cp-section">${h(label)}</div>`:`<div class="cp-line"><span class="cp-seg"><b class="chord blank"></b><span>${h(line)}</span></span></div>`;
    }
    const segments=[];let chord='';
    for(const t of tokens){
      if(t.startsWith('[')&&t.endsWith(']')&&isChord(t.slice(1,-1))){if(chord)segments.push({chord,text:''});chord=transposeChord(t.slice(1,-1),steps);}
      else if(t){segments.push({chord,text:t});chord='';}
    }
    if(chord)segments.push({chord,text:''});
    return `<div class="cp-line">${segments.map(x=>`<span class="cp-seg"><b class="chord${x.chord?'':' blank'}">${h(x.chord)}</b><span>${h(x.text)}</span></span>`).join('')}</div>`;
  }).join('');
}
export function filterSongs(songs,categories,{q='',category='',style='',event='',favorites=false}={}){
  let result=songs.filter(s=>!s.archived&&(!favorites||s.favorite));const query=normalize(q);
  if(query)result=result.filter(s=>normalize(`${s.title} ${s.artist} ${s.lyrics} ${s.notes} ${s.language} ${s.categories.map(id=>categories.find(c=>c.id===id)?.name||'').join(' ')}`).includes(query));
  for(const cid of [category,style,event].filter(Boolean)){const ids=categories.filter(c=>c.id===cid||c.parent_id===cid).map(c=>c.id);result=result.filter(s=>s.categories.some(id=>ids.includes(id)));}
  return result;
}
export async function api(path,options={}){
  const headers={...(options.headers||{})};let body=options.body;
  if(body&&!(body instanceof Blob)&&typeof body!=='string'){headers['Content-Type']='application/json';body=JSON.stringify(body);}
  const res=await fetch('/api'+path,{credentials:'same-origin',...options,body,headers});
  let data;try{data=await res.json();}catch{throw new Error('Réponse serveur non valide.');}
  if(!res.ok)throw Object.assign(new Error(data.error||'Une erreur est survenue.'),{status:res.status});return data;
}
export function csvCell(value){let s=String(value??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export function setlistCSV(list){return '\ufeff'+[['Ordre','Chant','Artiste','Tonalité','Notes'],...list.items.map((item,index)=>[index+1,item.title,item.artist,item.musical_key,item.notes])].map(row=>row.map(csvCell).join(';')).join('\r\n');}
export function moveItem(items,itemId,direction){const next=[...items];const index=next.findIndex(x=>x.id===itemId);const target=index+direction;if(index<0||target<0||target>=next.length)return next;[next[index],next[target]]=[next[target],next[index]];return next;}
export function safeLink(value){try{const u=new URL(value,globalThis.location?.origin||'http://localhost');return ['http:','https:'].includes(u.protocol)?h(value):'#';}catch{return '#';}}

// YouTube video id from watch / youtu.be / shorts / embed / live URLs, else ''.
export function youtubeId(value){
  try{const u=new URL(String(value||''));const host=u.hostname.replace(/^(www|m|music)\./,'');
    if(host==='youtu.be')return /^[\w-]{11}$/.test(u.pathname.slice(1))?u.pathname.slice(1):'';
    if(host!=='youtube.com'&&host!=='youtube-nocookie.com')return '';
    const v=u.searchParams.get('v');if(v&&/^[\w-]{11}$/.test(v))return v;
    const m=u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/);return m?m[1]:'';
  }catch{return '';}
}
export const isVideoFile=value=>/\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(String(value||''));
export const isAudioFile=value=>/\.(mp3|wav|ogg|oga|m4a|aac|flac|opus)(\?|#|$)/i.test(String(value||''));
// What the song page plays, from the single « lien du chant de référence » (legacy audio/video
// fields still honoured): audio file → audio player; video file → video; YouTube / TikTok /
// Instagram → embedded player; any other site → a card that opens the link.
export function mediaSource(song){
  const url=song.audio_url||song.video_url||song.reference_url||'';
  if(!url)return {kind:'none',url:'',label:'Aucun média'};
  if(isAudioFile(url))return {kind:'audio',url,label:'Audio de référence'};
  if(isVideoFile(url))return {kind:'video',url,label:'Vidéo de référence'};
  const yt=youtubeId(url);if(yt)return {kind:'embed',url,embed:'https://www.youtube-nocookie.com/embed/'+yt+'?rel=0',label:'Vidéo YouTube'};
  let u;try{u=new URL(url);}catch{return {kind:'none',url:'',label:'Aucun média'};}
  if(!['http:','https:'].includes(u.protocol))return {kind:'none',url:'',label:'Aucun média'};
  const host=u.hostname.replace(/^(www|m|vm)\./,'');
  const tt=host==='tiktok.com'&&u.pathname.match(/\/video\/(\d+)/);if(tt)return {kind:'embed',url,embed:'https://www.tiktok.com/player/v1/'+tt[1]+'?rel=0',label:'Vidéo TikTok'};
  const ig=host==='instagram.com'&&u.pathname.match(/^\/(?:p|reel|reels|tv)\/([\w-]+)/);if(ig)return {kind:'embed',url,embed:'https://www.instagram.com/p/'+ig[1]+'/embed/',label:'Publication Instagram'};
  return {kind:'link',url,host,label:'Chant de référence'};
}
// Covers offered by the application (sharp 1200 px artwork shipped with the front).
export const COVERS=[['purple','Violet'],['gold','Doré'],['night','Nuit'],['rose','Rose'],['ocean','Océan'],['forest','Forêt'],['ember','Braise'],['dawn','Aurore']].map(([k,label])=>({url:`/assets/cover-${k}.jpg`,label}));
export const DEFAULT_COVER=COVERS[0].url;
