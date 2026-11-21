// 버그 잡기: 30초 동안 에디터 위를 기어다니는 버그를 클릭/탭으로 잡는 Canvas 2D 아케이드
import { cssVar, onThemeChange, prefersReducedMotion } from "../../utils/theme-color";
import { loadBest, SITE_URL, saveBest, seededRandom, shareResult, todayKST } from "./lab-utils";

type Mode = "daily" | "practice";
type Kind = "bug" | "critical" | "feature" | "hotfix";

type Spawn = { at: number; kind: Kind; x: number; y: number; seed: number };
type Bug = {
	kind: Kind;
	x: number;
	y: number;
	angle: number;
	speed: number;
	r: number;
	born: number;
	life: number;
	dead: number; // 잡힌 시각(연출용), 0 이면 살아있음
	escaped: boolean;
	rand: () => number;
	phase: number;
};
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number };
type Floater = { x: number; y: number; text: string; life: number; color: string };

const DURATION = 30;
const SEGMENTS = 6; // 공유용 5초 구간
const KIND_SPEC: Record<Kind, { r: number; speed: [number, number]; life: number; points: number }> = {
	bug: { r: 17, speed: [55, 95], life: 2.4, points: 10 },
	critical: { r: 13, speed: [140, 190], life: 1.6, points: 30 },
	feature: { r: 19, speed: [10, 25], life: 2.6, points: -20 },
	hotfix: { r: 15, speed: [70, 90], life: 1.8, points: 0 },
};

const RED = "oklch(0.66 0.21 25)";
const GREEN = "oklch(0.70 0.17 150)";
const GOLD = "oklch(0.80 0.16 85)";

/** 시작 전에 판 전체(언제·어디서·무엇이)를 만든다 → 오늘의 챌린지는 모두 같은 판 */
const buildSchedule = (rand: () => number): Spawn[] => {
	const list: Spawn[] = [];
	let t = 0.4;
	let hotfixes = 0;
	while (t < DURATION + 6) {
		const p = Math.min(t / DURATION, 1);
		const roll = rand();
		let kind: Kind = "bug";
		if (roll < 0.12) kind = "feature";
		else if (roll < 0.12 + 0.08 + p * 0.17) kind = "critical";
		else if (roll > 0.975 && hotfixes < 2 && t > 8) {
			kind = "hotfix";
			hotfixes++;
		}
		list.push({ at: t, kind, x: 0.08 + rand() * 0.84, y: 0.1 + rand() * 0.8, seed: Math.floor(rand() * 1e9) });
		t += 0.78 - p * 0.42 + rand() * 0.18; // 점점 빨라진다
	}
	return list;
};

export function mountBugHunt(root: HTMLElement): () => void {
	const canvas = root.querySelector("canvas") as HTMLCanvasElement;
	const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
	const $ = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T;
	const hud = { score: $("[data-score]"), combo: $("[data-combo]"), time: $("[data-time]") };
	const overlay = $("[data-overlay]");
	const startPanel = $("[data-start]");
	const resultPanel = $("[data-result]");
	const reduced = prefersReducedMotion();

	let W = 0;
	let H = 0;
	let dpr = 1;
	const resize = () => {
		const rect = canvas.getBoundingClientRect();
		dpr = Math.min(window.devicePixelRatio, 2);
		W = rect.width;
		H = rect.height;
		canvas.width = Math.round(W * dpr);
		canvas.height = Math.round(H * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		if (state === "idle" || state === "over") drawScene(0);
	};

	// 색은 테마를 따라간다
	let colors = { primary: "", text: "", faint: "", bg: "" };
	const readColors = () => {
		const dark = document.documentElement.classList.contains("dark");
		colors = {
			primary: cssVar("--primary"),
			text: dark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.75)",
			faint: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
			bg: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
		};
	};
	readColors();

	// 에디터 배경: 줄 번호 + 코드처럼 보이는 막대
	let codeLines: { indent: number; parts: number[] }[] = [];
	const buildCode = (rand: () => number) => {
		codeLines = Array.from({ length: 40 }, () => {
			const indent = Math.floor(rand() * 4);
			const parts = Array.from({ length: 1 + Math.floor(rand() * 4) }, () => 20 + rand() * 70);
			return { indent, parts };
		});
	};

	let state: "idle" | "playing" | "over" = "idle";
	let mode: Mode = "daily";
	let elapsed = 0;
	let timeLeft = DURATION;
	let schedule: Spawn[] = [];
	let nextSpawn = 0;
	let bugs: Bug[] = [];
	let particles: Particle[] = [];
	let floaters: Floater[] = [];
	let score = 0;
	let combo = 0;
	let maxCombo = 0;
	let caught = 0;
	let shake = 0;
	let segHit: number[] = [];
	let segMiss: number[] = [];

	const multiplier = () => 1 + Math.min(4, Math.floor(combo / 5)) * 0.5;
	const segIndex = () => Math.min(SEGMENTS - 1, Math.floor((elapsed / DURATION) * SEGMENTS));

	const start = (m: Mode) => {
		mode = m;
		const seed = m === "daily" ? `bug-hunt:${todayKST()}` : `practice:${Date.now()}`;
		const rand = seededRandom(seed);
		schedule = buildSchedule(rand);
		buildCode(rand);
		nextSpawn = 0;
		bugs = [];
		particles = [];
		floaters = [];
		score = combo = maxCombo = caught = 0;
		elapsed = 0;
		timeLeft = DURATION;
		segHit = Array(SEGMENTS).fill(0);
		segMiss = Array(SEGMENTS).fill(0);
		state = "playing";
		overlay.hidden = true;
		updateHud();
		last = performance.now();
	};

	const spawn = (s: Spawn) => {
		const spec = KIND_SPEC[s.kind];
		const rand = seededRandom(String(s.seed));
		const late = Math.min(elapsed / DURATION, 1);
		bugs.push({
			kind: s.kind,
			x: s.x * W,
			y: s.y * H,
			angle: rand() * Math.PI * 2,
			speed: spec.speed[0] + rand() * (spec.speed[1] - spec.speed[0]),
			r: spec.r,
			born: elapsed,
			life: spec.life * (s.kind === "bug" ? 1 - late * 0.3 : 1),
			dead: 0,
			escaped: false,
			rand,
			phase: rand() * 10,
		});
	};

	const burst = (x: number, y: number, color: string, count: number) => {
		for (let i = 0; i < count; i++) {
			const a = Math.random() * Math.PI * 2;
			const v = 80 + Math.random() * 220;
			const max = 0.35 + Math.random() * 0.35;
			particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: max, max, color, size: 2 + Math.random() * 3 });
		}
	};
	const float = (x: number, y: number, text: string, color: string) => floaters.push({ x, y, text, color, life: 0.8 });
	const doShake = (amount: number) => {
		if (!reduced) shake = Math.max(shake, amount);
	};

	const hit = (b: Bug) => {
		b.dead = elapsed;
		const seg = segIndex();
		if (b.kind === "feature") {
			score = Math.max(0, score + KIND_SPEC.feature.points);
			combo = 0;
			segMiss[seg]++;
			burst(b.x, b.y, GREEN, 10);
			float(b.x, b.y - 10, "기능을 지웠다! -20", RED);
			doShake(9);
		} else if (b.kind === "hotfix") {
			timeLeft = Math.min(timeLeft + 3, 99);
			burst(b.x, b.y, GOLD, 18);
			float(b.x, b.y - 10, "핫픽스 +3초", GOLD);
		} else {
			combo++;
			maxCombo = Math.max(maxCombo, combo);
			caught++;
			segHit[seg]++;
			const m = multiplier();
			const gained = Math.round(KIND_SPEC[b.kind].points * m);
			score += gained;
			const color = b.kind === "critical" ? RED : colors.primary;
			burst(b.x, b.y, color, b.kind === "critical" ? 20 : 12);
			float(b.x, b.y - 10, m > 1 ? `+${gained} ×${m}` : `+${gained}`, color);
			if (b.kind === "critical") doShake(7);
			if (combo > 0 && combo % 10 === 0) float(W / 2, H * 0.22, `${combo} COMBO!`, colors.primary);
		}
		updateHud();
	};

	const onPointerDown = (e: PointerEvent) => {
		if (state !== "playing") return;
		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		// 손가락 오차를 감안해 반경 +10px, 가장 가까운 놈
		let target: Bug | null = null;
		let best = Infinity;
		for (const b of bugs) {
			if (b.dead || b.escaped) continue;
			const d = Math.hypot(b.x - x, b.y - y);
			if (d < b.r + 10 && d < best) {
				best = d;
				target = b;
			}
		}
		if (target) hit(target);
		else burst(x, y, colors.text, 4);
	};

	const end = () => {
		state = "over";
		const key = mode === "daily" ? `bug-hunt:daily:${todayKST()}` : "bug-hunt:practice";
		const isNew = saveBest(key, score);
		const bestDaily = loadBest(`bug-hunt:daily:${todayKST()}`);
		const bestPractice = loadBest("bug-hunt:practice");
		$("[data-r-title]").textContent = mode === "daily" ? `오늘의 챌린지 · ${todayKST()}` : "연습 모드";
		$("[data-r-score]").textContent = score.toLocaleString();
		$("[data-r-caught]").textContent = String(caught);
		$("[data-r-combo]").textContent = String(maxCombo);
		$("[data-r-best]").textContent = (mode === "daily" ? bestDaily : bestPractice).toLocaleString();
		$("[data-r-new]").hidden = !isNew;
		$("[data-r-bar]").textContent = resultBar();
		startPanel.hidden = true;
		resultPanel.hidden = false;
		overlay.hidden = false;
		saveBest("bug-hunt", score); // 놀이터 목록의 통합 최고 기록
	};

	const resultBar = () =>
		segHit
			.map((h, i) => {
				const total = h + segMiss[i];
				const rate = total ? h / total : 0;
				return rate >= 0.85 ? "🟩" : rate >= 0.6 ? "🟨" : "🟥";
			})
			.join("");

	const share = async () => {
		const text = [
			`🐛 버그 잡기 · ${mode === "daily" ? `오늘의 챌린지 ${todayKST()}` : "연습 모드"}`,
			`점수 ${score.toLocaleString()} · 검거 ${caught} · 최대 콤보 ${maxCombo}`,
			resultBar(),
			`${SITE_URL}/lab/bug-hunt/`,
		].join("\n");
		const res = await shareResult(text);
		const btn = $("[data-share]");
		const label = btn.textContent;
		btn.textContent = res === "copied" ? "복사했어요!" : res === "shared" ? "공유 완료" : "복사 실패";
		setTimeout(() => (btn.textContent = label), 1600);
	};

	const updateHud = () => {
		hud.score.textContent = score.toLocaleString();
		hud.combo.textContent = combo >= 2 ? `${combo} 콤보 ×${multiplier()}` : "";
		hud.time.textContent = Math.max(0, timeLeft).toFixed(1);
		hud.time.classList.toggle("text-red-500", timeLeft <= 5);
		hud.time.classList.toggle("animate-pulse", timeLeft <= 5 && !reduced);
	};

	// ---------- 그리기 ----------
	const drawBug = (b: Bug, t: number) => {
		const age = t - b.born;
		const appear = Math.min(age / 0.18, 1);
		let alpha = 1;
		let scale = appear;
		if (b.dead) {
			const k = Math.min((t - b.dead) / 0.18, 1);
			scale = 1 + k * 0.6;
			alpha = 1 - k;
		} else if (b.escaped) return;
		const remain = b.life - age;
		if (!b.dead && remain < 0.5 && b.kind !== "feature") alpha *= 0.4 + 0.6 * Math.abs(Math.sin(t * 18)); // 도망가기 직전 깜빡

		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.translate(b.x, b.y);
		ctx.scale(scale, scale);

		if (b.kind === "feature") {
			ctx.fillStyle = GREEN;
			ctx.beginPath();
			ctx.arc(0, 0, b.r, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = "white";
			ctx.lineWidth = 3.5;
			ctx.lineCap = "round";
			ctx.beginPath();
			ctx.moveTo(-7, 0);
			ctx.lineTo(-2, 6);
			ctx.lineTo(8, -6);
			ctx.stroke();
			ctx.restore();
			return;
		}
		if (b.kind === "hotfix") {
			ctx.rotate(t * 3);
			ctx.fillStyle = GOLD;
			ctx.beginPath();
			for (let i = 0; i < 10; i++) {
				const rr = i % 2 ? b.r * 0.45 : b.r;
				const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
				ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
			}
			ctx.fill();
			ctx.restore();
			return;
		}

		// 버그: 몸통 + 머리 + 다리 6개 + 더듬이
		ctx.rotate(b.angle + Math.PI / 2);
		const body = b.kind === "critical" ? RED : colors.primary;
		const leg = Math.sin(t * 22 + b.phase) * 3;
		ctx.strokeStyle = body;
		ctx.lineWidth = 2;
		ctx.lineCap = "round";
		for (const side of [-1, 1]) {
			for (let i = -1; i <= 1; i++) {
				ctx.beginPath();
				ctx.moveTo(side * b.r * 0.4, i * b.r * 0.45);
				ctx.lineTo(side * b.r * 1.05, i * b.r * 0.55 + (i === 0 ? leg : -leg) * side);
				ctx.stroke();
			}
			ctx.beginPath();
			ctx.moveTo(side * b.r * 0.2, -b.r * 0.9);
			ctx.lineTo(side * b.r * 0.55, -b.r * 1.4);
			ctx.stroke();
		}
		ctx.fillStyle = body;
		ctx.beginPath();
		ctx.ellipse(0, b.r * 0.15, b.r * 0.62, b.r * 0.8, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(0, -b.r * 0.72, b.r * 0.38, 0, Math.PI * 2);
		ctx.fill();
		// 등 줄무늬
		ctx.strokeStyle = "rgba(255,255,255,0.55)";
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(0, -b.r * 0.4);
		ctx.lineTo(0, b.r * 0.85);
		ctx.stroke();
		ctx.restore();
	};

	const drawScene = (t: number) => {
		ctx.save();
		ctx.clearRect(0, 0, W, H);
		if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

		// 에디터 배경
		ctx.fillStyle = colors.bg;
		ctx.fillRect(0, 0, W, H);
		ctx.font = "11px 'JetBrains Mono Variable', monospace";
		const lineH = 22;
		for (let i = 0; i * lineH < H; i++) {
			const y = 16 + i * lineH;
			ctx.fillStyle = colors.faint;
			ctx.fillText(String(i + 1).padStart(2, " "), 10, y + 4);
			const line = codeLines[i % Math.max(codeLines.length, 1)];
			if (!line) continue;
			let x = 44 + line.indent * 18;
			for (const w of line.parts) {
				ctx.fillRect(x, y - 4, w, 6);
				x += w + 8;
			}
		}

		for (const b of bugs) drawBug(b, t);

		for (const p of particles) {
			ctx.globalAlpha = Math.max(p.life / p.max, 0);
			ctx.fillStyle = p.color;
			ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
		}
		ctx.globalAlpha = 1;
		ctx.textAlign = "center";
		for (const f of floaters) {
			ctx.globalAlpha = Math.min(f.life / 0.3, 1);
			ctx.fillStyle = f.color;
			ctx.font = 'bold 15px "Pretendard Variable", Pretendard, sans-serif';
			ctx.fillText(f.text, f.x, f.y - (0.8 - f.life) * 40);
		}
		ctx.textAlign = "start";
		ctx.globalAlpha = 1;
		ctx.restore();
	};

	// ---------- 루프 ----------
	let last = performance.now();
	let raf = 0;
	const tick = (now: number) => {
		raf = requestAnimationFrame(tick);
		const dt = Math.min((now - last) / 1000, 0.1); // 탭 전환 후 순간이동 방지
		last = now;
		if (state !== "playing") {
			if (particles.length || floaters.length) step(dt, false);
			drawScene(elapsed);
			return;
		}
		elapsed += dt;
		timeLeft -= dt;
		step(dt, true);
		updateHud();
		drawScene(elapsed);
		if (timeLeft <= 0) end();
	};

	const step = (dt: number, playing: boolean) => {
		if (playing) {
			while (nextSpawn < schedule.length && schedule[nextSpawn].at <= elapsed) {
				if (bugs.filter((b) => !b.dead && !b.escaped).length < 9) spawn(schedule[nextSpawn]);
				nextSpawn++;
			}
			for (const b of bugs) {
				if (b.dead || b.escaped) continue;
				b.angle += (b.rand() - 0.5) * 6 * dt;
				b.x += Math.cos(b.angle) * b.speed * dt;
				b.y += Math.sin(b.angle) * b.speed * dt;
				const m = b.r + 4;
				if (b.x < m || b.x > W - m) {
					b.angle = Math.PI - b.angle;
					b.x = Math.min(Math.max(b.x, m), W - m);
				}
				if (b.y < m || b.y > H - m) {
					b.angle = -b.angle;
					b.y = Math.min(Math.max(b.y, m), H - m);
				}
				if (elapsed - b.born > b.life) {
					b.escaped = true;
					if (b.kind === "bug" || b.kind === "critical") {
						if (combo >= 5) float(b.x, b.y, "놓침!", colors.text);
						combo = 0;
						segMiss[segIndex()]++;
					}
				}
			}
			bugs = bugs.filter((b) => !b.escaped && !(b.dead && elapsed - b.dead > 0.2));
		}
		for (const p of particles) {
			p.life -= dt;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.vx *= 0.9;
			p.vy = p.vy * 0.9 + 300 * dt;
		}
		particles = particles.filter((p) => p.life > 0);
		for (const f of floaters) f.life -= dt;
		floaters = floaters.filter((f) => f.life > 0);
		shake = Math.max(0, shake - 60 * dt);
	};

	// ---------- 이벤트 ----------
	const onClick = (e: Event) => {
		const el = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
		if (!el) return;
		const action = el.dataset.action;
		if (action === "daily" || action === "practice") start(action);
		if (action === "retry") start(mode);
		if (action === "menu") {
			resultPanel.hidden = true;
			startPanel.hidden = false;
		}
		if (action === "share") share();
	};
	const onKey = (e: KeyboardEvent) => {
		if (state === "playing" || overlay.hidden) return;
		if (e.key === "Enter") {
			e.preventDefault();
			start(state === "over" ? mode : "daily");
		}
	};

	const showStartBest = () => {
		$("[data-best-daily]").textContent = loadBest(`bug-hunt:daily:${todayKST()}`).toLocaleString();
		$("[data-best-practice]").textContent = loadBest("bug-hunt:practice").toLocaleString();
	};

	buildCode(seededRandom(todayKST()));
	showStartBest();
	const ro = new ResizeObserver(resize);
	ro.observe(canvas);
	resize();
	canvas.addEventListener("pointerdown", onPointerDown);
	root.addEventListener("click", onClick);
	window.addEventListener("keydown", onKey);
	const stopTheme = onThemeChange(() => {
		readColors();
		if (state !== "playing") drawScene(elapsed);
	});
	raf = requestAnimationFrame(tick);

	return () => {
		cancelAnimationFrame(raf);
		ro.disconnect();
		stopTheme();
		canvas.removeEventListener("pointerdown", onPointerDown);
		root.removeEventListener("click", onClick);
		window.removeEventListener("keydown", onKey);
	};
}
