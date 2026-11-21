// 공 레이스 공정성 체크: npx -y node@24 scripts/check-race-fairness.ts
// 출발 위치를 매번 섞으면 이름마다 1등 확률이 같아야 한다. 모든 공이 시간 안에 골인해야 한다
import { createCourse, placeMarbles, ranking, shuffle, step } from "../src/components/lab/race-physics.ts";

const N = Number(process.argv[2] ?? 6);
const RACES = Number(process.argv[3] ?? 300);
const wins = Array(N).fill(0);
let maxT = 0;
let timeouts = 0;
const started = Date.now();
for (let r = 0; r < RACES; r++) {
	const course = createCourse();
	const ms = placeMarbles(shuffle([...Array(N).keys()], Math.random), course.W);
	let t = 0;
	while (ms.some((m) => m.finish === null) && t < 120) {
		step(ms, course, 1 / 60, t, Math.random);
		t += 1 / 60;
	}
	if (t >= 120) timeouts++;
	maxT = Math.max(maxT, t);
	wins[ranking(ms)[0].id]++;
}
const exp = 100 / N;
const pct = wins.map((w) => (w / RACES) * 100);
console.log(`N=${N} races=${RACES} 1등 확률(기대 ${exp.toFixed(1)}%): ${pct.map((p) => p.toFixed(1)).join(" ")}`);
console.log(`최장 ${maxT.toFixed(1)}s · 시간초과 ${timeouts} · ${((Date.now() - started) / 1000).toFixed(1)}s 걸림`);
// 표본 오차를 감안한 느슨한 기준 (이름 하나가 기대값의 2배 넘게 이기면 실패)
if (Math.max(...pct) > exp * 2 || timeouts > 0) throw new Error("unfair or stuck");
console.log("race ok");
