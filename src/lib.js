export const h=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const dateLabel=value=>value?new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric'}).format(new Date(value.slice(0,10)+'T12:00:00')):'Date à définir';
export const shortDate=value=>value?new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'short'}).format(new Date(value.slice(0,10)+'T12:00:00')):'À venir';
export const timeLabel=seconds=>`${Math.floor((seconds||0)/60)}:${String(Math.floor((seconds||0)%60)).padStart(2,'0')}`;
export const keyChoices=['','C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B','Cm','C#m','Dm','Ebm','Em','Fm','F#m','Gm','G#m','Am','Bbm','Bm'];
export const statusLabel=value=>({draft:'Brouillon',ready:'Prêt',completed:'Joué',planned:'À venir',cancelled:'Annulé'})[value]||value;
export function transpose(text,steps=0){
  const notes=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];const flats={Db:'C#',Eb:'D#',Gb:'F#',Ab:'G#',Bb:'A#'};
  return String(text).replace(/\[([A-G](?:#|b)?)([^\]]*)\]/g,(_,root,suffix)=>{
    const index=notes.indexOf(flats[root]||root);let ending=suffix.replace(/\/([A-G](?:#|b)?)/g,(_x,bass)=>'/'+notes[(notes.indexOf(flats[bass]||bass)+steps%12+12)%12]);
    return '['+notes[(index+steps%12+12)%12]+ending+']';
  });
}
export function chordMarkup(text,steps=0){return h(transpose(text,steps)).replace(/\[([A-G](?:#|b)?[^\]]*)\]/g,'<b class="chord">$1</b>');}
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
