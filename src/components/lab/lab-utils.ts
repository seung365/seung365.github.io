// 놀이터 게임 공용: 최고 기록(브라우저 저장소), 결과 공유, 날짜 시드 난수

const KEY_PREFIX = "lab:best:";

// 시크릿 창·저장소 차단에서는 localStorage 접근이 throw 할 수 있다 → 기록만 안 남기고 게임은 그대로
export const loadBest = (key: string): number => {
	try {
		return Number(localStorage.getItem(KEY_PREFIX + key)) || 0;
	} catch {
		return 0;
	}
};

/** 최고 기록이면 저장하고 true */
export const saveBest = (key: string, score: number): boolean => {
	if (score <= loadBest(key)) return false;
	try {
		localStorage.setItem(KEY_PREFIX + key, String(score));
	} catch {
		// 저장 실패는 무시
	}
	return true;
};

/** 낮을수록 좋은 기록 (오차 ms 등). 0도 유효한 기록이라 없으면 null */
export const loadBestLow = (key: string): number | null => {
	try {
		const v = localStorage.getItem(KEY_PREFIX + key);
		return v === null ? null : Number(v);
	} catch {
		return null;
	}
};

export const saveBestLow = (key: string, value: number): boolean => {
	const best = loadBestLow(key);
	if (best !== null && value >= best) return false;
	try {
		localStorage.setItem(KEY_PREFIX + key, String(value));
	} catch {
		// 저장 실패는 무시
	}
	return true;
};

/** 모바일은 공유 시트, 그 외는 클립보드 */
export const shareResult = async (text: string): Promise<"shared" | "copied" | "failed"> => {
	try {
		if (navigator.share && matchMedia("(pointer: coarse)").matches) {
			await navigator.share({ text });
			return "shared";
		}
		await navigator.clipboard.writeText(text);
		return "copied";
	} catch {
		return "failed";
	}
};

/** 한국 시간 기준 오늘 날짜 (YYYY-MM-DD) — 오늘의 챌린지 시드 */
export const todayKST = () =>
	new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());

/** 시드 고정 난수 (mulberry32). 같은 시드면 모두가 같은 판을 받는다 */
export const seededRandom = (seed: string) => {
	let h = 1779033703 ^ seed.length;
	for (let i = 0; i < seed.length; i++) {
		h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
		h = (h << 13) | (h >>> 19);
	}
	let a = h >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};

export const SITE_URL = "https://seung365.github.io";
