/* dhun. — lightweight, installable music discovery player.
   YouTube playback always uses the official, VISIBLE IFrame Player. No ad blocking,
   audio extraction, hidden YouTube playback, or unauthorized downloading. */
'use strict';
const SEED = [
  {id:'y-FudfVyYWNxQ',videoId:'FudfVyYWNxQ',title:'Saiyaara',artist:'Faheem Abdullah · YRF',genre:'Romance',source:'youtube'},
  {id:'y-g6fnFALEseI',videoId:'g6fnFALEseI',title:'Kesariya',artist:'Arijit Singh · Pritam',genre:'Bollywood',source:'youtube'},
  {id:'y-RLzC55ai0eo',videoId:'RLzC55ai0eo',title:'Heeriye',artist:'Jasleen Royal · Arijit Singh',genre:'Romance',source:'youtube'},
  {id:'y-ilNt2bikxDI',videoId:'ilNt2bikxDI',title:'Jo Tum Mere Ho',artist:'Anuv Jain',genre:'Indie',source:'youtube'},
  {id:'y-roz9sXFkTuE',videoId:'roz9sXFkTuE',title:'Aaj Ki Raat',artist:'Madhubanti Bagchi · Saregama',genre:'Party',source:'youtube'},
  {id:'y-4NRXx6U8ABQ',videoId:'4NRXx6U8ABQ',title:'Blinding Lights',artist:'The Weeknd',genre:'Global',source:'youtube'}
];
const MOODS = [
  {name:'Romance',subtitle:'Feel the butterflies',emoji:'💗',cls:'mood-romance',query:'bollywood romantic love songs official'},
  {name:'Chill',subtitle:'Slow down, breathe out',emoji:'🌴',cls:'mood-chill',query:'chill lofi music hindi official'},
  {name:'Party',subtitle:'Turn up the energy',emoji:'🔥',cls:'mood-party',query:'bollywood party songs official'},
  {name:'Indie',subtitle:'Your hidden gems',emoji:'🌙',cls:'mood-indie',query:'indie pop hindi anuv jain songs official'}
];
const FILTERS = ['All','Bollywood','Romance','Indie','Party','Punjabi','Global','Chill'];
const $ = (sel,from=document)=>from.querySelector(sel);
const $$ = (sel,from=document)=>[...from.querySelectorAll(sel)];
const icon = name=>`<svg class="ic" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const esc = (text)=>String(text??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const retrieve=(key,otherwise)=>{try{const value=localStorage.getItem('dhun_'+key);return value===null?otherwise:JSON.parse(value)}catch{return otherwise}};
const save=(key,data)=>{try{localStorage.setItem('dhun_'+key,JSON.stringify(data))}catch{}};
const thumb=t=>t.source==='local'?null:(t.thumbnail||`https://i.ytimg.com/vi/${encodeURIComponent(t.videoId)}/hqdefault.jpg`);
const artwork=t=>t.source==='local'?`<div class="file-cover">${icon('music')}</div>`:`<span class="fallback-art">${icon('music')}</span><img loading="lazy" src="${esc(thumb(t))}" alt="Cover: ${esc(t.title)}" onerror="this.style.display='none'" />`;
const registered=new Map();
function register(tracks){tracks.forEach(t=>registered.set(t.id,t));return tracks}
register(SEED);
const state={view:'home',key:retrieve('apiKey',''),liked:retrieve('liked',[]),recent:retrieve('recent',[]),playlists:retrieve('playlists',{}),searchTerm:'',filter:'All',results:[],nextPage:'',resultsLoading:false,activeQuery:'',popular:[],localTracks:[],current:null,queue:[],isPlaying:false,repeat:false,shuffle:false,youtubePlayer:null,ytReadyPromise:null,audio:null,objectUrl:null,playNonce:0,installEvent:null,searchTimer:null,mobileOpen:false};
register(state.liked);register(state.recent);Object.values(state.playlists).forEach(p=>register(p.tracks||[]));
let toastTimer;
function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3100)}
const localOrSeed=()=>[...state.localTracks,...SEED];
const isLiked=t=>state.liked.some(x=>x.id===t.id);
function navUpdate(){
  $$('.nav-item[data-view], .mobile-bottom-nav [data-view]').forEach(el=>el.classList.toggle('active',el.dataset.view===state.view));
  $('#likedCount').textContent=state.liked.length||'';
  const nav=$('#playlistNav');nav.innerHTML=Object.entries(state.playlists).map(([id,p],i)=>`<button class="playlist-link ${state.view==='playlist:'+id?'active':''}" data-playlist-id="${esc(id)}"><span class="playlist-color" style="background:${['#482c68','#604134','#21544a','#453361'][i%4]}">${icon('music')}</span><span>${esc(p.name)}</span></button>`).join('');
}
function setView(view){state.view=view;$('#sidebar').classList.remove('open');render();if(window.innerWidth<701)window.scrollTo({top:0,behavior:'smooth'})}
function card(t){
  register([t]);return `<article class="track-card" data-action="play" data-track-id="${esc(t.id)}" role="button" tabindex="0" aria-label="Play ${esc(t.title)}">
    <div class="track-cover">${artwork(t)}<span class="track-play-overlay">${icon('play')}</span></div>
    <div class="track-card-details"><div style="min-width:0"><div class="track-name" title="${esc(t.title)}">${esc(t.title)}</div><div class="track-artist" title="${esc(t.artist)}">${esc(t.artist)}</div></div>
    <button class="heart-btn ${isLiked(t)?'liked':''}" data-action="like" data-track-id="${esc(t.id)}" aria-label="${isLiked(t)?'Unlike':'Like'} ${esc(t.title)}">${icon('heart')}</button></div></article>`
}
function row(t,i){
  register([t]);return `<div class="track-row"><span class="track-index">${i+1}</span><div class="row-cover">${artwork(t)}</div><div class="row-main" role="button" tabindex="0" data-action="play" data-track-id="${esc(t.id)}"><span class="row-name">${esc(t.title)}</span><span class="row-artist">${esc(t.artist)}</span></div><span class="row-tag">${t.source==='local'?'On device':'YouTube'}</span><div class="row-more"><button data-action="more" data-track-id="${esc(t.id)}" title="More actions" aria-label="More actions for ${esc(t.title)}">${icon('more')}</button></div></div>`;
}
function sectionHead(title,sub='',more=''){return `<div class="section-head"><div><h2>${title}</h2>${sub?`<p class="section-desc">${sub}</p>`:''}</div>${more?`<button class="section-link" data-view="${esc(more)}">Explore more ${icon('arrow')}</button>`:''}</div>`}
function emptyState(head,desc,button='',action=''){return `<div class="empty-state"><div class="empty-state-icon">${icon('music')}</div><h3>${head}</h3><p>${desc}</p>${button?`<button class="accent-button" data-action="${action}">${button}</button>`:''}</div>`}
function htmlHome(){
 const tracks=state.popular.length?state.popular:SEED;
 const display=register([...tracks.slice(0,6)]);
 const hour=new Date().getHours();const greeting=hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
 return `<div class="welcome"><div><span class="welcome-kicker">WELCOME BACK TO YOUR VIBE</span><h1>${greeting} <span style="color:#d6b7ff">✦</span></h1></div><span class="welcome-side">Find a song for every moment.</span></div>
  <div class="hero"><div class="hero-text"><span class="eyebrow">${icon('sparkles')} YOUR DAILY SOUNDTRACK</span><h2>Feel every <em>beat.</em><br>Live every vibe.</h2><p>All the songs you love, one beautiful place. Hit play and get lost in the music.</p><button class="hero-button" data-action="play" data-track-id="${esc(SEED[0].id)}">${icon('play')} Start listening</button></div><div class="hero-art"><div class="hero-disc"></div><img class="hero-cover" alt="Saiyaara music thumbnail" src="${esc(thumb(SEED[0]))}"/><span class="hero-note">♫</span></div></div>
  <section class="section">${sectionHead('Made for your mood','Pick a feeling. We’ve got the soundtrack.')}<div class="moods">${MOODS.map(m=>`<button class="mood-card ${m.cls}" data-action="mood" data-mood="${m.name}"><span class="mood-emoji">${m.emoji}</span><strong>${m.name}</strong><small>${m.subtitle}</small></button>`).join('')}</div></section>
  <section class="section">${sectionHead(state.popular.length?'Popular music in India':'Handpicked for you','Fresh favorites, ready when you are.','search')}<div class="track-grid">${display.map(card).join('')}</div></section>
  <section class="section">${sectionHead('On your radar','A little more to fall in love with.')}<div class="track-rows">${SEED.slice().reverse().map(row).join('')}</div></section>`;
}
function htmlSearch(){
 const q=state.searchTerm.trim(); const source=q?state.results:(state.popular.length?state.popular:SEED);
 const list=source.filter(t=>{
   if(state.filter==='All')return true;
   if(q&&state.key)return true; // Search API already applied the selected genre.
   return t.genre===state.filter||(state.filter==='Bollywood'&&['Bollywood','Romance','Party'].includes(t.genre))||(state.filter==='Chill'&&t.genre==='Indie');
 });
 const APIwarning=!state.key?`<div class="notice-bar">${icon('info')} Search currently covers the demo picks and music on your device. Add your free YouTube Data API key to search the full YouTube catalog.<button data-action="settings">Add API key</button></div>`:'';
 return `<div class="page-head"><div class="page-icon">${icon('compass')}</div><div><h1>Discover music</h1><p>One search, a million new favorites.</p></div></div>
  ${APIwarning}<div class="chips">${FILTERS.map(f=>`<button class="chip ${state.filter===f?'active':''}" data-action="filter" data-filter="${esc(f)}">${esc(f)}</button>`).join('')}</div>
  <div class="search-status"><p>${q?`Results for <strong style="color:white">“${esc(q)}”</strong>`:'Explore something new today'}${state.resultsLoading?' · Searching YouTube…':''}</p>${q?`<button class="text-btn" data-action="clear-search">Clear search</button>`:''}</div>
  ${state.resultsLoading&&!state.results.length?`<div class="track-grid">${Array.from({length:6},()=>'<div class="loading-track"></div>').join('')}</div>`:list.length?`<div class="track-grid">${list.map(card).join('')}</div>`:emptyState('No songs found',state.key?'Try a different search or genre.':'Add a YouTube API key for full searches, or try the sample songs.','Connect YouTube','settings')}
  ${state.nextPage?`<div style="text-align:center;padding:23px"><button class="ghost-button" data-action="load-more">Load more songs ${icon('arrow')}</button></div>`:''}`;
}
function htmlLiked(){return `<div class="page-head"><div class="page-icon">${icon('heart')}</div><div><h1>Liked songs</h1><p>${state.liked.length} track${state.liked.length===1?'':'s'} you can't stop loving</p></div></div>${state.liked.length?`<div class="track-rows">${state.liked.map(row).join('')}</div>`:emptyState('Your favorites live here','Give a song some love by tapping its heart.','Discover music','discover')}`}
function htmlRecent(){return `<div class="page-head"><div class="page-icon">${icon('clock')}</div><div><h1>Recently played</h1><p>A rewind of your latest listening sessions</p></div></div>${state.recent.length?`<div class="track-rows">${state.recent.map(row).join('')}</div>`:emptyState('No history just yet','Songs you play will show up here.','Explore songs','discover')}`}
function htmlLocal(){return `<div class="page-head"><div class="page-icon">${icon('folder')}</div><div><h1>On your device</h1><p>Your personal collection. Ad-free and yours.</p></div></div>
  <div class="local-tile"><span>${icon('upload')}</span><div class="local-tile-text"><strong>Bring your own music</strong><p>Import songs from your phone or computer. Files stay on this device and work offline.</p></div><button class="accent-button" data-action="import-local">${icon('plus')} Add music</button></div>
  ${state.localTracks.length?`<div class="track-rows">${state.localTracks.map(row).join('')}</div>`:emptyState('Your local library is empty','Tap Add music to choose MP3, M4A, WAV or other supported audio files.','Import my songs','import-local')}`}
function htmlPlaylist(id){const p=state.playlists[id];if(!p)return emptyState('Playlist not found','This playlist may have been deleted.');register(p.tracks);return `<div class="page-head"><div class="page-icon">${icon('list')}</div><div><h1>${esc(p.name)}</h1><p>${p.tracks.length} tracks · Your playlist</p></div></div><div class="search-status"><p>Curated by you, for you.</p><button class="text-btn" data-action="delete-playlist" data-playlist-id="${esc(id)}">Delete playlist</button></div>${p.tracks.length?`<div class="track-rows">${p.tracks.map(row).join('')}</div>`:emptyState('Let’s add some music','Discover music and use the track menu to add songs.','Discover songs','discover')}`}
function render(){navUpdate();const content=$('#content');if(state.view==='home')content.innerHTML=htmlHome();else if(state.view==='search')content.innerHTML=htmlSearch();else if(state.view==='liked')content.innerHTML=htmlLiked();else if(state.view==='recent')content.innerHTML=htmlRecent();else if(state.view==='local')content.innerHTML=htmlLocal();else if(state.view.startsWith('playlist:'))content.innerHTML=htmlPlaylist(state.view.slice(9));else content.innerHTML=htmlHome()}
function updateLikes(){
  $$('.heart-btn[data-track-id]').forEach(el=>{let liked=state.liked.some(t=>t.id===el.dataset.trackId);el.classList.toggle('liked',liked);el.setAttribute('aria-label',liked?'Unlike track':'Like track')});
  $('#likedCount').textContent=state.liked.length||'';
}
function toggleLike(t){if(isLiked(t))state.liked=state.liked.filter(x=>x.id!==t.id);else state.liked.unshift(t);save('liked',state.liked);updateLikes();if(state.view==='liked')render();toast(isLiked(t)?'Added to Liked songs ♥':'Removed from Liked songs')}
function remember(t){state.recent=[t,...state.recent.filter(x=>x.id!==t.id)].slice(0,40);save('recent',state.recent);if(state.view==='recent')render()}
function openModal(inner){$('#modalRoot').innerHTML=`<div class="modal-scrim" id="modalScrim"><div class="modal" role="dialog" aria-modal="true">${inner}</div></div>`}
function closeModal(){$('#modalRoot').innerHTML=''}
const modalHeading=(title)=>`<div class="modal-head"><div><div class="modal-eyebrow">DHUN SETTINGS</div><h2>${title}</h2></div><button class="icon-btn" data-action="close-modal" aria-label="Close dialog">${icon('x')}</button></div>`;
function settingsModal(){openModal(`${modalHeading('Connect YouTube')}<p>Search millions of music videos using Google's official YouTube Data API. You only need to set this up once per device.</p><span class="${state.key?'key-status':'help-note'}">${state.key?'✓ API key saved on this device':'No API key connected yet'}</span><label for="apiKeyInput">YouTube Data API v3 key</label><input id="apiKeyInput" type="password" placeholder="Paste your API key" value="${esc(state.key)}" autocomplete="off"/><div class="help-note">1. Open <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" rel="noopener noreferrer">Google Cloud Console</a>.<br>2. Enable YouTube Data API v3 and create an API key.<br>3. Restrict it to this website's domain and YouTube Data API v3. Your key is saved in this browser only.</div><div class="modal-actions"><button class="ghost-button" data-action="close-modal">Cancel</button><button class="accent-button" data-action="save-key">Save & connect</button></div>${state.key?`<button style="margin-top:13px" class="text-btn" data-action="remove-key">Remove saved key</button>`:''}`)}
function createPlaylistModal(){openModal(`${modalHeading('New playlist')}<p>Give your playlist a name. All playlists are saved in this browser.</p><label for="playlistNameInput">Playlist name</label><input id="playlistNameInput" type="text" placeholder="e.g. Late night drives" maxlength="55"/><div class="modal-actions"><button class="ghost-button" data-action="close-modal">Cancel</button><button class="accent-button" data-action="save-playlist">Create playlist</button></div>`);$('#playlistNameInput').focus()}
function addToPlaylistModal(t){if(!Object.keys(state.playlists).length){createPlaylistModal();toast('Create a playlist first');return}openModal(`${modalHeading('Add to playlist')}<p>Choose where to save “${esc(t.title)}”.</p><div class="modal-choices">${Object.entries(state.playlists).map(([id,p])=>`<button class="modal-choice" data-action="choose-playlist" data-track-id="${esc(t.id)}" data-playlist-id="${esc(id)}">${icon('list')} ${esc(p.name)} <span style="margin-left:auto;color:#8f86a4">${p.tracks.length}</span></button>`).join('')}</div><div class="modal-actions"><button class="ghost-button" data-action="close-modal">Cancel</button><button class="accent-button" data-action="create-playlist">${icon('plus')} New playlist</button></div>`)}
function moreMenu(btn,t){$$('.row-menu').forEach(el=>el.remove());const menu=document.createElement('div');menu.className='row-menu';menu.innerHTML=`<button data-action="queue" data-track-id="${esc(t.id)}">Play next</button><button data-action="like" data-track-id="${esc(t.id)}">${isLiked(t)?'Remove from likes':'Add to liked songs'}</button><button data-action="playlist-add" data-track-id="${esc(t.id)}">Add to playlist</button>${state.view.startsWith('playlist:')?`<button data-action="remove-playlist-track" data-track-id="${esc(t.id)}">Remove from playlist</button>`:''}${t.source==='local'?`<button data-action="delete-local" data-track-id="${esc(t.id)}">Delete local file</button>`:''}`;btn.parentElement.append(menu)}
function queueTrack(t){if(state.current?.id===t.id){toast('Already playing');return}state.queue=[t,...state.queue.filter(x=>x.id!==t.id)];renderQueue();toast('Playing next: '+t.title)}
function renderQueue(){const el=$('#queueList');el.innerHTML=state.queue.length?state.queue.slice(0,12).map(t=>`<div class="queue-item">${t.source==='local'?`<span class="queue-file">${icon('music')}</span>`:`<img src="${esc(thumb(t))}" alt="" loading="lazy"/>`}<div style="min-width:0"><div class="queue-title">${esc(t.title)}</div><div class="queue-artist">${esc(t.artist)}</div></div><button title="Remove" data-action="remove-queue" data-track-id="${esc(t.id)}">${icon('x')}</button></div>`).join(''):`<p class="queue-placeholder">Your upcoming tracks will appear here. Use a song’s menu to add one.</p>`}
function formatTime(secs){if(!Number.isFinite(secs)||secs<0)return '0:00';let n=Math.floor(secs);return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`}
function destroyPlayers(){
 try{state.youtubePlayer?.destroy()}catch{}
 state.youtubePlayer=null;
 if(state.audio){try{state.audio.pause();state.audio.src=''}catch{}state.audio=null}
 if(state.objectUrl){URL.revokeObjectURL(state.objectUrl);state.objectUrl=null}
 state.isPlaying=false;
 if('mediaSession' in navigator){try{navigator.mediaSession.metadata=null}catch{}}
}
function renderPlayer(){const t=state.current;const body=$('#playerBody');if(!t){body.innerHTML=`<div class="empty-player"><div class="empty-player-graphic">${icon('headphones')}</div><h3>Nothing playing yet</h3><p>Pick a track and let the music take over.</p></div>`;renderQueue();return}
 body.innerHTML=`${t.source==='youtube'?'<div id="ytHost" class="yt-host" aria-label="Visible YouTube video player"></div>':`<div class="now-cover file-now">${artwork(t)}</div>`}
  <div class="player-meta"><div class="meta-left"><div class="player-song">${esc(t.title)}</div><div class="player-artist">${esc(t.artist)}</div></div><button class="heart-btn ${isLiked(t)?'liked':''}" data-action="like" data-track-id="${esc(t.id)}" title="Like song">${icon('heart')}</button></div>
  <div class="progress-wrap"><input class="progress-track" id="playbackSeek" type="range" min="0" max="100" value="0" aria-label="Seek song"/><div class="time-row"><span id="currentTime">0:00</span><span id="durationTime">0:00</span></div></div>
  <div class="transport"><button class="${state.shuffle?'active-mode':''}" data-action="shuffle" title="Shuffle">${icon('shuffle')}</button><button data-action="previous" title="Previous track">${icon('prev')}</button><button class="main-play" id="mainPlayPause" data-action="pause" title="Play/Pause">${icon('pause')}</button><button data-action="next" title="Next track">${icon('next')}</button><button class="${state.repeat?'active-mode':''}" data-action="repeat" title="Repeat this song">${icon('repeat')}</button></div>
  <div class="secondary-controls"><span class="yt-label">${t.source==='youtube'?'<span class="yt-spot"></span>Playing from YouTube':`${icon('music')} Your device`}</span>${t.source==='youtube'?`<a class="watch-link" target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/watch?v=${encodeURIComponent(t.videoId)}">Open on YouTube ${icon('external')}</a>`:'<span style="font-size:10px;color:#83768e">Offline enabled</span>'}</div>`;
 renderQueue();updatePlayingButton();
}
function updatePlayingButton(){const b=$('#mainPlayPause');if(b){b.dataset.action=state.isPlaying?'pause':'resume';b.innerHTML=icon(state.isPlaying?'pause':'play')}}
function updateProgress(){if(!state.current)return;let cur=0,dur=0;try{if(state.current.source==='youtube'&&state.youtubePlayer?.getCurrentTime){cur=state.youtubePlayer.getCurrentTime()||0;dur=state.youtubePlayer.getDuration()||0}else if(state.audio){cur=state.audio.currentTime||0;dur=state.audio.duration||0}}catch{}const range=$('#playbackSeek');if(range&&!range.matches(':active'))range.value=dur?String(Math.max(0,Math.min(100,cur/dur*100))):'0';if($('#currentTime'))$('#currentTime').textContent=formatTime(cur);if($('#durationTime'))$('#durationTime').textContent=formatTime(dur)}
function ensureYT(){if(window.YT?.Player)return Promise.resolve();if(state.ytReadyPromise)return state.ytReadyPromise;state.ytReadyPromise=new Promise((resolve,reject)=>{const existing=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{if(typeof existing==='function')existing();resolve()};const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{state.ytReadyPromise=null;reject(new Error('Could not load the YouTube player. Check your internet connection.'))};document.head.appendChild(script)});return state.ytReadyPromise}
async function beginYT(t,nonce){try{await ensureYT();if(nonce!==state.playNonce)return;state.youtubePlayer=new YT.Player('ytHost',{height:'100%',width:'100%',videoId:t.videoId,playerVars:{autoplay:1,playsinline:1,controls:1,rel:0,origin:location.origin},events:{onReady:e=>{if(nonce!==state.playNonce)return;try{e.target.playVideo()}catch{}},onStateChange:e=>{if(nonce!==state.playNonce)return;if(e.data===YT.PlayerState.ENDED){state.isPlaying=false;updatePlayingButton();if(state.repeat){playTrack(t,{keepQueue:true})}else nextTrack()}else if(e.data===YT.PlayerState.PLAYING){state.isPlaying=true;updatePlayingButton()}else if(e.data===YT.PlayerState.PAUSED){state.isPlaying=false;updatePlayingButton()}},onError:e=>{if(nonce!==state.playNonce)return;toast(e.data===101||e.data===150?'This video blocks embedded playback. Open it on YouTube.':'Video could not be played. Try another track.');state.isPlaying=false;updatePlayingButton()},onAutoplayBlocked:()=>{if(nonce===state.playNonce){toast('Tap play in the YouTube player to start');state.isPlaying=false;updatePlayingButton()}}}})}catch(err){if(nonce===state.playNonce){state.isPlaying=false;updatePlayingButton();toast(err.message)}}}
function dbOpen(){return new Promise((resolve,reject)=>{if(!('indexedDB'in window)){reject(new Error('Local music storage is not supported on this browser'));return}const req=indexedDB.open('dhun_local_music',1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('tracks'))req.result.createObjectStore('tracks',{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function dbAll(){const db=await dbOpen();return new Promise((resolve,reject)=>{const tx=db.transaction('tracks','readonly');const req=tx.objectStore('tracks').getAll();req.onsuccess=()=>{db.close();resolve(req.result)};req.onerror=()=>{db.close();reject(req.error)}})}
async function dbGet(id){const db=await dbOpen();return new Promise((resolve,reject)=>{const tx=db.transaction('tracks','readonly');const req=tx.objectStore('tracks').get(id);req.onsuccess=()=>{db.close();resolve(req.result)};req.onerror=()=>{db.close();reject(req.error)}})}
async function dbPut(item){const db=await dbOpen();return new Promise((resolve,reject)=>{const tx=db.transaction('tracks','readwrite');tx.objectStore('tracks').put(item);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
async function dbDelete(id){const db=await dbOpen();return new Promise((resolve,reject)=>{const tx=db.transaction('tracks','readwrite');tx.objectStore('tracks').delete(id);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
async function beginLocal(t,nonce){try{const found=await dbGet(t.id);if(nonce!==state.playNonce)return;if(!found?.blob)throw new Error('Local file unavailable. Import it again.');state.objectUrl=URL.createObjectURL(found.blob);const a=new Audio(state.objectUrl);state.audio=a;a.addEventListener('ended',()=>{if(nonce===state.playNonce){if(state.repeat)playTrack(t,{keepQueue:true});else nextTrack()}});a.addEventListener('play',()=>{state.isPlaying=true;updatePlayingButton()});a.addEventListener('pause',()=>{state.isPlaying=false;updatePlayingButton()});a.addEventListener('error',()=>toast('Your browser cannot play this audio format.'));if('mediaSession'in navigator){try{navigator.mediaSession.metadata=new MediaMetadata({title:t.title,artist:t.artist,album:'On your device'});navigator.mediaSession.setActionHandler('play',()=>resumePlayback());navigator.mediaSession.setActionHandler('pause',()=>pausePlayback());navigator.mediaSession.setActionHandler('nexttrack',()=>nextTrack());navigator.mediaSession.setActionHandler('previoustrack',()=>previousTrack())}catch{}}await a.play()}catch(err){if(nonce===state.playNonce){state.isPlaying=false;updatePlayingButton();toast(err?.name==='NotAllowedError'?'Tap play again to start audio.':err.message||'Could not play file')}}}
function selectQueueFrom(t){if(state.queue.length)return;let source=state.results.find(x=>x.id===t.id)?state.results:state.popular.find(x=>x.id===t.id)?state.popular:SEED;state.queue=source.filter(x=>x.id!==t.id).slice(0,5)}
function playTrack(t,options={}){if(!t)return;if(!options.keepQueue)selectQueueFrom(t);state.playNonce++;let nonce=state.playNonce;destroyPlayers();state.current=t;remember(t);state.isPlaying=true;renderPlayer();if(window.innerWidth<701){state.mobileOpen=true;$('#playerPanel').classList.add('open');$('#mobilePlayerBackdrop').hidden=false}if(t.source==='youtube')beginYT(t,nonce);else beginLocal(t,nonce)}
function pausePlayback(){try{if(state.current?.source==='youtube')state.youtubePlayer?.pauseVideo();else state.audio?.pause()}catch{}state.isPlaying=false;updatePlayingButton()}
function resumePlayback(){try{if(state.current?.source==='youtube')state.youtubePlayer?.playVideo();else state.audio?.play().catch(()=>toast('Tap the play button to start'))}catch{}state.isPlaying=true;updatePlayingButton()}
function nextTrack(){let next;if(state.queue.length){const index=state.shuffle?Math.floor(Math.random()*state.queue.length):0;next=state.queue.splice(index,1)[0]}else{const all=[...(state.popular.length?state.popular:SEED),...SEED];const uniques=all.filter((x,i)=>all.findIndex(y=>y.id===x.id)===i);let idx=uniques.findIndex(t=>t.id===state.current?.id);next=uniques[(idx+1)%uniques.length]}if(next)playTrack(next,{keepQueue:true});else{pausePlayback();toast('Queue finished')}}
function previousTrack(){const i=state.recent.findIndex(t=>t.id===state.current?.id);let prev=state.recent[i+1];if(prev)playTrack(prev,{keepQueue:true});else if(state.current)playTrack(state.current,{keepQueue:true})}
function closePlayer(){state.playNonce++;destroyPlayers();state.current=null;state.mobileOpen=false;$('#playerPanel').classList.remove('open');$('#mobilePlayerBackdrop').hidden=true;renderPlayer()}
async function importLocal(files){const audioFiles=[...files].filter(f=>f.type.startsWith('audio/')||/\.(mp3|m4a|wav|ogg|flac|aac)$/i.test(f.name));if(!audioFiles.length){toast('Choose audio files to import');return}let success=0;for(const f of audioFiles){const t={id:'l-'+(crypto.randomUUID?.()||Date.now()+'-'+success),title:f.name.replace(/\.[^.]+$/,''),artist:'On your device',source:'local',genre:'Local'};try{await dbPut({...t,blob:f});state.localTracks.unshift(t);register([t]);success++}catch(err){console.error('Import failed',err);toast('Storage unavailable or full — try smaller files');break}}setView('local');toast(`${success} song${success===1?'':'s'} added to your device`)}
async function deleteLocal(t){try{await dbDelete(t.id);state.localTracks=state.localTracks.filter(x=>x.id!==t.id);state.liked=state.liked.filter(x=>x.id!==t.id);state.recent=state.recent.filter(x=>x.id!==t.id);for(const p of Object.values(state.playlists))p.tracks=p.tracks.filter(x=>x.id!==t.id);if(state.current?.id===t.id)closePlayer();save('liked',state.liked);save('recent',state.recent);save('playlists',state.playlists);render();toast('Removed from your device')}catch{toast('Could not remove this file')}}
function decodeEntities(s){const doc=new DOMParser().parseFromString(s,'text/html');return doc.documentElement.textContent||s}
function fromSearch(item){const id=item?.id?.videoId;if(!id||!/^[\w-]{11}$/.test(id))return null;return {id:'y-'+id,videoId:id,title:decodeEntities(item.snippet?.title||'Untitled video'),artist:decodeEntities(item.snippet?.channelTitle||'YouTube'),source:'youtube',genre:state.filter==='All'?'YouTube':state.filter,thumbnail:item.snippet?.thumbnails?.high?.url||item.snippet?.thumbnails?.medium?.url||`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}}
function fromPopular(item){const id=item?.id;if(!id||!/^[\w-]{11}$/.test(id))return null;return {id:'y-'+id,videoId:id,title:decodeEntities(item.snippet?.title||'Untitled video'),artist:decodeEntities(item.snippet?.channelTitle||'YouTube'),source:'youtube',genre:'YouTube',thumbnail:item.snippet?.thumbnails?.high?.url||`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}}
async function youtubeGet(endpoint,params){if(!state.key)throw new Error('Add your YouTube API key in Settings.');const url=new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);Object.entries({...params,key:state.key}).forEach(([k,v])=>url.searchParams.set(k,v));let response=await fetch(url);let data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error?.message||(response.status===403?'Check your API key, API settings or quota.':'YouTube API request failed.'));return data}
async function loadPopular(){if(!state.key)return;try{const d=await youtubeGet('videos',{part:'snippet',chart:'mostPopular',videoCategoryId:'10',maxResults:'12',regionCode:'IN'});state.popular=register(d.items.map(fromPopular).filter(Boolean));if(state.view==='home'||(state.view==='search'&&!state.searchTerm))render()}catch(err){console.warn('Trending unavailable:',err.message);toast('Showing handpicked picks — trending unavailable')}}
function localSearch(q){let terms=q.toLocaleLowerCase().trim();return register([...SEED,...state.localTracks].filter(t=>(t.title+' '+t.artist+' '+t.genre).toLocaleLowerCase().includes(terms)))}
let searchVersion=0;
async function doSearch(query,append=false){const q=query.trim();const version=++searchVersion;state.activeQuery=q;if(!q){state.results=[];state.nextPage='';state.resultsLoading=false;render();return}if(!state.key){state.results=localSearch(q);state.nextPage='';state.resultsLoading=false;render();return}state.resultsLoading=true;if(!append){state.results=[];state.nextPage=''}render();try{
  const genreQuery=state.filter==='All'?q:`${q} ${state.filter} songs`;
  const data=await youtubeGet('search',{part:'snippet',q:genreQuery,type:'video',videoEmbeddable:'true',videoSyndicated:'true',maxResults:'18',regionCode:'IN',safeSearch:'moderate',...(append&&state.nextPage?{pageToken:state.nextPage}:{})});
  if(version!==searchVersion)return;
  const newer=register(data.items.map(fromSearch).filter(Boolean));state.results=append?[...state.results,...newer.filter(t=>!state.results.some(x=>x.id===t.id))]:newer;state.nextPage=data.nextPageToken||'';
 }catch(err){if(version!==searchVersion)return;state.results=localSearch(q);state.nextPage='';toast(err.message||'Search is temporarily unavailable')}finally{if(version===searchVersion){state.resultsLoading=false;if(state.view==='search')render()}}
}
function searchInput(value){state.searchTerm=value;setView('search');clearTimeout(state.searchTimer);state.searchTimer=setTimeout(()=>doSearch(value),420)}
function goMood(name){const mood=MOODS.find(x=>x.name===name);state.filter=name;state.searchTerm=state.key?mood.query:'';$('#searchInput').value=state.searchTerm;setView('search');if(state.key)doSearch(state.searchTerm);else{state.results=SEED.filter(t=>t.genre===name||(name==='Chill'&&t.genre==='Indie'));render()}}
function installGuide(){openModal(`${modalHeading('Install dhun.')}<p>Get dhun. right on your home screen, just like a normal app.</p><p><strong style="color:white">Android / Chrome:</strong> Open this website over HTTPS, tap Chrome’s ⋮ menu, then choose <b>Install app</b> or <b>Add to Home screen</b>.</p><p><strong style="color:white">iPhone / Safari:</strong> Tap Share → <b>Add to Home Screen</b>.</p><p>The app shell works offline; YouTube needs an internet connection. Imported local songs can work offline.</p><div class="modal-actions"><button class="accent-button" data-action="close-modal">Got it</button></div>`)}
function addPlaylist(name){const id='p-'+Date.now().toString(36);state.playlists[id]={name,tracks:[]};save('playlists',state.playlists);closeModal();setView('playlist:'+id);toast('Playlist created')}
function handleAction(action,btn){const t=registered.get(btn.dataset.trackId);
 switch(action){
 case 'play':if(t)playTrack(t);break;
 case 'like':if(t)toggleLike(t);break;
 case 'mood':goMood(btn.dataset.mood);break;
 case 'settings':settingsModal();break;
 case 'import-local':$('#localFilesInput').click();break;
 case 'clear-search':state.searchTerm='';$('#searchInput').value='';doSearch('');break;
 case 'filter':state.filter=btn.dataset.filter;if(state.searchTerm)doSearch(state.searchTerm);else render();break;
 case 'load-more':if(state.searchTerm)doSearch(state.searchTerm,true);break;
 case 'pause':pausePlayback();break;
 case 'resume':resumePlayback();break;
 case 'next':nextTrack();break;
 case 'previous':previousTrack();break;
 case 'repeat':state.repeat=!state.repeat;btn.classList.toggle('active-mode',state.repeat);break;
 case 'shuffle':state.shuffle=!state.shuffle;/* Avoid re-creating YouTube iframe */btn.classList.toggle('active-mode',state.shuffle);break;
 case 'queue':if(t)queueTrack(t);$$('.row-menu').forEach(n=>n.remove());break;
 case 'clear-queue':state.queue=[];renderQueue();break;
 case 'remove-queue':state.queue=state.queue.filter(x=>x.id!==btn.dataset.trackId);renderQueue();break;
 case 'more':if(t)moreMenu(btn,t);break;
 case 'playlist-add':if(t)addToPlaylistModal(t);break;
 case 'choose-playlist':{const p=state.playlists[btn.dataset.playlistId];if(t&&p&&!p.tracks.some(x=>x.id===t.id)){p.tracks.push(t);save('playlists',state.playlists);toast('Added to '+p.name)}else toast('Already in this playlist');closeModal();break}
 case 'create-playlist':createPlaylistModal();break;
 case 'save-playlist':{const name=$('#playlistNameInput')?.value.trim();if(name)addPlaylist(name);else toast('Enter a playlist name');break}
 case 'close-modal':closeModal();break;
 case 'save-key':{const key=$('#apiKeyInput')?.value.trim();state.key=key||'';save('apiKey',state.key);closeModal();toast(state.key?'Connected! Loading music…':'YouTube key cleared');if(state.key){loadPopular();if(state.searchTerm)doSearch(state.searchTerm)}else{state.popular=[];render()}break}
 case 'remove-key':state.key='';save('apiKey','');state.popular=[];closeModal();render();toast('YouTube API key removed');break;
 case 'delete-playlist':{const id=btn.dataset.playlistId;const name=state.playlists[id]?.name;if(name&&confirm(`Delete “${name}”?`)){delete state.playlists[id];save('playlists',state.playlists);setView('home');toast('Playlist deleted')}break}
 case 'remove-playlist-track':{const p=state.playlists[state.view.slice(9)];if(p&&t){p.tracks=p.tracks.filter(x=>x.id!==t.id);save('playlists',state.playlists);render();toast('Removed from playlist')}break}
 case 'delete-local':if(t&&confirm(`Delete “${t.title}” from this app?`))deleteLocal(t);break;
 case 'discover':setView('search');break;
 }
}
function bindEvents(){
 document.addEventListener('click',event=>{
   const action=event.target.closest('[data-action]');if(action){event.preventDefault();event.stopPropagation();handleAction(action.dataset.action,action);return}
   const p=event.target.closest('[data-playlist-id]');if(p){setView('playlist:'+p.dataset.playlistId);return}
   const nav=event.target.closest('[data-view]');if(nav){event.preventDefault();if(nav.dataset.view==='search'){$('#searchInput').focus()}setView(nav.dataset.view);return}
   if(!event.target.closest('.row-more'))$$('.row-menu').forEach(n=>n.remove());
 });
 document.addEventListener('keydown',e=>{
   if(e.key==='Escape'){$$('.row-menu').forEach(n=>n.remove());closeModal();$('#sidebar').classList.remove('open')}
   if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)&&!$('#modalScrim')){e.preventDefault();$('#searchInput').focus()}
   if(e.key==='Enter'){const item=document.activeElement;if(item?.dataset.action==='play'){e.preventDefault();const t=registered.get(item.dataset.trackId);if(t)playTrack(t)}}
 });
 $('#searchInput').addEventListener('input',e=>searchInput(e.target.value));
 $('#createPlaylistSide').onclick=createPlaylistModal;$('#newPlaylist').onclick=createPlaylistModal;
 $('#settingsButton').onclick=settingsModal;$('#topSettings').onclick=settingsModal;$('#connectButton').onclick=settingsModal;
 $('#menuToggle').onclick=()=>$('#sidebar').classList.toggle('open');
 $('#closePlayer').onclick=closePlayer;
 $('#mobilePlayerBackdrop').onclick=closePlayer;
 $('#clearQueue').onclick=()=>{state.queue=[];renderQueue();toast('Queue cleared')};
 $('#localFilesInput').addEventListener('change',e=>{if(e.target.files.length)importLocal(e.target.files);e.target.value=''});
 $('#playerPanel').addEventListener('input',e=>{if(e.target.id!=='playbackSeek')return;let duration=0;try{duration=state.current?.source==='youtube'?state.youtubePlayer?.getDuration():state.audio?.duration}catch{}if(duration){let target=Number(e.target.value)*duration/100;if(state.current.source==='youtube')state.youtubePlayer?.seekTo(target,true);else if(state.audio)state.audio.currentTime=target}});
 $('#installButton').onclick=async()=>{if(state.installEvent){state.installEvent.prompt();await state.installEvent.userChoice.catch(()=>{});state.installEvent=null}else installGuide()};
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.installEvent=e});
 window.addEventListener('appinstalled',()=>toast('dhun. is installed! 🎵'));
 $('#modalRoot').addEventListener('click',e=>{if(e.target.id==='modalScrim')closeModal()});
}
async function init(){bindEvents();render();renderQueue();setInterval(updateProgress,800);try{const files=await dbAll();state.localTracks=register(files.map(({blob,...t})=>t).reverse());if(['home','search','local'].includes(state.view))render()}catch(err){console.info('Local music storage unavailable:',err.message)}if(state.key)loadPopular();if('serviceWorker'in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')){navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('Service worker registration failed',e))}}
init();