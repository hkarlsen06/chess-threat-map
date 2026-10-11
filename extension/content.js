// Colors each square by enemy attackers vs your own (you = side at the bottom of the board):
// red = enemy outnumbers you, yellow = evenly contested, green = you control it, blue = nobody attacks it.
// While dragging a piece over a legal square, arrows show who attacks it there (red), who defends it (green)
// and what it would hit (blue).
// Runs only in bot games and training (analysis, puzzles, lessons): using it against people is cheating.
const DIRS = {
  n: [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]],
  k: [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]],
  b: [[1,1],[1,-1],[-1,1],[-1,-1]],
  r: [[1,0],[-1,0],[0,1],[0,-1]],
};
DIRS.q = DIRS.b.concat(DIRS.r);
const ROLES = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };

// board[f][r] = {color, role} | undefined; returns hits[f][r] = [[f, r], ...] squares of `side` pieces attacking it.
function attackers(board, side) {
  const hits = [...Array(8)].map(() => [...Array(8)].map(() => []));
  const on = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;
  for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) {
    const p = board[f][r];
    if (!p || p.color !== side) continue;
    if (p.role === 'p') {
      const dr = side === 'white' ? 1 : -1;
      for (const df of [-1, 1]) if (on(f + df, r + dr)) hits[f + df][r + dr].push([f, r]);
      continue;
    }
    const slide = 'bqr'.includes(p.role);
    for (const [df, dr] of DIRS[p.role]) {
      let x = f + df, y = r + dr;
      while (on(x, y)) {
        hits[x][y].push([f, r]);
        if (!slide || board[x][y]) break;
        x += df; y += dr;
      }
    }
  }
  return hits;
}

// Arrows for the piece on `sq`: [kind, from, to]. foes/friends = attackers() of the other/own color.
function conflicts(board, sq, foes, friends) {
  const [f, r] = sq, list = [];
  for (const s of foes[f][r]) list.push(['attacker', s, sq]);
  for (const s of friends[f][r]) list.push(['defender', s, sq]);
  for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) {
    const p = board[x][y];
    if (p && p.color !== board[f][r].color && friends[x][y].some(([a, b]) => a === f && b === r)) list.push(['target', sq, [x, y]]);
  }
  return list;
}

const ARROW = { attacker: '#e00000', defender: '#00a03c', target: '#1e5aff' };
function drawArrows(cgBoard, list, toScreen) {
  let svg = cgBoard.querySelector(':scope > svg.threat-map');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'threat-map');
    svg.setAttribute('viewBox', '0 0 8 8');
    // above pieces, below the held piece (lichess pieces z 2, held 11; chess.com pieces z auto, held 2)
    const z = cgBoard.tagName === 'CG-BOARD' ? 3 : 1;
    svg.style.cssText = `position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:${z}`;
    svg.innerHTML = '<defs>' + Object.entries(ARROW).map(([k, c]) =>
      `<marker id="tm-${k}" viewBox="0 0 4 4" refX="2" refY="2" markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0L4,2L0,4z" fill="${c}"/></marker>`).join('') + '</defs>';
    cgBoard.append(svg);
  }
  svg.querySelectorAll('line').forEach(l => l.remove());
  // target (move) arrows first and thinner, so attacker/defender arrows sit on top
  const sorted = [...list].sort((a, b) => (b[0] === 'target') - (a[0] === 'target'));
  for (const [kind, from, to] of sorted) {
    let [x1, y1] = toScreen(from), [x2, y2] = toScreen(to);
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (list.some(([, a, b]) => `${a}` === `${to}` && `${b}` === `${from}`)) {
      // mutual attack: nudge each arrow to its own side so they don't overlap
      const ox = -(y2 - y1) / len * 0.13, oy = (x2 - x1) / len * 0.13;
      x1 += ox; y1 += oy; x2 += ox; y2 += oy;
    }
    const k = 1 - 0.35 / len; // stop short so the head lands inside the square
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    const move = kind === 'target';
    for (const [a, v] of Object.entries({ x1, y1, x2: x1 + (x2 - x1) * k, y2: y1 + (y2 - y1) * k, stroke: ARROW[kind],
      'stroke-width': move ? 0.08 : 0.15, 'stroke-linecap': 'round', opacity: move ? 0.6 : 0.9, 'marker-end': `url(#tm-${kind})` }))
      line.setAttribute(a, v);
    svg.append(line);
  }
}

function color(threat, cover) {
  const alpha = n => Math.min(0.2 + 0.15 * n, 0.75);
  if (threat > cover) return `rgba(230,0,0,${alpha(threat - cover)})`;
  if (threat) return `rgba(240,200,0,${alpha(threat)})`;
  if (cover) return `rgba(0,180,60,${alpha(cover)})`;
  return 'rgba(30,90,255,0.45)';
}

// Where the map may show. Games against people and puzzle races/battles stay untouched.
function allowed() {
  const p = location.pathname;
  if (location.hostname.endsWith('chess.com'))
    return /^\/(analysis|play\/computer|game\/computer|lessons|practice|drills)(\/|$)/.test(p)
      || /^\/puzzles(\/|$)/.test(p) && !/^\/puzzles\/(rush|battle)/.test(p);
  if (/^\/(analysis|study|practice|training|learn|editor)(\/|$)/.test(p)) return true;
  // lichess game: only against a BOT account or lichess' built-in Stockfish (no profile link)
  return !!document.querySelector('.ruser [data-bot], .game__meta__players [data-bot]')
    || [...document.querySelectorAll('.ruser')].some(r => !r.querySelector('a') && r.textContent.includes('Stockfish'));
}

const emptyBoard = () => [...Array(8)].map(() => Array(8));

// A dragged piece counts on its hovered square only if that's a legal move; otherwise it stays on its origin.
// Returns the hovered square when legal (=> draw arrows).
function placeDrag(board, piece, at, origin, dests) {
  // ponytail: no legal-move dots at all (setting off, or a piece with no moves) => every square counts as legal
  const legal = at && (!dests.length || dests.some(d => `${d}` === `${at}`));
  const sq = legal ? at : origin;
  if (sq) board[sq[0]][sq[1]] = piece;
  return legal ? at : undefined;
}

// lichess (chessground): <cg-board> with <piece class="white queen" style="transform: translate(Xpx, Ypx)">
function readLichess(cgBoard) {
  const wrap = cgBoard.closest('.cg-wrap');
  const size = cgBoard.getBoundingClientRect().width / 8;
  if (!wrap || !size) return;
  const black = wrap.classList.contains('orientation-black');
  const sqOf = el => {
    const m = el?.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px/);
    if (!m) return;
    const c = Math.round(m[1] / size), w = Math.round(m[2] / size);
    const [f, r] = black ? [7 - c, w] : [c, 7 - w];
    if (f >= 0 && f < 8 && r >= 0 && r < 8) return [f, r];
  };
  const board = emptyBoard();
  let dragEl, drag;
  for (const el of cgBoard.querySelectorAll('piece')) {
    if (el.classList.contains('dragging')) { dragEl = el; continue; }
    if (el.classList.contains('fading') || el.classList.contains('ghost')) continue;
    const sq = sqOf(el);
    const [color, roleName] = el.classList; // "<color> <role> [anim...]"
    if (sq && ROLES[roleName]) board[sq[0]][sq[1]] = { color, role: ROLES[roleName] };
  }
  if (dragEl) {
    const [color, roleName] = dragEl.classList;
    const dests = [...cgBoard.querySelectorAll('square.move-dest, square.premove-dest')].map(sqOf);
    drag = placeDrag(board, { color, role: ROLES[roleName] }, sqOf(dragEl),
      sqOf(cgBoard.querySelector('piece.ghost, square.selected')), dests);
  }
  return { black, board, drag };
}

// chess.com: <wc-chess-board> with <div class="piece wq square-41"> (square-<file><rank>, 1-based).
// While dragging, the piece keeps its origin square class and .hover-square marks the square under the cursor.
function readChessCom(el) {
  const sqOf = e => { const m = e?.className.match(/square-(\d)(\d)/); return m ? [m[1] - 1, m[2] - 1] : undefined; };
  const board = emptyBoard();
  let dragged, drag;
  for (const p of el.querySelectorAll('.piece')) {
    const m = p.className.match(/\b([wb])([pnbrqk])\b/), sq = sqOf(p);
    if (!m || !sq) continue;
    const piece = { color: m[1] === 'w' ? 'white' : 'black', role: m[2] };
    if (p.classList.contains('dragging')) dragged = [piece, sq];
    else board[sq[0]][sq[1]] = piece;
  }
  if (dragged) {
    const hover = el.querySelector('.hover-square');
    const at = hover && hover.style.visibility !== 'hidden' ? sqOf(hover) : undefined;
    drag = placeDrag(board, dragged[0], at, dragged[1], [...el.querySelectorAll('.hint, .capture-hint')].map(sqOf));
  }
  return { black: el.classList.contains('flipped'), board, drag };
}

function render(el, { black, board, drag }) {
  const me = black ? 'black' : 'white';
  const threat = attackers(board, black ? 'white' : 'black');
  const cover = attackers(board, me);

  let overlay = el.querySelector(':scope > div.threat-map');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'threat-map';
    overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:0;display:grid;grid-template:repeat(8,1fr)/repeat(8,1fr)';
    for (let i = 0; i < 64; i++) overlay.appendChild(document.createElement('div'));
    el.prepend(overlay);
  }
  overlay.childNodes.forEach((cell, i) => {
    const c = i % 8, w = Math.floor(i / 8);
    const [f, r] = black ? [7 - c, w] : [c, 7 - w];
    cell.style.background = color(threat[f][r].length, cover[f][r].length);
  });

  const [foes, friends] = drag && board[drag[0]][drag[1]].color === me ? [threat, cover] : [cover, threat];
  drawArrows(el, drag ? conflicts(board, drag, foes, friends) : [],
    ([f, r]) => black ? [7.5 - f, r + 0.5] : [f + 0.5, 7.5 - r]);
}

let queued = false;
const update = () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    if (!allowed()) return document.querySelectorAll('.threat-map').forEach(e => e.remove());
    for (const el of document.querySelectorAll('cg-board')) { const pos = readLichess(el); if (pos) render(el, pos); }
    for (const el of document.querySelectorAll('wc-chess-board')) render(el, readChessCom(el));
  });
};
new MutationObserver(muts => {
  // ignore our own overlay writes
  if (muts.every(m => m.target.closest?.('.threat-map'))) return;
  update();
}).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class'] });
addEventListener('resize', update);
update();
