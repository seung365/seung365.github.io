// 배포 타워: 좌우로 움직이는 블록을 타이밍 맞춰 떨어뜨려 쌓는 Three.js 아케이드
import {
	BoxGeometry,
	Color,
	DirectionalLight,
	HemisphereLight,
	Mesh,
	MeshLambertMaterial,
	OrthographicCamera,
	Scene,
	Vector3,
	WebGLRenderer,
} from "three";
import { isDark, onThemeChange, prefersReducedMotion, themeColor } from "../../utils/theme-color";
import { loadBest, SITE_URL, saveBest, shareResult } from "./lab-utils";

type Axis = "x" | "z";
type Block = { mesh: Mesh; w: number; d: number };
type Chunk = { mesh: Mesh; vy: number; spin: Vector3 };

const H = 0.5; // 블록 높이
const START_SIZE = 3;
const PERFECT = 0.1; // 이 오차 안이면 퍼펙트
const RANGE = 4.2; // 움직이는 블록 왕복 범위

export function mountDeployTower(root: HTMLElement): () => void {
	const stage = root.querySelector("[data-stage]") as HTMLElement;
	const $ = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T;
	const hud = { floor: $("[data-floor]"), version: $("[data-version]") };
	const pop = $("[data-pop]");
	const overlay = $("[data-overlay]");
	const startPanel = $("[data-start]");
	const resultPanel = $("[data-result]");
	const reduced = prefersReducedMotion();

	const renderer = new WebGLRenderer({ antialias: true, alpha: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.domElement.className = "absolute inset-0 w-full h-full";
	stage.appendChild(renderer.domElement);

	const scene = new Scene();
	const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
	const camTarget = new Vector3(0, 0, 0);
	const camOffset = new Vector3(8, 7, 8);
	let viewSize = 9;

	scene.add(new HemisphereLight(0xffffff, 0x6b7280, 1.6));
	const sun = new DirectionalLight(0xffffff, 1.8);
	sun.position.set(5, 10, 3);
	scene.add(sun);

	// 색: 테마 hue 를 기준으로 층마다 조금씩 돌린다
	const base = new Color();
	const baseHsl = { h: 0, s: 0, l: 0 };
	const readTheme = () => {
		base.setRGB(...themeColor());
		base.getHSL(baseHsl);
	};
	readTheme();
	const colorFor = (level: number) =>
		new Color().setHSL(
			(baseHsl.h + level * 0.012) % 1,
			Math.min(0.75, baseHsl.s + 0.1),
			isDark() ? 0.55 : 0.62,
		);

	const boxes: Mesh[] = [];
	const makeBox = (w: number, h: number, d: number, color: Color) => {
		const mesh = new Mesh(new BoxGeometry(w, h, d), new MeshLambertMaterial({ color }));
		scene.add(mesh);
		boxes.push(mesh);
		return mesh;
	};
	const removeBox = (mesh: Mesh) => {
		scene.remove(mesh);
		mesh.geometry.dispose();
		(mesh.material as MeshLambertMaterial).dispose();
		boxes.splice(boxes.indexOf(mesh), 1);
	};

	let stack: Block[] = [];
	let chunks: Chunk[] = [];
	let moving: Block | null = null;
	let axis: Axis = "x";
	let dir = 1;
	let speed = 3;
	let state: "idle" | "playing" | "over" = "idle";
	let perfectStreak = 0;
	let maxStreak = 0;
	let shake = 0;

	const reset = () => {
		for (const m of [...boxes]) removeBox(m);
		stack = [];
		chunks = [];
		// 받침대
		const pedestal = makeBox(START_SIZE, 4, START_SIZE, colorFor(0).offsetHSL(0, -0.25, -0.1));
		pedestal.position.y = -2 - H / 2;
		stack.push({ mesh: makeBox(START_SIZE, H, START_SIZE, colorFor(0)), w: START_SIZE, d: START_SIZE });
		perfectStreak = maxStreak = 0;
		speed = 3;
		camTarget.set(0, 0, 0);
		updateHud();
	};

	const floors = () => stack.length - 1;
	const top = () => stack[stack.length - 1];

	const spawnMoving = () => {
		const t = top();
		axis = stack.length % 2 ? "x" : "z";
		dir = 1;
		const mesh = makeBox(t.w, H, t.d, colorFor(stack.length));
		mesh.position.copy(t.mesh.position);
		mesh.position.y += H;
		mesh.position[axis] = -RANGE;
		moving = { mesh, w: t.w, d: t.d };
	};

	const popText = (text: string) => {
		pop.textContent = text;
		pop.classList.remove("tower-pop");
		void pop.offsetWidth; // 애니메이션 재시작
		pop.classList.add("tower-pop");
	};

	const drop = () => {
		if (state !== "playing" || !moving) return;
		const t = top();
		const m = moving;
		const size = axis === "x" ? t.w : t.d;
		const delta = m.mesh.position[axis] - t.mesh.position[axis];
		const overlap = size - Math.abs(delta);

		if (overlap <= 0) {
			// 완전히 빗나감 → 통째로 떨어지고 끝
			chunks.push({ mesh: m.mesh, vy: 0, spin: new Vector3(Math.random(), 0, Math.random()).multiplyScalar(2) });
			moving = null;
			return gameOver();
		}

		if (Math.abs(delta) <= PERFECT) {
			m.mesh.position[axis] = t.mesh.position[axis];
			perfectStreak++;
			maxStreak = Math.max(maxStreak, perfectStreak);
			// 3연속부터 블록이 조금씩 회복된다
			if (perfectStreak >= 3) {
				const grow = (k: "w" | "d") => Math.min(START_SIZE, m[k] + 0.15);
				const w = grow("w");
				const d = grow("d");
				m.mesh.geometry.dispose();
				m.mesh.geometry = new BoxGeometry(w, H, d);
				m.w = w;
				m.d = d;
			}
			popText(perfectStreak >= 2 ? `PERFECT ×${perfectStreak}` : "PERFECT");
			if (!reduced) shake = 0.08;
		} else {
			perfectStreak = 0;
			// 겹친 부분만 남기고 나머지는 잘려서 떨어진다
			const cut = Math.abs(delta);
			const keepCenter = t.mesh.position[axis] + delta / 2;
			const chunkCenter = keepCenter + Math.sign(delta) * (overlap / 2 + cut / 2);
			const w = axis === "x" ? overlap : m.w;
			const d = axis === "z" ? overlap : m.d;
			m.mesh.geometry.dispose();
			m.mesh.geometry = new BoxGeometry(w, H, d);
			m.mesh.position[axis] = keepCenter;
			m.w = w;
			m.d = d;

			const cw = axis === "x" ? cut : m.w;
			const cd = axis === "z" ? cut : m.d;
			const chunk = makeBox(cw, H, cd, (m.mesh.material as MeshLambertMaterial).color.clone());
			chunk.position.copy(m.mesh.position);
			chunk.position[axis] = chunkCenter;
			chunks.push({
				mesh: chunk,
				vy: 0,
				spin: new Vector3(axis === "z" ? Math.sign(delta) * 2 : 0, 0, axis === "x" ? -Math.sign(delta) * 2 : 0),
			});
		}

		stack.push(m);
		moving = null;
		speed = Math.min(3 + floors() * 0.12, 7.5);
		camTarget.y = floors() * H;
		updateHud();
		spawnMoving();
	};

	const gameOver = () => {
		state = "over";
		const score = floors();
		const isNew = saveBest("deploy-tower", score);
		$("[data-r-floor]").textContent = String(score);
		$("[data-r-streak]").textContent = String(maxStreak);
		$("[data-r-best]").textContent = String(loadBest("deploy-tower"));
		$("[data-best]").textContent = String(loadBest("deploy-tower"));
		$("[data-r-new]").hidden = !isNew;
		$("[data-r-msg]").textContent =
			score >= 30 ? "무중단 배포의 달인" : score >= 15 ? "안정적인 릴리즈" : score >= 5 ? "롤백 위기 극복" : "핫픽스가 필요해요";
		// 무너지는 걸 잠깐 보여주고 결과
		setTimeout(() => {
			if (state !== "over") return;
			startPanel.hidden = true;
			resultPanel.hidden = false;
			overlay.hidden = false;
		}, 700);
		// 끝나면 탑 전체가 보이게 줌아웃
		viewSize = Math.max(9, score * H * 1.6 + 4);
		camTarget.y = (score * H) / 2;
		resize();
	};

	const start = () => {
		reset();
		viewSize = 9;
		resize();
		state = "playing";
		overlay.hidden = true;
		spawnMoving();
	};

	const share = async () => {
		const n = floors();
		const text = [
			`🏗️ 배포 타워 ${n}층 · v0.${n} 배포 완료`,
			`최대 퍼펙트 ${maxStreak}연속`,
			"🟦".repeat(Math.min(10, Math.ceil(n / 3))) || "🟥",
			`${SITE_URL}/lab/deploy-tower/`,
		].join("\n");
		const res = await shareResult(text);
		const btn = $("[data-share]");
		const label = btn.textContent;
		btn.textContent = res === "copied" ? "복사했어요!" : res === "shared" ? "공유 완료" : "복사 실패";
		setTimeout(() => (btn.textContent = label), 1600);
	};

	const updateHud = () => {
		hud.floor.textContent = String(floors());
		hud.version.textContent = `v0.${floors()}`;
	};

	// ---------- 크기·카메라 ----------
	const resize = () => {
		const { width, height } = stage.getBoundingClientRect();
		if (!width || !height) return;
		renderer.setSize(width, height, false);
		const aspect = width / height;
		camera.left = (-viewSize * aspect) / 2;
		camera.right = (viewSize * aspect) / 2;
		camera.top = viewSize / 2;
		camera.bottom = -viewSize / 2;
		camera.updateProjectionMatrix();
	};
	const ro = new ResizeObserver(resize);
	ro.observe(stage);

	// ---------- 루프 ----------
	let visible = true;
	const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
	io.observe(stage);
	let last = performance.now();
	const lookAt = new Vector3();
	renderer.setAnimationLoop((now) => {
		const dt = Math.min((now - last) / 1000, 0.05);
		last = now;
		if (!visible || document.hidden) return;

		if (moving && state === "playing") {
			const p = moving.mesh.position;
			p[axis] += dir * speed * dt;
			if (p[axis] > RANGE) dir = -1;
			if (p[axis] < -RANGE) dir = 1;
		}
		for (const c of chunks) {
			c.vy -= 18 * dt;
			c.mesh.position.y += c.vy * dt;
			c.mesh.rotation.x += c.spin.x * dt;
			c.mesh.rotation.z += c.spin.z * dt;
		}
		for (const c of chunks.filter((c) => c.mesh.position.y < camTarget.y - 25)) removeBox(c.mesh);
		chunks = chunks.filter((c) => boxes.includes(c.mesh));

		// 카메라는 목표 높이를 부드럽게 따라간다
		lookAt.lerp(camTarget, 1 - Math.exp(-dt * 4));
		camera.position.copy(lookAt).add(camOffset);
		if (shake > 0) {
			camera.position.y -= shake * 2;
			shake = Math.max(0, shake - dt * 0.8);
		}
		camera.lookAt(lookAt);
		renderer.render(scene, camera);
	});

	// ---------- 입력 ----------
	const onPointer = (e: PointerEvent) => {
		if ((e.target as HTMLElement).closest("button")) return;
		if (state === "playing") drop();
	};
	const onKey = (e: KeyboardEvent) => {
		if (e.code !== "Space" && e.key !== "Enter") return;
		if ((e.target as HTMLElement).closest("input, textarea")) return;
		e.preventDefault();
		if (state === "playing") drop();
		else if (state === "idle" || !resultPanel.hidden) start(); // 결과가 뜨기 전 연타로 재시작 방지
	};
	const onClick = (e: Event) => {
		const action = (e.target as HTMLElement).closest<HTMLElement>("[data-action]")?.dataset.action;
		if (action === "start" || action === "retry") start();
		if (action === "share") share();
	};
	root.addEventListener("pointerdown", onPointer);
	root.addEventListener("click", onClick);
	window.addEventListener("keydown", onKey);
	const stopTheme = onThemeChange(() => {
		readTheme();
		stack.forEach((b, i) => (b.mesh.material as MeshLambertMaterial).color.copy(colorFor(i)));
	});

	$("[data-best]").textContent = String(loadBest("deploy-tower"));
	reset();
	resize();

	return () => {
		renderer.setAnimationLoop(null);
		ro.disconnect();
		io.disconnect();
		stopTheme();
		root.removeEventListener("pointerdown", onPointer);
		root.removeEventListener("click", onClick);
		window.removeEventListener("keydown", onKey);
		for (const m of [...boxes]) removeBox(m);
		renderer.dispose();
		renderer.domElement.remove();
	};
}
