// stale-while-revalidate 시뮬레이터의 규칙. 화면과 분리해 scripts/check-swr-sim.ts로 글의 실측 표와 맞춰 본다.
// 시간 단위는 초. 요청은 시간 순서대로 들어온다고 가정한다
export type Outcome = "miss" | "fresh" | "stale" | "wait" | "blocking";
export type ServerHit = { at: number; end: number; status: 200 | 304; inm: number | null; version: number };
export type Req = { at: number; outcome: Outcome; doneAt: number; version: number; hit: ServerHit | null };
export type Band = { from: number; freshUntil: number; swrUntil: number };
type Inflight = { end: number; version: number };

export const OUTCOME_LABEL: Record<Outcome, string> = {
	miss: "캐시 없음 → 기다림",
	fresh: "신선 → 바로",
	stale: "만료(창 안) → 옛 값 바로, 뒤에서 재검증",
	wait: "재검증 중 → 끝날 때까지 기다림",
	blocking: "창도 지남 → 기다림",
};

export function createSim(opts: { maxAge: number; swr: number; delay: number }) {
	const { maxAge, swr, delay } = opts;
	let serverVersion = 1;
	let cache: { version: number; storedAt: number } | null = null;
	let inflight: Inflight | null = null;
	const reqs: Req[] = [];
	const hits: ServerHit[] = [];
	const bands: Band[] = [];
	const bumps: { at: number; version: number }[] = [];

	// 끝난 재검증을 캐시에 반영. 304든 200이든 받은 시점부터 다시 신선해진다
	const settle = (t: number) => {
		if (!inflight || inflight.end > t) return;
		cache = { version: inflight.version, storedAt: inflight.end };
		bands.push({ from: inflight.end, freshUntil: inflight.end + maxAge, swrUntil: inflight.end + maxAge + swr });
		inflight = null;
	};

	const hitServer = (t: number, inm: number | null): ServerHit => {
		const hit: ServerHit = { at: t, end: t + delay, status: inm === serverVersion ? 304 : 200, inm, version: serverVersion };
		hits.push(hit);
		inflight = { end: hit.end, version: serverVersion };
		return hit;
	};

	const request = (t: number): Req => {
		settle(t);
		let req: Req;
		if (inflight) {
			// 진행 중인 요청이 있으면 그걸 기다린다 (Chrome 실측: 재검증 중에 온 요청은 옛 값을 바로 받지 않았다)
			req = { at: t, outcome: cache ? "wait" : "miss", doneAt: inflight.end, version: inflight.version, hit: null };
		} else if (!cache) {
			const hit = hitServer(t, null);
			req = { at: t, outcome: "miss", doneAt: hit.end, version: hit.version, hit };
		} else {
			const age = t - cache.storedAt;
			if (age < maxAge) {
				req = { at: t, outcome: "fresh", doneAt: t, version: cache.version, hit: null };
			} else if (age < maxAge + swr) {
				const hit = hitServer(t, cache.version);
				req = { at: t, outcome: "stale", doneAt: t, version: cache.version, hit };
			} else {
				const hit = hitServer(t, cache.version);
				req = { at: t, outcome: "blocking", doneAt: hit.end, version: hit.version, hit };
			}
		}
		reqs.push(req);
		return req;
	};

	const bump = (t: number) => {
		serverVersion += 1;
		bumps.push({ at: t, version: serverVersion });
	};

	return { request, bump, settle, reqs, hits, bands, bumps, maxAge, swr, delay };
}

/** 글의 Chrome 실험과 같은 순서 (bump는 서버 데이터 변경) */
export const ARTICLE_PLAN: [number, "request" | "bump"][] = [
	[0, "request"],
	[1, "request"],
	[3, "request"],
	[3.5, "request"],
	[4.5, "request"],
	[5, "bump"],
	[7.6, "request"],
	[8.8, "request"],
	[16, "request"],
];
