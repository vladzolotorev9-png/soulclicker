/* ============================================================
   ПЕПЕЛЬНЫЙ ПРИЗЫВ — пиксель-арт (мир 320×180)
   Строка = ряд пикселей, символ = цвет палитры.
   ============================================================ */
(function(){
'use strict';

const PAL = {
  '.': null,
  'o': '#08060c',   // контур
  'k': '#141020',   // глубокая тень
  'b': '#0d0a14',

  // кость
  'w': '#efe8d4', 'W': '#cfc5aa', 'x': '#9a8f78', 'X': '#6a6152',

  // сталь
  'S': '#c6cfdd', 's': '#8b94a6', 'u': '#59606e', 'U': '#343a46',

  // золото
  'g': '#c99a2e', 'G': '#f7dc8a',

  // плоть демона
  'r': '#8e1f2a', 'R': '#cf3840', 'D': '#4a0c14', 'h': '#5c1a24', 'H': '#7a2530',

  // свечение
  'e': '#ffd35c', 'E': '#fff6d0', 't': '#46d6bd', 'T': '#b9fff1',

  // фиолет
  'p': '#6a3fa0', 'P': '#a274e0', 'q': '#2e1a47',

  // камень
  'n': '#26222f', 'm': '#3d3949', 'M': '#575265', 'N': '#6f6a7d',

  // кожа
  'f': '#b07a5a', 'F': '#8a5a40'
};

const ART = {

  /* ---------------- ГЕРОЙ 18×28 ---------------- */
  hero: {
    rows: [
      '....oooooooo......',
      '...oSSSSSSSSo.....',
      '...oSuuuuuuSo.....',
      '...oSSSSSSSSo.....',
      '...oSeEeEEeSo.....',
      '...oSSuSSuSSo.....',
      '....oSSSSSSo......',
      '...ooSSSSSSoo.....',
      '..coSSSSSSSSoC....',
      '.cCoSuuuuuuSoCc...',
      '.cCoSgGGGgSoCc....',
      '.cCoSSSSSSSoCc....',
      '.cCoSSSSSSSoCc....',
      '..CoSSSSSSSoC.....',
      '...oSSSSSSSo......',
      '...oSsSSsSo.......',
      '...oSsSoSSo.......',
      '...oSsSoSSo.......',
      '...oSsSoSSo.......',
      '...oSsSoSSo.......',
      '...oSsSoSSo.......',
      '..oSsSooSSo.......',
      '..oSSooooSSo......',
      '..oSSo..oSSo......',
      '.oSSo....oSSo.....',
      '.oSSo....oSSo.....',
      '.oooo....oooo.....',
      '..................'
    ]
  },

  /* ---------------- БЕС 24×24 ---------------- */
  imp: {
    rows: [
      '........................',
      '...o................o...',
      '..oxo..............oxo..',
      '..oxxo............oxxo..',
      '...oxxo..........oxxo...',
      '....oxxo........oxxo....',
      '.....oxxooooooxxo.......',
      '......oxxxxxxxxo........',
      '.....oxxRRRRRRxxo.......',
      '....oxRReeRRReeRRo......',
      '....oxRRRRRRRRRRRo......',
      '....oxRRoRRRRoRRRo......',
      '.....oxRRRRRRRRo........',
      '......oxxRRRRxxo........',
      '.....oxxRRRRRRxxo.......',
      '....oxRooRRRRooRRo......',
      '...oxRo..oRRo..oRo......',
      '...oxo...oRRo...oo......',
      '.........oRRRRo.........',
      '........oRRo.oRRo.......',
      '........oRo...oRo.......',
      '.......oWWo...oWWo......',
      '.......oooo...oooo......',
      '........................'
    ]
  },

  /* ---------------- СКЕЛЕТ 22×26 ---------------- */
  skeleton: {
    rows: [
      '......oooooo..........',
      '.....owwwwwwo.........',
      '....owwwwwwwwo........',
      '....owkkwwkkwo........',
      '....owkeowekwo........',
      '....owwwwwwwwo........',
      '.....owwwwwwo.........',
      '......owwwwo..........',
      '.......owwo...........',
      '....oowwwwwoo.........',
      '...owwowwowwo.........',
      '...owwowwowwo.........',
      '...owwowwowwo.........',
      '...owwowwowwo.........',
      '....owwwwwwo..........',
      '.....owwwwo...........',
      '....owwoowwo..........',
      '....owwo.owwo.........',
      '...owwo...owwo........',
      '...owwo...owwo........',
      '...owwo...owwo........',
      '..owwo.....owwo.......',
      '..owwo.....owwo.......',
      '..oooo.....oooo.......',
      '......................',
      '......................'
    ]
  },

  /* ---------------- ПРИЗРАК 22×26 ---------------- */
  wraith: {
    rows: [
      '......oooooo..........',
      '.....oqqqqqqo.........',
      '....oqqqqqqqqo........',
      '....oqqtqqqtqo........',
      '....oqteeteetqo.......',
      '....oqqqqqqqqo........',
      '...oqqqqqqqqqqo.......',
      '...oqqqqqqqqqqo.......',
      '...oqtqqqqqqtqo.......',
      '...oqqqqqqqqqqo.......',
      '....oqqqqqqqqo........',
      '....oqqqqqqqqo........',
      '.....oqqqqqqo.........',
      '.....oq.oqoq.oq.......',
      '....oq..q..q..qo......',
      '...oq...q..q...qo.....',
      '..oq....q..q....qo....',
      '........q..q..........',
      '.......oq..qo.........',
      '......oq....qo........',
      '.....oq......qo.......',
      '......................',
      '......................',
      '......................',
      '......................',
      '......................'
    ]
  },

  /* ---------------- ГОЛЕМ 26×26 ---------------- */
  golem: {
    rows: [
      '..........................',
      '.......oooooooo...........',
      '......omMMMMMMmo..........',
      '.....omMMMMMMMMmo.........',
      '.....omMeemmMeeMmo........',
      '.....omMMMMMMMMmo.........',
      '.....omMnnnnnnMmo.........',
      '......omMMMMMMmo..........',
      '....ooomMMmmMMmooo........',
      '...omMMoommooMMMo.........',
      '...omMMoMnnMoMMMo.........',
      '...omMMoMnnMoMMMo.........',
      '...omMMoMnnMoMMMo.........',
      '...omMMoMnnMoMMMo.........',
      '...ommmoMnnMommmo.........',
      '...ommnoMMMMonmmo.........',
      '....oMmoMMMMomMo..........',
      '.....ooMMMMMMoo...........',
      '.....omMmo.omMmo..........',
      '....omMmo...omMmo.........',
      '....omMmo...omMmo.........',
      '...omMMmo...omMMmo........',
      '...omMMmo...omMMmo........',
      '..omMMMmo...omMMMmo.......',
      '..ooooooo...ooooooo.......',
      '..........................'
    ]
  },

  /* ---------------- БОСС: гигантский череп 40×40 (зеркальная половина) ---------------- */
  bossHalf: {
    mirror: true,
    rows: [
      '........................',
      '....oo..................',
      '...oxxooo...............',
      '..oxxxxxXo..............',
      '..oxxoxxxXo.............',
      '.oxxo.oxxxXo............',
      '..oxxo.ooxXXo...........',
      '...oxxo..oxXxo.........o',
      '....oxxo..oxXxo...oooooW',
      '.....oo....ooXxoooWWWWWW',
      '.............oooWWWWWWWW',
      '.............oWWWWWWWWWW',
      '............oWWWWWWWWWWW',
      '...........oWWWWWWWWWWWW',
      '..........oWWWWWWWWWWWWW',
      '.........oWWWWWWkWWWWWWW',
      '.........oWWWWkkkkkWWWWW',
      '........oWWWWkkkEkkkWWWW',
      '........oWWWkkEEEEEkkWWW',
      '........oWWWWkkkEkkkWWWW',
      '........oWWWWWkkkkkWWWWW',
      '.......oWWWWWWWWkWWWWWWW',
      '........oWWWWWWWWWWWWWWW',
      '........oWWWWWWWWWWWWWWW',
      '........oWWWWWWWWWWWkWWW',
      '........oWWWWWWWWWWWkkWW',
      '.........oWWWWWWWWWWWWWW',
      '.........oWWWWWWWWWWWWWW',
      '..........oWWWWWWWWWWWWW',
      '...........oWWWWWWWWWWWW',
      '...........oWWWWWWWWWWWW',
      '..........o.oWWWWWWWWWWW',
      '.........okookWWkWWkWWkW',
      '.......oookookWWDDDDDDDW',
      '......oHHHHHHHDDDDDDDDDW',
      '.....oHHHHHHHHHWDDDDDDDW',
      '....oHHHHHHHHHHHHHHHHHHH',
      '....oHHHHHHHHHHHHHHHHHHH',
      '...oHHHHHHHHHHHHHHHHHHHH',
      '....oHHHHHHHHHHHHHHHHHHH',
    ]
  }
};

/* ---------------- ИКОНКИ 8×8 ---------------- */
const ICONS = {
  sword: ['...oo...','..oSo...','..oSo...','..oSo...','..oSo...','.oGGGo..','..ogo...','..oo....'],
  eye:   ['..oooo..','.oggggo.','oggeeGgo','ogeEEego','oggeeGgo','.oggggo.','..oooo..','........'],
  skull: ['.oooooo.','owwwwwwo','owwkkwwo','owkeekwo','owwkkwwo','.owwwwo.','..owwo..','...oo...'],
  soul:  ['...o....','..oto...','..oto...','.otTto..','.otTTto.','otTTTTto','.ottto..','..ooo...'],
  coin:  ['..oooo..','.oggggo.','ogGGGGgo','ogGooGgo','ogGooGgo','ogGGGGgo','.oggggo.','..oooo..'],
  flame: ['...o....','..oyo...','..oyo...','.oyEyo..','.oyEEyo.','oyEEEEyo','.oyyyo..','..ooo...'],
  rune:  ['..oooo..','.opppo..','.opo....','.opppo..','....opo.','.opppo..','..oooo..','........'],
  claw:  ['o..o..o.','wo.wo.wo','wo.wo.wo','.wo.wo.w','.wo.wo.w','..w..w..','........','........'],
  arrow: ['....o...','...owo..','..owwwo.','.owwwoo.','oowwooo.','..oww...','..ow....','..oo....'],
  dps:   ['...o....','..oeo...','.oeeeo..','oeeEeeo.','.oeeeo..','..oeo...','...o....','........'],
  seal:  ['..oooo..','.opppo..','opooopo.','opoopopo','opooopo.','.opppo..','..oooo..','........'],
  // снаряжение
  armor: ['..oooo..','.oSSSSo.','oSSooSSo','oSSooSSo','oSSooSSo','.oSSoSo.','..oSSo..','...oo...'],
  amulet:['..oooo..','.oGoGo..','..oGo...','.oGoGo..','oGooGoGo','oGooGoGo','.oGGGo..','..oooo..'],
  ring:  ['..oooo..','.oGooGo.','oGo..oGo','oGo..oGo','oGo..oGo','.oGooGo.','..oooo..','........'],
  bag:   ['...oo...','..oooo..','.oSSSSo.','oSSSSSSo','oSGoGSoS','oSSSSSSo','oSSSSSSo','.oooooo.'],
  gem:   ['..oooo..','.oPPPpo.','oPPEEPPo','oPEEEEPp','.oPEEPp.','..oPPp..','...oo...','........'],
  boot:  ['..oooo..','..oSSo..','..oSSo..','..oSSo..','.ooSSoo.','oSSSSooo','oSSSSSoo','.oooooo.']
};

/* ---------------- рендер ---------------- */

function rowsToCanvas(rows, pal, mirror){
  let w = 0;
  for(const r of rows) w = Math.max(w, r.length);
  const h = rows.length;
  const full = mirror ? w * 2 : w;
  const c = document.createElement('canvas');
  c.width = full; c.height = h;
  const g = c.getContext('2d');
  const P = Object.assign({}, PAL, pal || {});
  for(let y=0;y<h;y++){
    const row = rows[y];
    for(let x=0;x<row.length;x++){
      const col = P[row[x]];
      if(!col) continue;
      g.fillStyle = col;
      g.fillRect(x, y, 1, 1);
      if(mirror) g.fillRect(full - 1 - x, y, 1, 1);
    }
  }

  // белая маска для вспышки удара
  const mask = document.createElement('canvas');
  mask.width = full; mask.height = h;
  const mg = mask.getContext('2d');
  mg.drawImage(c, 0, 0);
  mg.globalCompositeOperation = 'source-in';
  mg.fillStyle = '#ffffff';
  mg.fillRect(0, 0, full, h);

  // силуэт для тени
  const dark = document.createElement('canvas');
  dark.width = full; dark.height = h;
  const dg = dark.getContext('2d');
  dg.drawImage(c, 0, 0);
  dg.globalCompositeOperation = 'source-in';
  dg.fillStyle = '#000000';
  dg.fillRect(0, 0, full, h);

  return { canvas:c, mask:mask, dark:dark, w:full, h:h };
}

function makeSprite(def, pal){
  return rowsToCanvas(def.rows, pal || def.pal, def.mirror);
}

window.PAL = PAL;
window.ART = ART;
window.ICONS = ICONS;
window.makeSprite = makeSprite;
window.rowsToCanvas = rowsToCanvas;

})();
