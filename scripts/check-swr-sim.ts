// SWR 시뮬레이터 규칙이 글의 Chrome 실측 표와 같은 결과를 내는지: npx -y node@24 scripts/check-swr-sim.ts
import { ARTICLE_PLAN, createSim } from "../src/components/sim/swr-model.ts";

const sim = createSim({ maxAge: 2, swr: 5, delay: 1 });
for (const [t, kind] of ARTICLE_PLAN) kind === "bump" ? sim.bump(t) : sim.request(t);
// [시점, 걸린 ms, 받은 버전, 서버 요청]  — 글의 표 (실측 ms는 반올림)
const expected: [number, number, number, string][] = [
	[0, 1000, 1, "200"],
	[1, 0, 1, "-"],
	[3, 0, 1, "304"],
	[3.5, 500, 1, "-"],
	[4.5, 0, 1, "-"],
	[7.6, 0, 1, "200"],
	[8.8, 0, 2, "-"],
	[16, 1000, 2, "304"],
];
sim.reqs.forEach((r, i) => {
	const got: [number, number, number, string] = [r.at, Math.round((r.doneAt - r.at) * 1000), r.version, r.hit ? String(r.hit.status) : "-"];
	const ok = JSON.stringify(got) === JSON.stringify(expected[i]);
	console.log(ok ? "✓" : "✗", got.join(" | "), r.outcome);
	if (!ok) throw new Error(`mismatch at ${r.at}s: expected ${expected[i].join(" | ")}`);
});
console.log("swr sim ok");
