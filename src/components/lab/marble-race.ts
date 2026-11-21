// 공 레이스 화면: 코스를 그리고 카메라가 승부가 나는 공을 따라간다. 물리는 race-physics.ts
import { cssVar, isDark, onThemeChange } from "../../utils/theme-color";
import { type Course, createCourse, type Marble, placeMarbles, R, ranking, shuffle, spinnerEnds, step } from "./race-physics";

export type Entry = { name: string; color: string };
export type RaceOptions = { entries: Entry[]; winBy: "first" | "last"; winners: number };
export type RaceEvents = {
	onTick: (state: { left: number; leader: string; t: number }) => void;
	/** 당첨자가 확정된 순간 (남은 공은 계속 달린다) */
	onDecided: (winners: Entry[]) => void;
	onFinish: (order: Entry[]) => void;
};

const TIME_LIMIT = 90;

export function mountMarbleRace(canvas: HTMLCanvasElement, ev: RaceEvents) {
	const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
	let course: Course = createCourse();
	let marbles: Marble[] = [];
	let opts: RaceOptions = { entries: [], winBy: "first", winners: 1 };
	let running = false;
	let decided = false;
	let dirty = true;
	let speed = 1;
	let t = 0;
	let camY = 0;
	let raf = 0;
	let last = 0;
	let tickAcc = 0;
	let W = 0;
	let H = 0;
	let colors = { primary: "", peg: "", wall: "", text: "", bg: "" };

	const readColors = () => {
		const dark = isDark();
		colors = {
			primary: cssVar("--primary"),
			peg: dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.35)",
			wall: dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)",
			text: dark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.65)",
			bg: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
		};
	};

	const resize = () => {
		const rect = canvas.getBoundingClientRect();
		const dpr = Math.min(window.devicePixelRatio, 2);
		W = rect.width;
		H = rect.height;
		canvas.width = Math.round(W * dpr);
		canvas.height = Math.round(H * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		dirty = true;
	};

	// 넓은 화면에서 너무 확대되지 않게 세로로 이만큼(월드 단위)은 보이게 하고 가운데 정렬
	const scale = () => Math.min(W / course.W, H / 560);
	const offX = () => (W - course.W * scale()) / 2;
	const viewH = () => H / scale();

	// 카메라: 먼저 도착 모드는 선두, 마지막 도착 모드는 첫 골인 이후 꼴찌를 따라간다
	const focusY = () => {
		const live = marbles.filter((m) => m.finish === null);
		if (!live.length) return course.goal;
		const ys = live.map((m) => m.y);
		const anyDone = live.length < marbles.length;
		return opts.winBy === "last" && anyDone ? Math.min(...ys) : Math.max(...ys);
	};

	const draw = () => {
		if (!W) return;
		const s = scale();
		ctx.clearRect(0, 0, W, H);
		ctx.save();
		ctx.translate(offX(), 0);
		ctx.scale(s, s);
		ctx.translate(0, -camY);
		const top = camY - 40;
		const bottom = camY + viewH() + 40;
		// 코스 양쪽 벽
		ctx.strokeStyle = colors.wall;
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(0, top);
		ctx.lineTo(0, bottom);
		ctx.moveTo(course.W, top);
		ctx.lineTo(course.W, bottom);
		ctx.stroke();

		// 골 라인 (체커)
		const sq = 10;
		for (let i = 0; i * sq < course.W; i++) {
			for (let j = 0; j < 2; j++) {
				ctx.fillStyle = (i + j) % 2 ? colors.text : "transparent";
				ctx.fillRect(i * sq, course.goal + j * sq, sq, sq);
			}
		}

		for (const p of course.pegs) {
			if (p.y < top || p.y > bottom) continue;
			ctx.fillStyle = p.bump ? colors.primary : colors.peg;
			ctx.globalAlpha = p.bump ? 0.35 : 1;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
			ctx.fill();
			if (p.bump) {
				ctx.globalAlpha = 1;
				ctx.strokeStyle = colors.primary;
				ctx.lineWidth = 2;
				ctx.stroke();
			}
		}
		ctx.globalAlpha = 1;
		ctx.lineCap = "round";
		ctx.strokeStyle = colors.wall;
		ctx.lineWidth = 4;
		for (const g of course.segs) {
			ctx.beginPath();
			ctx.moveTo(g.ax, g.ay);
			ctx.lineTo(g.bx, g.by);
			ctx.stroke();
		}
		ctx.strokeStyle = colors.primary;
		ctx.lineWidth = 5;
		for (const sp of course.spinners) {
			const e = spinnerEnds(sp);
			ctx.beginPath();
			ctx.moveTo(e.ax, e.ay);
			ctx.lineTo(e.bx, e.by);
			ctx.stroke();
			ctx.fillStyle = colors.primary;
			ctx.beginPath();
			ctx.arc(sp.cx, sp.cy, 5, 0, Math.PI * 2);
			ctx.fill();
		}

		// 공
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `800 ${R}px "Pretendard Variable", Pretendard, sans-serif`;
		for (const m of marbles) {
			if (m.finish !== null || m.y < top || m.y > bottom) continue;
			const e = opts.entries[m.id];
			ctx.fillStyle = e.color;
			ctx.beginPath();
			ctx.arc(m.x, m.y, R, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = "#fff";
			ctx.fillText(e.name.slice(0, 1), m.x, m.y + 0.5);
		}
		ctx.restore();

		// 오른쪽 미니맵: 코스 전체에서 공 위치
		const mx = W - 10;
		ctx.fillStyle = colors.bg;
		ctx.fillRect(mx - 4, 8, 8, H - 16);
		const toMini = (y: number) => 8 + (y / course.H) * (H - 16);
		ctx.strokeStyle = colors.text;
		ctx.lineWidth = 1;
		ctx.strokeRect(mx - 4, toMini(camY), 8, (viewH() / course.H) * (H - 16));
		for (const m of marbles) {
			if (m.finish !== null) continue;
			ctx.fillStyle = opts.entries[m.id].color;
			ctx.fillRect(mx - 3, toMini(m.y) - 1.5, 6, 3);
		}
	};

	const finish = () => {
		running = false;
		ev.onFinish(ranking(marbles).map((m) => opts.entries[m.id]));
	};

	const frame = (now: number) => {
		const dt = Math.min((now - last) / 1000, 1 / 30);
		last = now;
		if (running) {
			for (let k = 0; k < speed; k++) {
				step(marbles, course, dt, t, Math.random);
				t += dt;
			}
			const target = Math.max(0, Math.min(course.H - viewH(), focusY() - viewH() * 0.55));
			camY += (target - camY) * Math.min(1, dt * 4);
			tickAcc += dt;
			if (tickAcc > 0.2) {
				tickAcc = 0;
				const order = ranking(marbles);
				ev.onTick({ left: marbles.filter((m) => m.finish === null).length, leader: opts.entries[order[0].id].name, t });
			}
			const done = marbles.filter((m) => m.finish !== null).length;
			const n = marbles.length;
			if (!decided && (opts.winBy === "first" ? done >= opts.winners : done >= n - opts.winners)) {
				decided = true;
				const order = ranking(marbles).map((m) => opts.entries[m.id]);
				ev.onDecided(opts.winBy === "first" ? order.slice(0, opts.winners) : order.slice(n - opts.winners));
			}
			if (done === n || t > TIME_LIMIT) finish();
		}
		// 멈춰 있을 땐 바뀐 게 있을 때만 그린다
		if ((running || dirty) && !document.hidden) {
			draw();
			dirty = false;
		}
		raf = requestAnimationFrame(frame);
	};

	const start = (o: RaceOptions) => {
		opts = o;
		course = createCourse();
		// 출발 위치는 매번 섞는다 → 이름마다 확률이 같다 (scripts/check-race-fairness.ts)
		marbles = placeMarbles(shuffle([...o.entries.keys()], Math.random), course.W);
		t = 0;
		camY = 0;
		decided = false;
		running = true;
	};

	readColors();
	const ro = new ResizeObserver(resize);
	ro.observe(canvas);
	const stopTheme = onThemeChange(() => {
		readColors();
		dirty = true;
	});
	last = performance.now();
	raf = requestAnimationFrame(frame);

	return {
		start,
		preview(entries: Entry[]) {
			if (running) return;
			opts = { ...opts, entries };
			marbles = placeMarbles([...entries.keys()], course.W);
			camY = 0;
			dirty = true;
		},
		setSpeed(v: number) {
			speed = v;
		},
		get running() {
			return running;
		},
		destroy() {
			cancelAnimationFrame(raf);
			ro.disconnect();
			stopTheme();
		},
	};
}
