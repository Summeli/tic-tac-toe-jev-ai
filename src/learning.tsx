import { gameMove, P1, P2 } from "./GameUtil";

/**
 * Session memory for Jev: remembers which moves led to lost games and
 * lets later games avoid them. Lives in module scope, so it lasts until
 * the page is reloaded.
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

const MAX_LESSONS_IN_PROMPT = 5;

// boardKey -> moveIds that are known to lead to a loss from that position
const losingMoves = new Map<string, Set<string>>();
const lessons: Lesson[] = [];
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

/**
 * Jev lost: blame its last move. If that leaves a position where every
 * move is known to lose, the position itself was lost, so blame the move
 * that led there too, and so on backwards.
 */
export function recordLoss(finalBoard: string[][]): void {
	gamesPlayed++;
	gamesLost++;
	const final = normalizeBoard(finalBoard);

	for (let i = currentGame.length - 1; i >= 0; i--) {
		const played = currentGame[i];
		let set = losingMoves.get(played.boardKey);
		if (!set) {
			set = new Set();
			losingMoves.set(played.boardKey, set);
		}
		set.add(moveId(played.move));
		lessons.push({ board: played.board, move: played.move, finalBoard: final });

		const positionLost = played.possibleMoves.every((m) => isLosing(played.boardKey, m));
		if (!positionLost) {
			break;
		}
	}

	console.log(
		`[Jev] Lost game ${gamesPlayed} (${gamesLost} losses this session). ` +
			`Remembering losing moves in ${losingMoves.size} positions.`
	);
	currentGame = [];
}

export function recordNotLost(): void {
	gamesPlayed++;
	console.log(`[Jev] Game ${gamesPlayed} not lost (${gamesLost} losses this session).`);
	currentGame = [];
}

/** Most recent lessons, newest first, for giving Jev context. */
export function recentLessons(): Lesson[] {
	return lessons.slice(-MAX_LESSONS_IN_PROMPT).reverse();
}
