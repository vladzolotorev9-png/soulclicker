/* ============================================================
   Куда уходят сохранения.

   ''  — тот же адрес, что отдал игру (Python-бот из bot/bot.py
         или любой сервер, который раздаёт игру и /api).

   Для отдельного сервера на Cloudflare Workers укажите его адрес:
         window.API_BASE = 'https://ashen-summon.workers.dev';

   Тогда игру можно держать на GitHub Pages / Cloudflare Pages,
   а сохранения — в Worker.
   ============================================================ */
window.API_BASE = 'soulclicker-bot.vladzolotorev9.workers.dev';
