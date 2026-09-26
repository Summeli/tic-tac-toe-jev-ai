import axios from "axios";
import { gameMove, getPossibleMoves, P1, P2 } from "./GameUtil";
import { filterKnownLosingMoves, Lesson, moveId, recentLessons, recordMove } from "./learning";

export const PLAYER_NAME = "Jev";

// Proxied by src/setupProxy.js, which adds the API key server-side.
const EVALUATE_URL = "/ai-gateway/v1/evaluate";
const MODEL = "typesafe-ai/jev";

type ChoiceAnswer = {
	type: "choice";
	choice: string;
	probabilities: Record<string, number>;
};

type EvaluateResponse = {
	model: string;
	answers: { move: ChoiceAnswer };
};

const EMPTY_CELL = "empty";

/**
 * Describes the board cell by cell in writing, e.g.
 * row 0 column 0: X
 * row 0 column 1: empty
 * row 0 column 2: O
 * ...
 */
function describeBoard(board: string[][]): string {
	return board
		.flatMap((row, r) =>
			row.map((cell, c) => `row ${r} column ${c}: ${cell === P1 || cell === P2 ? cell : EMPTY_CELL}`)
		)
		.join("\n");
}

function describeLesson(lesson: Lesson): string {
	return (
		`Board before your move:\n${describeBoard(lesson.board)}\n` +
		`You played row ${lesson.move.row} column ${lesson.move.col} and later lost. Final board:\n${describeBoard(lesson.finalBoard)}`
	);
}

/**
 * You are P2, return optimal move
*/
export async function getNextMove(board: string[][], round: number): Promise<gameMove> {
	const allMoves: gameMove[] = getPossibleMoves(board);
	// Skip moves that lost from this exact position earlier in the session,
	// unless every move has lost before.
	const saferMoves = filterKnownLosingMoves(board, allMoves);
	const possibleMoves = saferMoves.length > 0 ? saferMoves : allMoves;
	if (saferMoves.length < allMoves.length) {
		console.log(`[Jev] Avoiding ${allMoves.length - saferMoves.length} move(s) that lost here before`);
	}

	const move = await chooseMove(board, possibleMoves);
	recordMove(board, move, allMoves);
	return move;
}

async function chooseMove(board: string[][], possibleMoves: gameMove[]): Promise<gameMove> {
	if (possibleMoves.length <= 1) {
		return possibleMoves[0];
	}

	const criteria: Record<string, string> = {};
	for (const move of possibleMoves) {
		criteria[moveId(move)] = `Place "${P2}" at row ${move.row}, column ${move.col}.`;
	}

	const lessons = recentLessons();
	const requestBody = {
		model: MODEL,
		state: {
			board: describeBoard(board),
			you: P2,
			opponent: P1,
			...(lessons.length > 0 && { losses_this_session: lessons.map(describeLesson) }),
		},
		questions: {
			move: {
				type: "choice",
				instructions: `Tic-tac-toe (3x3 grid, rows and columns 0-2). The board is listed cell by cell as "row R column C: value", where "${EMPTY_CELL}" marks an open cell. You are playing as "${P2}". Choose the best open cell to play next: win immediately if a winning move exists, otherwise block "${P1}" from winning next turn, otherwise prefer the center, then a corner, then an edge, favoring moves that set up a fork.${lessons.length > 0 ? " `losses_this_session` lists your own earlier moves that led to a loss; avoid repeating the same mistake in similar positions." : ""}`,
				criteria,
			},
		},
	};

	try {
		console.log(`[Jev] Request to AI Gateway:\n${JSON.stringify(requestBody, null, 2)}`);
		const response = await axios.post<EvaluateResponse>(EVALUATE_URL, requestBody);

		const { data } = response;
		console.log(`[Jev] Response from AI Gateway (HTTP ${response.status}):\n${JSON.stringify(data, null, 2)}`);

		const chosenMove = possibleMoves.find((move) => moveId(move) === data.answers.move.choice);
		if (chosenMove) {
			return chosenMove;
		}
		console.warn("[Jev] Returned choice did not match any open move:", data.answers?.move?.choice);
	} catch (error) {
		console.error("Jev move selection failed, falling back to first open spot", error);
		if (axios.isAxiosError(error) && error.response) {
			console.error("[Jev] AI Gateway error response:", error.response.status, error.response.data);
		}
	}

	return possibleMoves[0];
}
