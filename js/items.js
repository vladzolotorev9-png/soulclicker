/* ============================================================
   ПЕПЕЛЬНЫЙ ПРИЗЫВ — снаряжение, редкости, генерация лута
   ============================================================ */
(function(){
'use strict';

const RARITY = [
  { id:'common',    name:'ОБЫЧНОЕ',     color:'#b9b2a6', mult:1.00, affixes:1, weight:56 },
  { id:'uncommon',  name:'НЕОБЫЧНОЕ',   color:'#69cf72', mult:1.30, affixes:2, weight:24 },
  { id:'rare',      name:'РЕДКОЕ',      color:'#57a8ff', mult:1.70, affixes:3, weight:11 },
  { id:'epic',      name:'ЭПИЧЕСКОЕ',   color:'#c07bff', mult:2.25, affixes:4, weight:5.5 },
  { id:'legendary', name:'ЛЕГЕНДАРНОЕ', color:'#ffb340', mult:3.00, affixes:5, weight:1.8 },
  { id:'mythic',    name:'МИФИЧЕСКОЕ',  color:'#ff5f6d', mult:4.10, affixes:6, weight:0.45 }
];
const RARITY_BY_ID = {};
RARITY.forEach((r,i) => { r.tier = i; RARITY_BY_ID[r.id] = r; });

/* ---------- оружие: свой тип атаки ---------- */
const WEAPONS = [
  { id:'sword',  base:'меч',     noun:'Клинок',  atk:'slash',  dmg:1.00, crit:0,    souls:0,    bossDmg:0,    hits:1, desc:'Ровный размах' },
  { id:'axe',    base:'топор',   noun:'Топор',   atk:'cleave', dmg:1.38, crit:0,    souls:0,    bossDmg:0,    hits:1, desc:'Тяжёлый замах' },
  { id:'dagger', base:'кинжал',  noun:'Кинжал',  atk:'stab',   dmg:0.58, crit:0.10, souls:0,    bossDmg:0,    hits:2, desc:'Двойной удар' },
  { id:'mace',   base:'булава',  noun:'Булава',  atk:'smash',  dmg:1.12, crit:0,    souls:0,    bossDmg:0.30, hits:1, desc:'Дробит боссов' },
  { id:'staff',  base:'посох',   noun:'Посох',   atk:'bolt',   dmg:0.92, crit:0,    souls:0,    bossDmg:0,    hits:1, desc:'Пьёт силу слуг' },
  { id:'scythe', base:'коса',    noun:'Коса',    atk:'sweep',  dmg:1.08, crit:0.02, souls:0.25, bossDmg:0,    hits:1, desc:'Жнёт души' }
];
const WEAPON_BY_ID = {};
WEAPONS.forEach(w => { WEAPON_BY_ID[w.id] = w; });

const SLOTS = {
  weapon: { name:'ОРУЖИЕ', icon:'sword',  pool:['dmg','crit','cdmg'] },
  armor:  { name:'БРОНЯ',  icon:'armor',  pool:['hp','arm','dps'] },
  amulet: { name:'АМУЛЕТ', icon:'amulet', pool:['crit','cdmg','souls'] },
  ring1:  { name:'КОЛЬЦО', icon:'ring',   pool:['souls','dps','dmg'] },
  ring2:  { name:'КОЛЬЦО', icon:'ring',   pool:['dmg','crit','souls'] }
};
const SLOT_ORDER = ['weapon','armor','amulet','ring1','ring2'];

const STATS = {
  dmg:  { name:'УРОН КЛИКА', pct:true,  w:1.0  },
  dps:  { name:'УРОН СЛУГ',  pct:true,  w:0.55 },
  crit: { name:'ШАНС КРИТА', pct:true,  w:2.2  },
  cdmg: { name:'УРОН КРИТА', pct:true,  w:0.55 },
  souls:{ name:'ДУШИ',       pct:true,  w:0.9  },
  hp:   { name:'ЗДОРОВЬЕ',   pct:false, w:0.35 },
  arm:  { name:'ЗАЩИТА',     pct:true,  w:1.1  }
};

const PREFIX = [
  ['Ржавый', 'Треснувший', 'Грубый', 'Тусклый'],
  ['Крепкий', 'Закалённый', 'Костяной', 'Тёртый'],
  ['Кровавый', 'Тенистый', 'Рунный', 'Студёный'],
  ['Проклятый', 'Пепельный', 'Демонический', 'Погребальный'],
  ['Бездонный', 'Королевский', 'Пылающий', 'Безумный'],
  ['Вечный', 'Пожирающий', 'Мифический', 'Немыслимый']
];

let NEXT_UID = 1;

function rndPick(a){ return a[(Math.random()*a.length)|0]; }
function rnd(a,b){ return a + Math.random()*(b-a); }

function pickRarity(boss){
  const w = RARITY.map((r,i) => {
    let weight = r.weight;
    if(boss) weight = Math.pow(weight, 0.55) * 2.2;   // боссы щедрее
    return weight;
  });
  let total = 0;
  for(const x of w) total += x;
  let roll = Math.random() * total;
  for(let i=0;i<w.length;i++){
    roll -= w[i];
    if(roll <= 0) return RARITY[i];
  }
  return RARITY[0];
}

/* ---------- генерация предмета ---------- */
function makeItem(wave, opts){
  opts = opts || {};
  const isBoss = !!opts.boss;
  const slot = opts.slot || rndPick(SLOT_ORDER);
  const rar = opts.rarity ? RARITY_BY_ID[opts.rarity] || RARITY[0] : pickRarity(isBoss);
  const ilvl = Math.max(1, Math.round(wave + rnd(-1, 2)));

  const item = {
    uid: NEXT_UID++,
    slot, ilvl,
    rarity: rar.id,
    stats: {},
    weapon: null,
    name: ''
  };

  const scale = (0.55 + ilvl * 0.055) * rar.mult;

  if(slot === 'weapon'){
    const w = opts.weapon ? WEAPON_BY_ID[opts.weapon] : rndPick(WEAPONS);
    item.weapon = w.id;
    item.name = rndPick(PREFIX[rar.tier]) + ' ' + w.noun.toLowerCase();
    // базовый урон оружия
    item.stats.dmg = +(6 * scale).toFixed(1);
    if(w.crit) item.stats.crit = +(w.crit * 100 * 0.5 + scale * 1.2).toFixed(1);
    if(w.souls) item.stats.souls = +(w.souls * 100).toFixed(1);
  } else {
    const B = {
      armor:  ['Кольчуга','Панцирь','Мантия','Латы','Рубаха'],
      amulet: ['Амулет','Оберег','Медальон','Талисман','Подвеска'],
      ring1:  ['Кольцо','Перстень','Печатка','Обруч'],
      ring2:  ['Кольцо','Перстень','Печатка','Обруч']
    }[slot];
    item.name = rndPick(PREFIX[rar.tier]) + ' ' + rndPick(B).toLowerCase();
  }

  // аффиксы
  const pool = SLOTS[slot].pool.slice();
  const n = rar.affixes;
  for(let i=0;i<n && pool.length;i++){
    const key = pool.splice((Math.random()*pool.length)|0, 1)[0];
    if(item.stats[key]) continue;
    let val;
    if(key === 'hp') val = Math.round(8 + ilvl * 1.6 * rar.mult);
    else if(key === 'arm') val = +(2.5 * scale).toFixed(1);
    else if(key === 'crit') val = +(0.9 * scale).toFixed(1);
    else if(key === 'cdmg') val = +(5 * scale).toFixed(1);
    else val = +(4.5 * scale).toFixed(1);
    item.stats[key] = val;
  }

  item.score = itemScore(item);
  return item;
}

function itemScore(it){
  let s = 0;
  for(const k in it.stats) s += it.stats[k] * (STATS[k] ? STATS[k].w : 0.5);
  if(it.weapon){
    const w = WEAPON_BY_ID[it.weapon];
    s *= w.dmg * (w.hits > 1 ? 1.12 : 1);
  }
  return Math.round(s * 10) / 10;
}

function statLabel(k, v){
  const st = STATS[k];
  if(!st) return '';
  return st.pct ? v.toFixed(1).replace('.', ',') + '%' : Math.round(v);
}

/* ---------- агрегация ---------- */
function emptyStats(){ return { dmg:0, dps:0, crit:0, cdmg:0, souls:0, hp:0, arm:0 }; }

function gearStats(gear){
  const t = emptyStats();
  if(!gear) return t;
  for(const slot in gear){
    const it = gear[slot];
    if(!it) continue;
    for(const k in it.stats) if(t[k] !== undefined) t[k] += it.stats[k];
  }
  return t;
}

function sellPrice(it){
  const base = 6 + it.ilvl * 2.2;
  return Math.ceil(base * (1 + RARITY_BY_ID[it.rarity].tier * 0.55));
}

window.ITEMS = {
  RARITY, RARITY_BY_ID, WEAPONS, WEAPON_BY_ID, SLOTS, SLOT_ORDER, STATS,
  makeItem, itemScore, statLabel, gearStats, emptyStats, sellPrice,
  resetUid: (n) => { NEXT_UID = n || 1; }
};

})();
