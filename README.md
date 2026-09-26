# Tic-Tac-Toe-AI-Challenge
Can you create an AI for classic Tic-Tac-Toe?

# 🏃 Getting started 
The challenge is made with typescript and react

### Install NPM and Yarn
Install [npm](https://docs.npmjs.com/) and then you can install yarn with npm:

```bash
npm install --global yarn
```

### 🚀 Building and running the applicaiton
install the dependencies with
```bash
yarn install
```

and then run 
```bash
yarn start
```

# ✨ The Challenge
You are O (P2) and the challenge is to write an AI that can play a tie in tic-tac-toe
Start with ai.tsx

### 🌱 The board
the intial state of the board is filled with number from 1 to 9
```typescript
1 2 3  
4 5 6  
7 8 9  
```


First you need to name your bot by editing the line
```typescript
export const PLAYER_NAME = "";
```

Then you need to implement the getNextMove function
```typescript
export function getNextMove(board: string[][], round: number): gameMove {
	const possibleMoves: gameMove[] = getPossibleMoves(board);
	return possibleMove[0];
}
```

### 💦 Help?
See helpper functions in 
GameUtil.tsx

#### getPossibleMoves
Gets all the possible moves on the board

#### isWinning
returns true, if player is winning

#### isSpotOpen
returns true if spot is open

isMovesLeft

# 🤖 How Jev plays
This version's bot is **Jev**, the `typesafe-ai/jev` model, called through the Vercel AI Gateway. Put your key in `.env` (see `.env.example`). The dev server proxy in `src/setupProxy.js` adds the key server-side, so it never ends up in the browser bundle.

### 🎯 Making a move
On each turn `getNextMove` in `src/ai.tsx`:
1. Gets the open cells with `getPossibleMoves`. Every open cell is offered to Jev, and no moves are filtered out.
2. Sends an `evaluate` request to Jev with:
   - the board, written out cell by cell (`row 0 column 1: X`, `row 1 column 1: empty`, ...)
   - who is who (Jev is `O`, the opponent is `X`)
   - a simple strategy: win if possible, otherwise block, otherwise take the center, then a corner, then an edge, and look for forks
   - the recent losses, if there are any (see below)
   - a single `choice` question, "What is your next move?", with one option per open cell
3. Plays the cell Jev picked. If the request fails or the answer doesn't match an open cell, it falls back to the first open cell.

The full request and response are logged to the browser console with the `[Jev]` prefix.

### 📚 Learning from mistakes
`src/learning.tsx` gives Jev a memory of its **last 10 lost games**:
- Every move Jev makes is recorded along with the board it was played on.
- When Jev loses, the **last move** of that game is marked as a losing move for that position. If that leaves a position where *every* option has lost, the position was already lost, so the move that led there is blamed too, and so on backwards.
- The blamed moves are sent to Jev as `recent_losses` (the board before the move, the move, and the final board), with a note asking it to avoid repeating those mistakes.
- Losing moves are **not** filtered out. Jev still gets every open cell as an option and decides for itself, using the losses only as context.

The lost games are stored in `localStorage`, so the memory survives page reloads. Only the 10 most recent losses are kept, and the **reset Jev's memory** button clears them so Jev starts learning from scratch.
