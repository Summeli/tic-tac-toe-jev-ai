/**
 * Win/loss counter for Jev. Stored in localStorage, so it survives page reloads.
 */

export type Score = {
	wins: number;
	losses: number;
};

const STORAGE_KEY = "jev-score";

export function loadScore(): Score {
	try {
		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
		return {
			wins: Number.isInteger(stored.wins) ? stored.wins : 0,
			losses: Number.isInteger(stored.losses) ? stored.losses : 0,
		};
	} catch {
		return { wins: 0, losses: 0 };
	}
}

export function saveScore(score: Score): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(score));
	} catch {
		// Storage unavailable (private mode, quota); the score still works for this session.
	}
}
