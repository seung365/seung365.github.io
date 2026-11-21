// 공 뽑기 화면: 공을 떨어뜨려 들어간 칸이 당첨. 물리는 drop-physics.ts
import { cssVar, isDark, onThemeChange } from "../../utils/theme-color";
import { BALL_R, type Ball, type Board, createBall, createBoard, PEG_R, step } from "./drop-physics";

type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };

export function mountDropPick(
	canvas: HTMLCanvasElement,
	onLand: (slot: number) => void,
): { setItems: (items: string[]) => void; drop: (x?: number) => void; destroy: () => void } {
	const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
	let items: string[] = [];
	let board: Board = createBoard(1, 1, 2);
	let balls: (Ball & { trail: [number, number][] })[] = [];
	let particles: Particle[] = [];
	let flash: number[] = [];
	let W = 0;
	let H = 0;
	let raf = 0;
	let last = 0;
	let colors = { primary: "", peg: "", line: "", text: "", glow: "" };

	const readColors = () => {
		const dark = isDark();
		colors = {
			primary: cssVar("--primary"),
			peg: dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.28)",
			line: dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.1)",
			text: dark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.7)",
			glow: dark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.6)",
		};
	};

	const rebuild = () => {
		balls = [];
		flash = items.map(() => 0);
		board = createBoard(W, H, Math.max(2, items.length));
		draw();
	};

	const resize = () => {
		const rect = canvas.getBoundingClientRect();
		const dpr = Math.min(window.devicePixelRatio, 2);
		W = rect.width;
		H = rect.height;
		canvas.width = Math.round(W * dpr);
		canvas.height = Math.round(H * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		rebuild();
	};

	// 칸 이름: 한 줄에 안 들어가면 띄어쓰기 기준 두 줄, 그래도 넘치면 말줄임
	const fitLabel = (text: string, maxW: number): string[] => {
		const fits = (t: string) => ctx.measureText(t).width <= maxW;
		const clip = (t: string) => {
			if (fits(t)) return t;
			while (t.length > 1 && !fits(`${t}…`)) t = t.slice(0, -1);
			return `${t}…`;
		};
		// 좁은 칸은 처음부터 작게 시작해 칸마다 글자 크기가 들쭉날쭉하지 않게
		for (let size = maxW < 60 ? 11 : 14; size >= 10; size--) {
			ctx.font = `700 ${size}px "Pretendard Variable", Pretendard, sans-serif`;
			if (fits(text)) return [text];
		}
		const words = text.split(" ");
		if (words.length > 1) {
			let best = 1;
			for (let k = 1; k < words.length; k++) {
				const a = words.slice(0, k).join(" ");
				const b = words.slice(k).join(" ");
				if (Math.max(ctx.measureText(a).width, ctx.measureText(b).width) < Math.max(ctx.measureText(words.slice(0, best).join(" ")).width, ctx.measureText(words.slice(best).join(" ")).width)) best = k;
			}
			return [clip(words.slice(0, best).join(" ")), clip(words.slice(best).join(" "))];
		}
		return [clip(text)];
	};

	const draw = () => {
		ctx.clearRect(0, 0, W, H);
		const { pegs, slotTop, floor, n } = board;
		const slotW = W / n;

		// 칸
		for (let i = 0; i < n; i++) {
			if (flash[i] > 0) {
				ctx.globalAlpha = flash[i] * 0.35;
				ctx.fillStyle = colors.primary;
				ctx.fillRect(i * slotW, slotTop, slotW, floor - slotTop);
				ctx.globalAlpha = 1;
			}
			ctx.fillStyle = flash[i] > 0.05 ? colors.primary : colors.text;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			const lines = fitLabel(items[i] ?? "", slotW - 6);
			lines.forEach((line, k) => ctx.fillText(line, i * slotW + slotW / 2, floor - 22 + (k - (lines.length - 1) / 2) * 15));
		}
		ctx.strokeStyle = colors.line;
		ctx.lineWidth = 2;
		ctx.beginPath();
		for (let i = 1; i < n; i++) {
			ctx.moveTo(i * slotW, slotTop);
			ctx.lineTo(i * slotW, floor);
		}
		ctx.moveTo(0, floor);
		ctx.lineTo(W, floor);
		ctx.stroke();

		// 핀 (공 근처는 반짝)
		for (const p of pegs) {
			const near = balls.some((b) => Math.hypot(b.x - p.x, b.y - p.y) < BALL_R + PEG_R + 3);
			ctx.fillStyle = near ? colors.glow : colors.peg;
			ctx.beginPath();
			ctx.arc(p.x, p.y, near ? PEG_R + 1.5 : PEG_R, 0, Math.PI * 2);
			ctx.fill();
		}

		// 떨어뜨리는 곳 안내선
		ctx.setLineDash([4, 6]);
		ctx.strokeStyle = colors.line;
		ctx.beginPath();
		ctx.moveTo(0, 40);
		ctx.lineTo(W, 40);
		ctx.stroke();
		ctx.setLineDash([]);

		// 공 + 꼬리
		for (const b of balls) {
			b.trail.forEach(([x, y], i) => {
				ctx.globalAlpha = (i / b.trail.length) * 0.25;
				ctx.fillStyle = colors.primary;
				ctx.beginPath();
				ctx.arc(x, y, BALL_R * (i / b.trail.length), 0, Math.PI * 2);
				ctx.fill();
			});
			ctx.globalAlpha = 1;
			ctx.fillStyle = colors.primary;
			ctx.beginPath();
			ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = "rgba(255,255,255,0.6)";
			ctx.beginPath();
			ctx.arc(b.x - 2.2, b.y - 2.2, 2.2, 0, Math.PI * 2);
			ctx.fill();
		}

		for (const p of particles) {
			ctx.globalAlpha = Math.max(0, p.life);
			ctx.fillStyle = p.color;
			ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
		}
		ctx.globalAlpha = 1;
	};

	const land = (b: Ball) => {
		flash[b.slot] = 1;
		const cx = (b.slot + 0.5) * (W / board.n);
		const palette = [colors.primary, "#f59e0b", "#10b981", "#ef4444", "#6366f1"];
		for (let i = 0; i < 28; i++) {
			const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
			const v = 180 + Math.random() * 260;
			particles.push({ x: cx, y: board.slotTop, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, color: palette[i % palette.length] });
		}
		onLand(b.slot);
	};

	const frame = (now: number) => {
		const dt = Math.min((now - last) / 1000, 1 / 30);
		last = now;
		for (const b of balls) {
			step(b, board, dt, Math.random);
			b.trail.push([b.x, b.y]);
			if (b.trail.length > 8) b.trail.shift();
			if (b.done) land(b);
		}
		balls = balls.filter((b) => !b.done);
		for (const p of particles) {
			p.vy += 900 * dt;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.life -= dt * 1.2;
		}
		particles = particles.filter((p) => p.life > 0);
		flash = flash.map((f) => Math.max(0, f - dt * 0.5));
		draw();
		// 움직일 게 없으면 루프를 멈춘다
		raf = balls.length || particles.length || flash.some((f) => f > 0) ? requestAnimationFrame(frame) : 0;
	};

	const kick = () => {
		if (raf) return;
		last = performance.now();
		raf = requestAnimationFrame(frame);
	};

	const drop = (x?: number) => {
		if (items.length < 2) return;
		// 위치를 안 주면 폭 전체에서 균일하게 → 칸별 확률이 같다 (scripts/check-drop-fairness.ts)
		const px = x ?? BALL_R + Math.random() * (W - BALL_R * 2);
		const jitter = (Math.random() - 0.5) * 6;
		balls.push({ ...createBall(Math.min(W - BALL_R, Math.max(BALL_R, px + jitter))), trail: [] });
		kick();
	};

	const onPointer = (e: PointerEvent) => {
		const r = canvas.getBoundingClientRect();
		// 위쪽 영역을 누르면 그 자리에서 떨어뜨린다
		if (e.clientY - r.top < board.pegs[0]?.y) drop(e.clientX - r.left);
	};

	readColors();
	const ro = new ResizeObserver(resize);
	ro.observe(canvas);
	const stopTheme = onThemeChange(() => {
		readColors();
		draw();
	});
	canvas.addEventListener("pointerdown", onPointer);

	return {
		setItems(next) {
			items = next;
			rebuild();
		},
		drop,
		destroy() {
			cancelAnimationFrame(raf);
			ro.disconnect();
			stopTheme();
			canvas.removeEventListener("pointerdown", onPointer);
		},
	};
}
