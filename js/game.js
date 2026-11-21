/* ============================================================
   ПЕПЕЛЬНЫЙ ПРИЗЫВ — ядро: бой, снаряжение, лут, рендер
   ============================================================ */
(function(){
'use strict';

const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
const clamp = (v,a,b) => v<a?a:(v>b?b:v);
const lerp  = (a,b,t) => a+(b-a)*t;
const rnd   = (a,b) => a + Math.random()*(b-a);
const pick  = a => a[(Math.random()*a.length)|0];
const easeOut = t => 1-(1-t)*(1-t);

function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const SUF = [[1e15,'Кв'],[1e12,'Т'],[1e9,'Б'],[1e6,'М'],[1e3,'К']];
function fmt(n){
  if(!isFinite(n)) return '∞';
  n = Math.floor(n);
  if(n < 1000) return String(n);
  for(let i=0;i<SUF.length;i++){
    const v = SUF[i][0], s = SUF[i][1];
    if(n >= v){
      const q = n/v;
      return (q >= 10 ? q.toFixed(0) : q.toFixed(1)).replace('.', ',') + s;
    }
  }
  return String(n);
}
function plural(n, one, few, many){
  const m10 = n % 10, m100 = n % 100;
  if(m10 === 1 && m100 !== 11) return one;
  if(m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

/* ===================== баланс ===================== */
const BAL = {
  hp0: 24, hpG: 1.15,
  rew0: 4, rewG: 1.17,
  bossHp: 7, bossRew: 14,
  zoneLen: 10,
  baseClick: 2,
  bladePerLvl: 1.04,
  critBase: 0.05, critPer: 0.02, critMax: 0.55,
  critMultBase: 2, critMultPer: 0.5,
  greedPer: 0.12,
  sealPer: 0.20,
  comboMax: 20, comboStep: 0.15,
  ritualNeed: 250000,
  dropChance: 0.2,
  bagMax: 24,
  heroHp: 100,
  enemyHitMob: 0.10,
  enemyHitBoss: 0.16
};

const SAVE_KEY = 'ashen-summon-v4';
const VW = 256, VH = 144, FLOOR = 116, HERO_X = 52, ENEMY_X = 178;

const MOB_NAME = {
  imp: 'ПЕПЕЛЬНЫЙ БЕС',
  skeleton: 'КОСТЯНОЙ СТРАЖ',
  wraith: 'ГОЛОДНАЯ ТЕНЬ',
  golem: 'МОГИЛЬНЫЙ ГОЛЕМ'
};

const ZONES = [
  { name:'СКЛЕП ЗАБЫТЫХ', mobs:['imp','skeleton'], bossName:'КОСТЯНОЙ КОРОЛЬ',
    wall0:'#171226', wall1:'#0d0a15', brick:'#221a33', brickHi:'#2b2140', mortar:'#090711',
    floor0:'#151020', floor1:'#0f0b17', glow:'#7a4bd6' },
  { name:'КОСТЯНЫЕ КАТАКОМБЫ', mobs:['skeleton','wraith'], bossName:'ПОЖИРАТЕЛЬ ДУШ',
    wall0:'#141a24', wall1:'#0a0e15', brick:'#1d2533', brickHi:'#273244', mortar:'#080b10',
    floor0:'#12161e', floor1:'#0c0f15', glow:'#46d6bd' },
  { name:'ПЕПЕЛЬНЫЙ АЛТАРЬ', mobs:['wraith','golem'], bossName:'ВЛАДЫКА ПЕПЛА',
    wall0:'#1e141d', wall1:'#110a11', brick:'#2a1a26', brickHi:'#38232f', mortar:'#0b0609',
    floor0:'#191019', floor1:'#110a11', glow:'#ff7a3c' },
  { name:'БЕЗДНА', mobs:['golem','imp'], bossName:'ХОЗЯИН БЕЗДНЫ',
    wall0:'#120c1c', wall1:'#08050e', brick:'#1b1229', brickHi:'#261936', mortar:'#050309',
    floor0:'#0f0a16', floor1:'#090510', glow:'#9d6bff' }
];

const BOSS_PAL = [
  { W:'#d3c9ae', H:'#7d2029', E:'#ffcf4a', k:'#241016' },
  { W:'#b8b2c8', H:'#4a2a70', E:'#c08bff', k:'#1b1430' },
  { W:'#d9bb9c', H:'#8a3316', E:'#ff9a3c', k:'#2a1209' },
  { W:'#ada6c2', H:'#2a1a45', E:'#9d6bff', k:'#160f2a' }
];

const UNITS = [
  { id:'hound',    name:'ГНИЛОЙ ПЁС',      desc:'Грызёт кости у трона',  dps:1,     base:25,     growth:1.14, icon:'claw'  },
  { id:'archer',   name:'КОСТЯНОЙ ЛУЧНИК', desc:'Стреляет в темноту',    dps:7,     base:180,    growth:1.14, icon:'arrow' },
  { id:'priest',   name:'ТЁМНЫЙ ЖРЕЦ',     desc:'Шепчет мёртвым',        dps:45,    base:1400,   growth:1.14, icon:'rune'  },
  { id:'devourer', name:'ПОЖИРАТЕЛЬ ДУШ',  desc:'Ест всё, что светится', dps:280,   base:11000,  growth:1.14, icon:'skull' },
  { id:'lich',     name:'ДРЕВНИЙ ЛИЧ',     desc:'Поднимает легионы',     dps:1800,  base:90000,  growth:1.14, icon:'flame' },
  { id:'abyss',    name:'ДИТЯ БЕЗДНЫ',     desc:'Смотрит из-под пола',   dps:12000, base:800000, growth:1.14, icon:'eye'   }
];

const UPGRADES = [
  { id:'blade', name:'КЛИНОК СТРАЖА',  desc:'+1 и ×1,04 к урону клика', base:16,  growth:1.13, icon:'sword', max:9999 },
  { id:'crit',  name:'ХОЛОДНЫЙ РАСЧЁТ',desc:'+2% к шансу крита',       base:55,  growth:1.30, icon:'eye',   max:20 },
  { id:'cruel', name:'ЖЕСТОКОСТЬ',     desc:'+0,5× к урону крита',     base:170, growth:1.32, icon:'skull', max:40 },
  { id:'greed', name:'ГОЛОД',          desc:'+12% душ с врага',        base:420, growth:1.55, icon:'coin',  max:40 }
];

/* ===================== состояние ===================== */
function freshState(){
  return {
    souls:0, total:0, kills:0, wave:1, best:1,
    up:{ blade:0, crit:0, cruel:0, greed:0 },
    units:{ hound:0, archer:0, priest:0, devourer:0, lich:0, abyss:0 },
    gear:{ weapon:null, armor:null, amulet:null, ring1:null, ring2:null },
    bag:[],
    hp:100,
    seals:0, sound:true, started:false, ts:Date.now()
  };
}
let S = freshState();
let gearCache = null;
const G = () => { if(!gearCache) gearCache = ITEMS.gearStats(S.gear); return gearCache; };
const invalidateGear = () => { gearCache = null; };

/* ===================== формулы ===================== */
const sealBonus = () => 1 + S.seals * BAL.sealPer;
const soulMult  = () => (1 + S.up.greed * BAL.greedPer + G().souls/100) * sealBonus();
const bladeMul  = () => Math.pow(BAL.bladePerLvl, S.up.blade);
const clickDmg  = () => (BAL.baseClick + S.up.blade) * bladeMul() * sealBonus() * (1 + G().dmg/100) * weaponMult();
const comboMul  = () => 1 + Math.min(combo, BAL.comboMax) * BAL.comboStep;
const critChance= () => clamp(BAL.critBase + S.up.crit*BAL.critPer + G().crit/100, 0, 0.85);
const critMult  = () => BAL.critMultBase + S.up.cruel*BAL.critMultPer + G().cdmg/100;
const maxHp     = () => Math.round(BAL.heroHp + G().hp);
const armorRed  = () => clamp(G().arm/100, 0, 0.7);
const buffMul   = () => (buff > 0 ? 2 : 1);

function equippedWeapon(){
  const it = S.gear.weapon;
  return it ? ITEMS.WEAPON_BY_ID[it.weapon] : null;
}
function weaponMult(){
  const w = equippedWeapon();
  return w ? w.dmg : 1;
}
function dpsRaw(){
  let d = 0;
  for(let i=0;i<UNITS.length;i++) d += S.units[UNITS[i].id] * UNITS[i].dps;
  return d;
}
const dpsValue = () => dpsRaw() * sealBonus() * (1 + G().dps/100);

function waveInfo(wave){
  const boss = wave % BAL.zoneLen === 0;
  const zi = Math.floor((wave-1)/BAL.zoneLen) % ZONES.length;
  const hp = Math.ceil(BAL.hp0 * Math.pow(BAL.hpG, wave-1) * (boss ? BAL.bossHp : 1));
  const rew = Math.ceil(BAL.rew0 * Math.pow(BAL.rewG, wave-1) * (boss ? BAL.bossRew : 1));
  return { boss, zi, zone:ZONES[zi], hp, rew };
}
const unitCost = u => Math.ceil(u.base * Math.pow(u.growth, S.units[u.id]));
const upCost = u => Math.ceil(u.base * Math.pow(u.growth, S.up[u.id]));
const ritualGain = () => Math.floor(Math.sqrt(S.total / BAL.ritualNeed));

/* ===================== звук ===================== */
const SFX = {
  ctx:null, master:null, on:true,
  init(){
    if(this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    try{
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.26;
      this.master.connect(this.ctx.destination);
    }catch(e){ this.ctx = null; }
  },
  ok(){ return this.ctx && this.on && this.ctx.state !== 'suspended'; },
  resume(){ if(this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  tone(f, dur, type, vol, f2){
    if(!this.ok()) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t);
    if(f2) o.frequency.exponentialRampToValueAtTime(Math.max(20,f2), t+dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol || 0.15, t+0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t+dur+0.03);
  },
  noise(dur, vol, freq, q){
    if(!this.ok()) return;
    const c = this.ctx, t = c.currentTime;
    const len = Math.max(1, Math.floor(c.sampleRate*dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i] = (Math.random()*2-1) * (1 - i/len);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type='bandpass';
    f.frequency.value = freq || 800; f.Q.value = q || 1.2;
    const g = c.createGain();
    g.gain.setValueAtTime(vol || 0.16, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  },
  hit(crit){ this.noise(crit?0.11:0.07, crit?0.22:0.12, crit?1500:700); this.tone(crit?150:110, crit?0.12:0.07, 'sine', crit?0.16:0.09, 50); },
  kill(){ this.noise(0.28, 0.16, 400, 0.8); this.tone(240, 0.3, 'sawtooth', 0.06, 48); },
  buy(){ this.tone(620, 0.06, 'square', 0.07); setTimeout(()=>this.tone(880, 0.08, 'square', 0.06), 55); },
  deny(){ this.tone(120, 0.1, 'square', 0.06, 80); },
  boss(){ this.tone(64, 1.1, 'sawtooth', 0.15, 38); this.noise(0.8, 0.12, 220, 0.6); },
  drop(){ this.tone(700, 0.09, 'triangle', 0.09); setTimeout(()=>this.tone(1050, 0.12, 'triangle', 0.08), 70); },
  hurt(){ this.noise(0.16, 0.16, 300, 0.7); this.tone(90, 0.18, 'sawtooth', 0.1, 45); },
  skill(){ this.tone(300, 0.22, 'sawtooth', 0.1, 900); this.noise(0.2, 0.12, 2200, 1.6); },
  ritual(){ [110,146,220,293].forEach((f,i)=>setTimeout(()=>this.tone(f,0.5,'sine',0.1), i*140)); }
};

/* ===================== спрайты ===================== */
const SPR = {};
function buildSprites(){
  ['hero','imp','skeleton','wraith','golem'].forEach(k => { SPR[k] = makeSprite(ART[k]); });
  for(let i=0;i<BOSS_PAL.length;i++) SPR['boss'+i] = makeSprite(ART.bossHalf, BOSS_PAL[i]);
}

/* ===================== фон ===================== */
let backdrop = null;
function buildBackdrop(zi){
  const z = ZONES[zi];
  const c = document.createElement('canvas');
  c.width = VW; c.height = VH;
  const g = c.getContext('2d');
  const rr = mulberry32(7331 + zi*131);

  // стена
  const grad = g.createLinearGradient(0, 0, 0, FLOOR);
  grad.addColorStop(0, z.wall0);
  grad.addColorStop(1, z.wall1);
  g.fillStyle = grad;
  g.fillRect(0, 0, VW, FLOOR);

  // кладка
  const bw = 22, bh = 9;
  for(let y = -2; y < FLOOR; y += bh){
    const off = (Math.floor(y/bh) % 2) ? 11 : 0;
    for(let x = -bw; x < VW + bw; x += bw){
      const px = x + off;
      const v = rr();
      g.fillStyle = v > 0.78 ? z.brickHi : (v < 0.3 ? z.mortar : z.brick);
      g.fillRect(px, y, bw-1, bh-1);
      if(v > 0.72){
        g.fillStyle = 'rgba(255,255,255,0.03)';
        g.fillRect(px, y, bw-1, 1);
      }
      g.fillStyle = 'rgba(0,0,0,0.30)';
      g.fillRect(px, y+bh-1, bw, 1);
      g.fillStyle = 'rgba(0,0,0,0.22)';
      g.fillRect(px+bw-1, y, 1, bh);
    }
  }

  // подтёки и трещины
  for(let i=0;i<14;i++){
    const x = Math.floor(rr()*VW), y = Math.floor(rr()*FLOOR*0.8);
    const h = 6 + Math.floor(rr()*26);
    g.fillStyle = 'rgba(0,0,0,0.16)';
    g.fillRect(x, y, 1, h);
  }
  for(let i=0;i<6;i++){
    let x = Math.floor(rr()*VW), y = 10 + Math.floor(rr()*(FLOOR-30));
    g.fillStyle = 'rgba(0,0,0,0.28)';
    for(let s=0;s<7;s++){
      g.fillRect(x, y, 1, 2);
      y += 2 + (rr()<0.4?1:0);
      x += (rr()<0.5?-1:1);
    }
  }

  // арки в глубине
  for(const ax of [78, 186]){
    g.fillStyle = 'rgba(2,1,5,0.62)';
    g.beginPath();
    g.moveTo(ax-26, FLOOR);
    g.lineTo(ax-26, 54);
    g.arc(ax, 54, 26, Math.PI, 0);
    g.lineTo(ax+26, FLOOR);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.05)';
    g.lineWidth = 1;
    g.stroke();
    const ag = g.createRadialGradient(ax, 84, 2, ax, 84, 40);
    ag.addColorStop(0, hexA(z.glow, 0.18));
    ag.addColorStop(1, hexA(z.glow, 0));
    g.fillStyle = ag;
    g.fillRect(ax-40, 40, 80, 80);
  }

  // колонны
  for(const cx of [0, 238]){
    g.fillStyle = '#221c30';
    g.fillRect(cx, 8, 18, FLOOR-8);
    g.fillStyle = '#2c243d';
    g.fillRect(cx+2, 8, 13, FLOOR-8);
    g.fillStyle = 'rgba(255,255,255,0.05)';
    g.fillRect(cx+3, 8, 2, FLOOR-8);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(cx+15, 8, 3, FLOOR-8);
    for(let y=16;y<FLOOR;y+=13){ g.fillStyle='rgba(0,0,0,0.3)'; g.fillRect(cx+2, y, 13, 1); }
    g.fillStyle = '#332a45';
    g.fillRect(cx-1, 4, 20, 6);
    g.fillRect(cx-1, FLOOR-6, 20, 6);
  }

  // цепи
  for(const cx of [108, 152, 206]){
    const len = 20 + Math.floor(rr()*18);
    for(let y=0;y<len;y+=2){
      g.fillStyle = ((y/2)|0) % 2 ? '#3b3448' : '#4a4159';
      g.fillRect(cx, y, 2, 1);
    }
    g.fillStyle = '#4a4159';
    g.fillRect(cx-1, len, 4, 2);
  }

  // знамёна
  for(const bx of [30, 226]){
    g.fillStyle = '#2a1420';
    g.fillRect(bx, 6, 18, 46);
    g.fillStyle = '#3d1a28';
    for(let i=0;i<4;i++) g.fillRect(bx+1, 7+i*11, 16, 8);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(bx+17, 6, 2, 46);
    g.fillStyle = '#57324a';
    g.fillRect(bx+7, 26, 5, 8);
  }

  // факельные кронштейны
  for(const tx of [34, 222]){
    g.fillStyle = '#2b2433';
    g.fillRect(tx-1, 56, 4, 10);
    g.fillStyle = '#3a3049';
    g.fillRect(tx-3, 53, 8, 4);
  }

  // свечи у алтаря
  for(const cx of [96, 158, 120, 136]){
    const ch = 4 + Math.floor(rr()*5);
    g.fillStyle = '#d8cfae';
    g.fillRect(cx, FLOOR-6-ch, 3, ch);
    g.fillStyle = '#8f8667';
    g.fillRect(cx, FLOOR-6-ch, 3, 1);
  }

  // пол
  const fg = g.createLinearGradient(0, FLOOR, 0, VH);
  fg.addColorStop(0, z.floor0);
  fg.addColorStop(1, z.floor1);
  g.fillStyle = fg;
  g.fillRect(0, FLOOR, VW, VH-FLOOR);
  for(let y=FLOOR; y<VH; y+=7){
    const off = (((y-FLOOR)/7)|0) % 2 ? 13 : 0;
    for(let x=-26; x<VW+26; x+=26){
      const v = rr();
      g.fillStyle = v > 0.8 ? z.floor1 : (v < 0.25 ? '#07050b' : z.floor0);
      g.fillRect(x+off, y, 25, 6);
    }
  }
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, FLOOR, VW, 1);
  g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(0, FLOOR+1, VW, 1);

  // кости на полу
  for(let i=0;i<10;i++){
    const x = Math.floor(rr()*VW), y = FLOOR + 4 + Math.floor(rr()*(VH-FLOOR-6));
    g.fillStyle = 'rgba(200,192,168,0.13)';
    g.fillRect(x, y, 4, 1);
    if(rr() > 0.5) g.fillRect(x+4, y-1, 1, 1);
  }

  // передний план: обломки внизу
  g.fillStyle = '#050409';
  for(let x=0;x<VW;x+=6){
    const h = 2 + Math.floor(rr()*4);
    g.fillRect(x, VH-h, 6, h);
  }

  backdrop = c;
}

function hexA(hex, a){
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + ((n>>16)&255) + ',' + ((n>>8)&255) + ',' + (n&255) + ',' + a + ')';
}

/* ===================== объекты ===================== */
let enemy = null;
let particles = [], numbers = [], decals = [], dust = [], lootTexts = [];
let hero = { x:HERO_X, swing:0, swingLen:0.2, lunge:0, atk:null };
let T = 0, shakeAmp = 0, flashWhite = 0, flashRed = 0, buff = 0, stun = 0;
let combo = 0, comboTimer = 0, spawnTimer = 0, hitStop = 0;
const cd = { q:0, e:0 };
const CD_MAX = { q:18, e:45 };
let hpFill, hpText, enemyName, bossTag, waveBadge, zoneName, buffBadge, comboBadge, heroHpEl;

/* ===================== шрифт ===================== */
const GLYPH = {
  '0':['111','101','101','101','111'], '1':['010','110','010','010','111'],
  '2':['111','001','111','100','111'], '3':['111','001','111','001','111'],
  '4':['101','101','111','001','001'], '5':['111','100','111','001','111'],
  '6':['111','100','111','101','111'], '7':['111','001','010','010','010'],
  '8':['111','101','111','101','111'], '9':['111','101','111','001','111'],
  '+':['000','010','111','010','000'], '-':['000','000','111','000','000'],
  ',':['000','000','000','010','010'], '.':['000','000','000','000','010'],
  'x':['000','101','010','101','000'], '!':['010','010','010','000','010'],
  'К':['101','110','100','110','101'], 'М':['101','111','111','101','101'],
  'Б':['111','100','110','101','110'], 'Т':['111','010','010','010','010'],
  ' ':['000','000','000','000','000']
};
function drawText(c, text, x, y, color, scale, shadow){
  scale = scale || 1;
  let cx = x;
  for(let i=0;i<text.length;i++){
    const gl = GLYPH[text[i]] || GLYPH[' '];
    for(let ry=0;ry<5;ry++) for(let rx=0;rx<3;rx++){
      if(gl[ry][rx] !== '1') continue;
      if(shadow){
        c.fillStyle = 'rgba(0,0,0,0.8)';
        c.fillRect(cx+rx*scale+1, y+ry*scale+1, scale, scale);
      }
      c.fillStyle = color;
      c.fillRect(cx+rx*scale, y+ry*scale, scale, scale);
    }
    cx += 4*scale;
  }
}
const textW = (t,s) => t.length*4*(s||1) - (s||1);

/* ===================== бой ===================== */
function spawnEnemy(){
  const info = waveInfo(S.wave);
  const key = info.boss ? ('boss' + (info.zi % BOSS_PAL.length)) : pick(info.zone.mobs);
  const spr = SPR[key];
  enemy = {
    key, spr,
    name: info.boss ? info.zone.bossName : MOB_NAME[key],
    hp: info.hp, maxHp: info.hp, boss: info.boss,
    x: info.boss ? 176 : ENEMY_X,
    reward: info.rew,
    seed: Math.random()*6.28,
    born: 0, flash: 0, knock: 0, dying: 0,
    atkTimer: info.boss ? rnd(3.2, 4.6) : rnd(4.5, 7),
    atkWind: 0, pending: false
  };
  if(info.boss){ SFX.boss(); shakeAmp = 4; toast('БОСС · ' + enemy.name); }
  updatePlate();
}

function updatePlate(){
  if(!enemy) return;
  const hp = Math.max(0, Math.ceil(enemy.hp));
  enemyName.textContent = enemy.name;
  bossTag.classList.toggle('hidden', !enemy.boss);
  hpFill.style.width = clamp(enemy.hp/enemy.maxHp,0,1)*100 + '%';
  hpText.textContent = fmt(hp) + ' / ' + fmt(enemy.maxHp);
  const toBoss = (BAL.zoneLen - (S.wave % BAL.zoneLen)) % BAL.zoneLen;
  waveBadge.textContent = 'ВОЛНА ' + S.wave + (enemy.boss ? ' · БОСС' : ' · ДО БОССА ' + toBoss);
  zoneName.textContent = ZONES[Math.floor((S.wave-1)/BAL.zoneLen) % ZONES.length].name;
}

function addNumber(text, x, y, kind){
  numbers.push({
    text, x, y, kind,
    vy: kind === 'crit' ? -34 : (kind === 'hero' ? -22 : -26),
    life: kind === 'crit' ? 1.1 : 0.9,
    max: kind === 'crit' ? 1.1 : 0.9,
    vx: rnd(-10,10)
  });
}

function sparks(x, y, n, cols, spd, grav){
  for(let i=0;i<n;i++){
    const a = rnd(0, Math.PI*2), s = rnd(spd*0.3, spd);
    particles.push({
      x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s - 30,
      life:rnd(0.25,0.65), max:0.65,
      col:pick(cols), size: Math.random()<0.35 ? 2 : 1,
      g: grav === undefined ? 130 : grav
    });
  }
}

function bloodSplat(x, y, n){
  for(let i=0;i<n;i++){
    particles.push({
      x, y, vx:rnd(-40,40), vy:rnd(-60,-10),
      life:rnd(0.3,0.7), max:0.7, col:pick(['#8e1f2a','#5c1018','#c9323a']),
      size:1, g:260
    });
  }
}

function soulBurst(x, y){
  for(let i=0;i<18;i++){
    const a = rnd(-Math.PI, 0), s = rnd(14, 54);
    particles.push({
      x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s,
      life:rnd(0.5,1.15), max:1.15,
      col:pick(['#c9a6ff','#8f62c4','#54dcc4','#f0e2ff']),
      size:1, g:-24
    });
  }
  for(let i=0;i<4;i++){
    particles.push({
      x:x+rnd(-8,8), y:y+rnd(-10,4), vx:0, vy:rnd(-40,-18),
      life:rnd(0.8,1.3), max:1.3, col:'#b98cf0', size:2, g:-8, orb:true
    });
  }
}

function hitEnemy(dmg, isCrit, opts){
  if(!enemy || enemy.dying > 0) return;
  opts = opts || {};
  enemy.hp -= dmg;
  enemy.flash = 0.1;
  enemy.knock = isCrit ? 7 : 4;
  const hx = enemy.x + rnd(-7,7), hy = FLOOR - enemy.spr.h*0.55 + rnd(-8,8);
  sparks(hx, hy, isCrit ? 14 : 6, ['#ffe6a8','#ffb347','#ffffff'], isCrit ? 90 : 55);
  if(Math.random() < 0.55) bloodSplat(hx, hy, isCrit ? 6 : 3);
  addNumber(fmt(dmg), enemy.x + rnd(-10,10), FLOOR - enemy.spr.h - 4, isCrit ? 'crit' : 'hit');
  if(isCrit){
    shakeAmp = Math.max(shakeAmp, 4);
    flashWhite = Math.max(flashWhite, 0.12);
    hitStop = Math.max(hitStop, 0.035);
    particles.push({ x:enemy.x, y:hy, vx:0, vy:0, life:0.3, max:0.3, col:'#ffd35c', size:1, ring:true, r0:4, r1:26 });
  } else {
    shakeAmp = Math.max(shakeAmp, 1.6);
  }
  if(opts.skill) shakeAmp = Math.max(shakeAmp, 5);
  SFX.hit(isCrit);
  if(enemy.hp <= 0) killEnemy();
}

function killEnemy(){
  if(!enemy || enemy.dying > 0) return;
  enemy.dying = 0.45;
  const gain = Math.ceil(enemy.reward * soulMult());
  S.souls += gain;
  S.total += gain;
  const wave = S.wave;
  S.kills++;
  S.wave++;
  if(S.wave > S.best) S.best = S.wave;

  soulBurst(enemy.x, FLOOR - 22);
  addNumber('+' + fmt(gain), enemy.x + 6, FLOOR - enemy.spr.h - 12, 'soul');
  for(let i=0;i<5;i++){
    decals.push({ x: enemy.x + rnd(-18,18), y: FLOOR + rnd(2,12), r: rnd(3,8), life: rnd(8,14), max: 14 });
  }
  shakeAmp = Math.max(shakeAmp, 2.6);
  SFX.kill();
  maybeDrop();
  if(wave % BAL.zoneLen === 0) toast('ЗОНА: ' + ZONES[Math.floor((S.wave-1)/BAL.zoneLen) % ZONES.length].name);
  refreshUI();
  updatePlate();
  saveSoon();
}

/* ---------- лут ---------- */
function maybeDrop(){
  if(!enemy) return;
  const chance = enemy.boss ? 1 : BAL.dropChance;
  if(Math.random() > chance) return;
  const count = enemy.boss ? (Math.random() < 0.5 ? 3 : 2) : 1;
  for(let i=0;i<count;i++){
    const it = ITEMS.makeItem(S.wave, { boss: enemy.boss });
    receiveItem(it);
  }
}
function receiveItem(it){
  if(S.bag.length >= BAL.bagMax){
    const price = ITEMS.sellPrice(it);
    S.souls += price;
    S.total += price;
    toast('СУМКА ПОЛНА · ПРОДАНО ЗА ' + fmt(price));
    return;
  }
  S.bag.push(it);
  const rar = ITEMS.RARITY_BY_ID[it.rarity];
  lootTexts.push({ x: enemy ? enemy.x : VW/2, y: FLOOR - 46, life: 0.9, max: 0.9, col: rar.color });
  sparks(enemy ? enemy.x : VW/2, FLOOR - 26, 12, [rar.color, '#ffffff'], 70);
  SFX.drop();
  toast('ВЫПАЛО: ' + it.name.toUpperCase());
  refreshBag();
  const dot = $('#bag-dot');
  if(dot) dot.classList.remove('hidden');
}

/* ---------- герой: удар ---------- */
function attack(){
  if(!S.started || !enemy || enemy.dying > 0 || stun > 0) return;
  SFX.resume();
  const w = equippedWeapon();
  const kind = w ? w.atk : 'slash';
  combo = Math.min(combo + 1, BAL.comboMax);
  comboTimer = 1.4;

  let base = clickDmg() * comboMul() * buffMul();
  if(w && kind === 'bolt') base += dpsValue() * 0.15;
  if(w && w.bossDmg && enemy.boss) base *= (1 + w.bossDmg);

  const hits = w && w.hits > 1 ? w.hits : 1;
  let critDone = false;
  for(let i=0;i<hits;i++){
    const isCrit = Math.random() < critChance();
    if(isCrit) critDone = true;
    hitEnemy((base/hits) * (isCrit ? critMult() : 1), isCrit, {});
  }

  hero.swing = kind === 'smash' ? 0.3 : (kind === 'cleave' ? 0.28 : 0.2);
  hero.swingLen = hero.swing;
  hero.lunge = 0.16;
  hero.atk = kind;
  if(kind === 'bolt'){
    particles.push({ x:HERO_X+16, y:FLOOR-30, vx:0, vy:0, life:0.22, max:0.22, col:'#a274e0', size:2, beam:enemy.x });
  }
  if(critDone && window.navigator && window.navigator.vibrate && !window.__tgHaptic) window.navigator.vibrate(12);
  if(window.__tgHaptic) window.__tgHaptic('light');
}

/* ---------- герой: урон ---------- */
function heroHurt(dmg){
  if(stun > 0) return;
  S.hp -= dmg;
  flashRed = Math.max(flashRed, 0.35);
  shakeAmp = Math.max(shakeAmp, 3);
  addNumber('-' + fmt(dmg), HERO_X + rnd(-6,6), FLOOR - 46, 'hero');
  sparks(HERO_X, FLOOR - 26, 8, ['#ff5f6d','#ffb340','#8e1f2a'], 50);
  SFX.hurt();
  if(S.hp <= 0) heroDown();
  else saveSoon();
}
function heroDown(){
  const lost = Math.floor(S.souls * 0.08);
  S.souls -= lost;
  S.hp = maxHp() * 0.5;
  stun = 1.6;
  combo = 0;
  shakeAmp = 8;
  flashRed = 0.8;
  addNumber('!!!', HERO_X, FLOOR - 52, 'hero');
  toast('ТЬМА ЗАБРАЛА ' + fmt(lost) + ' ' + plural(lost, 'ДУШУ', 'ДУШИ', 'ДУШ'));
  SFX.hurt();
  refreshUI();
}

/* ===================== силы ===================== */
function useSkill(k){
  if(!S.started || cd[k] > 0 || stun > 0) return;
  if(k === 'q'){
    if(!enemy || enemy.dying > 0) return;
    const dmg = (clickDmg() * 20 + dpsValue() * 8) * buffMul();
    hitEnemy(dmg, true, { skill:true });
    hero.swing = 0.3; hero.swingLen = 0.3; hero.lunge = 0.2; hero.atk = 'smash';
    flashWhite = Math.max(flashWhite, 0.2);
    addNumber('x20', VW/2 - 12, 44, 'skill');
    SFX.skill();
  } else {
    buff = 12;
    SFX.skill();
    toast('КРИК ДУШ · СИЛА УДВОЕНА');
  }
  cd[k] = CD_MAX[k];
  refreshSkills();
}

/* ===================== покупки ===================== */
function buyUpgrade(def){
  if(S.up[def.id] >= def.max){ SFX.deny(); return false; }
  const c = upCost(def);
  if(S.souls < c){ SFX.deny(); return false; }
  S.souls -= c;
  S.up[def.id]++;
  SFX.buy();
  refreshUI(); saveSoon();
  return true;
}
function buyUnit(u){
  const c = unitCost(u);
  if(S.souls < c){ SFX.deny(); return false; }
  S.souls -= c;
  S.units[u.id]++;
  SFX.buy();
  refreshUI(); saveSoon();
  return true;
}

/* ===================== снаряжение ===================== */
let selectedUid = null;

function equipItem(uid){
  const idx = S.bag.findIndex(i => i.uid === uid);
  if(idx < 0) return false;
  const it = S.bag[idx];
  const slot = it.slot;
  const old = S.gear[slot];
  S.bag.splice(idx, 1);
  S.gear[slot] = it;
  if(old) S.bag.push(old);
  invalidateGear();
  selectedUid = null;
  SFX.buy();
  refreshUI(); refreshBag();
  saveSoon();
  return true;
}
function unequip(slot){
  const it = S.gear[slot];
  if(!it) return false;
  if(S.bag.length >= BAL.bagMax){ toast('СУМКА ПОЛНА'); SFX.deny(); return false; }
  S.gear[slot] = null;
  S.bag.push(it);
  invalidateGear();
  selectedUid = null;
  refreshUI(); refreshBag();
  saveSoon();
  return true;
}
function sellItem(uid){
  const idx = S.bag.findIndex(i => i.uid === uid);
  if(idx < 0) return false;
  const price = ITEMS.sellPrice(S.bag[idx]);
  S.souls += price;
  S.total += price;
  S.bag.splice(idx, 1);
  if(selectedUid === uid) selectedUid = null;
  SFX.buy();
  refreshUI(); refreshBag();
  saveSoon();
  return true;
}
function sellJunk(){
  let sum = 0, n = 0;
  S.bag = S.bag.filter(it => {
    const t = ITEMS.RARITY_BY_ID[it.rarity].tier;
    if(t <= 1){ sum += ITEMS.sellPrice(it); n++; return false; }
    return true;
  });
  if(!n){ SFX.deny(); toast('НЕЧЕГО ПРОДАВАТЬ'); return; }
  S.souls += sum; S.total += sum;
  SFX.buy();
  toast('ПРОДАНО ' + n + ' ' + plural(n,'ВЕЩЬ','ВЕЩИ','ВЕЩЕЙ') + ' · +' + fmt(sum));
  refreshUI(); refreshBag(); saveSoon();
}

function betterThan(item){
  const cur = S.gear[item.slot];
  if(!cur) return true;
  return ITEMS.itemScore(item) > ITEMS.itemScore(cur);
}

/* ===================== ритуал ===================== */
function doRitual(){
  const gain = ritualGain();
  if(gain < 1){ SFX.deny(); return false; }
  S.seals += gain;
  S.total = 0; S.souls = 0; S.wave = 1; S.kills = 0;
  S.up = { blade:0, crit:0, cruel:0, greed:0 };
  S.units = { hound:0, archer:0, priest:0, devourer:0, lich:0, abyss:0 };
  S.gear = { weapon:null, armor:null, amulet:null, ring1:null, ring2:null };
  S.bag = [];
  S.hp = BAL.heroHp;
  buff = 0; cd.q = 0; cd.e = 0; stun = 0; combo = 0;
  invalidateGear();
  enemy = null; spawnTimer = 0.6;
  particles.length = 0; numbers.length = 0; decals.length = 0;
  SFX.ritual();
  spawnEnemy();
  refreshUI(); refreshBag();
  toast('РИТУАЛ СОВЕРШЁН · ПЕЧАТЕЙ: ' + S.seals);
  save();
  return true;
}

/* ===================== сохранение ===================== */
let saveTimer = 0;
let loadedFromDisk = false;
function saveSoon(){ saveTimer = 0.8; }
function save(){
  S.ts = Date.now();
  try{
    localStorage.setItem(SAVE_KEY, JSON.stringify(S));
    const d = $('#save-dot');
    if(d){ d.classList.add('saving'); setTimeout(()=>d.classList.remove('saving'), 450); }
  }catch(e){}
  if(window.ACCOUNT) window.ACCOUNT.pushDebounced();
}
function load(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return false;
    const o = JSON.parse(raw);
    const f = freshState();
    S = Object.assign(f, o);
    S.up = Object.assign(f.up, o.up || {});
    S.units = Object.assign(f.units, o.units || {});
    S.gear = Object.assign(f.gear, o.gear || {});
    if(!Array.isArray(S.bag)) S.bag = [];
    S.bag = S.bag.filter(it => it && it.slot && it.stats);
    // восстановить счётчик uid
    let mx = 0;
    const bump = it => { if(it && it.uid > mx) mx = it.uid; };
    S.bag.forEach(bump);
    Object.keys(S.gear).forEach(k => bump(S.gear[k]));
    ITEMS.resetUid(mx + 1);
    invalidateGear();
    S.hp = clamp(S.hp || maxHp(), 1, maxHp());
    loadedFromDisk = true;
    return true;
  }catch(e){ return false; }
}

/* ---------- сохранение из облака ---------- */
function applyRemoteSave(obj){
  if(!obj || typeof obj !== 'object' || typeof obj.wave !== 'number') return false;
  const f = freshState();
  const next = Object.assign(f, obj);
  next.up = Object.assign(f.up, obj.up || {});
  next.units = Object.assign(f.units, obj.units || {});
  next.gear = Object.assign(f.gear, obj.gear || {});
  if(!Array.isArray(next.bag)) next.bag = [];
  next.bag = next.bag.filter(it => it && it.slot && it.stats);

  let mx = 0;
  const bump = it => { if(it && it.uid > mx) mx = it.uid; };
  next.bag.forEach(bump);
  Object.keys(next.gear).forEach(k => bump(next.gear[k]));
  ITEMS.resetUid(mx + 1);

  S = next;
  invalidateGear();
  S.hp = clamp(S.hp || maxHp(), 1, maxHp());
  loadedFromDisk = true;
  enemy = null; spawnTimer = 0.25;
  particles.length = 0; numbers.length = 0; decals.length = 0;
  selectedUid = null;
  refreshUI(); refreshBag(); refreshSkills(); refreshHeroHp();
  spawnEnemy();
  toast('ПРОГРЕСС ЗАГРУЖЕН ИЗ ОБЛАКА');
  return true;
}

/* ===================== интерфейс ===================== */
let uiUp = {}, uiUnits = {};

function iconURL(name){
  const rows = ICONS[name];
  if(!rows) return '';
  const s = rowsToCanvas(rows, null, false);
  const c = document.createElement('canvas');
  c.width = s.w; c.height = s.h;
  c.getContext('2d').drawImage(s.canvas, 0, 0);
  return c.toDataURL();
}
function makeCursor(){
  try{
    const s = rowsToCanvas(ICONS.sword, null, false);
    const c = document.createElement('canvas');
    c.width = 32; c.height = 32;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(s.canvas, 8, 8, 16, 16);
    return c.toDataURL();
  }catch(e){ return null; }
}
const ICON_CACHE = {};
const icon = name => (ICON_CACHE[name] || (ICON_CACHE[name] = iconURL(name)));

function buildUI(){
  const soulIcon = icon('soul');
  const sealIcon = icon('seal');
  $('#ic-soul').innerHTML = '<img src="' + soulIcon + '" alt="">';
  $('#ic-sword').innerHTML = '<img src="' + icon('sword') + '" alt="">';
  $('#ic-dps').innerHTML = '<img src="' + icon('dps') + '" alt="">';
  $('#ic-seal').innerHTML = '<img src="' + sealIcon + '" alt="">';
  $('#ic-hp').innerHTML = '<img src="' + icon('armor') + '" alt="">';
  const introRune = $('#intro-rune');
  if(introRune) introRune.innerHTML = '<img src="' + icon('skull') + '" alt="">';

  // улучшения
  const p1 = $('#pane-up');
  p1.innerHTML = '';
  const t1 = document.createElement('div');
  t1.className = 'sec-title'; t1.textContent = 'КЛИНОК И КРОВЬ';
  p1.appendChild(t1);
  UPGRADES.forEach(u => {
    const b = document.createElement('button');
    b.className = 'item';
    b.innerHTML =
      '<span class="ic"><img src="' + icon(u.icon) + '" alt=""></span>' +
      '<span class="txt"><b>' + u.name + '</b><i>' + u.desc + '</i></span>' +
      '<span class="meta"><span class="lvl"></span><span class="cost"><img src="' + soulIcon + '" alt="">' +
      '<span class="c"></span></span></span>';
    b.addEventListener('click', () => buyUpgrade(u));
    p1.appendChild(b);
    uiUp[u.id] = { el:b, lvl:b.querySelector('.lvl'), cost:b.querySelector('.c') };
  });

  // слуги
  const p2 = $('#pane-units');
  p2.innerHTML = '';
  const t2 = document.createElement('div');
  t2.className = 'sec-title'; t2.textContent = 'ТВОИ СЛУГИ';
  p2.appendChild(t2);
  UNITS.forEach(u => {
    const b = document.createElement('button');
    b.className = 'item';
    b.innerHTML =
      '<span class="ic"><img src="' + icon(u.icon) + '" alt=""></span>' +
      '<span class="txt"><b>' + u.name + '</b><i class="d"></i></span>' +
      '<span class="meta"><span class="lvl"></span><span class="cost"><img src="' + soulIcon + '" alt="">' +
      '<span class="c"></span></span></span>';
    b.addEventListener('click', () => buyUnit(u));
    p2.appendChild(b);
    uiUnits[u.id] = { el:b, lvl:b.querySelector('.lvl'), cost:b.querySelector('.c'), desc:b.querySelector('.d') };
  });
  const dpsRow = document.createElement('div');
  dpsRow.className = 'unit-row';
  dpsRow.innerHTML = 'ВСЕГО УРОНА В СЕКУНДУ: <b>' + '<span id="units-dps">0</span>' + '</b>';
  p2.appendChild(dpsRow);

  // сумка
  const p3 = $('#pane-bag');
  p3.innerHTML =
    '<div class="gear-bar" id="gear-bar"></div>' +
    '<div class="bag-top"><span>СУМКА <b id="bag-count">0/24</b></span>' +
    '<button class="mini-btn" id="sell-junk">ПРОДАТЬ ХЛАМ</button></div>' +
    '<div class="bag-grid" id="bag-grid"></div>' +
    '<div class="item-card hidden" id="item-card"></div>';

  // ритуал
  const p4 = $('#pane-ritual');
  p4.innerHTML =
    '<div class="ritual">' +
      '<div class="ritual-rune"><img src="' + sealIcon + '" alt="" style="width:38px;height:38px;image-rendering:pixelated"></div>' +
      '<h3>РИТУАЛ БЕЗДНЫ</h3>' +
      '<p>Принеси в жертву всё, что собрал.<br>Бездна запомнит тебя — и оставит печать.</p>' +
      '<div class="gain">+<span id="ritual-gain">0</span> <span id="ritual-word">печатей</span></div>' +
      '<p>Каждая печать: <b style="color:#d9a53b">+20%</b> к урону и душам.<br>' +
      'У тебя печатей: <b style="color:#b98cf0" id="ritual-have">0</b></p>' +
      '<p id="ritual-need" style="color:#6f6580"></p>' +
      '<button class="big-btn wide" id="ritual-btn">СОВЕРШИТЬ РИТУАЛ</button>' +
    '</div>';

  $('#ritual-btn').addEventListener('click', () => {
    const g = ritualGain();
    if(g < 1){ SFX.deny(); toast('НУЖНО ' + fmt(BAL.ritualNeed) + ' ДУШ ВСЕГО'); return; }
    showModal('РИТУАЛ БЕЗДНЫ',
      'Ты потеряешь души, клинок, слуг и всё снаряжение из сумки. Бездна оставит тебе <b>' + g + '</b> ' +
      plural(g, 'печать', 'печати', 'печатей') + ' — навсегда. Продолжить?',
      'ПРИНЕСТИ ЖЕРТВУ', () => doRitual());
  });

  $('#sell-junk').addEventListener('click', sellJunk);

  $$('.tab').forEach(t => {
    t.addEventListener('click', () => {
      $$('.tab').forEach(x => x.classList.toggle('active', x === t));
      $$('.pane').forEach(p => p.classList.toggle('active', p.id === 'pane-' + t.dataset.tab));
      if(t.dataset.tab === 'bag'){
        const dot = $('#bag-dot');
        if(dot) dot.classList.add('hidden');
        refreshBag();
      }
    });
  });

  hpFill = $('#hp-fill');
  hpText = $('#hp-text');
  enemyName = $('#enemy-name');
  bossTag = $('#boss-tag');
  waveBadge = $('#wave-badge');
  zoneName = $('#zone-name');
  buffBadge = $('#buff-badge');
  comboBadge = $('#combo-badge');
  heroHpEl = $('#hero-hp');
}

function refreshUI(){
  UPGRADES.forEach(u => {
    const r = uiUp[u.id];
    if(!r) return;
    const lvl = S.up[u.id], c = upCost(u), maxed = lvl >= u.max;
    r.lvl.textContent = 'УР. ' + lvl;
    r.cost.textContent = maxed ? 'МАКС' : fmt(c);
    r.el.disabled = maxed || S.souls < c;
  });
  UNITS.forEach(u => {
    const r = uiUnits[u.id];
    if(!r) return;
    const n = S.units[u.id], c = unitCost(u);
    r.lvl.textContent = n > 0 ? '×' + n : '';
    r.cost.textContent = fmt(c);
    r.el.disabled = S.souls < c;
    r.desc.textContent = '+' + fmt(u.dps) + '/сек' + (n > 0 ? ' · всего ' + fmt(n*u.dps) : '');
  });
  const ud = $('#units-dps');
  if(ud) ud.textContent = fmt(dpsValue());
  $('#souls-val').textContent = fmt(S.souls);
  $('#click-val').textContent = fmt(clickDmg() * comboMul());
  $('#dps-val').textContent = fmt(dpsValue());
  $('#seals-val').textContent = S.seals;
  const hpv = $('#hp-val');
  if(hpv) hpv.textContent = Math.max(0, Math.ceil(S.hp)) + '/' + maxHp();
  refreshRitual();
  refreshSkills();
  refreshHeroHp();
}

function refreshHeroHp(){
  if(!heroHpEl) return;
  const p = clamp(S.hp / maxHp(), 0, 1);
  heroHpEl.style.width = (p*100) + '%';
  heroHpEl.classList.toggle('low', p < 0.35);
}

function refreshRitual(){
  const g = ritualGain();
  const gg = $('#ritual-gain'), hh = $('#ritual-have'), nn = $('#ritual-need'), btn = $('#ritual-btn'), ww = $('#ritual-word');
  if(!gg) return;
  gg.textContent = g;
  if(ww) ww.textContent = plural(g, 'печать', 'печати', 'печатей');
  hh.textContent = S.seals;
  if(g < 1){
    nn.textContent = 'НУЖНО ВСЕГО ДУШ: ' + fmt(BAL.ritualNeed) + ' · СЕЙЧАС: ' + fmt(S.total);
  } else nn.textContent = '';
  btn.disabled = g < 1;
}

function refreshSkills(){
  for(const k of ['q','e']){
    const el = $('#sk-' + k), fill = $('#cd-' + k);
    if(!el) continue;
    const p = cd[k] / CD_MAX[k];
    fill.style.height = (p*100) + '%';
    el.classList.toggle('cooling', cd[k] > 0);
  }
  if(buffBadge){
    buffBadge.classList.toggle('hidden', buff <= 0);
    if(buff > 0) buffBadge.innerHTML = 'КРИК ДУШ <b>' + buff.toFixed(1) + '</b>с';
  }
  if(comboBadge){
    const show = combo >= 2;
    comboBadge.classList.toggle('hidden', !show);
    if(show) comboBadge.innerHTML = '<b>×' + comboMul().toFixed(1).replace('.',',') + '</b> СЕРИЯ ' + combo;
  }
}

/* ---------- сумка ---------- */
function statRow(k, v, cmp){
  const st = ITEMS.STATS[k];
  if(!st) return '';
  let diff = '';
  if(cmp !== undefined && cmp !== null && Math.abs(cmp - v) > 0.05){
    diff = v > cmp
      ? '<em class="up">▲+' + ITEMS.statLabel(k, v-cmp) + '</em>'
      : '<em class="down">▼' + ITEMS.statLabel(k, v-cmp) + '</em>';
  }
  return '<div class="st"><span>' + st.name + '</span><b>+' + ITEMS.statLabel(k, v) + '</b>' + diff + '</div>';
}

function refreshBag(){
  const bar = $('#gear-bar');
  if(!bar) return;

  // слоты
  bar.innerHTML = '';
  ITEMS.SLOT_ORDER.forEach(slot => {
    const def = ITEMS.SLOTS[slot];
    const it = S.gear[slot];
    const el = document.createElement('button');
    el.className = 'gslot' + (it ? ' filled' : '');
    if(it){
      const rar = ITEMS.RARITY_BY_ID[it.rarity];
      el.style.borderColor = rar.color;
      el.style.boxShadow = 'inset 0 0 14px ' + hexA(rar.color, 0.22);
    }
    el.innerHTML = '<img src="' + icon(it ? def.icon : def.icon) + '" alt=""' + (it ? '' : ' class="dim"') + '>' +
      '<span class="gslot-name">' + def.name + '</span>' +
      (it ? '<span class="gslot-lvl">' + it.ilvl + '</span>' : '');
    el.addEventListener('click', () => {
      if(it){ selectedUid = null; showEquipped(slot); }
      else toast('СЛОТ ПУСТ');
    });
    bar.appendChild(el);
  });

  // сетка
  const grid = $('#bag-grid');
  grid.innerHTML = '';
  if(!S.bag.length){
    grid.innerHTML = '<div class="bag-empty">СУМКА ПУСТА.<br>УБИВАЙ ВРАГОВ — С НИХ ПАДАЕТ СНАРЯЖЕНИЕ.</div>';
  } else {
    const sorted = S.bag.slice().sort((a,b) => ITEMS.RARITY_BY_ID[b.rarity].tier - ITEMS.RARITY_BY_ID[a.rarity].tier || b.ilvl - a.ilvl);
    sorted.forEach(it => {
      const rar = ITEMS.RARITY_BY_ID[it.rarity];
      const el = document.createElement('button');
      el.className = 'bag-item';
      el.style.borderColor = rar.color;
      el.style.boxShadow = 'inset 0 0 10px ' + hexA(rar.color, 0.18);
      el.innerHTML = '<img src="' + icon(ITEMS.SLOTS[it.slot].icon) + '" alt="">' +
        (betterThan(it) ? '<i class="up-mark">▲</i>' : '') +
        '<span class="bi-lvl">' + it.ilvl + '</span>';
      el.addEventListener('click', () => selectBagItem(it.uid));
      grid.appendChild(el);
    });
  }
  const cnt = $('#bag-count');
  if(cnt) cnt.textContent = S.bag.length + '/' + BAL.bagMax;

  // карточка
  const card = $('#item-card');
  let sel = null;
  if(selectedUid !== null){
    sel = S.bag.find(i => i.uid === selectedUid) || null;
    if(!sel) selectedUid = null;
  }
  if(sel){
    card.innerHTML = itemCardHTML(sel, true);
    card.classList.remove('hidden');
    const eq = card.querySelector('#card-equip');
    const sl = card.querySelector('#card-sell');
    const cl = card.querySelector('#card-close');
    if(eq) eq.addEventListener('click', () => equipItem(sel.uid));
    if(sl) sl.addEventListener('click', () => sellItem(sel.uid));
    if(cl) cl.addEventListener('click', () => { selectedUid = null; refreshBag(); });
  } else {
    card.classList.add('hidden');
    card.innerHTML = '';
  }
}

function itemCardHTML(it, actions){
  const rar = ITEMS.RARITY_BY_ID[it.rarity];
  const cur = S.gear[it.slot];
  const isWeapon = it.slot === 'weapon';
  let html = '<div class="card-head" style="color:' + rar.color + '">' + it.name + '</div>';
  html += '<div class="card-sub">' + rar.name + ' · ' +
    ITEMS.SLOTS[it.slot].name + ' · УР. ' + it.ilvl + '</div>';
  if(isWeapon){
    const w = ITEMS.WEAPON_BY_ID[it.weapon];
    html += '<div class="card-weapon">' + w.noun.toUpperCase() + ' · ' + w.desc.toUpperCase() + '</div>';
  }
  const cmpStats = cur ? cur.stats : {};
  for(const k in it.stats) html += statRow(k, it.stats[k], cmpStats[k] !== undefined ? cmpStats[k] : null);
  if(cur){
    const d = ITEMS.itemScore(it) - ITEMS.itemScore(cur);
    html += '<div class="card-score ' + (d >= 0 ? 'up' : 'down') + '">' +
      (d >= 0 ? 'СИЛЬНЕЕ НА ' : 'СЛАБЕЕ НА ') + Math.abs(d).toFixed(1) + '</div>';
  }
  if(actions){
    html += '<div class="card-actions">' +
      '<button class="big-btn small" id="card-equip">НАДЕТЬ</button>' +
      '<button class="mini-btn" id="card-sell">ПРОДАТЬ ' + fmt(ITEMS.sellPrice(it)) + '</button>' +
      '<button class="mini-btn ghostbtn" id="card-close">×</button>' +
      '</div>';
  }
  return html;
}

function selectBagItem(uid){
  selectedUid = uid;
  refreshBag();
}
function showEquipped(slot){
  const it = S.gear[slot];
  if(!it) return;
  const card = $('#item-card');
  card.innerHTML = itemCardHTML(it, false) +
    '<div class="card-actions"><button class="mini-btn" id="card-off">СНЯТЬ</button></div>';
  card.classList.remove('hidden');
  const off = card.querySelector('#card-off');
  if(off) off.addEventListener('click', () => { unequip(slot); card.classList.add('hidden'); });
}

/* ---------- прочее ---------- */
let toastTimer = 0;
function toast(text){
  const t = $('#toast');
  if(!t) return;
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 2200);
}
let modalCb = null;
function showModal(title, text, okLabel, cb, cancelLabel){
  $('#modal-title').textContent = title;
  $('#modal-text').innerHTML = text;
  $('#modal-ok').textContent = okLabel || 'ДА';
  $('#modal-cancel').textContent = cancelLabel || 'ОТМЕНА';
  modalCb = cb || null;
  $('#modal').classList.remove('hidden');
}
function hideModal(){ $('#modal').classList.add('hidden'); }

/* ---------- профиль и облако ---------- */
function openProfile(){
  if(!window.ACCOUNT || !window.ACCOUNT.hasAccount()){
    toast('ПРОФИЛЬ ГОТОВИТСЯ…');
    if(window.ACCOUNT) window.ACCOUNT.init();
    return;
  }
  const info = window.ACCOUNT.info();
  const code = info.code || '';
  const html =
    '<div class="prof">' +
      '<div class="prof-row"><span>ИГРОК</span><b>' + (info.name || 'СТРАЖ') + '</b></div>' +
      '<div class="prof-row"><span>ВХОД</span><b>' + (info.tg ? 'TELEGRAM' : 'КОД ДОСТУПА') + '</b></div>' +
      (code
        ? '<div class="prof-code" id="prof-code">' + code + '</div>' +
          '<div class="prof-hint">Этот код открывает прогресс на другом устройстве.<br>Сохраните его.</div>'
        : '') +
      '<div class="prof-field">' +
        '<input id="claim-input" maxlength="9" inputmode="text" autocomplete="off" placeholder="XXXX-XXXX">' +
        '<button class="mini-btn" id="claim-btn">ВОЙТИ</button>' +
      '</div>' +
      '<div class="prof-msg" id="claim-msg"></div>' +
      '<div class="prof-hint">Прогресс уходит в облако автоматически и при закрытии игры.</div>' +
    '</div>';
  showModal('ПРОФИЛЬ', html, 'ЗАКРЫТЬ', null, '×');

  const btn = $('#claim-btn'), input = $('#claim-input'), msg = $('#claim-msg');
  if(btn && input){
    btn.addEventListener('click', () => {
      const value = input.value.trim();
      if(!value){ if(msg) msg.textContent = 'ВВЕДИТЕ КОД'; return; }
      if(msg) msg.textContent = 'ПРОВЕРЯЮ…';
      window.ACCOUNT.claim(value).then(r => {
        if(r.ok){
          if(msg) msg.textContent = 'ВОШЁЛ КАК ' + (r.player.name || 'СТРАЖ');
          toast('ПРОФИЛЬ ВОССТАНОВЛЕН');
          setTimeout(hideModal, 800);
        }else if(msg){
          msg.textContent = r.error || 'НЕ ПОЛУЧИЛОСЬ';
        }
      });
    });
    input.addEventListener('keydown', ev => { if(ev.key === 'Enter') btn.click(); });
  }
}

/* ===================== рендер ===================== */
let ctx = null, canvas = null;

function drawTorches(c){
  for(const t of [{x:34,y:56},{x:222,y:56}]){
    const fl = 0.75 + Math.sin(T*9 + t.x)*0.16 + Math.sin(T*17.7 + t.x*1.7)*0.1;
    const h = Math.max(3, Math.round(4 + fl*6));
    for(let i=0;i<h;i++){
      const w = Math.max(1, Math.round((h-i)*0.55));
      c.fillStyle = i < h*0.35 ? '#fff3c4' : (i < h*0.7 ? '#ffb347' : '#e0662a');
      c.fillRect(t.x - Math.floor(w/2), t.y - i, w, 1);
    }
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(t.x, t.y-4, 1, t.x, t.y-4, 46);
    g.addColorStop(0, 'rgba(255,150,60,0.20)');
    g.addColorStop(1, 'rgba(255,120,30,0)');
    c.fillStyle = g;
    c.fillRect(t.x-46, t.y-50, 92, 92);
    c.globalCompositeOperation = 'source-over';
  }
  for(const cx of [96, 158, 120, 136]){
    const fl = 0.6 + Math.sin(T*11 + cx)*0.3;
    c.fillStyle = '#ffd9a0';
    c.fillRect(cx+1, FLOOR-7-Math.round(fl*3), 1, 2);
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(cx+1, FLOOR-8, 1, cx+1, FLOOR-8, 14);
    g.addColorStop(0, 'rgba(255,190,110,0.22)');
    g.addColorStop(1, 'rgba(255,150,60,0)');
    c.fillStyle = g;
    c.fillRect(cx-13, FLOOR-21, 28, 24);
    c.globalCompositeOperation = 'source-over';
  }
}

function drawAltarGlow(c){
  const zi = Math.floor((S.wave-1)/BAL.zoneLen) % ZONES.length;
  const glow = ZONES[zi].glow;
  const pulse = 0.16 + Math.sin(T*1.3)*0.05;
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(186, 78, 4, 186, 78, 62);
  g.addColorStop(0, hexA(glow, pulse));
  g.addColorStop(1, hexA(glow, 0));
  c.fillStyle = g;
  c.fillRect(124, 16, 124, 124);
  c.globalCompositeOperation = 'source-over';
}

function drawFog(c){
  for(let i=0;i<3;i++){
    const y = 86 + i*22;
    const off = Math.sin(T*0.25 + i*1.7) * 26;
    const g = c.createLinearGradient(0, y, 0, y+22);
    g.addColorStop(0, 'rgba(150,140,190,0)');
    g.addColorStop(0.5, 'rgba(150,140,190,' + (0.045 - i*0.008) + ')');
    g.addColorStop(1, 'rgba(150,140,190,0)');
    c.fillStyle = g;
    c.fillRect(off-40, y, VW+80, 22);
  }
}

function drawDust(c){
  for(const d of dust){
    const a = d.a * (0.5 + 0.5*Math.sin(T*1.6 + d.ph));
    c.fillStyle = 'rgba(215,205,235,' + a.toFixed(3) + ')';
    c.fillRect(d.x, d.y, 1, 1);
  }
}

function drawDecals(c){
  for(let i=decals.length-1;i>=0;i--){
    const d = decals[i];
    const a = clamp(d.life / d.max, 0, 1) * 0.55;
    c.fillStyle = 'rgba(74,12,20,' + a.toFixed(3) + ')';
    c.beginPath();
    c.ellipse(d.x, d.y, d.r, d.r*0.42, 0, 0, Math.PI*2);
    c.fill();
  }
}

/* ---------- герой ---------- */
function drawHero(c){
  const spr = SPR.hero;
  const bob = Math.sin(T*2.4)*0.8;
  const lx = HERO_X + (hero.lunge > 0 ? 2 : 0);
  const ty = Math.round(FLOOR - spr.h + bob);

  // свет вокруг героя
  c.globalCompositeOperation = 'lighter';
  const lg = c.createRadialGradient(lx, FLOOR-18, 3, lx, FLOOR-18, 40);
  lg.addColorStop(0, 'rgba(120,150,255,0.10)');
  lg.addColorStop(1, 'rgba(120,150,255,0)');
  c.fillStyle = lg;
  c.fillRect(lx-40, FLOOR-58, 80, 80);
  c.globalCompositeOperation = 'source-over';

  // тень
  c.fillStyle = 'rgba(0,0,0,0.5)';
  c.beginPath(); c.ellipse(lx, FLOOR-1, 8, 2.4, 0, 0, Math.PI*2); c.fill();

  c.save();
  if(stun > 0){
    c.globalAlpha = 0.55 + Math.sin(T*22)*0.2;
  }
  c.drawImage(spr.canvas, Math.round(lx - spr.w/2), ty);
  c.restore();

  drawWeapon(c, lx - spr.w/2 + 12, ty + 15);

  // аура крика душ
  if(buff > 0){
    const r = 15 + Math.sin(T*8)*2;
    c.globalAlpha = 0.2 + Math.sin(T*8)*0.06;
    c.strokeStyle = '#b98cf0';
    c.lineWidth = 1;
    c.beginPath(); c.ellipse(lx, FLOOR-13, r, r*0.95, 0, 0, Math.PI*2); c.stroke();
    c.globalAlpha = 1;
  }

  // полоса здоровья над головой
  const hpP = clamp(S.hp / maxHp(), 0, 1);
  const bw = 26, bh = 3;
  const bx = Math.round(lx - bw/2), by = ty - 7;
  c.fillStyle = 'rgba(0,0,0,0.65)';
  c.fillRect(bx-1, by-1, bw+2, bh+2);
  c.fillStyle = '#2a0a10';
  c.fillRect(bx, by, bw, bh);
  c.fillStyle = hpP > 0.35 ? '#cf3840' : '#ff5f6d';
  c.fillRect(bx, by, Math.max(1, bw*hpP), bh);
  c.fillStyle = 'rgba(255,255,255,0.25)';
  c.fillRect(bx, by, Math.max(1, bw*hpP), 1);
}

function drawWeapon(c, hx, hy){
  const kind = hero.atk || (equippedWeapon() ? equippedWeapon().atk : 'slash');
  let ang;
  if(hero.swing > 0){
    const p = 1 - hero.swing / (hero.swingLen || 0.2);
    ang = lerp(-1.9, 1.0, easeOut(p));
  } else {
    ang = -0.55 + Math.sin(T*2.2)*0.05;
  }
  c.save();
  c.translate(hx, hy);
  c.rotate(ang);
  switch(kind){
    case 'cleave':
      c.fillStyle = '#0a0810'; c.fillRect(-1,-17,4,18);
      c.fillStyle = '#6b4a2a'; c.fillRect(0,-16,2,16);
      c.fillStyle = '#c6cfdd'; c.fillRect(-4,-19,9,5);
      c.fillStyle = '#8b94a6'; c.fillRect(-4,-19,9,1);
      break;
    case 'stab':
      c.fillStyle = '#0a0810'; c.fillRect(-1,-11,4,12);
      c.fillStyle = '#cfd6e2'; c.fillRect(0,-10,2,9);
      c.fillStyle = '#c9a227'; c.fillRect(-2,-2,5,1);
      break;
    case 'smash':
      c.fillStyle = '#0a0810'; c.fillRect(-1,-14,4,15);
      c.fillStyle = '#5a4030'; c.fillRect(0,-13,2,13);
      c.fillStyle = '#7c8494'; c.fillRect(-4,-19,9,6);
      c.fillStyle = '#b2bbcc'; c.fillRect(-4,-19,9,2);
      break;
    case 'bolt':
      c.fillStyle = '#0a0810'; c.fillRect(-1,-19,3,20);
      c.fillStyle = '#6b4a2a'; c.fillRect(0,-18,1,18);
      c.fillStyle = '#a274e0'; c.fillRect(-2,-22,5,4);
      c.fillStyle = '#e6d4ff'; c.fillRect(-1,-21,3,2);
      break;
    case 'sweep':
      c.fillStyle = '#0a0810'; c.fillRect(-1,-20,3,21);
      c.fillStyle = '#5a4030'; c.fillRect(0,-19,1,19);
      c.strokeStyle = '#cfd6e2'; c.lineWidth = 2;
      c.beginPath(); c.arc(1, -19, 8, 0.2, 2.2); c.stroke();
      break;
    default:
      c.fillStyle = '#08060c'; c.fillRect(-1,-16,4,17);
      c.fillStyle = '#cfd6e2'; c.fillRect(0,-15,2,14);
      c.fillStyle = '#8b93a6'; c.fillRect(1,-15,1,14);
      c.fillStyle = '#c9a227'; c.fillRect(-3,-3,7,2);
      c.fillStyle = '#5a3b12'; c.fillRect(-1,0,2,4);
  }
  c.restore();

  // след удара
  if(hero.swing > 0.05){
    const p = 1 - hero.swing/(hero.swingLen||0.2);
    const a = Math.max(0, 1-Math.abs(p-0.45)*2.6) * 0.75;
    c.globalAlpha = a;
    c.strokeStyle = kind === 'bolt' ? '#c9a6ff' : '#fff4d0';
    c.lineWidth = kind === 'cleave' ? 2 : 1;
    c.beginPath();
    c.arc(hx, hy, kind === 'cleave' ? 20 : 15, -1.7, 1.0);
    c.stroke();
    c.globalAlpha = 1;
  }
}

/* ---------- враг ---------- */
function drawEnemy(c){
  if(!enemy) return;
  const e = enemy, spr = e.spr;
  const born = Math.min(1, e.born/0.22);
  const dying = e.dying > 0 ? 1 - e.dying/0.45 : 0;
  const alpha = (e.dying > 0 ? Math.max(0, 1 - dying*1.15) : 1) * born;
  const breathe = Math.sin(T*1.8 + e.seed)*1.6;
  const y = FLOOR - spr.h + breathe - (e.dying > 0 ? dying*14 : 0);
  const x = e.x + e.knock;

  c.globalAlpha = alpha * 0.42;
  c.fillStyle = '#000';
  c.beginPath(); c.ellipse(e.x, FLOOR-1, spr.w*0.36, 3, 0, 0, Math.PI*2); c.fill();

  if(e.boss){
    const g = c.createRadialGradient(e.x, FLOOR-22, 3, e.x, FLOOR-22, 44);
    g.addColorStop(0, 'rgba(150,40,60,0.22)');
    g.addColorStop(1, 'rgba(150,40,60,0)');
    c.globalAlpha = alpha;
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = g;
    c.fillRect(e.x-44, FLOOR-66, 88, 88);
    c.globalCompositeOperation = 'source-over';
  }

  c.globalAlpha = alpha;
  // предупреждение об атаке
  if(e.atkWind > 0){
    c.globalAlpha = alpha * (0.45 + Math.sin(T*30)*0.3);
    c.drawImage(spr.mask, Math.round(x - spr.w/2), Math.round(y));
    c.globalAlpha = alpha;
  }
  c.drawImage(spr.canvas, Math.round(x - spr.w/2), Math.round(y));

  if(e.flash > 0){
    c.globalAlpha = alpha * Math.min(1, e.flash/0.1);
    c.drawImage(spr.mask, Math.round(x - spr.w/2), Math.round(y));
  }
  c.globalAlpha = 1;
}

/* ---------- частицы ---------- */
function drawParticles(c){
  for(const p of particles){
    const a = clamp(p.life / p.max, 0, 1);
    if(p.ring){
      const t = 1 - p.life/p.max;
      const r = p.r0 + (p.r1-p.r0)*t;
      c.globalAlpha = a * 0.8;
      c.strokeStyle = p.col;
      c.lineWidth = 2;
      c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI*2); c.stroke();
      c.globalAlpha = 1;
      continue;
    }
    if(p.beam){
      c.globalAlpha = a;
      c.strokeStyle = '#c9a6ff';
      c.lineWidth = 2;
      c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.beam, FLOOR-38); c.stroke();
      c.globalAlpha = 1;
      continue;
    }
    c.globalAlpha = a;
    c.fillStyle = p.col;
    c.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
  }
  c.globalAlpha = 1;
}

function drawNumbers(c){
  for(const n of numbers){
    const a = clamp(n.life / n.max, 0, 1);
    const col = n.kind === 'crit' ? '#ffd35c'
      : n.kind === 'soul' ? '#9ff0d4'
      : n.kind === 'hero' ? '#ff6b74'
      : n.kind === 'skill' ? '#c9a6ff'
      : '#ffe9b8';
    const sc = n.kind === 'crit' ? 2 : 1;
    c.globalAlpha = a;
    drawText(c, n.text, Math.round(n.x - textW(n.text, sc)/2), Math.round(n.y), col, sc, true);
    c.globalAlpha = 1;
  }
  for(const l of lootTexts){
    const a = Math.min(1, l.life / 0.4);
    c.globalAlpha = a * 0.9;
    c.fillStyle = l.col;
    c.fillRect(Math.round(l.x - 2), Math.round(l.y), 5, 5);
    c.fillStyle = '#ffffff';
    c.fillRect(Math.round(l.x - 1), Math.round(l.y + 1), 3, 3);
    c.globalAlpha = 1;
  }
}

function drawVignette(c){
  const g = c.createRadialGradient(VW/2, VH*0.48, VH*0.4, VW/2, VH*0.55, VW*0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.6)');
  c.fillStyle = g;
  c.fillRect(0,0,VW,VH);
}

function render(){
  const c = ctx;
  c.setTransform(1,0,0,1,0,0);
  c.imageSmoothingEnabled = false;
  c.clearRect(0,0,VW,VH);

  const sh = shakeAmp > 0.25 ? shakeAmp : 0;
  const ox = sh ? Math.round(rnd(-sh, sh)) : 0;
  const oy = sh ? Math.round(rnd(-sh, sh)) : 0;

  c.save();
  c.translate(ox, oy);
  if(backdrop) c.drawImage(backdrop, 0, 0);
  drawTorches(c);
  drawAltarGlow(c);
  drawFog(c);
  drawDust(c);
  drawDecals(c);
  drawHero(c);
  drawEnemy(c);
  drawParticles(c);
  drawNumbers(c);
  c.restore();

  drawVignette(c);

  if(flashRed > 0){
    c.globalAlpha = Math.min(0.5, flashRed);
    c.fillStyle = '#7a0d14';
    c.fillRect(0,0,VW,VH);
    c.globalAlpha = 1;
  }
  if(flashWhite > 0){
    c.globalAlpha = Math.min(0.5, flashWhite*2);
    c.fillStyle = '#ffe9c0';
    c.fillRect(0,0,VW,VH);
    c.globalAlpha = 1;
  }
  if(stun > 0){
    c.fillStyle = 'rgba(0,0,0,0.45)';
    c.fillRect(0,0,VW,VH);
    const pulse = 0.5 + Math.sin(T*10)*0.3;
    c.globalAlpha = pulse;
    c.fillStyle = '#ff6b74';
    c.fillRect(VW/2 - 3, 60, 2, 14);
    c.fillRect(VW/2 + 1, 60, 2, 14);
    c.fillRect(VW/2 - 1, 78, 2, 3);
    c.globalAlpha = 1;
  }
}

/* ===================== цикл ===================== */
let last = 0, hudTimer = 0, dtLast = 0;

function update(dt){
  T += dt;

  if(saveTimer > 0){
    saveTimer -= dt;
    if(saveTimer <= 0) save();
  }

  for(let i=particles.length-1;i>=0;i--){
    const p = particles[i];
    p.life -= dt;
    if(p.life <= 0){ particles.splice(i,1); continue; }
    if(p.beam) continue;
    p.vy += (p.g || 0) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if(p.orb) p.vx += rnd(-10,10)*dt;
  }
  for(let i=numbers.length-1;i>=0;i--){
    const n = numbers[i];
    n.life -= dt;
    if(n.life <= 0){ numbers.splice(i,1); continue; }
    n.y += n.vy * dt;
    n.x += n.vx * dt;
    n.vy *= 0.95;
  }
  for(let i=lootTexts.length-1;i>=0;i--){
    const l = lootTexts[i];
    l.life -= dt;
    if(l.life <= 0) lootTexts.splice(i,1);
  }
  for(let i=decals.length-1;i>=0;i--){
    decals[i].life -= dt;
    if(decals[i].life <= 0) decals.splice(i,1);
  }
  for(const d of dust){
    d.y -= d.vy * dt;
    d.x += Math.sin(T*0.7 + d.ph) * dt * 3;
    if(d.y < -2){ d.y = VH + 2; d.x = rnd(0,VW); }
  }
  // угольки у факелов
  if(Math.random() < dt*6){
    const tx = Math.random() < 0.5 ? 34 : 222;
    particles.push({
      x: tx + rnd(-3,3), y: 52, vx: rnd(-8,8), vy: rnd(-26,-12),
      life: rnd(0.6,1.4), max: 1.4, col: pick(['#ffb347','#ff7a3c','#ffd35c']), size: 1, g: -6
    });
  }

  if(shakeAmp > 0) shakeAmp = Math.max(0, shakeAmp - dt*18);
  if(flashWhite > 0) flashWhite = Math.max(0, flashWhite - dt);
  if(flashRed > 0) flashRed = Math.max(0, flashRed - dt*1.6);
  if(hero.swing > 0) hero.swing = Math.max(0, hero.swing - dt);
  if(hero.lunge > 0) hero.lunge = Math.max(0, hero.lunge - dt);
  if(buff > 0) buff = Math.max(0, buff - dt);
  if(stun > 0) stun = Math.max(0, stun - dt);
  if(comboTimer > 0){
    comboTimer -= dt;
    if(comboTimer <= 0) combo = 0;
  }
  for(const k of ['q','e']) if(cd[k] > 0) cd[k] = Math.max(0, cd[k] - dt);

  if(!S.started) return;

  if(enemy){
    enemy.born += dt;
    if(enemy.flash > 0) enemy.flash = Math.max(0, enemy.flash - dt);
    enemy.knock = lerp(enemy.knock, 0, Math.min(1, dt*14));
  }

  if(enemy && enemy.dying > 0){
    enemy.dying -= dt;
    if(enemy.dying <= 0){ enemy = null; spawnTimer = 0.12; }
  } else if(!enemy){
    spawnTimer -= dt;
    if(spawnTimer <= 0) spawnEnemy();
  }

  // атака врага: замах, затем удар
  if(enemy && enemy.dying <= 0 && stun <= 0){
    if(enemy.atkWind > 0) enemy.atkWind = Math.max(0, enemy.atkWind - dt);
    if(enemy.pending && enemy.atkWind <= 0){
      enemy.pending = false;
      heroHurt(Math.max(1, maxHp() * (enemy.boss ? BAL.enemyHitBoss : BAL.enemyHitMob) * (1 - armorRed())));
      enemy.atkTimer = enemy.boss ? rnd(4.2, 5.8) : rnd(5.5, 8);
    }
    if(!enemy.pending && enemy.atkWind <= 0){
      enemy.atkTimer -= dt;
      if(enemy.atkTimer <= 0){ enemy.atkWind = 0.55; enemy.pending = true; }
    }
  }

  // регенерация
  const regen = (enemy && enemy.dying <= 0) ? 0.012 : 0.085;
  if(S.hp < maxHp()) S.hp = Math.min(maxHp(), S.hp + maxHp()*regen*dt);

  // пассивный урон
  if(enemy && enemy.dying <= 0){
    const d = dpsValue() * buffMul();
    if(d > 0){
      enemy.hp -= d * dt;
      if(enemy.hp <= 0) killEnemy();
    }
  }

  hudTimer += dt;
  if(hudTimer > 0.1){
    hudTimer = 0;
    refreshSkills();
    refreshHeroHp();
    if(enemy){
      hpFill.style.width = clamp(enemy.hp/enemy.maxHp,0,1)*100 + '%';
      hpText.textContent = fmt(Math.max(0,Math.ceil(enemy.hp))) + ' / ' + fmt(enemy.maxHp);
    }
    const hpv = $('#hp-val');
    if(hpv) hpv.textContent = Math.max(0, Math.ceil(S.hp)) + '/' + maxHp();
  }
}

function frame(now){
  if(!last) last = now;
  let dt = (now - last)/1000;
  last = now;
  if(!isFinite(dt) || dt < 0) dt = 0;
  if(dt > 0.1) dt = 0.1;

  if(hitStop > 0){
    hitStop -= dt;
    dt *= 0.15;
  }
  dtLast = dt;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

/* ===================== размер ===================== */
function fit(){
  if(!canvas) return;
  const stage = $('#stage');
  if(!stage) return;
  const plate = $('.plate'), sk = $('.skills'), hint = $('.hint');
  if(hint) hint.style.display = '';

  let s;
  if(window.innerWidth <= 1020){
    s = Math.floor((Math.min(window.innerWidth, 1100) - 40) / VW);
  } else {
    const availW = Math.max(160, stage.clientWidth - 34);
    const base = (plate ? plate.offsetHeight : 0) + (sk ? sk.offsetHeight : 0) + 62;
    const hintH = hint ? hint.offsetHeight : 0;
    s = Math.floor(Math.min(availW / VW, (stage.clientHeight - base - hintH) / VH));
    if(hint && hintH){
      const s2 = Math.floor(Math.min(availW / VW, (stage.clientHeight - base) / VH));
      if(s2 > s){ hint.style.display = 'none'; s = s2; }
    }
  }

  const wrap = $('.canvas-wrap');
  if(s < 2){
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    if(wrap){ wrap.style.width = '100%'; wrap.style.maxWidth = '100%'; }
    if(plate){ plate.style.width = '100%'; plate.style.maxWidth = '100%'; }
    return;
  }
  s = clamp(s, 2, 8);
  canvas.style.width = (VW * s) + 'px';
  canvas.style.height = (VH * s) + 'px';
  if(wrap){ wrap.style.width = (VW*s + 4) + 'px'; wrap.style.maxWidth = '100%'; }
  if(plate){ plate.style.width = (VW*s + 4) + 'px'; plate.style.maxWidth = '100%'; }
  if(sk) sk.style.width = Math.min(VW*s + 4, 660) + 'px';
}

/* ===================== запуск ===================== */
function initDust(){
  dust = [];
  for(let i=0;i<36;i++){
    dust.push({ x:rnd(0,VW), y:rnd(0,VH), vy:rnd(2,8), ph:rnd(0,6.28), a:rnd(0.06,0.18) });
  }
}

function startGame(){
  S.started = true;
  SFX.init();
  SFX.resume();
  $('#intro').classList.add('hidden');
  spawnEnemy();
  save();
  if(window.TG && TG.haptic) TG.haptic('medium');
}

function bind(){
  canvas = $('#scene');
  ctx = canvas.getContext('2d', { alpha:false });

  const cur = makeCursor();
  if(cur) canvas.style.cursor = 'url(' + cur + ') 16 16, crosshair';

  $('#btn-start').addEventListener('click', startGame);

  canvas.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    attack();
  });

  document.addEventListener('keydown', (ev) => {
    if(ev.repeat) return;
    if(ev.key === 'Escape'){ hideModal(); return; }
    if(!$('#modal').classList.contains('hidden')) return;
    if(!$('#intro').classList.contains('hidden')) return;
    if(ev.code === 'Space' || ev.key === ' '){ ev.preventDefault(); attack(); }
    else if(ev.key === 'q' || ev.key === 'Q' || ev.key === 'й' || ev.key === 'Й') useSkill('q');
    else if(ev.key === 'e' || ev.key === 'E' || ev.key === 'у' || ev.key === 'У') useSkill('e');
  });

  $('#sk-q').addEventListener('click', () => useSkill('q'));
  $('#sk-e').addEventListener('click', () => useSkill('e'));

  $('#modal-ok').addEventListener('click', () => {
    const cb = modalCb;
    hideModal();
    if(cb) cb();
  });
  $('#modal-cancel').addEventListener('click', hideModal);

  $('#btn-sound').addEventListener('click', () => {
    S.sound = !S.sound;
    SFX.on = S.sound;
    $('#btn-sound').textContent = 'ЗВУК: ' + (S.sound ? 'ВКЛ' : 'ВЫКЛ');
    if(S.sound){ SFX.init(); SFX.resume(); SFX.buy(); }
    save();
  });

  $('#btn-reset').addEventListener('click', () => {
    showModal('СТЕРЕТЬ ПАМЯТЬ', 'Склеп забудет тебя: души, печати, снаряжение и слуги исчезнут — и здесь, и в облаке. Начать заново?', 'СТЕРЕТЬ', () => {
      const wipe = () => {
        try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
        location.reload();
      };
      if(window.ACCOUNT && window.ACCOUNT.hasAccount()) window.ACCOUNT.reset().then(wipe, wipe);
      else wipe();
    });
  });

  const prof = $('#btn-profile');
  if(prof) prof.addEventListener('click', openProfile);

  document.addEventListener('pointerdown', () => { SFX.init(); SFX.resume(); }, { once:true });
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', () => setTimeout(fit, 120));
  window.addEventListener('beforeunload', save);
  document.addEventListener('visibilitychange', () => { if(document.hidden) save(); });
}

function boot(){
  buildSprites();
  buildUI();

  const loaded = load();
  SFX.on = S.sound;

  const qp = new URLSearchParams(location.search);
  if(qp.has('souls')) S.souls = parseInt(qp.get('souls'),10) || 0;
  if(qp.has('wave')) S.wave = Math.max(1, parseInt(qp.get('wave'),10) || 1);
  if(qp.has('seals')) S.seals = parseInt(qp.get('seals'),10) || 0;
  if(qp.has('start')) S.started = true;
  if(qp.has('loot')){
    for(let i=0;i<6;i++) S.bag.push(ITEMS.makeItem(S.wave + i*3, { boss: i > 3 }));
  }

  $('#btn-sound').textContent = 'ЗВУК: ' + (S.sound ? 'ВКЛ' : 'ВЫКЛ');

  initDust();
  bind();
  fit();
  buildBackdrop(Math.floor((S.wave-1)/BAL.zoneLen) % ZONES.length);

  if(S.started){
    $('#intro').classList.add('hidden');
    spawnEnemy();
  } else {
    spawnEnemy();
    enemy = null;
    spawnTimer = 0.4;
  }

  if(loaded && S.started){
    const away = (Date.now() - (S.ts || Date.now()))/1000;
    if(away > 60 && dpsValue() > 0){
      const secs = Math.min(away, 7200);
      const gain = Math.floor(dpsValue() * secs * 0.5);
      if(gain > 0){
        S.souls += gain; S.total += gain;
        setTimeout(() => showModal('СКЛЕП ЖДАЛ',
          'Тебя не было ' + Math.floor(secs/60) + ' мин. Слуги убили <b>' + fmt(gain) + '</b> душ.',
          'ПРИНЯТЬ', null, 'ЛАДНО'), 400);
      }
    }
  }

  refreshUI();
  refreshBag();
  updatePlate();

  window.gameToast = toast;
  if(window.ACCOUNT){
    window.ACCOUNT.attach({
      getSave: () => S,
      getLocalTs: () => (loadedFromDisk ? (S.ts || 0) : 0),
      applySave: applyRemoteSave
    });
    window.ACCOUNT.init();
  }

  requestAnimationFrame(frame);

  setInterval(save, 8000);
  setInterval(() => { refreshUI(); }, 500);

  if(window.TG && TG.init) TG.init();
}

window.GAME = {
  state: () => S,
  attack, useSkill, spawnEnemy, buyUpgrade, buyUnit, doRitual, update, render,
  units: UNITS, upgrades: UPGRADES, bal: BAL, fmt, ritualGain, save, load,
  waveInfo, clickDmg, dpsValue, critChance, critMult, soulMult, maxHp,
  gear: () => ITEMS.gearStats(S.gear), invalidateGear,
  equipItem, unequip, sellItem, sellJunk, receiveItem, maybeDrop, refreshBag,
  dbg: () => ({
    T, dtLast, started: S.started, wave: S.wave, hp: S.hp, maxHp: maxHp(),
    enemy: enemy ? { key: enemy.key, hp: enemy.hp, x: enemy.x, born: enemy.born } : null,
    sprites: Object.keys(SPR).map(k => k + ':' + SPR[k].w + 'x' + SPR[k].h).join(' '),
    gear: S.gear, bag: S.bag.length, camera: canvas ? canvas.getAttribute('style') : null,
    backdrop: backdrop ? [backdrop.width, backdrop.height] : null
  })
};

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

})();
