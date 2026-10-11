// Runs extension/content.js against fake lichess and chess.com boards in jsdom. `npm test`
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const src = readFileSync(new URL('./extension/content.js', import.meta.url), 'utf8');
const fr = s => ['abcdefgh'.indexOf(s[0]), +s[1] - 1];

// Position for every board: white queen dragged from h5, black rook h8, pawns g7 and a5.
function run(url, html, setup) {
  const { window } = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true });
  const d = window.document;
  setup(d);
  window.HTMLElement.prototype.getBoundingClientRect = () => ({ width: 800 });
  window.requestAnimationFrame = f => f();
  window.eval(src);
  const cells = [...d.querySelectorAll('div.threat-map > div')];
  const cell = s => { const [f, r] = fr(s); return cells[(7 - r) * 8 + f]?.style.background ?? ''; };
  return { on: cells.length > 0, arrows: [...d.querySelectorAll('svg.threat-map line')].map(l => l.getAttribute('stroke')), cell };
}

function lichess(hover, { url = 'https://lichess.org/analysis', players = '' } = {}) {
  return run(url, `<div class="round__app">${players}</div><div class="cg-wrap orientation-white"><cg-board></cg-board></div>`, d => {
    const b = d.querySelector('cg-board');
    const add = (tag, cls, s) => {
      const e = d.createElement(tag), [f, r] = fr(s);
      e.className = cls; e.style.transform = `translate(${f * 100}px, ${(7 - r) * 100}px)`; b.append(e);
    };
    add('piece', 'black rook', 'h8'); add('piece', 'black pawn', 'a5'); add('piece', 'black pawn', 'g7');
    add('piece', 'ghost white queen', 'h5'); add('square', 'selected', 'h5');
    ['a5', 'g5', 'h6'].forEach(s => add('square', 'move-dest', s));
    add('piece', 'white queen dragging', hover);
  });
}

function chesscom(hover, url = 'https://www.chess.com/analysis') {
  return run(url, '<wc-chess-board class="board"></wc-chess-board>', d => {
    const b = d.querySelector('wc-chess-board');
    const add = (cls, s) => { const e = d.createElement('div'), [f, r] = fr(s); e.className = `${cls} square-${f + 1}${r + 1}`; b.append(e); };
    add('piece br', 'h8'); add('piece bp', 'a5'); add('piece bp', 'g7'); add('piece wq dragging', 'h5');
    ['a5', 'g5', 'h6'].forEach(s => add('hint', s));
    add('hover-square', hover);
  });
}

const RED = 'rgba(230, 0, 0', GREEN = 'rgba(0, 180, 60';
for (const [name, read] of [['lichess', lichess], ['chess.com', chesscom]]) {
  // legal, contested square: queen on h6 is attacked by rook + pawn and hits both
  const legal = read('h6');
  assert.deepEqual(legal.arrows.sort(), ['#1e5aff', '#1e5aff', '#e00000', '#e00000'], `${name}: arrows on h6`);
  assert.ok(legal.cell('h4').startsWith(GREEN), `${name}: h4 not attacked once the queen leaves h5`);
  // illegal square: no arrows, queen evaluated on h5, so the rook's file is blocked at h5
  const illegal = read('c3');
  assert.deepEqual(illegal.arrows, [], `${name}: no arrows on illegal square`);
  assert.ok(illegal.cell('h6').startsWith(RED), `${name}: h6 attacked by rook and pawn, queen on h5 hits it once`);
}

// guard: only bot games and training
const BOT = '<div class="ruser"><a href="/@/somebot"><span class="utitle" data-bot>BOT</span>somebot</a></div>';
const HUMAN = '<div class="ruser"><a href="/@/someone">someone</a></div>';
assert.ok(lichess('h6', { url: 'https://lichess.org/abcd1234', players: BOT }).on, 'lichess bot game');
assert.ok(!lichess('h6', { url: 'https://lichess.org/abcd1234', players: HUMAN }).on, 'lichess human game');
assert.ok(!lichess('h6', { url: 'https://lichess.org/racer' }).on, 'lichess puzzle racer');
assert.ok(lichess('h6', { url: 'https://lichess.org/training/daily' }).on, 'lichess puzzles');
assert.ok(chesscom('h6', 'https://www.chess.com/play/computer').on, 'chess.com bots');
assert.ok(chesscom('h6', 'https://www.chess.com/puzzles/rated').on, 'chess.com puzzles');
assert.ok(!chesscom('h6', 'https://www.chess.com/puzzles/battle').on, 'chess.com puzzle battle');
assert.ok(!chesscom('h6', 'https://www.chess.com/game/live/123').on, 'chess.com live game');
assert.ok(!chesscom('h6', 'https://www.chess.com/play/online').on, 'chess.com online');
console.log('all checks passed');
