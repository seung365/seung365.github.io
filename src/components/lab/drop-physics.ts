// 공 뽑기 물리: 핀에 튕기며 떨어지는 공. 렌더링과 분리해 공정성(칸별 확률)을 시뮬레이션으로 검증한다
export type Peg = { x: number; y: number };
export type Board = { W: number; H: number; n: number; pegs: Peg[]; slotTop: number; floor: number };
export type Ball = { x: number; y: number; vx: number; vy: number; slot: number; done: boolean; still: number };

export const PEG_R = 4;
export const BALL_R = 7;
const G = 1500;
const BOUNCE = 0.5;
const MAX_V = 1100;
const ROWS = 9;
const WALL_KICK = 220;

export const createBoard = (W: number, H: number, n: number): Board => {
	const slotTop = H - 84;
	const floor = H - 4;
	const top = 70;
	const cols = Math.max(7, Math.round(W / 46));
	const gap = W / cols;
	const rowGap = (slotTop - 26 - top) / (ROWS - 1);
	const pegs: Peg[] = [];
	// 레이아웃 전(폭 0)에 불리면 gap이 0이라 아래 반복이 끝나지 않는다
	if (!(gap > 0)) return { W, H, n, pegs, slotTop, floor };
	for (let r = 0; r < ROWS; r++) {
		// 줄마다 반 칸씩 엇갈리게
		const offset = r % 2 ? 0 : gap / 2;
		for (let x = offset; x <= W + 0.1; x += gap) {
			if (x < PEG_R + 2 || x > W - PEG_R - 2) continue;
			pegs.push({ x, y: top + r * rowGap });
		}
	}
	return { W, H, n, pegs, slotTop, floor };
};

export const createBall = (x: number): Ball => ({ x, y: 18, vx: 0, vy: 0, slot: -1, done: false, still: 0 });

/** dt초만큼 진행. rand는 핀 충돌 때 옆으로 튀는 정도에만 쓴다 */
export const step = (b: Ball, board: Board, dt: number, rand: () => number) => {
	if (b.done) return;
	const { W, n, pegs, slotTop, floor } = board;
	const sub = 4;
	const h = dt / sub;
	for (let s = 0; s < sub; s++) {
		b.vy += G * h;
		b.x += b.vx * h;
		b.y += b.vy * h;

		// 핀
		if (b.y < slotTop) {
			for (const p of pegs) {
				const dx = b.x - p.x;
				const dy = b.y - p.y;
				const d2 = dx * dx + dy * dy;
				const min = BALL_R + PEG_R;
				if (d2 >= min * min) continue;
				const d = Math.sqrt(d2) || 0.001;
				const nx = dx / d;
				const ny = dy / d;
				b.x = p.x + nx * min;
				b.y = p.y + ny * min;
				const vn = b.vx * nx + b.vy * ny;
				if (vn < 0) {
					b.vx -= (1 + BOUNCE) * vn * nx;
					b.vy -= (1 + BOUNCE) * vn * ny;
					// 핀 꼭대기에 멈추지 않게 옆으로 살짝 흔든다
					b.vx += (rand() - 0.5) * 120;
				}
			}
		}

		// 칸 안으로 들어가면 그 칸 벽 사이에 가둔다
		const slotW = W / n;
		if (b.y >= slotTop) {
			if (b.slot < 0) b.slot = Math.min(n - 1, Math.max(0, Math.floor(b.x / slotW)));
			const left = b.slot * slotW + BALL_R + 1.5;
			const right = (b.slot + 1) * slotW - BALL_R - 1.5;
			if (b.x < left) [b.x, b.vx] = [left, Math.abs(b.vx) * BOUNCE];
			if (b.x > right) [b.x, b.vx] = [right, -Math.abs(b.vx) * BOUNCE];
		}

		// 바깥 벽: 벽을 타고 끝 칸으로 미끄러지면 양 끝 칸만 잘 나와서, 안쪽으로 튕겨 낸다
		const kick = b.y < slotTop ? WALL_KICK : 0;
		if (b.x < BALL_R) [b.x, b.vx] = [BALL_R, Math.max(Math.abs(b.vx) * BOUNCE, kick)];
		if (b.x > W - BALL_R) [b.x, b.vx] = [W - BALL_R, -Math.max(Math.abs(b.vx) * BOUNCE, kick)];

		const sp = Math.hypot(b.vx, b.vy);
		if (sp > MAX_V) {
			b.vx *= MAX_V / sp;
			b.vy *= MAX_V / sp;
		}

		if (b.y >= floor - BALL_R) {
			b.y = floor - BALL_R;
			b.done = true;
			return;
		}
	}
	// 어디 끼어서 오래 안 움직이면 살짝 밀어준다
	b.still = Math.hypot(b.vx, b.vy) < 8 ? b.still + dt : 0;
	if (b.still > 0.4) {
		b.vx += (rand() - 0.5) * 200;
		b.vy -= 60;
		b.still = 0;
	}
};
