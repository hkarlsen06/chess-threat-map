# Chess Threat Map

A browser extension for **lichess.org** and **chess.com** that colors every square by who controls it, and shows the conflicts of a move while you drag a piece.

| Square | Meaning |
|---|---|
| 🔴 Red | More enemy pieces attack it than you defend it (deeper = bigger gap) |
| 🟡 Yellow | Contested: attacked, but defended at least as many times |
| 🟢 Green | Only you attack it — a safe square to move to |
| 🔵 Blue | Nobody attacks it |

While dragging a piece over a legal square, arrows show who would attack it there (red), who would defend it (green) and which enemy pieces it would hit (thin blue). "You" is the side at the bottom of the board.

## Only for practice

Using this against people is cheating, so it only runs:

- **lichess:** games against BOT accounts or Stockfish, analysis board, studies, puzzles, practice, learn, board editor
- **chess.com:** games against computer bots, analysis, puzzles (not Puzzle Rush or Battle), lessons, drills, practice

Everywhere else (rated or casual games against people, puzzle races) it stays off.

## Install

**Chrome / Edge / Brave:** open `chrome://extensions`, enable Developer mode, click *Load unpacked* and pick the `extension` folder.

**Safari (macOS):** needs Xcode and an Apple Development certificate. Run `./safari.sh`, then enable *Chess Threat Map* in Safari → Settings → Extensions.

## Limits

- Counts direct attacks only: no x-rays through a piece, no pins, no piece values (a pawn attacking your queen's square shows yellow if you defend it once).
- Legal squares come from the site's move dots. With move dots turned off, every square counts as legal.

## Test

```sh
npm install && npm test
```
