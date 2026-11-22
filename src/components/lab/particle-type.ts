// 파티클 타이포: 글자를 입자로 샘플링해서 마우스로 흩뜨리면 스프링처럼 돌아온다
import {
	AdditiveBlending,
	BufferAttribute,
	BufferGeometry,
	NormalBlending,
	OrthographicCamera,
	Points,
	PointsMaterial,
	Scene,
	Color,
	WebGLRenderer,
} from "three";
import { isDark, onThemeChange, prefersReducedMotion, themeColor } from "../../utils/theme-color";

const sampleText = (text: string, width: number, height: number, gap: number) => {
	const c = document.createElement("canvas");
	c.width = width;
	c.height = height;
	const g = c.getContext("2d", { willReadFrequently: true });
	if (!g) return [];
	let size = Math.min(height * 0.62, (width * 1.55) / text.length);
	g.font = `900 ${size}px "Pretendard Variable", Pretendard, sans-serif`;
	// 폭에 맞게 줄이기
	while (g.measureText(text).width > width * 0.92 && size > 10) {
		size -= 2;
		g.font = `900 ${size}px "Pretendard Variable", Pretendard, sans-serif`;
	}
	g.fillStyle = "#000";
	g.textAlign = "center";
	g.textBaseline = "middle";
	g.fillText(text, width / 2, height / 2);
	const { data } = g.getImageData(0, 0, width, height);
	const points: [number, number][] = [];
	for (let y = 0; y < height; y += gap) {
		for (let x = 0; x < width; x += gap) {
			if (data[(y * width + x) * 4 + 3] > 128) points.push([x - width / 2, height / 2 - y]);
		}
	}
	return points;
};

export function mountParticleType(el: HTMLElement, text: string): () => void {
	const renderer = new WebGLRenderer({ antialias: true, alpha: true });
	const dpr = Math.min(window.devicePixelRatio, 2);
	renderer.setPixelRatio(dpr);
	renderer.domElement.className = "absolute inset-0 w-full h-full";
	el.appendChild(renderer.domElement);

	const scene = new Scene();
	const camera = new OrthographicCamera(-1, 1, 1, -1, -10, 10);
	const color = new Color(...themeColor());
	const material = new PointsMaterial({ color, size: 2.6 * dpr, sizeAttenuation: false, transparent: true, depthWrite: false });
	const geometry = new BufferGeometry();
	const points = new Points(geometry, material);
	scene.add(points);

	let count = 0;
	let pos = new Float32Array(0);
	let vel = new Float32Array(0);
	let target = new Float32Array(0);
	let W = 0;
	let H = 0;

	const build = () => {
		const rect = el.getBoundingClientRect();
		W = Math.round(rect.width);
		H = Math.round(rect.height);
		if (!W || !H) return;
		renderer.setSize(W, H, false);
		camera.left = -W / 2;
		camera.right = W / 2;
		camera.top = H / 2;
		camera.bottom = -H / 2;
		camera.updateProjectionMatrix();

		const samples = sampleText(text, W, H, W < 500 ? 4 : 5);
		count = samples.length;
		target = new Float32Array(count * 3);
		pos = new Float32Array(count * 3);
		vel = new Float32Array(count * 3);
		samples.forEach(([x, y], i) => {
			target[i * 3] = x;
			target[i * 3 + 1] = y;
			// 처음엔 화면 전체에 흩어져 있다가 모여든다
			pos[i * 3] = (Math.random() - 0.5) * W * 1.4;
			pos[i * 3 + 1] = (Math.random() - 0.5) * H * 1.4;
		});
		if (reduced) pos.set(target);
		geometry.setAttribute("position", new BufferAttribute(pos, 3));
		geometry.setDrawRange(0, count);
	};

	const applyTheme = () => {
		// 재질은 만들 때 색을 복사해 두므로 재질의 색을 직접 바꾼다
		material.color.setRGB(...themeColor());
		material.blending = isDark() ? AdditiveBlending : NormalBlending;
		material.opacity = isDark() ? 0.9 : 0.85;
		material.needsUpdate = true;
	};

	const pointer = { x: 9999, y: 9999, active: false };
	const toLocal = (e: PointerEvent) => {
		const r = el.getBoundingClientRect();
		return { x: e.clientX - r.left - W / 2, y: H / 2 - (e.clientY - r.top) };
	};
	const onMove = (e: PointerEvent) => {
		Object.assign(pointer, toLocal(e), { active: true });
	};
	const onLeave = () => {
		pointer.active = false;
	};
	// 클릭하면 펑
	const onDown = (e: PointerEvent) => {
		const p = toLocal(e);
		for (let i = 0; i < count; i++) {
			const dx = pos[i * 3] - p.x;
			const dy = pos[i * 3 + 1] - p.y;
			const d = Math.hypot(dx, dy) + 1;
			const f = Math.min(2400 / d, 60) * 14;
			vel[i * 3] += (dx / d) * f * (0.6 + Math.random() * 0.8);
			vel[i * 3 + 1] += (dy / d) * f * (0.6 + Math.random() * 0.8);
		}
	};

	const reduced = prefersReducedMotion();
	const R = 90; // 밀어내는 반경
	let last = performance.now();
	let visible = true;
	const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
	io.observe(el);

	const frame = (now: number) => {
		const dt = Math.min((now - last) / 1000, 0.033);
		last = now;
		if (!visible || document.hidden) return;
		if (!reduced) {
			const t = now / 1000;
			for (let i = 0; i < count; i++) {
				const ix = i * 3;
				const iy = ix + 1;
				// 목표점으로 당기는 스프링 + 살짝 일렁임
				const tx = target[ix] + Math.sin(t * 1.4 + i * 0.37) * 0.8;
				const ty = target[iy] + Math.cos(t * 1.1 + i * 0.21) * 0.8;
				let ax = (tx - pos[ix]) * 26;
				let ay = (ty - pos[iy]) * 26;
				if (pointer.active) {
					const dx = pos[ix] - pointer.x;
					const dy = pos[iy] - pointer.y;
					const d2 = dx * dx + dy * dy;
					if (d2 < R * R) {
						const d = Math.sqrt(d2) + 0.01;
						const f = (1 - d / R) * 9000;
						ax += (dx / d) * f;
						ay += (dy / d) * f;
					}
				}
				vel[ix] = (vel[ix] + ax * dt) * 0.88;
				vel[iy] = (vel[iy] + ay * dt) * 0.88;
				pos[ix] += vel[ix] * dt;
				pos[iy] += vel[iy] * dt;
			}
			geometry.attributes.position.needsUpdate = true;
		}
		renderer.render(scene, camera);
	};

	applyTheme();
	build();
	let resizeTimer = 0;
	const ro = new ResizeObserver(() => {
		clearTimeout(resizeTimer);
		resizeTimer = window.setTimeout(build, 120);
	});
	ro.observe(el);
	const stopTheme = onThemeChange(applyTheme);
	el.addEventListener("pointermove", onMove);
	el.addEventListener("pointerleave", onLeave);
	el.addEventListener("pointerdown", onDown);
	renderer.setAnimationLoop(frame);

	return () => {
		renderer.setAnimationLoop(null);
		clearTimeout(resizeTimer);
		ro.disconnect();
		io.disconnect();
		stopTheme();
		el.removeEventListener("pointermove", onMove);
		el.removeEventListener("pointerleave", onLeave);
		el.removeEventListener("pointerdown", onDown);
		geometry.dispose();
		material.dispose();
		renderer.dispose();
		renderer.domElement.remove();
	};
}
