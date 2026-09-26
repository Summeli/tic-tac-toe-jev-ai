import { gameMove, P1, P2 } from "./GameUtil";

/**
 * Memory for Jev: remembers the last MAX_LOSSES lost games and lets later
 * games avoid the moves that led to them. Stored in localStorage, so it
 * survives page reloads.
 */

type PlayedMove = {
	boardKey: string;
	board: string[][];
	move: gameMove;
	possibleMoves: gameMove[];
};

export type Lesson = {
	board: string[][];
	move: gameMove;
	finalBoard: string[][];
};

type LostGame = {
	moves: PlayedMove[];
	finalBoard: string[][];
};

const MAX_LOSSES = 10;
const STORAGE_KEY = "jev-lost-games";

// Oldest first, at most MAX_LOSSES.
let lostGames: LostGame[] = loadLostGames();
// boardKey -> moveIds that are known to lead to a loss from that position
let losingMoves = new Map<string, Set<string>>();
let lessons: Lesson[] = [];
rebuildFromLostGames();
let currentGame: PlayedMove[] = [];
let gamesPlayed = 0;
let gamesLost = 0;

export function moveId(move: gameMove): string {
	return `${move.row}_${move.col}`;
}

function normalizeBoard(board: string[][]): string[][] {
	return board.map((row) => row.map((cell) => (cell === P1 || cell === P2 ? cell : "")));
}

function boardKey(board: string[][]): string {
	return normalizeBoard(board)
		.map((row) => row.map((cell) => cell || "-").join(""))
		.join("/");
}

function isLosing(key: string, move: gameMove): boolean {
	return losingMoves.get(key)?.has(moveId(move)) ?? false;
}

/** Moves from this position that have not (yet) led to a loss. */
export function filterKnownLosingMoves(board: string[][], possibleMoves: gameMove[]): gameMove[] {
	const key = boardKey(board);
	return possibleMoves.filter((move) => !isLosing(key, move));
}

/** Call for every move Jev makes, before the board is mutated. */
export function recordMove(board: string[][], move: gameMove, possibleMoves: gameMove[]): void {
	const key = boardKey(board);
	const last = currentGame[currentGame.length - 1];
	if (last && last.boardKey === key) {
		// Same position asked twice (e.g. effect re-run); keep the latest move.
		currentGame.pop();
	}
	currentGame.push({ boardKey: key, board: normalizeBoard(board), move, possibleMoves });
}

export function startNewGame(): void {
	currentGame = [];
}

function loadLostGames(): LostGame[] {
	try {
		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
		return Array.isArray(stored) ? stored.slice(-MAX_LOSSES) : [];
	} catch {
		return [];
	}
}

function saveLostGames(): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(lostGames));
	} catch {
		// Storage unavailable (private mode, quota); memory still works for this session.
	}
}

/** Replays the remembered lost games, oldest first, to derive losing moves and lessons. */
function rebuildFromLostGames(): void {
	losingMoves = new Map();
	lessons = [];
	for (const game of lostGames) {
		blameMoves(game);
	}
}

/**
 * Blame the last move of a lost game. If that leaves a position where every
 * move is known to lose, the position itself was lost, so blame the move
 * that led there too, and so on backwards.
 */
function blameMoves(game: LostGame): void {
	for (let i = game.moves.length - 1; i >= 0; i--) {
		const played = game.moves[i];
		let set = losingMoves.get(played.boardKey);
		if (!set) {
			set = new Set();
			losingMoves.set(played.boardKey, set);
		}
		set.add(moveId(played.move));
		lessons.push({ board: played.board, move: played.move, finalBoard: game.finalBoard });

		const positionLost = played.possibleMoves.every((m) => isLosing(played.boardKey, m));
		if (!positionLost) {
			break;
		}
	}
}

export function recordLoss(finalBoard: string[][]): void {
	gamesPlayed++;
	gamesLost++;
	lostGames.push({ moves: currentGame, finalBoard: normalizeBoard(finalBoard) });
	if (lostGames.length > MAX_LOSSES) {
		// Dropping the oldest loss can change what the rest imply, so rebuild.
		lostGames = lostGames.slice(-MAX_LOSSES);
		rebuildFromLostGames();
	} else {
		blameMoves(lostGames[lostGames.length - 1]);
	}
	saveLostGames();

	console.log(
		`[Jev] Lost game ${gamesPlayed} (${gamesLost} losses this session). ` +
			`Remembering the last ${lostGames.length} lost games, with losing moves in ${losingMoves.size} positions.`
	);
	currentGame = [];
}

/** Forget every remembered lost game, so Jev starts learning from scratch. */
export function clearLostGames(): void {
	lostGames = [];
	currentGame = [];
	gamesPlayed = 0;
	gamesLost = 0;
	rebuildFromLostGames();
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {
		// Storage unavailable; in-memory state is already cleared.
	}
	console.log("[Jev] Forgot all lost games.");
}

export function recordNotLost(): void {
	gamesPlayed++;
	console.log(`[Jev] Game ${gamesPlayed} not lost (${gamesLost} losses this session).`);
	currentGame = [];
}

/** Lessons from the remembered lost games, newest first, for giving Jev context. */
export function recentLessons(): Lesson[] {
	return [...lessons].reverse();
}
