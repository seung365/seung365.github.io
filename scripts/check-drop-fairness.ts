// 공 뽑기 공정성 체크: npx -y node@24 scripts/check-drop-fairness.ts
import { createBall, createBoard, step } from "../src/components/lab/drop-physics.ts";
// 공정성 체크: 폭 전체에서 균일하게 떨어뜨리면 칸별 확률이 고르게 나와야 한다
for (const [W, n] of [[720, 8], [340, 8], [340, 2], [720, 5]] as const) {
	const board = createBoard(W, 416, n);
	const counts = Array(n).fill(0);
	const N = 4000;
	let maxT = 0;
	for (let i = 0; i < N; i++) {
		const b = createBall(7 + Math.random() * (W - 14));
		let t = 0;
		while (!b.done && t < 20) { step(b, board, 1 / 60, Math.random); t += 1 / 60; }
		if (!b.done) throw new Error("ball stuck");
		maxT = Math.max(maxT, t);
		counts[b.slot]++;
	}
	const pct = counts.map((c) => ((c / N) * 100).toFixed(1));
	const exp = 100 / n;
	const worst = Math.max(...counts.map((c) => Math.abs((c / N) * 100 - exp)));
	console.log(`W=${W} n=${n} expected ${exp.toFixed(1)}% → ${pct.join(" ")} | worst dev ${worst.toFixed(1)}%p | max ${maxT.toFixed(1)}s`);
	if (worst > exp * 0.2) throw new Error("unfair");
}
console.log("fair ok");
// 폭 0(레이아웃 전)에서도 멈추지 않아야 한다
if (createBoard(0, 0, 3).pegs.length !== 0) throw new Error("zero width board");
console.log("zero width ok");
