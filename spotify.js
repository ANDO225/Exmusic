function applyTheme(){
  const theme=localStorage.getItem('sw_theme')||'dark';
  document.documentElement.setAttribute('data-theme',theme);
  const sw=document.getElementById('themeToggle');
  if(sw) sw.classList.toggle('on',theme==='light');
  const quick=document.getElementById('themeQuickBtn');
  if(quick) quick.textContent = theme==='light' ? 'MODE SOMBRE' : 'MODE CLAIR';
}
function toggleTheme(){
  const cur=localStorage.getItem('sw_theme')||'dark';
  const next = cur==='dark' ? 'light' : 'dark';
  localStorage.setItem('sw_theme',next);
  applyTheme();
}

// ══════════════════════ "BASE DE DONNÉES" JSON DES UTILISATEURS ══════════════════════
// Stockée dans localStorage sous forme de JSON (pas de serveur ici, mais la logique
// est la même : on vérifie l'utilisateur par rapport à cette base avant de le connecter).
const USERS_KEY='sw_users';
const SESSION_KEY='sw_session';
function loadUsers(){ try{ return JSON.parse(localStorage.getItem(USERS_KEY))||[]; }catch(e){ return []; } }
function saveUsers(list){ localStorage.setItem(USERS_KEY, JSON.stringify(list)); }
function getSession(){ return localStorage.getItem(SESSION_KEY); }
function setSession(u){ localStorage.setItem(SESSION_KEY, u); }
function clearSession(){ localStorage.removeItem(SESSION_KEY); }

let currentUser=null;

// ══ Panneaux Connexion / Inscription ══
function showSignup(){
  document.getElementById('signinPanel').classList.add('slide-up');
  document.getElementById('signupPanel').classList.add('slide-up');
  document.getElementById('signinError').textContent='';
}
function showSignin(){
  document.getElementById('signinPanel').classList.remove('slide-up');
  document.getElementById('signupPanel').classList.remove('slide-up');
  document.getElementById('signupError').textContent='';
}
function setAuthLoading(on,which){
  const btn=document.getElementById(which==='signin'?'signinBtn':'signupBtn');
  btn.disabled=on;
  btn.innerHTML=on?'<span class="btn-spinner"></span> Vérification…':(which==='signin'?'Se connecter':'Créer un compte');
}

function doLogin(){
  const username=document.getElementById('loginUser').value.trim();
  const pass=document.getElementById('loginPass').value;
  const errEl=document.getElementById('signinError');
  errEl.textContent='';
  if(!username||!pass){ errEl.textContent='Veuillez remplir tous les champs.'; return; }
  setAuthLoading(true,'signin');
  setTimeout(()=>{
    setAuthLoading(false,'signin');
    const users=loadUsers();
    const found=users.find(u=>u.username.toLowerCase()===username.toLowerCase());
    if(!found){
      errEl.textContent="Aucun compte trouvé pour ce nom d'utilisateur. Veuillez vous inscrire.";
      document.getElementById('signupUser').value=username;
      showSignup();
      return;
    }
    if(found.password!==pass){
      errEl.textContent='Mot de passe incorrect.';
      return;
    }
    currentUser=found.username;
    setSession(currentUser);
    enterApp();
  },600);
}

function doSignup(){
  const name=document.getElementById('signupName').value.trim();
  const email=document.getElementById('signupEmail').value.trim();
  const username=document.getElementById('signupUser').value.trim();
  const pass=document.getElementById('signupPass').value;
  const errEl=document.getElementById('signupError');
  errEl.textContent='';
  if(!name||!email||!username||!pass){ errEl.textContent='Veuillez remplir tous les champs.'; return; }
  setAuthLoading(true,'signup');
  setTimeout(()=>{
    setAuthLoading(false,'signup');
    const users=loadUsers();
    if(users.find(u=>u.username.toLowerCase()===username.toLowerCase())){
      errEl.textContent="Ce nom d'utilisateur existe déjà.";
      return;
    }
    users.push({username,password:pass,fullname:name,email});
    saveUsers(users);
    currentUser=username;
    setSession(currentUser);
    enterApp();
  },600);
}

// ══ Modale de connexion (ouverte via le bouton "Se connecter" en haut à droite) ══
function openAuthModal(){
  showSignin();
  document.getElementById('authModalOverlay').classList.add('open');
}
function closeAuthModal(){
  document.getElementById('authModalOverlay').classList.remove('open');
}
function requireLogin(){
  if(!currentUser){ openAuthModal(); return false; }
  return true;
}

function renderAuthArea(){
  const el=document.getElementById('authArea');
  if(currentUser){
    el.innerHTML=`
      <div class="user-chip" onclick="toggleUserMenu()">
        <div class="user-avatar">${currentUser.substring(0,2).toUpperCase()}</div>
        <span class="user-name">${escapeHtml(currentUser)}</span>
      </div>
      <div class="user-menu" id="userMenu">
        <div class="user-menu-item" onclick="navTo(document.querySelectorAll('.ni')[4],'params');document.getElementById('userMenu').classList.remove('open')"> Paramètres</div>
        <div class="user-menu-item" onclick="logout()"> Déconnexion</div>
      </div>`;
  } else {
    el.innerHTML=`<button class="btn-outline-dark" style="border-color:var(--yd);color:var(--yd)" onclick="openAuthModal()">SE CONNECTER</button>`;
  }
}
function toggleUserMenu(){
  document.getElementById('userMenu').classList.toggle('open');
}
document.addEventListener('click',(e)=>{
  const menu=document.getElementById('userMenu');
  if(!menu || !menu.classList.contains('open')) return;
  const chip=document.querySelector('.user-chip');
  if(!menu.contains(e.target) && (!chip || !chip.contains(e.target))) menu.classList.remove('open');
});

function enterApp(){
  document.getElementById('settingsUser').textContent=currentUser;
  closeAuthModal();
  renderAuthArea();
  initApp();
}

function logout(){
  clearSession();
  currentUser=null;
  const audio=document.getElementById('audioEl');
  audio.pause(); audio.src='';
  currentTrack=null; isPlaying=false;
  document.getElementById('pTitle').textContent='Sélectionnez un titre';
  document.getElementById('pArtist').textContent='—';
  document.getElementById('loginUser').value='';
  document.getElementById('loginPass').value='';
  document.getElementById('settingsUser').textContent='—';
  renderAuthArea();
  initApp();
}

// ══ Barre de menu latérale : à afficher / masquer à volonté, en overlay sur mobile ══
function toggleSidebar(){
  const isMobile=window.innerWidth<=780;
  if(isMobile){
    document.getElementById('sidebarAside').classList.toggle('open');
    document.getElementById('sbBackdrop').classList.toggle('show');
  } else {
    document.getElementById('app').classList.toggle('sidebar-hidden');
  }
}

// ══ Démarrage : bref écran de chargement, puis l'application s'affiche directement ══
// (jamais l'écran d'inscription au premier plan — seulement si l'utilisateur clique sur "Se connecter")
// ══ Animation de chargement : spirographe coloré (arcs entrelacés avec traînée) ══
let bootAnimId=null;
function startBootAnimation(){
  const canvas=document.getElementById('bootCanvas');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  const W=canvas.width, H=canvas.height, cx=W/2, cy=H/2;
  const arms=[
    {r:70,speed:1.6,phase:0,          col:'233,59,150'},
    {r:55,speed:-2.1,phase:Math.PI/2, col:'59,233,150'},
    {r:60,speed:1.3,phase:Math.PI,    col:'59,155,255'},
    {r:45,speed:-1.8,phase:Math.PI*1.5,col:'170,80,255'}
  ];
  let t=0;
  function frame(){
    ctx.fillStyle='rgba(10,9,18,0.16)';
    ctx.fillRect(0,0,W,H);
    arms.forEach(a=>{
      const ang=t*a.speed+a.phase;
      const x=cx+Math.cos(ang)*a.r;
      const y=cy+Math.sin(ang)*a.r*0.9;
      ctx.beginPath();
      ctx.arc(x,y,4,0,Math.PI*2);
      ctx.fillStyle='rgb('+a.col+')';
      ctx.shadowColor='rgb('+a.col+')';
      ctx.shadowBlur=8;
      ctx.fill();
    });
    ctx.shadowBlur=0;
    t+=0.035;
    bootAnimId=requestAnimationFrame(frame);
  }
  ctx.fillStyle='#0a0912';
  ctx.fillRect(0,0,W,H);
  frame();
}
function stopBootAnimation(){
  if(bootAnimId) cancelAnimationFrame(bootAnimId);
  bootAnimId=null;
}

function boot(){
  applyTheme();
  startBootAnimation();
  const bootLoader=document.getElementById('bootLoader');
  setTimeout(()=>{
    bootLoader.classList.add('hide');
    setTimeout(()=>{ bootLoader.style.display='none'; stopBootAnimation(); },350);
    const session=getSession();
    const users=loadUsers();
    if(session && users.some(u=>u.username===session)){
      currentUser=session;
      document.getElementById('settingsUser').textContent=currentUser;
    } else {
      clearSession();
      currentUser=null;
    }
    renderAuthArea();
    initApp();
  },1400);
}
document.addEventListener('DOMContentLoaded',boot);

// ══════════════════════ BASE DE DONNÉES MUSICALE (IndexedDB) ══════════════════════
// Les morceaux importés par l'utilisateur (fichiers réels de son appareil) sont stockés
// localement dans IndexedDB, sous forme de blobs, afin qu'ils restent disponibles.
let dbPromise=null;
function getDB(){
  if(dbPromise) return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
    const req=indexedDB.open('ANsoundDB',1);
    req.onupgradeneeded=e=>{
      const db=e.target.result;
      if(!db.objectStoreNames.contains('tracks')){
        const store=db.createObjectStore('tracks',{keyPath:'id',autoIncrement:true});
        store.createIndex('username','username',{unique:false});
      }
    };
    req.onsuccess=e=>resolve(e.target.result);
    req.onerror=e=>reject(e.target.error);
  });
  return dbPromise;
}
async function dbAddTrack(track){
  const db=await getDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction('tracks','readwrite');
    const req=tx.objectStore('tracks').add(track);
    req.onsuccess=()=>res(req.result);
    req.onerror=()=>rej(req.error);
  });
}
async function dbGetTracksForUser(username){
  const db=await getDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction('tracks','readonly');
    const idx=tx.objectStore('tracks').index('username');
    const req=idx.getAll(username);
    req.onsuccess=()=>res(req.result);
    req.onerror=()=>rej(req.error);
  });
}
async function dbUpdateTrack(track){
  const db=await getDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction('tracks','readwrite');
    const req=tx.objectStore('tracks').put(track);
    req.onsuccess=()=>res();
    req.onerror=()=>rej(req.error);
  });
}
async function dbDeleteTrack(id){
  const db=await getDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction('tracks','readwrite');
    const req=tx.objectStore('tracks').delete(id);
    req.onsuccess=()=>res();
    req.onerror=()=>rej(req.error);
  });
}

// Playlists & historique : petites données JSON, stockées par utilisateur dans localStorage
function plKey(){ return 'sw_playlists_'+currentUser; }
function loadPlaylists(){ try{ return JSON.parse(localStorage.getItem(plKey()))||[]; }catch(e){ return []; } }
function savePlaylists(list){ localStorage.setItem(plKey(), JSON.stringify(list)); }
function histKey(){ return 'sw_history_'+currentUser; }
function loadHistory(){ try{ return JSON.parse(localStorage.getItem(histKey()))||[]; }catch(e){ return []; } }
function saveHistory(list){ localStorage.setItem(histKey(), JSON.stringify(list)); }

// ══ ÉTAT GLOBAL ══
let TRACKS=[];
let PLAYLISTS=[];
let HISTORY=[];
let filteredTracks=[];
let currentTrack=null, isPlaying=false, shuffleOn=false, repeatOn=true;
let currentQueue=[];
let currentPlaylistIndex=null; // null = bibliothèque complète

// ══ INIT (mode invité si non connecté, sinon charge la bibliothèque de l'utilisateur) ══
async function initApp(){
  if(currentUser){
    TRACKS=await dbGetTracksForUser(currentUser);
    PLAYLISTS=loadPlaylists();
    HISTORY=loadHistory();
  } else {
    TRACKS=[]; PLAYLISTS=[]; HISTORY=[];
  }
  filteredTracks=[...TRACKS];
  currentPlaylistIndex=null;
  renderPlaylists();
  renderHome();
  renderFavs();
  renderStats();
  renderHistory();
  renderGenreChips();
  renderAlbums();
  renderSuggestedArtists();
  renderTrackList(TRACKS,'Ma Musique');
  setVol(65);
}

// ══ NAVIGATION ══
function navTo(el,page){
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  if(el) el.classList.add('active');
  document.querySelectorAll('.pg').forEach(p=>p.classList.remove('active'));
  document.getElementById('pg-'+page).classList.add('active');
  if(window.innerWidth<=780){
    document.getElementById('sidebarAside').classList.remove('open');
    document.getElementById('sbBackdrop').classList.remove('show');
  }
}

// ══ RENDER : PLAYLISTS (barre latérale) ══
function renderPlaylists(){
  const c=document.getElementById('playlists');
  c.innerHTML = PLAYLISTS.length ? PLAYLISTS.map((p,i)=>`
    <div class="pl-row" onclick="openPlaylist(${i})" id="plr-${i}">
      <div class="pl-img">${svgAlbum(p.col,p.name[0])}</div>
      <div><div class="pl-name">${escapeHtml(p.name)}</div><div class="pl-sub">${p.trackIds.length} titre(s)</div></div>
    </div>`).join('') : '<div style="color:var(--text3);font-size:11px;padding:8px 4px">Aucune playlist. Cliquez sur « + » pour en créer une.</div>';
}
function addPlaylist(){
  if(!requireLogin()) return;
  const n=prompt('Nom de la playlist :');
  if(!n) return;
  PLAYLISTS.push({id:Date.now(), name:n.trim(), trackIds:[], col:randomColor()});
  savePlaylists(PLAYLISTS);
  renderPlaylists();
  renderHome();
}
function openPlaylist(i){
  document.querySelectorAll('.pl-row').forEach(r=>r.classList.remove('active-pl'));
  const row=document.getElementById('plr-'+i); if(row) row.classList.add('active-pl');
  const p=PLAYLISTS[i];
  const tracks=TRACKS.filter(t=>p.trackIds.includes(t.id));
  filteredTracks=tracks;
  currentPlaylistIndex=i;
  renderTrackList(tracks,p.name);
  navTo(null,'lecteur');
}

// ══ RENDER : ACCUEIL ══
function renderHome(){
  const hasTracks=TRACKS.length>0;
  document.getElementById('heroEyebrow').textContent=hasTracks?' Le plus écouté':' Bienvenue dans ExMUSIC';
  if(hasTracks){
    const top=[...TRACKS].sort((a,b)=>(b.plays||0)-(a.plays||0))[0];
    document.getElementById('heroTitle').textContent=top.title;
    document.getElementById('heroSub').textContent=(top.artist||'Artiste inconnu')+' · '+(top.plays||0)+' écoute(s)';
    document.getElementById('heroArt').innerHTML=svgAlbum(top.col,top.title[0]);
    document.getElementById('homeHero').dataset.trackId=top.id;
  } else {
    document.getElementById('heroTitle').textContent='Importez votre première musique';
    document.getElementById('heroSub').textContent='Ajoutez des titres depuis votre appareil pour commencer à écouter.';
    document.getElementById('heroArt').innerHTML='';
    document.getElementById('homeHero').dataset.trackId='';
  }
  document.getElementById('recentCards').innerHTML = hasTracks
    ? [...TRACKS].slice(-6).reverse().map(t=>mkCard(t.title,t.artist||'Artiste inconnu',t.col,t.id)).join('')
    : '<div class="empty-hint">Aucun morceau pour le moment. Utilisez « Ajouter de la musique ».</div>';
  document.getElementById('playlistCards').innerHTML = PLAYLISTS.length
    ? PLAYLISTS.map((p,i)=>`<div class="card round" onclick="openPlaylist(${i})"><div class="card-art">${svgAlbum(p.col,p.name[0])}</div><div class="card-t center">${escapeHtml(p.name)}</div><div class="card-s center">${p.trackIds.length} titre(s)</div></div>`).join('')
    : '<div class="empty-hint">Créez votre première playlist avec le bouton « + » de la barre latérale.</div>';
  const follows = currentUser ? loadFollows() : [];
  const followedSec=document.getElementById('followedSec');
  if(follows.length){
    followedSec.style.display='';
    document.getElementById('followedChips').innerHTML = follows.map(name=>{
      const a=SUGGESTED_ARTISTS.find(ar=>ar.name===name);
      const col=a?a.col:'#3d3b00';
      return `<div class="chip" style="display:flex;align-items:center;gap:6px" onclick="navTo(document.querySelectorAll('.ni')[1],'recherche')"><span style="width:8px;height:8px;border-radius:50%;background:${col};display:inline-block"></span>${escapeHtml(name)}</div>`;
    }).join('');
  } else {
    followedSec.style.display='none';
  }
}
function playHeroTrack(){
  const id=document.getElementById('homeHero').dataset.trackId;
  if(id) playTrackById(parseInt(id));
}
function mkCard(title,sub,col,id){
  return `<div class="card" onclick="playTrackById(${id})">
    <div class="card-art">${svgAlbum(col,title[0])}
      <div class="pov"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
    </div>
    <div class="card-t">${escapeHtml(title)}</div>
    <div class="card-s">${escapeHtml(sub)}</div>
  </div>`;
}

// ══ ALBUMS (regroupement automatique de la musique ajoutée) ══
// Regroupe par nom d'album si renseigné (via ✎), sinon par artiste.
function albumGroups(){
  const groups={};
  TRACKS.forEach(t=>{
    const key=(t.album && t.album.trim()) ? t.album.trim() : (t.artist && t.artist.trim() ? t.artist.trim() : 'Titres divers');
    if(!groups[key]) groups[key]=[];
    groups[key].push(t);
  });
  return groups;
}
function renderAlbums(){
  const groups=albumGroups();
  const keys=Object.keys(groups);
  const sec=document.getElementById('secAlbums');
  if(!keys.length){ sec.style.display='none'; } else { sec.style.display=''; }
  const cardsHtml = keys.length ? keys.map(k=>{
    const tracks=groups[k];
    return `<div class="card round" onclick="openAlbum('${encodeURIComponent(k)}')">
      <div class="card-art">${svgAlbum(tracks[0].col,k[0])}</div>
      <div class="card-t center">${escapeHtml(k)}</div>
      <div class="card-s center">${tracks.length} titre(s)</div>
    </div>`;
  }).join('') : '<div class="empty-hint">Importez de la musique et donnez-lui un album (bouton ✎) pour la regrouper ici.</div>';
  document.getElementById('albumCards').innerHTML = keys.length ? cardsHtml : '';
  const albumGridEl=document.getElementById('albumGrid');
  if(albumGridEl) albumGridEl.innerHTML=cardsHtml;
}
function openAlbum(encodedKey){
  const key=decodeURIComponent(encodedKey);
  const groups=albumGroups();
  const tracks=groups[key]||[];
  filteredTracks=tracks;
  currentPlaylistIndex=null;
  renderTrackList(tracks,'💿 '+key);
  navTo(null,'lecteur');
}

// ══ IMPORT DE MUSIQUE DEPUIS LE PÉRIPHÉRIQUE ══
function triggerFileImport(){
  if(!requireLogin()) return;
  document.getElementById('fileInput').click();
}
function handlePlActionBtn(){
  if(!requireLogin()) return;
  if(currentPlaylistIndex===null){ triggerFileImport(); }
  else { openAddToPlaylist(currentPlaylistIndex); }
}
async function handleFiles(files){
  for(const file of files){
    const duration=await getAudioDuration(file);
    const track={
      username: currentUser,
      title: file.name.replace(/\.[^/.]+$/,''),
      artist:'Artiste inconnu',
      note:'',
      genre:'',
      album:'',
      fileName:file.name,
      blob:file,
      duration:duration,
      liked:false,
      plays:0,
      dateAdded:Date.now(),
      col: randomColor()
    };
    const id=await dbAddTrack(track);
    track.id=id;
    TRACKS.push(track);
  }
  filteredTracks = currentPlaylistIndex===null ? [...TRACKS] : TRACKS.filter(t=>PLAYLISTS[currentPlaylistIndex].trackIds.includes(t.id));
  renderHome();
  renderTrackList(filteredTracks, currentPlaylistIndex===null?'Ma Musique':PLAYLISTS[currentPlaylistIndex].name);
  renderFavs();
  renderGenreChips();
  renderAlbums();
  document.getElementById('fileInput').value='';
}
function getAudioDuration(file){
  return new Promise(resolve=>{
    const a=document.createElement('audio');
    a.preload='metadata';
    a.onloadedmetadata=()=>{ URL.revokeObjectURL(a.src); resolve(a.duration||0); };
    a.onerror=()=>resolve(0);
    a.src=URL.createObjectURL(file);
  });
}
function randomColor(){
  const palette=['#1a1533','#161229','#1c1440','#140f26','#1e1236','#12102a','#20143a','#160e2e','#1a1240','#100c24'];
  return palette[Math.floor(Math.random()*palette.length)];
}

// ══ MODALE : ÉDITER UN MORCEAU (titre / artiste / album / genre / note personnelle) ══
function openEditModal(id){
  const t=TRACKS.find(t=>t.id===id);
  if(!t) return;
  document.getElementById('editTitle').value=t.title;
  document.getElementById('editArtist').value=t.artist||'';
  document.getElementById('editAlbum').value=t.album||'';
  document.getElementById('editGenre').value=t.genre||'';
  document.getElementById('editNote').value=t.note||'';
  document.getElementById('editModal').dataset.id=id;
  document.getElementById('modalOverlay').classList.add('open');
}
function closeModal(){ document.getElementById('modalOverlay').classList.remove('open'); }
async function saveEdit(){
  const id=parseInt(document.getElementById('editModal').dataset.id);
  const t=TRACKS.find(t=>t.id===id);
  if(!t) return;
  t.title=document.getElementById('editTitle').value.trim()||t.title;
  t.artist=document.getElementById('editArtist').value.trim();
  t.album=document.getElementById('editAlbum').value.trim();
  t.genre=document.getElementById('editGenre').value.trim();
  t.note=document.getElementById('editNote').value.trim();
  await dbUpdateTrack(t);
  closeModal();
  renderHome();
  renderTrackList(filteredTracks, document.getElementById('plTitle').textContent);
  renderFavs(); renderStats(); renderGenreChips(); renderAlbums();
  if(currentTrack && currentTrack.id===id){
    document.getElementById('pTitle').textContent=t.title;
    document.getElementById('pArtist').textContent=t.artist||'Artiste inconnu';
  }
}
async function deleteTrackUI(id){
  if(!confirm('Supprimer définitivement ce morceau de votre bibliothèque ?')) return;
  await dbDeleteTrack(id);
  TRACKS=TRACKS.filter(t=>t.id!==id);
  filteredTracks=filteredTracks.filter(t=>t.id!==id);
  PLAYLISTS.forEach(p=>p.trackIds=p.trackIds.filter(tid=>tid!==id));
  savePlaylists(PLAYLISTS);
  renderPlaylists(); renderHome(); renderAlbums();
  renderTrackList(filteredTracks, document.getElementById('plTitle').textContent);
  renderFavs(); renderStats(); renderGenreChips();
}

// ══ MODALE : GÉRER LES MORCEAUX D'UNE PLAYLIST ══
function openAddToPlaylist(plIndex){
  const p=PLAYLISTS[plIndex];
  document.getElementById('plModalBody').innerHTML = TRACKS.length ? TRACKS.map(t=>`
    <label class="pl-check-row"><input type="checkbox" value="${t.id}" ${p.trackIds.includes(t.id)?'checked':''}/> ${escapeHtml(t.title)} — ${escapeHtml(t.artist||'Inconnu')}</label>
  `).join('') : '<div class="empty-hint">Importez de la musique dans votre bibliothèque d\'abord.</div>';
  document.getElementById('plModal').dataset.index=plIndex;
  document.getElementById('plModalOverlay').classList.add('open');
}
function closePlModal(){ document.getElementById('plModalOverlay').classList.remove('open'); }
function savePlaylistTracks(){
  const idx=parseInt(document.getElementById('plModal').dataset.index);
  const checks=document.querySelectorAll('#plModalBody input[type=checkbox]:checked');
  PLAYLISTS[idx].trackIds=[...checks].map(c=>parseInt(c.value));
  savePlaylists(PLAYLISTS);
  closePlModal();
  renderPlaylists(); renderHome();
  if(currentPlaylistIndex===idx) openPlaylist(idx);
}

// ══ FAVORIS ══
function renderFavs(){
  const favs=TRACKS.filter(t=>t.liked);
  document.getElementById('favGrid').innerHTML = favs.length ? favs.map(t=>`
    <div class="fav-row" onclick="playTrackById(${t.id})">
      <div class="fav-thumb">${svgAlbum(t.col,t.title[0])}</div>
      <div class="fav-meta"><div class="fav-title">${escapeHtml(t.title)}</div><div class="fav-sub">${escapeHtml(t.artist||'Inconnu')} · ${fmt(t.duration)}</div></div>
      <div class="fav-heart"><svg width="16" height="16" viewBox="0 0 24 24" fill="var(--y)" stroke="var(--y)" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></div>
    </div>`).join('') : '<div class="empty-hint">Aucun favori. Cliquez sur le cœur d\'un morceau pour l\'ajouter ici.</div>';
  document.getElementById('statFav').textContent=favs.length;
}
function toggleFav(id,btn){
  const t=TRACKS.find(t=>t.id===id);
  if(!t) return;
  t.liked=!t.liked;
  dbUpdateTrack(t);
  btn.classList.toggle('liked',t.liked);
  btn.querySelector('svg').setAttribute('fill',t.liked?'var(--y)':'none');
  renderFavs();
  if(currentTrack && currentTrack.id===id){
    document.getElementById('pHeart').classList.toggle('liked',t.liked);
  }
}

// ══ STATISTIQUES ══
function renderStats(){
  document.getElementById('statTotal').textContent=HISTORY.length;
  const totalSeconds=HISTORY.reduce((sum,h)=>{
    const t=TRACKS.find(tt=>tt.id===h.trackId);
    return sum+(t?(t.duration||0):0);
  },0);
  document.getElementById('statTime').textContent=Math.round(totalSeconds/3600)+'h';
  document.getElementById('statFav').textContent=TRACKS.filter(t=>t.liked).length;

  const dayNames=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  const counts=[0,0,0,0,0,0,0];
  HISTORY.forEach(h=>{
    if(h.date){ const d=new Date(h.date); const idx=(d.getDay()+6)%7; counts[idx]++; }
  });
  const max=Math.max(...counts,1);
  document.getElementById('statsChart').innerHTML=dayNames.map((d,i)=>`<div class="bar-item"><div class="bar-col" style="height:${(counts[i]/max)*72}px" title="${counts[i]} écoute(s)"></div><div class="bar-lbl">${d}</div></div>`).join('');

  const sorted=[...TRACKS].sort((a,b)=>(b.plays||0)-(a.plays||0)).slice(0,5);
  document.getElementById('topTracks').innerHTML = sorted.length ? sorted.map((t,i)=>`
    <div class="top-tr">
      <div class="top-rank">${i+1}</div>
      <div class="top-info"><div class="top-name">${escapeHtml(t.title)}</div><div class="top-plays">${t.plays||0} écoute(s) · ${escapeHtml(t.artist||'Inconnu')}</div></div>
      <div class="top-bar-wrap"><div class="top-bar-fill" style="width:${sorted[0].plays?((t.plays||0)/sorted[0].plays)*100:0}%"></div></div>
    </div>`).join('') : '<div class="empty-hint">Aucune écoute pour le moment.</div>';
}

// ══ HISTORIQUE ══
function renderHistory(){
  const el=document.getElementById('histList');
  if(!HISTORY.length){ el.innerHTML='<div class="empty-hint">Aucune écoute enregistrée</div>'; return; }
  el.innerHTML=HISTORY.slice().reverse().map(h=>`
    <div class="hist-row" onclick="playTrackById(${h.trackId})">
      <div class="hist-thumb">${svgAlbum(h.col,'♪')}</div>
      <div class="hist-meta"><div class="hist-title">${escapeHtml(h.title)}</div><div class="hist-sub">${escapeHtml(h.artist||'Inconnu')}</div></div>
      <div class="hist-time">${h.time}</div>
    </div>`).join('');
}
function clearHistory(){ HISTORY.length=0; saveHistory(HISTORY); renderHistory(); renderStats(); }

// ══ SAUVEGARDE / RESTAURATION (fichier .json externe, téléchargé sur l'appareil) ══
// Convertit un Blob audio en base64 pour pouvoir l'inclure dans le fichier JSON exporté.
function blobToBase64(blob){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onloadend=()=>resolve(reader.result);
    reader.onerror=reject;
    reader.readAsDataURL(blob);
  });
}
function base64ToBlob(dataUrl){
  return fetch(dataUrl).then(r=>r.blob());
}
async function exportLibrary(evt){
  if(!requireLogin()) return;
  const btn=evt && evt.target;
  if(btn){ btn.disabled=true; btn.textContent='Préparation…'; }
  try{
    const tracksOut=[];
    for(const t of TRACKS){
      const b64 = t.blob ? await blobToBase64(t.blob) : null;
      tracksOut.push({title:t.title,artist:t.artist,album:t.album,genre:t.genre,note:t.note,fileName:t.fileName,duration:t.duration,liked:t.liked,plays:t.plays,dateAdded:t.dateAdded,col:t.col,oldId:t.id,audioBase64:b64});
    }
    const payload={
      app:'ANsound', version:1, exportedAt:new Date().toISOString(), user:currentUser,
      tracks:tracksOut, playlists:PLAYLISTS, follows:loadFollows()
    };
    const blob=new Blob([JSON.stringify(payload)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download='ansound-backup-'+currentUser+'.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  } finally {
    if(btn){ btn.disabled=false; btn.textContent='Exporter'; }
  }
}
async function importLibrary(file){
  if(!file || !requireLogin()) return;
  try{
    const text=await file.text();
    const data=JSON.parse(text);
    if(!data || !Array.isArray(data.tracks)) throw new Error('Fichier invalide');
    const idMap={};
    for(const t of data.tracks){
      let blob=null;
      if(t.audioBase64){ blob=await base64ToBlob(t.audioBase64); }
      const track={
        username:currentUser, title:t.title||'Sans titre', artist:t.artist||'', album:t.album||'',
        genre:t.genre||'', note:t.note||'', fileName:t.fileName||'', blob, duration:t.duration||0,
        liked:!!t.liked, plays:t.plays||0, dateAdded:t.dateAdded||Date.now(), col:t.col||randomColor()
      };
      const newId=await dbAddTrack(track);
      if(t.oldId!==undefined) idMap[t.oldId]=newId;
    }
    if(Array.isArray(data.playlists)){
      const restoredPlaylists=data.playlists.map(p=>({
        id:p.id||Date.now()+Math.random(), name:p.name,
        trackIds:(p.trackIds||[]).map(oid=>idMap[oid]).filter(id=>id!==undefined),
        col:p.col||randomColor()
      }));
      PLAYLISTS=[...PLAYLISTS,...restoredPlaylists];
      savePlaylists(PLAYLISTS);
    }
    if(Array.isArray(data.follows)){
      const existing=loadFollows();
      saveFollows([...new Set([...existing,...data.follows])]);
    }
    await initApp();
    alert('Sauvegarde restaurée : '+data.tracks.length+' morceau(x) importé(s).');
  } catch(err){
    alert("Impossible de lire ce fichier de sauvegarde : "+err.message);
  } finally {
    document.getElementById('backupInput').value='';
  }
}

// ══ SUGGESTIONS D'ARTISTES (présentées par la personne / la communauté ANsound) ══
// Sélection éditoriale d'exemples ; l'utilisateur peut s'abonner pour les retrouver plus tard.
const SUGGESTED_ARTISTS=[
  {name:'Indila', bio:"Chanteuse française d'origine malgache, révélée par « Dernière Danse ».", col:'#7a1fa8'},
  {name:'Stromae', bio:'Auteur-compositeur belgo-rwandais, entre pop et électro.', col:'#1f7aa8'},
  {name:'Angélique Kidjo', bio:'Chanteuse béninoise, figure majeure de l\'afro-pop.', col:'#a85a1f'},
  {name:'Rajery', bio:'Virtuose malgache de la valiha, musiques traditionnelles.', col:'#2f8a4a'}
];
function followsKey(){ return 'sw_follows_'+currentUser; }
function loadFollows(){ try{ return JSON.parse(localStorage.getItem(followsKey()))||[]; }catch(e){ return []; } }
function saveFollows(list){ localStorage.setItem(followsKey(), JSON.stringify(list)); }
function renderSuggestedArtists(){
  const follows = currentUser ? loadFollows() : [];
  const html = SUGGESTED_ARTISTS.map(a=>{
    const isFollowing=follows.includes(a.name);
    return `<div class="artist-card">
      <div class="artist-avatar" style="background:${a.col}">${escapeHtml(a.name.substring(0,2).toUpperCase())}</div>
      <div class="artist-name">${escapeHtml(a.name)}</div>
      <div class="artist-bio">${escapeHtml(a.bio)}</div>
      <button class="artist-follow${isFollowing?' following':''}" onclick="toggleFollow('${encodeURIComponent(a.name)}')">${isFollowing?'✓ Abonné':"+ S'abonner"}</button>
    </div>`;
  }).join('');
  const el1=document.getElementById('suggestedArtists'); if(el1) el1.innerHTML=html;
  const el2=document.getElementById('homeSuggestedArtists'); if(el2) el2.innerHTML=html;
  renderMyFollows();
}
function renderMyFollows(){
  const wrap=document.getElementById('myFollowsList');
  if(!wrap) return;
  const follows = currentUser ? loadFollows() : [];
  wrap.innerHTML = follows.length ? follows.map(name=>{
    const a=SUGGESTED_ARTISTS.find(ar=>ar.name===name);
    const col=a?a.col:'#544777';
    return `<div class="s-row">
      <div class="s-row-left">
        <div class="s-icon" style="background:${col};color:#fff;font-weight:800">${escapeHtml(name.substring(0,2).toUpperCase())}</div>
        <div><div class="s-label">${escapeHtml(name)}</div><div class="s-desc">Abonné</div></div>
      </div>
      <button class="btn-g" style="font-size:11px;padding:6px 12px" onclick="toggleFollow('${encodeURIComponent(name)}')">Se désabonner</button>
    </div>`;
  }).join('') : '<div class="empty-hint">Vous ne suivez encore aucun artiste. Rendez-vous sur la page Rechercher ou Accueil pour en découvrir.</div>';
}
function toggleFollow(encodedName){
  if(!requireLogin()) return;
  const name=decodeURIComponent(encodedName);
  let follows=loadFollows();
  follows = follows.includes(name) ? follows.filter(n=>n!==name) : [...follows,name];
  saveFollows(follows);
  renderSuggestedArtists();
  renderHome();
}

// ══ RECHERCHE ══
function renderGenreChips(){
  const genres=[...new Set(TRACKS.map(t=>t.genre).filter(Boolean))];
  const wrap=document.getElementById('genreChips');
  wrap.innerHTML = genres.length
    ? genres.map(g=>`<div class="chip" onclick="filterByGenre('${escapeHtml(g)}')">${escapeHtml(g)}</div>`).join('')
    : '<div class="empty-hint">Ajoutez un genre à vos morceaux (bouton ✎) pour les retrouver ici.</div>';
}
function filterTracks(q){
  const ql=q.toLowerCase();
  filteredTracks = !q ? [...TRACKS] : TRACKS.filter(t=>
    t.title.toLowerCase().includes(ql) ||
    (t.artist||'').toLowerCase().includes(ql) ||
    (t.album||'').toLowerCase().includes(ql) ||
    (t.genre||'').toLowerCase().includes(ql) ||
    (t.note||'').toLowerCase().includes(ql)
  );
  document.getElementById('searchResults').innerHTML = filteredTracks.length ? filteredTracks.map((t,i)=>`
    <div class="tr" onclick="playTrackById(${t.id})">
      <div class="tr-num">${i+1}</div><div class="tr-wave"><span></span><span></span><span></span></div>
      <div class="tr-thumb">${svgAlbum(t.col,t.title[0])}</div>
      <div class="tr-meta"><div class="tr-title">${escapeHtml(t.title)}</div><div class="tr-artist">${escapeHtml(t.artist||'Inconnu')}${t.genre?' · '+escapeHtml(t.genre):''}</div></div>
      <div class="tr-actions"><div class="tr-dur">${fmt(t.duration)}</div></div>
    </div>`).join('') : '<div class="empty-hint">Aucun résultat.</div>';
  if(q) navTo(document.querySelectorAll('.ni')[1],'recherche');
}
function filterByGenre(g){
  document.getElementById('searchQ').value=g;
  filterTracks(g);
}
function sortTracks(by){
  if(!by) return;
  const arr=[...filteredTracks];
  if(by==='az') arr.sort((a,b)=>a.title.localeCompare(b.title));
  else if(by==='recent') arr.sort((a,b)=>(b.dateAdded||0)-(a.dateAdded||0));
  filteredTracks=arr;
  renderTrackList(arr,'Playlist — triée');
}

// ══ LISTE DE MORCEAUX ══
function renderTrackList(tracks, title){
  document.getElementById('plTitle').textContent=title||'Ma Musique';
  const btn=document.getElementById('plActionBtn');
  btn.textContent = currentPlaylistIndex===null ? '➕ Importer de la musique' : ' Gérer les morceaux';
  document.getElementById('trackList').innerHTML = tracks.length ? tracks.map((t,i)=>`
    <div class="tr${currentTrack&&currentTrack.id===t.id?' playing':''}" id="tr-${t.id}" onclick="playTrackById(${t.id})">
      <div class="tr-num">${i+1}</div>
      <div class="tr-wave"><span></span><span></span><span></span></div>
      <div class="tr-thumb">${svgAlbum(t.col,t.title[0])}</div>
      <div class="tr-meta">
        <div class="tr-title">${escapeHtml(t.title)}</div>
        <div class="tr-artist">${escapeHtml(t.artist||'Artiste inconnu')}${t.genre?' · '+escapeHtml(t.genre):''}</div>
        ${t.note?`<div class="tr-note">💬 ${escapeHtml(t.note)}</div>`:''}
      </div>
      <div class="tr-actions">
        <div class="tr-dur">${fmt(t.duration)}</div>
        <button class="tr-edit" onclick="event.stopPropagation();openEditModal(${t.id})" title="Modifier / noter">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        </button>
        <button class="tr-fav${t.liked?' liked':''}" onclick="event.stopPropagation();toggleFav(${t.id},this)" title="Favori">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="${t.liked?'var(--y)':'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        <button class="tr-del" onclick="event.stopPropagation();deleteTrackUI(${t.id})" title="Supprimer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
        <button class="tr-play-btn" onclick="event.stopPropagation();playTrackById(${t.id})">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </button>
      </div>
    </div>`).join('') : `<div class="empty-hint">${currentPlaylistIndex===null?'Aucun morceau. Cliquez sur « Importer de la musique » pour parcourir votre appareil.':'Cette playlist est vide. Cliquez sur « Gérer les morceaux » pour en ajouter.'}</div>`;
}

// ══ LECTEUR AUDIO (lecture réelle des fichiers importés) ══
const audioEl=document.getElementById('audioEl');
audioEl.addEventListener('loadedmetadata',()=>{
  document.getElementById('pDur').textContent=fmt(audioEl.duration||0);
  document.getElementById('npDur').textContent=fmt(audioEl.duration||0);
});
audioEl.addEventListener('timeupdate',()=>{
  if(!audioEl.duration) return;
  const pct=(audioEl.currentTime/audioEl.duration)*100;
  document.getElementById('bFill').style.width=pct+'%';
  document.getElementById('pCur').textContent=fmt(audioEl.currentTime);
  document.getElementById('npBFill').style.width=pct+'%';
  document.getElementById('npCur').textContent=fmt(audioEl.currentTime);
});
audioEl.addEventListener('ended',()=>{
  if(repeatOn && currentQueue.length<=1){ audioEl.currentTime=0; audioEl.play(); }
  else { nextTrack(); }
});
audioEl.addEventListener('play',()=>{ isPlaying=true; updatePlayUI(); });
audioEl.addEventListener('pause',()=>{ isPlaying=false; updatePlayUI(); });

function playTrackById(id){
  const t=TRACKS.find(t=>t.id===id);
  if(!t) return;
  currentQueue = filteredTracks.length ? filteredTracks : TRACKS;
  loadAndPlayTrack(t);
}
function loadAndPlayTrack(t){
  currentTrack=t;
  if(t.blob){
    const url=URL.createObjectURL(t.blob);
    audioEl.src=url;
  }
  document.getElementById('pTitle').textContent=t.title;
  document.getElementById('pArtist').textContent=t.artist||'Artiste inconnu';
  document.getElementById('pThumb').innerHTML=svgAlbum(t.col,t.title[0]);
  document.getElementById('pHeart').classList.toggle('liked',!!t.liked);
  document.getElementById('npTitle').textContent=t.title;
  document.getElementById('npArtist').textContent=t.artist||'Artiste inconnu';
  document.getElementById('npArt').innerHTML=svgAlbum(t.col,t.title[0]);
  document.getElementById('npHeart').classList.toggle('liked',!!t.liked);
  openNowPlaying();
  audioEl.currentTime=0;
  audioEl.play().catch(()=>{});
  t.plays=(t.plays||0)+1;
  dbUpdateTrack(t);
  const now=new Date();
  const hm=now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0');
  HISTORY.push({trackId:t.id,title:t.title,artist:t.artist,col:t.col,time:hm,date:now.toISOString().slice(0,10)});
  saveHistory(HISTORY);
  renderHistory();
  renderStats();
  document.querySelectorAll('.tr').forEach(r=>r.classList.toggle('playing', r.id==='tr-'+t.id));
}
function openNowPlaying(){ document.getElementById('nowPlaying').classList.add('open'); }
function closeNowPlaying(){ document.getElementById('nowPlaying').classList.remove('open'); }
function togglePlay(){
  if(!currentTrack) return;
  if(audioEl.paused) audioEl.play(); else audioEl.pause();
}
function updatePlayUI(){
  document.getElementById('iconPlay').style.display=isPlaying?'none':'';
  document.getElementById('iconPause').style.display=isPlaying?'':'none';
  document.getElementById('npIconPlay').style.display=isPlaying?'none':'';
  document.getElementById('npIconPause').style.display=isPlaying?'':'none';
}
function seek(e){
  if(!audioEl.duration) return;
  const wrap=e.currentTarget||document.getElementById('bWrap');
  const r=wrap.getBoundingClientRect();
  audioEl.currentTime=((e.clientX-r.left)/r.width)*audioEl.duration;
}
function nextTrack(){
  const queue=currentQueue.length?currentQueue:TRACKS;
  if(!queue.length) return;
  let idx;
  if(shuffleOn){ idx=Math.floor(Math.random()*queue.length); }
  else { idx=(queue.findIndex(t=>currentTrack&&t.id===currentTrack.id)+1)%queue.length; }
  loadAndPlayTrack(queue[idx]);
}
function prevTrack(){
  const queue=currentQueue.length?currentQueue:TRACKS;
  if(!queue.length) return;
  if(audioEl.currentTime>3){ audioEl.currentTime=0; return; }
  const idx=(queue.findIndex(t=>currentTrack&&t.id===currentTrack.id)-1+queue.length)%queue.length;
  loadAndPlayTrack(queue[idx]);
}
function playAll(){
  if(!filteredTracks.length) return;
  currentQueue=filteredTracks;
  loadAndPlayTrack(filteredTracks[0]);
}
function shuffleAll(){
  shuffleOn=true;
  document.getElementById('shuffleC').classList.add('on');
  document.getElementById('npShuffleC').classList.add('on');
  document.getElementById('shuffleToggleSetting').classList.add('on');
  nextTrack();
}
function toggleShuffle(){
  shuffleOn=!shuffleOn;
  document.getElementById('shuffleC').classList.toggle('on',shuffleOn);
  document.getElementById('npShuffleC').classList.toggle('on',shuffleOn);
}
function toggleRepeat(){
  repeatOn=!repeatOn;
  document.getElementById('repeatC').classList.toggle('on',repeatOn);
  document.getElementById('npRepeatC').classList.toggle('on',repeatOn);
}
function toggleHeart(){
  const h=document.getElementById('pHeart');
  h.classList.toggle('liked');
  document.getElementById('npHeart').classList.toggle('liked',h.classList.contains('liked'));
  if(currentTrack){
    currentTrack.liked=h.classList.contains('liked');
    dbUpdateTrack(currentTrack);
    renderFavs();
  }
}
function setVol(v){ document.getElementById('volS').style.setProperty('--vol',v+'%'); audioEl.volume=v/100; }

// ══ AIDES ══
function fmt(s){ if(!s||isNaN(s)) return '0:00'; const m=Math.floor(s/60), sec=Math.floor(s%60); return m+':'+(sec<10?'0':'')+sec; }
function svgAlbum(col,letter){
  return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><rect width="50" height="50" fill="${col||'#1a1533'}"/><circle cx="25" cy="25" r="16" fill="none" stroke="#a970ff" stroke-width=".8" opacity=".4"/><circle cx="25" cy="25" r="7" fill="#a970ff" opacity=".5"/><text x="25" y="14" font-size="9" font-weight="700" text-anchor="middle" fill="#a970ff" opacity=".7">${(letter||'♪').toString()[0].toUpperCase()}</text></svg>`;
}
function escapeHtml(s){
  return (s||'').toString().replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
document.getElementById('volS').style.setProperty('--vol','65%');
