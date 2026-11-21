// 공 레이스 물리: 이름 공 여러 개가 같은 코스를 내려가 골인 순서를 가린다.
// 렌더링과 분리해 공정성(이름별 1등 확률)을 scripts/check-race-fairness.ts로 시뮬레이션한다
export type Circle = { x: number; y: number; r: number; bump: boolean };
export type Seg = { ax: number; ay: number; bx: number; by: number };
export type Spinner = { cx: number; cy: number; len: number; w: number; a: number };
export type Course = { W: number; H: number; goal: number; pegs: Circle[]; segs: Seg[]; spinners: Spinner[] };
export type Marble = { id: number; x: number; y: number; vx: number; vy: number; finish: number | null; still: number };

export const R = 9;
const G = 900;
const MAX_V = 900;
const SUB = 6;

/** 코스는 매번 같다. 공정성은 출발 위치를 섞어서 만든다 */
export const createCourse = (): Course => {
	const W = 400;
	const pegs: Circle[] = [];
	const segs: Seg[] = [];
	const peg = (x: number, y: number, r = 5, bump = false) => pegs.push({ x, y, r, bump });
	const seg = (ax: number, ay: number, bx: number, by: number) => segs.push({ ax, ay, bx, by });

	// 1. 핀밭
	// 벽과 핀 사이 틈이 공 지름보다 좁으면 공이 걸터앉아 멈춘다 → 좌우 대칭으로 틈을 넉넉히
	for (let r = 0; r < 10; r++) {
		const xs = r % 2 ? [...Array(8).keys()].map((k) => 49.5 + k * 43) : [...Array(9).keys()].map((k) => 28 + k * 43);
		for (const x of xs) peg(x, 230 + r * 38);
	}
	// 2. 지그재그 경사로
	seg(0, 640, 300, 700);
	seg(W, 760, 100, 820);
	seg(0, 880, 300, 940);
	seg(W, 1000, 100, 1060);
	// 3. 회전 막대 구간
	const spinners: Spinner[] = [
		{ cx: 110, cy: 1150, len: 150, w: 2.2, a: 0 },
		{ cx: 290, cy: 1250, len: 150, w: -2.6, a: 1 },
		{ cx: 200, cy: 1370, len: 170, w: 1.8, a: 2 },
	];
	for (const [x, y] of [[300, 1140], [30, 1250], [370, 1370], [30, 1380]]) peg(x, y, 7);
	// 4. 깔때기 (공 지름의 3배 넘게 열어 둬서 막히지 않게)
	seg(0, 1450, 168, 1550);
	seg(W, 1450, 232, 1550);
	spinners.push({ cx: 200, cy: 1610, len: 80, w: 4, a: 0 });
	// 5. 범퍼 구간
	for (let r = 0; r < 5; r++) {
		const off = r % 2 ? 50 : 0;
		for (let x = 50 + off; x < W - 20; x += 100) peg(x, 1700 + r * 70, 15, true);
	}
	for (let r = 0; r < 4; r++) {
		const off = r % 2 ? 0 : 50;
		for (let x = 50 + off; x < W - 20; x += 100) peg(x, 1735 + r * 70, 5);
	}
	const goal = 2080;
	return { W, H: goal + 60, goal, pegs, segs, spinners };
};

/** 출발 줄. order는 섞인 공 id 순서 */
export const placeMarbles = (order: number[], W: number): Marble[] => {
	const perRow = Math.floor((W - 2 * R) / (R * 2.4));
	return order.map((id, i) => {
		const row = Math.floor(i / perRow);
		const col = i % perRow;
		return { id, x: R * 1.5 + col * R * 2.4 + (row % 2) * R, y: 30 + row * R * 2.4, vx: 0, vy: 0, finish: null, still: 0 };
	});
};

export const shuffle = <T>(arr: T[], rand: () => number) => {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
};

const spinnerEnds = (s: Spinner) => {
	const dx = (Math.cos(s.a) * s.len) / 2;
	const dy = (Math.sin(s.a) * s.len) / 2;
	return { ax: s.cx - dx, ay: s.cy - dy, bx: s.cx + dx, by: s.cy + dy };
};
export { spinnerEnds };

// 선분과 공 충돌. 회전 막대는 접점의 표면 속도(sv)를 반영한다
const hitSeg = (m: Marble, s: Seg, bounce: number, svx = 0, svy = 0, spin?: Spinner) => {
	const ex = s.bx - s.ax;
	const ey = s.by - s.ay;
	const t = Math.max(0, Math.min(1, ((m.x - s.ax) * ex + (m.y - s.ay) * ey) / (ex * ex + ey * ey)));
	const px = s.ax + ex * t;
	const py = s.ay + ey * t;
	const dx = m.x - px;
	const dy = m.y - py;
	const min = R + 2;
	const d2 = dx * dx + dy * dy;
	if (d2 >= min * min) return;
	const d = Math.sqrt(d2) || 0.001;
	const nx = dx / d;
	const ny = dy / d;
	m.x = px + nx * min;
	m.y = py + ny * min;
	if (spin) {
		svx = -spin.w * (py - spin.cy);
		svy = spin.w * (px - spin.cx);
	}
	const rvx = m.vx - svx;
	const rvy = m.vy - svy;
	const vn = rvx * nx + rvy * ny;
	if (vn < 0) {
		m.vx -= (1 + bounce) * vn * nx;
		m.vy -= (1 + bounce) * vn * ny;
	}
};

export const step = (ms: Marble[], c: Course, dt: number, t: number, rand: () => number) => {
	const h = dt / SUB;
	const live = ms.filter((m) => m.finish === null);
	for (let s = 0; s < SUB; s++) {
		for (const sp of c.spinners) sp.a += sp.w * h;
		for (const m of live) {
			if (m.finish !== null) continue;
			m.vy += G * h;
			m.x += m.vx * h;
			m.y += m.vy * h;

			for (const p of c.pegs) {
				const dy = m.y - p.y;
				if (dy > 30 || dy < -30) continue;
				const dx = m.x - p.x;
				const min = R + p.r;
				const d2 = dx * dx + dy * dy;
				if (d2 >= min * min) continue;
				const d = Math.sqrt(d2) || 0.001;
				const nx = dx / d;
				const ny = dy / d;
				m.x = p.x + nx * min;
				m.y = p.y + ny * min;
				const vn = m.vx * nx + m.vy * ny;
				if (vn < 0) {
					const e = p.bump ? 0.9 : 0.45;
					m.vx -= (1 + e) * vn * nx;
					m.vy -= (1 + e) * vn * ny;
					if (p.bump) {
						// 범퍼는 최소한 이만큼은 튕겨 낸다
						const out = m.vx * nx + m.vy * ny;
						if (out < 260) {
							m.vx += (260 - out) * nx;
							m.vy += (260 - out) * ny;
						}
					}
					m.vx += (rand() - 0.5) * 60;
				}
			}
			for (const sg of c.segs) {
				if (m.y < Math.min(sg.ay, sg.by) - 20 || m.y > Math.max(sg.ay, sg.by) + 20) continue;
				hitSeg(m, sg, 0.25);
			}
			for (const sp of c.spinners) {
				if (Math.abs(m.y - sp.cy) > sp.len / 2 + 20) continue;
				hitSeg(m, spinnerEnds(sp), 0.4, 0, 0, sp);
			}
			if (m.x < R) [m.x, m.vx] = [R, Math.abs(m.vx) * 0.5];
			if (m.x > c.W - R) [m.x, m.vx] = [c.W - R, -Math.abs(m.vx) * 0.5];
		}
		// 공끼리
		for (let i = 0; i < live.length; i++) {
			const a = live[i];
			if (a.finish !== null) continue;
			for (let j = i + 1; j < live.length; j++) {
				const b = live[j];
				if (b.finish !== null) continue;
				const dy = b.y - a.y;
				if (dy > 2 * R || dy < -2 * R) continue;
				const dx = b.x - a.x;
				const d2 = dx * dx + dy * dy;
				if (d2 >= 4 * R * R) continue;
				const d = Math.sqrt(d2) || 0.001;
				const nx = dx / d;
				const ny = dy / d;
				const push = (2 * R - d) / 2;
				a.x -= nx * push;
				a.y -= ny * push;
				b.x += nx * push;
				b.y += ny * push;
				const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
				if (vn < 0) {
					const j2 = (-(1 + 0.6) * vn) / 2;
					a.vx -= j2 * nx;
					a.vy -= j2 * ny;
					b.vx += j2 * nx;
					b.vy += j2 * ny;
				}
			}
		}
		for (const m of live) {
			const sp = Math.hypot(m.vx, m.vy);
			if (sp > MAX_V) {
				m.vx *= MAX_V / sp;
				m.vy *= MAX_V / sp;
			}
			if (m.finish === null && m.y > c.goal) m.finish = t + (s + 1) * h;
		}
	}
	// 어디 끼어서 멈추면 살짝 밀어준다
	for (const m of live) {
		m.still = Math.hypot(m.vx, m.vy) < 12 ? m.still + dt : 0;
		if (m.still > 0.8) {
			// 벽에 붙어 있으면 안쪽으로
			const dir = m.x < c.W * 0.15 ? 1 : m.x > c.W * 0.85 ? -1 : rand() < 0.5 ? -1 : 1;
			m.vx += dir * (120 + rand() * 180);
			m.vy -= 160;
			m.still = 0;
		}
	}
};

/** 골인 순서. 시간 제한으로 끝나면 남은 공은 더 내려간 순 */
export const ranking = (ms: Marble[]) =>
	[...ms].sort((a, b) => {
		if (a.finish !== null && b.finish !== null) return a.finish - b.finish;
		if (a.finish !== null) return -1;
		if (b.finish !== null) return 1;
		return b.y - a.y;
	});
