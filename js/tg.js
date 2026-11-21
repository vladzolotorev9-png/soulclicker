/* ============================================================
   ПЕПЕЛЬНЫЙ ПРИЗЫВ — интеграция с Telegram Mini App
   В обычном браузере всё тихо выключается.
   ============================================================ */
(function(){
'use strict';

const wa = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;
const inside = !!(wa && typeof wa.initData === 'string');
let ready = false;

function setVar(name, value){
  try{ document.documentElement.style.setProperty(name, value); }catch(e){}
}

const TG = {
  inside,
  init(){
    if(!inside || ready) return;
    ready = true;
    try{
      wa.ready();
      wa.expand();
      if(wa.setHeaderColor) wa.setHeaderColor('#0a0812');
      if(wa.setBackgroundColor) wa.setBackgroundColor('#06050a');
      if(wa.disableVerticalSwipes) wa.disableVerticalSwipes();
    }catch(e){}

    const applyViewport = () => {
      const h = wa.viewportStableHeight || window.innerHeight;
      setVar('--tg-vh', h + 'px');
      const top = (wa.contentSafeAreaInset && wa.contentSafeAreaInset.top) || 0;
      const bottom = (wa.contentSafeAreaInset && wa.contentSafeAreaInset.bottom) || 0;
      setVar('--tg-top', top + 'px');
      setVar('--tg-bottom', bottom + 'px');
      if(window.GAME && window.dispatchEvent) window.dispatchEvent(new Event('resize'));
    };
    applyViewport();
    try{ wa.onEvent('viewportChanged', applyViewport); }catch(e){}

    window.__tgHaptic = (type) => {
      try{
        if(!wa.HapticFeedback) return;
        if(type === 'light' || type === 'medium' || type === 'heavy') wa.HapticFeedback.impactOccurred(type);
        else wa.HapticFeedback.impactOccurred('light');
      }catch(e){}
    };

    try{
      if(wa.BackButton){
        wa.BackButton.onClick(() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape' }));
        });
      }
    }catch(e){}
  },
  haptic(type){
    if(!inside) return;
    try{ if(wa.HapticFeedback) wa.HapticFeedback.impactOccurred(type || 'light'); }catch(e){}
  },
  expand(){
    if(!inside) return;
    try{ wa.expand(); }catch(e){}
  },
  user(){
    if(!inside || !wa.initDataUnsafe) return null;
    return wa.initDataUnsafe.user || null;
  }
};

window.TG = TG;
if(inside){
  // если игра загрузилась раньше — инициализируемся сразу
  if(document.readyState !== 'loading') setTimeout(() => TG.init(), 0);
  else document.addEventListener('DOMContentLoaded', () => TG.init());
}
})();
