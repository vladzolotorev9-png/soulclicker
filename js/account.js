/* ============================================================
   ПЕПЕЛЬНЫЙ ПРИЗЫВ — аккаунт и облачные сохранения
   • внутри Telegram вход автоматический (подпись initData);
   • в браузере создаётся профиль и выдаётся код доступа,
     чтобы продолжить на другом устройстве.
   Работает и без сервера: тогда игра просто сохраняется локально.
   ============================================================ */
(function(){
'use strict';

const KEY = 'ashen-account-v1';
const API = ((window.API_BASE || '').replace(/\/+$/, '')) + '/api';

let me = null;             // {pid, code, name}
let status = 'off';        // off | cloud | saving | error
let hooks = null;          // {getSave, applySave}
let pushTimer = 0;
let lastPushAt = 0;
let pulling = false;
const PUSH_MIN_INTERVAL = 45000;   // не чаще раза в 45 с (бережём лимиты KV)

function readStored(){
  try{
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}
function store(){
  if(me){
    try{ localStorage.setItem(KEY, JSON.stringify(me)); }catch(e){}
  }
  const dot = document.getElementById('cloud-dot');
  if(dot) dot.className = 'cloud-dot ' + status;
  const btn = document.getElementById('btn-profile');
  if(btn){
    btn.title = status === 'cloud' ? 'Сохранения в облаке включены'
      : status === 'saving' ? 'Идёт сохранение'
      : status === 'error' ? 'Нет связи с сервером'
      : 'Облако недоступно — игра сохраняется локально';
  }
}

function tg(){
  return (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;
}
function initData(){
  try{
    const w = tg();
    return (w && typeof w.initData === 'string') ? w.initData : '';
  }catch(e){ return ''; }
}
function inTelegram(){ return !!initData(); }

function request(path, body, method){
  const payload = Object.assign({ initData: initData() }, body || {});
  return fetch(API + path, {
    method: method || 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: method === 'GET' ? undefined : JSON.stringify(payload),
    credentials: 'same-origin',
    cache: 'no-store'
  }).then(res => res.json().then(data => ({ ok: res.ok, data })));
}

function getJSON(path){
  return fetch(API + path, { cache: 'no-store' })
    .then(res => res.json().then(data => ({ ok: res.ok, data })));
}

/* ---------- регистрация / вход ---------- */
function register(){
  return request('/register', {}).then(r => {
    if(!r.ok || !r.data.player) throw new Error((r.data && r.data.error) || 'register failed');
    me = r.data.player;
    store();
    status = 'cloud';
    store();
    return me;
  });
}

function loadProfile(){
  if(!me) return Promise.resolve(null);
  const q = new URLSearchParams();
  q.set('pid', me.pid);
  if(initData()) q.set('initData', initData());
  return getJSON('/load?' + q.toString()).then(r => {
    if(r.ok && r.data.player) me = r.data.player;
    if(r.ok) status = 'cloud';
    store();
    return me;
  }).catch(() => { status = 'error'; store(); return null; });
}

function init(){
  status = 'off';

  if(inTelegram()){
    // В Telegram аккаунт создаётся сам по подписи initData
    register().then(() => pull()).catch(() => { status = 'error'; store(); });
    return;
  }

  const saved = readStored();
  if(saved && saved.pid){
    me = saved;
    status = 'cloud';
    store();
    loadProfile().then(() => pull());
  }else{
    register().then(() => {
      const code = me && me.code ? me.code : '';
      if(window.gameToast && code) window.gameToast('ПРОФИЛЬ СОЗДАН · КОД ' + code);
      pull();
    }).catch(() => { status = 'off'; store(); });
  }
}

/* ---------- загрузка с сервера ---------- */
function pull(){
  if(!me || pulling) return Promise.resolve(false);
  pulling = true;
  const q = new URLSearchParams();
  q.set('pid', me.pid);
  if(initData()) q.set('initData', initData());

  return getJSON('/load?' + q.toString()).then(r => {
    pulling = false;
    if(!r.ok){ status = 'error'; store(); return false; }
    status = 'cloud'; store();
    if(r.data.player) me = r.data.player;
    store();
    const remote = r.data.save;
    const remoteTs = r.data.ts || 0;
    if(!remote || !hooks) return false;

    const localTs = (hooks.getLocalTs ? hooks.getLocalTs() : 0) || 0;
    if(remoteTs > localTs){
      try{
        hooks.applySave(remote);
        return true;
      }catch(e){ /* повреждённый сейв не должен ломать игру */ }
    }
    return false;
  }).catch(() => { pulling = false; status = 'error'; store(); return false; });
}

/* ---------- выгрузка на сервер ---------- */
function pushNow(force){
  if(!me || !hooks) return Promise.resolve(false);
  let save;
  try{ save = hooks.getSave(); }catch(e){ return Promise.resolve(false); }
  if(!save) return Promise.resolve(false);

  const now = Date.now();
  if(!force && now - lastPushAt < PUSH_MIN_INTERVAL){
    if(!pushTimer){
      pushTimer = setTimeout(() => { pushTimer = 0; pushNow(); }, PUSH_MIN_INTERVAL - (now - lastPushAt) + 120);
    }
    return Promise.resolve(false);
  }
  lastPushAt = now;

  status = 'saving'; store();
  return request('/save', { pid: me.pid, save, ts: save.ts || Date.now() })
    .then(r => {
      if(r.ok){ status = 'cloud'; }
      else if(r.data && r.data.error === 'Слишком часто'){
        status = 'cloud';
        pushTimer = setTimeout(() => { pushTimer = 0; pushNow(); }, 1700);
      }
      else status = 'error';
      store();
      return r.ok;
    })
    .catch(() => { status = 'error'; store(); return false; });
}

function pushDebounced(){
  if(pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { pushTimer = 0; pushNow(); }, 1600);
}

/* отправить сохранение при закрытии вкладки */
function beacon(){
  if(!me || !hooks) return;
  let save;
  try{ save = hooks.getSave(); }catch(e){ return; }
  const body = JSON.stringify({ pid: me.pid, initData: initData(), save, ts: save.ts || Date.now() });
  try{
    if(navigator.sendBeacon){
      // text/plain — «простой» запрос: без CORS-preflight, работает и на чужой домен
      navigator.sendBeacon(API + '/save', new Blob([body], { type: 'text/plain;charset=UTF-8' }));
    }else{
      fetch(API + '/save', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body,
        keepalive: true
      });
    }
  }catch(e){}
}

/* ---------- вход по коду с другого устройства ---------- */
function claim(code){
  const clean = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if(clean.length !== 8) return Promise.resolve({ ok:false, error:'КОД ИЗ 8 СИМВОЛОВ' });
  return request('/claim', { code: clean.slice(0,4) + '-' + clean.slice(4) })
    .then(r => {
      if(!r.ok || !r.data.player) return { ok:false, error: (r.data && r.data.error) || 'НЕ НАЙДЕНО' };
      me = r.data.player;
      status = 'cloud';
      store();
      return pull().then(() => ({ ok:true, player: me }));
    })
    .catch(() => ({ ok:false, error: 'НЕТ СВЯЗИ С СЕРВЕРОМ' }));
}

/* ---------- удалить сохранение в облаке ---------- */
function reset(){
  if(!me) return Promise.resolve(false);
  return request('/reset', { pid: me.pid })
    .then(r => { if(r.ok){ status = 'cloud'; store(); } return r.ok; })
    .catch(() => false);
}

/* ---------- публичный интерфейс ---------- */
window.ACCOUNT = {
  init,
  attach(h){
    hooks = h;
    if(me && status === 'cloud') pull();
  },
  pull,
  pushNow,
  pushDebounced,
  beacon,
  claim,
  reset,
  info(){ return Object.assign({ tg: inTelegram(), status }, me || {}); },
  hasAccount(){ return !!me; },
  status(){ return status; }
};

window.addEventListener('pagehide', beacon);
document.addEventListener('visibilitychange', () => { if(document.hidden) beacon(); });

})();
