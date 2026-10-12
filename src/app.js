import { api,h,filterSongs,timeLabel,chordMarkup,transpose,moveItem,setlistCSV } from './lib.js';
import { icon } from './icons.js';
import * as view from './views.js';
import * as forms from './admin.js';

const app=document.querySelector('#app'),modalRoot=document.querySelector('#modal-root'),audio=document.querySelector('#audio');
const s={user:null,categories:[],songs:[],searches:[],events:[],setlists:[],dashboard:null,route:{path:'home',params:new URLSearchParams()},
  listFilter:'all',eventFilter:'all',playingSong:null,isPlaying:false,detail:null,song:null,event:null,admin:null,transpose:0,fontSize:19,afterAuth:'#home'};
let renderVersion=0,toastTimer,previousFocus,confirmCallback,installPrompt,pendingSongId='',uploadCount=0;
function toast(message,error=false){const el=document.querySelector('#toast');el.textContent=message;el.className=`visible ${error?'error':''}`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.className='',5000);}
function route(){const [path,query]=(location.hash.slice(1)||'welcome').split('?');return {path,params:new URLSearchParams(query||'')};}
function go(path){location.hash=path;}
function requireUser(){if(s.user)return true;s.afterAuth=location.hash||'#home';go('login');return false;}
async function catalog(){let songs=[],offset=0,total=1;while(offset<total){const data=await api('/songs?limit=1000&offset='+offset);songs.push(...data.songs);total=data.total;offset+=data.songs.length;if(!data.songs.length)break;}s.songs=songs;}
// The repertoire is reserved to validated members: nothing but /auth/me is loaded before sign-in.
async function refresh(){const me=await api('/auth/me');s.user=me.user;s.registration=me.registration;
  if(s.user){const [cats,,dashboard,events]=await Promise.all([api('/categories'),catalog(),api('/dashboard'),api('/events')]);s.categories=cats.categories;s.dashboard=dashboard;s.events=events.events;}
  else{s.categories=[];s.songs=[];s.dashboard=null;s.events=[];s.searches=[];s.setlists=[];}}
const PUBLIC_PATHS=['welcome','login','register','pending'];
function askNewPassword(){modal('Choisissez votre mot de passe','<p class="info-box warning">Vous êtes connecté avec un mot de passe provisoire. Choisissez maintenant votre mot de passe personnel.</p>'+forms.passwordForm());}
function modal(title,content,wide=false){previousFocus=document.activeElement;modalRoot.innerHTML=`<div class="modal-backdrop"><section class="modal ${wide?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header><h2 id="modal-title">${h(title)}</h2><button class="icon-button" data-action="close-modal" aria-label="Fermer">${icon('close')}</button></header><div class="modal-content">${content}</div></section></div>`;document.body.classList.add('modal-open');requestAnimationFrame(()=>modalRoot.querySelector('input:not([type="checkbox"]),select,textarea,button')?.focus());}
function closeModal(){if(uploadCount){toast('Patientez pendant l’import du fichier.');return;}const selectionOpen=!!modalRoot.querySelector('#selection-results')||!!modalRoot.querySelector('#temp-password');modalRoot.innerHTML='';document.body.classList.remove('modal-open');confirmCallback=null;previousFocus?.focus();if(selectionOpen&&route().path===s.route.path)void render({keepScroll:true});}
function confirmAction(title,message,callback,label='Confirmer'){modal(title,`<p class="confirm-message">${h(message)}</p><div class="form-error" role="alert"></div><div class="form-footer"><button class="btn outline" data-action="close-modal">Annuler</button><button class="btn primary" data-action="confirm">${h(label)}</button></div>`);confirmCallback=callback;}
const localSearches=()=>{try{return JSON.parse(localStorage.getItem('pr_recent')||'[]').slice(0,10);}catch{return[];}};
async function remember(term){if(!term.trim())return;if(s.user)await api('/searches',{method:'POST',body:{term:term.trim()}});else{const recent=[{term:term.trim()},...localSearches().filter(x=>x.term!==term.trim())].slice(0,10);localStorage.setItem('pr_recent',JSON.stringify(recent));}s.searches=s.user?(await api('/searches')).searches:localSearches();}

async function render({keepScroll=false}={}){
  const generation=++renderVersion;const scrollY=window.scrollY;s.route=route();const {path,params}=s.route;let content='';
  if(!s.user&&!PUBLIC_PATHS.includes(path)){s.afterAuth='#'+(location.hash.slice(1)||'home');location.replace('#login');return;}
  if(s.user&&['login','register','pending'].includes(path)){location.replace('#home');return;}
  try{
    if(path==='welcome'){document.title='Porteurs de Réveil';app.innerHTML=view.welcome();return;}
    if(path==='pending'){document.title='Demande envoyée · Porteurs de Réveil';app.innerHTML=view.pendingPage();return;}
    if(path==='login'||path==='register'){app.innerHTML=view.authPage(path==='register');document.title=(path==='login'?'Connexion':'Demande d’accès')+' · Porteurs de Réveil';return;}
    if(path==='home')content=view.home(s);
    else if(path==='events'||path==='styles')content=view.categories(s,path==='events'?'event':'style');
    else if(path==='songs'||path==='favorites')content=view.songList(s,params,path==='favorites');
    else if(path==='search'){s.searches=s.user?(await api('/searches')).searches:localSearches();content=view.search(s,params.get('q')||'');}
    else if(path.startsWith('song/')){const [,songId,tab]=path.split('/');s.song=await api('/songs/'+encodeURIComponent(songId));s.transpose=0;content=view.songDetail(s,s.song,tab);}
    else if(path==='setlists'){if(!s.user)content=view.gate('Mes répertoires');else{s.setlists=(await api('/setlists')).setlists;content=view.setlists(s,s.setlists);}}
    else if(path.startsWith('setlist/')){if(!s.user)content=view.gate('Votre répertoire');else{s.detail=await api('/setlists/'+encodeURIComponent(path.split('/')[1]));content=view.setlistDetail(s,s.detail);}}
    else if(path==='calendar'){if(!s.user)content=view.gate('Événements','Connectez-vous pour préparer vos événements et consulter l’historique.');else{s.events=(await api('/events')).events;content=view.events(s,s.events);}}
    else if(path.startsWith('event/')){if(!s.user)content=view.gate('Événement');else{s.event=await api('/events/'+encodeURIComponent(path.split('/')[1]));content=view.eventDetail(s,s.event);}}
    else if(path==='profile'){if(s.user)s.dashboard=await api('/dashboard');content=view.profile(s);}
    else if(path==='admin'){if(!s.user)content=view.gate('Administration');else{s.admin=await api('/admin');content=forms.adminPage(s,s.admin,params.get('tab')||'songs');}}
    else content=view.header('Page introuvable')+view.empty('Cette page n’existe pas','Retrouvez votre répertoire depuis l’accueil.','<a href="#home" class="btn primary">Revenir à l’accueil</a>');
    if(generation!==renderVersion)return;
    app.innerHTML=view.shell(content,s,path);document.title=(app.querySelector('h1')?.textContent||'Répertoire')+' · Porteurs de Réveil';syncAudio();
    if(keepScroll)window.scrollTo({top:scrollY});else window.scrollTo({top:0});
  }catch(error){if(generation!==renderVersion)return;
    if(error.status===401){s.user=null;await refresh().catch(()=>{});s.afterAuth=location.hash||'#home';location.replace('#login');toast('Votre session a expiré. Reconnectez-vous.',true);return;}
    app.innerHTML=view.shell(view.header('Impossible d’ouvrir cette page')+view.empty('Réessayons dans un instant',error.message,view.button('Réessayer','retry')),s,path);}
}
function syncAudio(){
  const active=s.playingSong&&s.song?.id===s.playingSong.id;
  const seek=document.querySelector('#audio-progress');if(active&&seek){seek.max=Number.isFinite(audio.duration)?audio.duration:s.playingSong.duration||100;if(document.activeElement!==seek)seek.value=audio.currentTime;}
  if(active){const t=document.querySelector('#audio-current');if(t)t.textContent=timeLabel(audio.currentTime);const duration=document.querySelector('#audio-duration');if(duration)duration.textContent=timeLabel(Number.isFinite(audio.duration)?audio.duration:s.playingSong.duration);}
  document.querySelectorAll('.mini-toggle').forEach(b=>b.innerHTML=icon(audio.paused?'play':'pause'));
  document.querySelectorAll('.play-button').forEach(b=>{if(b.dataset.id===s.playingSong?.id){b.innerHTML=icon(audio.paused?'play':'pause');b.setAttribute('aria-label',audio.paused?'Écouter le chant':'Mettre en pause');}});
}
async function playSong(song){
  if(!song.audio_url){toast('Ce chant ne possède pas encore de fichier audio.');return;}
  if(s.playingSong?.id!==song.id){s.playingSong=song;audio.src=song.audio_url;await audio.play();}else if(audio.paused)await audio.play();else audio.pause();
  s.isPlaying=!audio.paused;await render({keepScroll:true});
}
async function newSetlist(eventId=''){if(!requireUser())return;s.events=(await api('/events')).events;modal('Nouveau répertoire',forms.setlistForm(s,{},eventId));}
async function addToSetlist(songId){
  if(!requireUser())return;pendingSongId=songId;s.setlists=(await api('/setlists')).setlists;
  const lists=s.setlists.filter(l=>l.can_edit&&l.status!=='completed');
  modal('Ajouter à un répertoire',`<p class="muted">Choisissez le répertoire dans lequel ajouter ce chant.</p><div class="choose-lists">${lists.map(l=>`<button class="reference-card" data-action="choose-setlist" data-id="${h(l.id)}" ${l.items.some(x=>x.song_id===songId)?'disabled':''}>${icon('file')}<span><b>${h(l.title)}</b><small>${l.items.some(x=>x.song_id===songId)?'Chant déjà présent':l.items.length+' chants'}</small></span>${icon('plus')}</button>`).join('')}</div><button class="btn primary full" data-action="new-setlist-for-song">${icon('plus')} Créer un répertoire</button>`);
}
function selectionRows(q=''){const songs=filterSongs(s.songs,s.categories,{q});return songs.map(song=>{const chosen=s.detail.items.some(x=>x.song_id===song.id);return `<button class="select-song-row" data-action="choose-song" data-id="${h(song.id)}" ${chosen?'disabled':''}>${view.cover(song)}<span><b>${h(song.title)}</b><small>${h(song.artist)}</small></span>${icon(chosen?'check':'plus')}</button>`;}).join('')||'<p class="muted">Aucun chant trouvé.</p>';}
function selectSongs(){modal('Ajouter des chants',`<label class="search-field">${icon('search')}<input id="select-query" placeholder="Rechercher un chant" aria-label="Filtrer les chants"></label><div id="selection-results">${selectionRows()}</div><div class="form-footer"><button class="btn primary" data-action="finish-selection">Terminer</button></div>`);}
function download(text,name,type){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function shareList(){
  const url=location.origin+'/#setlist/'+s.detail.id;
  if(navigator.share){try{await navigator.share({title:s.detail.title,text:'Notre répertoire Porteurs de Réveil',url});}catch(error){if(error.name!=='AbortError')throw error;}}
  else if(navigator.clipboard){await navigator.clipboard.writeText(url);toast('Lien copié. Les membres connectés peuvent ouvrir ce répertoire.');}
  else modal('Partager le répertoire',`<p>Copiez ce lien. Une connexion est nécessaire pour l’ouvrir.</p><input class="share-url" value="${h(url)}" readonly aria-label="Lien du répertoire">`);
}

const actions={
  retry:()=>render(), 'close-modal':()=>closeModal(),
  confirm:async()=>{const cb=confirmCallback;if(cb)await cb();},
  favorite:async el=>{if(!requireUser())return;const song=s.songs.find(x=>x.id===el.dataset.id)||s.song;const result=await api('/favorites/'+encodeURIComponent(song.id),{method:song.favorite?'DELETE':'PUT'});song.favorite=result.favorite;if(s.song?.id===song.id)s.song.favorite=result.favorite;toast(result.favorite?'Ajouté aux favoris':'Retiré des favoris');await render({keepScroll:true});},
  'play-song':el=>playSong(s.songs.find(x=>x.id===el.dataset.id)||s.song),
  'toggle-audio':async()=>{if(audio.paused)await audio.play();else audio.pause();},
  'close-audio':async()=>{audio.pause();audio.removeAttribute('src');audio.load();s.playingSong=null;await render({keepScroll:true});},
  'song-menu':()=>modal('Actions du chant',`<div class="menu-actions"><button class="reference-card" data-action="add-to-setlist" data-id="${h(s.song.id)}">${icon('plus')} Ajouter à un répertoire</button><a class="reference-card" href="#song/${h(s.song.id)}?view=${s.route.params.get('view')==='expanded'?'classic':'expanded'}" data-close-modal>${icon('file')} ${s.route.params.get('view')==='expanded'?'Vue lecteur':'Vue détaillée'}</a><a class="reference-card" href="#song/${h(s.song.id)}/history" data-close-modal>${icon('calendar')} Événements où le chant a été joué</a>${['admin','editor'].includes(s.user?.role)?`<button class="reference-card" data-action="edit-song" data-id="${h(s.song.id)}">${icon('edit')} Modifier le chant</button>`:''}</div>`),
  'font-up':()=>{s.fontSize=Math.min(36,s.fontSize+2);document.querySelector('#lyrics-reader').style.fontSize=s.fontSize+'px';},
  'font-down':()=>{s.fontSize=Math.max(14,s.fontSize-2);document.querySelector('#lyrics-reader').style.fontSize=s.fontSize+'px';},
  transpose:el=>{s.transpose+=Number(el.dataset.step);document.querySelector('#chords-reader').innerHTML=chordMarkup(s.song.chords,s.transpose);document.querySelector('#transpose-count').textContent=(s.transpose>0?'+':'')+s.transpose;document.querySelector('#transposed-key').textContent=s.song.musical_key?transpose('['+s.song.musical_key+']',s.transpose).replace(/[\[\]]/g,''):'Non précisée';},
  print:()=>window.print(),
  'clear-searches':async()=>{if(s.user)await api('/searches',{method:'DELETE'});else localStorage.removeItem('pr_recent');s.searches=[];await render({keepScroll:true});},
  'recent-search':el=>go('search?q='+encodeURIComponent(el.dataset.term)),
  'new-song':()=>modal('Ajouter un chant',forms.songForm(s),true),
  'edit-song':async el=>{const song=await api('/songs/'+encodeURIComponent(el.dataset.id));modal('Modifier le chant',forms.songForm(s,song),true);},
  'archive-song':el=>{const song=s.admin.songs.find(x=>x.id===el.dataset.id);confirmAction(song.archived?'Restaurer ce chant ?':'Archiver ce chant ?',song.archived?'Le chant sera de nouveau visible dans le catalogue.':'Le chant sera retiré du catalogue. Les répertoires et son historique seront conservés.',async()=>{await api('/songs/'+song.id+'/archive',{method:'POST',body:{version:song.version,archived:!song.archived}});closeModal();await catalog();await render({keepScroll:true});toast(song.archived?'Chant restauré':'Chant archivé');});},
  'new-category':()=>modal('Nouvelle catégorie',forms.categoryForm(s)),
  'edit-category':el=>modal('Modifier la catégorie',forms.categoryForm(s,s.categories.find(c=>c.id===el.dataset.id))),
  'delete-category':el=>confirmAction('Supprimer cette catégorie ?','La suppression est possible uniquement si aucun chant, événement ou sous-style ne l’utilise.',async()=>{await api('/categories/'+el.dataset.id,{method:'DELETE'});closeModal();s.categories=(await api('/categories')).categories;await render({keepScroll:true});toast('Catégorie supprimée');}),
  'add-to-setlist':el=>addToSetlist(el.dataset.id),
  'new-setlist':()=>{pendingSongId='';return newSetlist();},
  'new-setlist-for-song':()=>newSetlist(),
  'choose-setlist':async el=>{const list=s.setlists.find(x=>x.id===el.dataset.id);await api('/setlists/'+list.id+'/items',{method:'POST',body:{song_id:pendingSongId,version:list.version}});pendingSongId='';closeModal();toast('Chant ajouté au répertoire');},
  'select-songs':()=>selectSongs(),
  'choose-song':async el=>{s.detail=await api('/setlists/'+s.detail.id+'/items',{method:'POST',body:{song_id:el.dataset.id,version:s.detail.version}});document.querySelector('#selection-results').innerHTML=selectionRows(document.querySelector('#select-query').value);toast('Chant ajouté');},
  'finish-selection':()=>closeModal(),
  'edit-item':el=>modal('Tonalité et notes',forms.itemForm(s.detail.items.find(x=>x.id===el.dataset.id))),
  'remove-item':async el=>{s.detail=await api('/setlists/'+s.detail.id+'/items/'+el.dataset.id,{method:'DELETE',body:{version:s.detail.version}});await render({keepScroll:true});toast('Chant retiré du répertoire');},
  'move-item':async el=>{const ids=moveItem(s.detail.items,el.dataset.id,Number(el.dataset.direction)).map(x=>x.id);s.detail=await api('/setlists/'+s.detail.id+'/order',{method:'PUT',body:{ids,version:s.detail.version}});await render({keepScroll:true});},
  'setlist-filter':el=>{s.listFilter=el.dataset.value;return render({keepScroll:true});},
  'event-filter':el=>{s.eventFilter=el.dataset.value;return render({keepScroll:true});},
  'edit-setlist':async()=>{s.events=(await api('/events')).events;modal('Modifier le répertoire',forms.setlistForm(s,s.detail));},
  'copy-setlist':async()=>{const data=await api('/setlists/'+s.detail.id+'/copy',{method:'POST'});closeModal();go('setlist/'+data.id);toast('Répertoire dupliqué');},
  'delete-setlist':()=>confirmAction('Supprimer ce répertoire ?','Sa sélection et ses notes seront supprimées. Les chants du catalogue seront conservés.',async()=>{await api('/setlists/'+s.detail.id,{method:'DELETE'});closeModal();go('setlists');toast('Répertoire supprimé');},'Supprimer'),
  'export-setlist':()=>download(setlistCSV(s.detail),`repertoire-${s.detail.id}.csv`,'text/csv;charset=utf-8'),
  'share-setlist':()=>{if(s.detail.visibility==='private'){confirmAction('Partager avec l’équipe ?','Le répertoire deviendra visible par tous les membres connectés du groupe. Les responsables pourront modifier les répertoires en préparation.',async()=>{s.detail=await api('/setlists/'+s.detail.id+'/share',{method:'POST',body:{version:s.detail.version,visibility:'team'}});closeModal();await render({keepScroll:true});await shareList();},'Partager');}else return shareList();},
  'complete-setlist':()=>confirmAction('Marquer ce répertoire comme joué ?','La sélection sera conservée dans l’historique de l’événement et de chaque chant. Le répertoire ne sera plus modifiable ; vous pourrez le dupliquer.',async()=>{s.detail=await api('/setlists/'+s.detail.id+'/complete',{method:'POST',body:{version:s.detail.version}});closeModal();await render({keepScroll:true});toast('Répertoire enregistré dans l’historique');},'Marquer comme joué'),
  'setlist-menu':()=>modal('Actions du répertoire',`<div class="menu-actions">${s.detail.can_edit&&s.detail.status!=='completed'?'<button class="reference-card" data-action="edit-setlist">'+icon('edit')+' Modifier les informations</button>':''}<button class="reference-card" data-action="copy-setlist">${icon('copy')} Dupliquer</button><button class="reference-card" data-action="export-setlist">${icon('download')} Exporter CSV</button>${s.detail.can_edit&&s.detail.status!=='completed'?`<button class="reference-card danger" data-action="delete-setlist">${icon('trash')} Supprimer</button>`:''}</div>`),
  'new-event':()=>{if(requireUser())modal('Nouvel événement',forms.eventForm(s));},
  'edit-event':()=>modal('Modifier l’événement',forms.eventForm(s,s.event)+`<button class="text-button danger" data-action="delete-event">Supprimer l’événement</button>`),
  'delete-event':()=>confirmAction('Supprimer cet événement ?','Les répertoires préparés seront conservés sans association à cet événement.',async()=>{await api('/events/'+s.event.id,{method:'DELETE'});closeModal();go('calendar');toast('Événement supprimé');},'Supprimer'),
  'event-setlist':()=>{pendingSongId='';return newSetlist(s.event.id);},
  'edit-profile':()=>modal('Modifier mon nom',forms.profileForm(s)),
  'change-password':()=>modal('Changer mon mot de passe',forms.passwordForm()),
  'toggle-password':el=>{const input=el.previousElementSibling;input.type=input.type==='password'?'text':'password';el.textContent=input.type==='password'?'Afficher':'Masquer';},
  logout:async()=>{await api('/auth/logout',{method:'POST'});audio.pause();audio.removeAttribute('src');s.playingSong=null;s.user=null;await refresh();s.afterAuth='#home';go('login');toast('Vous êtes déconnecté');},
  'new-member':()=>modal('Ajouter un membre',forms.memberForm()),
  'approve-member':async el=>{await api('/admin/users/'+el.dataset.id,{method:'PATCH',body:{status:'active'}});await render({keepScroll:true});toast('Accès validé');},
  'reject-member':el=>{const user=s.admin.users.find(u=>u.id===el.dataset.id);confirmAction('Refuser cette demande ?',`La demande de ${user.name} (${user.email}) sera supprimée.`,async()=>{await api('/admin/users/'+user.id,{method:'DELETE'});closeModal();await render({keepScroll:true});toast('Demande refusée');},'Refuser');},
  'member-menu':el=>{const user=s.admin.users.find(u=>u.id===el.dataset.id);modal(user.name,`<div class="menu-actions"><button class="reference-card" data-action="reset-member" data-id="${user.id}">${icon('lock')} Attribuer un mot de passe provisoire</button>${user.status==='disabled'?`<button class="reference-card" data-action="enable-member" data-id="${user.id}">${icon('check')} Réactiver le compte</button>`:`<button class="reference-card danger" data-action="disable-member" data-id="${user.id}">${icon('close')} Désactiver le compte</button>`}</div>`);},
  'reset-member':el=>{const user=s.admin.users.find(u=>u.id===el.dataset.id);confirmAction('Réinitialiser le mot de passe ?',`${user.name} sera déconnecté et devra se reconnecter avec un mot de passe provisoire.`,async()=>{const r=await api('/admin/users/'+user.id+'/reset-password',{method:'POST'});modal('Mot de passe provisoire',forms.temporaryPasswordView(r.user,r.temporary_password));s.admin=await api('/admin');},'Réinitialiser');},
  'disable-member':el=>{const user=s.admin.users.find(u=>u.id===el.dataset.id);confirmAction('Désactiver ce compte ?',`${user.name} ne pourra plus se connecter. Ses répertoires et l’historique sont conservés ; le compte peut être réactivé.`,async()=>{await api('/admin/users/'+user.id,{method:'PATCH',body:{status:'disabled'}});closeModal();await render({keepScroll:true});toast('Compte désactivé');},'Désactiver');},
  'enable-member':async el=>{await api('/admin/users/'+el.dataset.id,{method:'PATCH',body:{status:'active'}});closeModal();await render({keepScroll:true});toast('Compte réactivé');},
  'copy-temp':async()=>{const text=document.querySelector('#temp-password')?.textContent||'';try{await navigator.clipboard.writeText(text);toast('Mot de passe copié');}catch{toast('Sélectionnez puis copiez le mot de passe.');}},
  'install-help':async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;}else modal('Porteurs de Réveil sur votre téléphone',`<p>Sur iPhone : ouvrez cette application dans Safari, touchez <strong>Partager</strong>, puis <strong>Sur l’écran d’accueil</strong>.</p><p>Sur Android : ouvrez le menu de votre navigateur puis <strong>Installer l’application</strong> ou <strong>Ajouter à l’écran d’accueil</strong>.</p><p class="muted">Une connexion Internet est nécessaire pour consulter et enregistrer les chants et les répertoires.</p>`);}
};

document.addEventListener('click',async event=>{
  const link=event.target.closest('a[href^="#"]');if(link){if(link.matches('[data-close-modal]'))closeModal();if(link.getAttribute('href').startsWith('#song/')&&!s.route.path.startsWith('song/'))s.songBack=location.hash;}
  if(event.target.matches('.modal-backdrop')){closeModal();return;}
  const el=event.target.closest('[data-action]');if(!el||el.disabled)return;
  const action=actions[el.dataset.action];if(!action)return;event.preventDefault();
  el.disabled=true;
  try{await action(el);}catch(error){const errorBox=modalRoot.querySelector('.form-error');if(errorBox)errorBox.textContent=error.message;else toast(error.message,true);}
  finally{if(el.isConnected)el.disabled=false;}
});
document.addEventListener('submit',async event=>{
  const form=event.target.closest('[data-form]');if(!form)return;event.preventDefault();
  if(uploadCount){toast('Patientez pendant l’import des fichiers.');return;}
  const data=Object.fromEntries(new FormData(form));const kind=form.dataset.form;const submit=form.querySelector('[type="submit"]');const errorBox=form.querySelector('.form-error');if(submit)submit.disabled=true;if(errorBox)errorBox.textContent='';
  try{
    if(kind==='register'){const r=await api('/auth/register',{method:'POST',body:data});if(r.pending){go('pending');}else{await refresh();go('home');toast('Bienvenue dans Porteurs de Réveil');}}
    if(kind==='login'){await api('/auth/login',{method:'POST',body:data});await refresh();const next=s.afterAuth.replace(/^#/,'');go(['login','register','pending','welcome',''].includes(next)?'home':next);s.afterAuth='#home';
      if(s.user.must_change_password)setTimeout(askNewPassword,150);else toast('Heureux de vous retrouver');}
    if(kind==='member'){const r=await api('/admin/users',{method:'POST',body:data});modal('Compte créé',forms.temporaryPasswordView(r.user,r.temporary_password));s.admin=await api('/admin');}
    if(kind==='search'){await remember(data.q);history.replaceState(null,'','#search?q='+encodeURIComponent(data.q));await render({keepScroll:true});}
    if(kind==='song'){data.categories=new FormData(form).getAll('categories');data.tempo=Number(data.tempo)||0;data.duration=Number(data.duration)||0;data.version=Number(form.dataset.version);const id=form.dataset.id;const song=await api('/songs'+(id?'/'+id:''),{method:id?'PUT':'POST',body:data});closeModal();await catalog();go('song/'+song.id);await render();toast(id?'Chant mis à jour':'Chant ajouté au catalogue');}
    if(kind==='category'){const id=form.dataset.id;if(data.kind==='event')data.parent_id='';await api('/categories'+(id?'/'+id:''),{method:id?'PATCH':'POST',body:data});closeModal();s.categories=(await api('/categories')).categories;await render({keepScroll:true});toast('Catégorie enregistrée');}
    if(kind==='setlist'){const id=form.dataset.id;data.version=Number(form.dataset.version);let list=await api('/setlists'+(id?'/'+id:''),{method:id?'PUT':'POST',body:data});if(pendingSongId){list=await api('/setlists/'+list.id+'/items',{method:'POST',body:{song_id:pendingSongId,version:list.version}});pendingSongId='';}closeModal();go('setlist/'+list.id);await render({keepScroll:!!id});toast(id?'Répertoire mis à jour':'Répertoire créé');}
    if(kind==='item'){data.version=s.detail.version;s.detail=await api('/setlists/'+s.detail.id+'/items/'+form.dataset.id,{method:'PATCH',body:data});closeModal();await render({keepScroll:true});toast('Tonalité et notes enregistrées');}
    if(kind==='event'){const id=form.dataset.id;data.version=Number(form.dataset.version);const e=await api('/events'+(id?'/'+id:''),{method:id?'PUT':'POST',body:data});closeModal();s.events=(await api('/events')).events;go('event/'+e.id);await render();toast('Événement enregistré');}
    if(kind==='profile'){s.user=(await api('/auth/profile',{method:'PATCH',body:data})).user;closeModal();await render({keepScroll:true});toast('Profil mis à jour');}
    if(kind==='password'){await api('/auth/password',{method:'POST',body:data});closeModal();s.user=(await api('/auth/me')).user;await render({keepScroll:true});toast('Mot de passe modifié');}
  }catch(error){if(errorBox)errorBox.textContent=error.message;else toast(error.message,true);}
  finally{if(submit?.isConnected)submit.disabled=false;}
});
document.addEventListener('input',event=>{
  const el=event.target;
  if(el.id==='search-input'){const songs=filterSongs(s.songs,s.categories,{q:el.value});history.replaceState(null,'','#search'+(el.value?'?q='+encodeURIComponent(el.value):''));document.querySelector('#search-results').innerHTML=el.value?`<h2 class="small-title">${songs.length} résultat${songs.length===1?'':'s'}</h2>${view.songRows(songs)}`:view.recentSearches(s);}
  if(el.id==='catalog-query'){s.route.params.set('q',el.value);history.replaceState(null,'','#songs?'+s.route.params);document.querySelector('#catalog-results').innerHTML=view.songRows(filterSongs(s.songs,s.categories,Object.fromEntries(s.route.params)));}
  if(el.id==='select-query')document.querySelector('#selection-results').innerHTML=selectionRows(el.value);
  if(el.id==='audio-progress'&&s.playingSong&&s.song?.id===s.playingSong.id)audio.currentTime=Number(el.value);
});
document.addEventListener('change',async event=>{
  const el=event.target;
  try{
    if(el.dataset.filter){s.route.params.set(el.dataset.filter,el.value);go('songs?'+s.route.params);}
    if(el.id==='category-kind'){const parent=el.form.elements.parent_id;parent.disabled=el.value==='event';if(parent.disabled)parent.value='';}
    if(el.dataset.roleUser){await api('/admin/users/'+el.dataset.roleUser,{method:'PATCH',body:{role:el.value}});await refresh();await render({keepScroll:true});toast('Rôle mis à jour');}
    if(el.dataset.upload&&el.files[0]){
      const file=el.files[0];if(file.size>25*1024*1024)throw new Error('Ce fichier dépasse la limite de 25 Mo.');
      const field=el.dataset.upload,form=el.closest('form'),status=form.querySelector(`[data-upload-status="${field}"]`);uploadCount++;form.querySelector('[type="submit"]').disabled=true;status.textContent='Import en cours…';
      try{const upload=await api('/uploads',{method:'POST',body:file,headers:{'Content-Type':'application/octet-stream','X-Filename':encodeURIComponent(file.name)}});if(field==='audio_url'&&!upload.mime.startsWith('audio/'))throw new Error('Le champ audio n’accepte que des fichiers audio (MP3, WAV, OGG). Importez la vidéo dans le champ Vidéo.');
        if(field==='video_url'&&!upload.mime.startsWith('video/'))throw new Error('Le champ vidéo n’accepte qu’un fichier MP4 ou un lien YouTube.');
        form.elements[field].value=upload.url;status.textContent='Fichier importé : '+file.name;}
      catch(error){status.textContent=error.message;throw error;}finally{uploadCount--;form.querySelector('[type="submit"]').disabled=uploadCount>0;}
    }
  }catch(error){toast(error.message,true);if(el.dataset.roleUser)await render({keepScroll:true});}
});
document.addEventListener('keydown',event=>{
  if((event.metaKey||event.ctrlKey)&&event.key==='k'){event.preventDefault();go('search');}
  if(event.key==='Escape')closeModal();
  if(event.key==='Tab'&&modalRoot.firstElementChild){const elements=[...modalRoot.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')];const first=elements[0],last=elements.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
});
window.addEventListener('hashchange',()=>{if(modalRoot.firstElementChild)closeModal();void render();});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
for(const event of ['timeupdate','loadedmetadata','play','pause','ended'])audio.addEventListener(event,()=>{s.isPlaying=!audio.paused;syncAudio();});
audio.addEventListener('error',()=>toast('Impossible de lire ce média. Vérifiez le fichier ou le lien audio.',true));
window.addEventListener('offline',()=>toast('Vous êtes hors connexion. Les modifications nécessitent Internet.',true));
window.addEventListener('online',()=>toast('Connexion rétablie'));

try{await refresh();if(!location.hash)go(sessionStorage.getItem('pr_seen')?'home':'welcome');sessionStorage.setItem('pr_seen','1');await render();if(s.user?.must_change_password)askNewPassword();if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});}
catch(error){app.innerHTML=`<main class="startup-error">${view.empty('Le répertoire ne répond pas',error.message,'<button class="btn primary" data-action="retry-startup">Réessayer</button>')}</main>`;actions['retry-startup']=async()=>{await refresh();await render();};}
