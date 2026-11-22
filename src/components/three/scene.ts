// 테마 색(--primary, oklch)을 따라가는 파티클 행성. ThreeHero 가 동적 import 한다.
import {
	AdditiveBlending,
	NormalBlending,
	BufferAttribute,
	BufferGeometry,
	Clock,
	Color,
	Group,
	IcosahedronGeometry,
	type Material,
	Mesh,
	MeshBasicMaterial,
	PerspectiveCamera,
	Points,
	Scene,
	ShaderMaterial,
	WebGLRenderer,
} from "three";
import { isDark, onThemeChange, prefersReducedMotion, themeColor } from "../../utils/theme-color";

const fibonacciSphere = (count: number, radius: number) => {
	const positions = new Float32Array(count * 3);
	const seeds = new Float32Array(count);
	const golden = Math.PI * (3 - Math.sqrt(5));
	for (let i = 0; i < count; i++) {
	const y = 1 - (i / (count - 1)) * 2;
	const r = Math.sqrt(1 - y * y);
	const theta = golden * i;
	positions.set([Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius], i * 3);
	seeds[i] = Math.random();
	}
	return { positions, seeds };
};

const ring = (count: number, inner: number, outer: number) => {
	const positions = new Float32Array(count * 3);
	const seeds = new Float32Array(count);
	for (let i = 0; i < count; i++) {
	const a = Math.random() * Math.PI * 2;
	const d = inner + Math.pow(Math.random(), 1.6) * (outer - inner);
	positions.set([Math.cos(a) * d, (Math.random() - 0.5) * 0.06, Math.sin(a) * d], i * 3);
	seeds[i] = Math.random();
	}
	return { positions, seeds };
};

const vertexShader = /* glsl */ `
	uniform float uTime;
	uniform float uPixelRatio;
	uniform float uSize;
	uniform float uWave;
	attribute float aSeed;
	varying float vAlpha;
	void main() {
	vec3 p = position;
	float wave = sin(p.y * 3.0 + uTime * 1.2 + aSeed * 6.2831) * 0.5
	           + sin(p.x * 2.5 - uTime * 0.9) * 0.5;
	p += normalize(p) * wave * uWave;
	vec4 mv = modelViewMatrix * vec4(p, 1.0);
	gl_Position = projectionMatrix * mv;
	float twinkle = 0.55 + 0.45 * sin(uTime * 2.0 + aSeed * 40.0);
	gl_PointSize = uSize * uPixelRatio * (0.6 + aSeed * 0.8) * (4.6 / -mv.z);
	// 뒤쪽 점은 흐리게 해서 깊이감
	vAlpha = twinkle * smoothstep(-7.5, -4.0, mv.z);
	}
`;
const fragmentShader = /* glsl */ `
	uniform vec3 uColor;
	uniform float uOpacity;
	varying float vAlpha;
	void main() {
	float d = length(gl_PointCoord - 0.5);
	float a = smoothstep(0.5, 0.0, d);
	gl_FragColor = vec4(uColor, a * vAlpha * uOpacity);
	}
`;

export function mount(el: HTMLElement): () => void {
	const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
	const pixelRatio = Math.min(window.devicePixelRatio, 2);
	renderer.setPixelRatio(pixelRatio);
	renderer.domElement.className = "absolute inset-0 w-full h-full";
	el.appendChild(renderer.domElement);

	const scene = new Scene();
	const camera = new PerspectiveCamera(40, 1, 0.1, 50);
	camera.position.set(0, 0, 6.2);

	const color = new Color(...themeColor());
	const makePoints = (
		data: { positions: Float32Array; seeds: Float32Array },
		size: number,
		wave: number,
		opacity: number,
	) => {
		const geometry = new BufferGeometry();
		geometry.setAttribute("position", new BufferAttribute(data.positions, 3));
		geometry.setAttribute("aSeed", new BufferAttribute(data.seeds, 1));
		const material = new ShaderMaterial({
			vertexShader,
			fragmentShader,
			transparent: true,
			depthWrite: false,
			blending: AdditiveBlending,
			uniforms: {
				uTime: { value: 0 },
				uPixelRatio: { value: pixelRatio },
				uSize: { value: size },
				uWave: { value: wave },
				uColor: { value: color },
				uOpacity: { value: opacity },
			},
		});
		return new Points(geometry, material);
	};

	const planet = makePoints(fibonacciSphere(2600, 1.25), 7, 0.06, 1);
	const halo = makePoints(ring(1200, 1.6, 2.15), 5, 0.03, 0.75);
	halo.rotation.set(1.15, 0, 0.35);

	const core = new Mesh(
		new IcosahedronGeometry(0.72, 1),
		new MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.22 }),
	);

	const group = new Group();
	group.add(planet, halo, core);
	scene.add(group);

	const materials = [planet.material, halo.material] as ShaderMaterial[];

	// 크기
	const resize = () => {
		const { width, height } = el.getBoundingClientRect();
		if (!width || !height) return;
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		// 세로로 긴 캔버스면 링이 좌우로 잘리지 않게 뒤로 뺀다
		camera.position.z = 6.4 / Math.min(camera.aspect, 1);
		camera.updateProjectionMatrix();
	};
	const resizeObserver = new ResizeObserver(resize);
	resizeObserver.observe(el);
	resize();

	// 포인터 쪽으로 살짝 기울기
	const pointer = { x: 0, y: 0 };
	const onPointerMove = (e: PointerEvent) => {
		pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
		pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
	};
	window.addEventListener("pointermove", onPointerMove, { passive: true });

	// 화면 밖·백그라운드 탭에서는 멈춤
	let visible = true;
	const io = new IntersectionObserver(([entry]) => {
		visible = entry.isIntersecting;
	});
	io.observe(el);

	const clock = new Clock();
	const reduced = prefersReducedMotion();
	const render = () => {
		const t = clock.getElapsedTime();
		for (const m of materials) m.uniforms.uTime.value = t;
		planet.rotation.y = t * 0.12;
		halo.rotation.z = 0.35 + t * 0.05;
		core.rotation.set(t * 0.2, t * 0.3, 0);
		group.rotation.x += (pointer.y * 0.25 - group.rotation.x) * 0.04;
		group.rotation.y += (pointer.x * 0.35 - group.rotation.y) * 0.04;
		renderer.render(scene, camera);
	};

	// 다크: 가산 혼합으로 빛나게 / 라이트: 흰 배경에선 가산 혼합이 날아가므로 일반 혼합
	const applyTheme = () => {
		color.setRGB(...themeColor());
		const dark = isDark();
		for (const m of materials) {
			m.blending = dark ? AdditiveBlending : NormalBlending;
			m.needsUpdate = true;
		}
		// 셰이더는 color를 참조하지만 MeshBasicMaterial은 만들 때 복사해 두므로 따로 맞춘다
		(core.material as MeshBasicMaterial).color.copy(color);
		(core.material as MeshBasicMaterial).opacity = dark ? 0.22 : 0.35;
	};
	applyTheme();
	// 테마 색·다크모드 변경 따라가기 (모션 줄이기면 정지 화면만 다시 그림)
	const stopThemeWatch = onThemeChange(() => {
		applyTheme();
		if (reduced) render();
	});

	if (reduced) {
		render();
		renderer.setAnimationLoop(null);
	} else {
		renderer.setAnimationLoop(() => {
			if (visible && !document.hidden) render();
		});
	}

	return () => {
		renderer.setAnimationLoop(null);
		resizeObserver.disconnect();
		stopThemeWatch();
		io.disconnect();
		window.removeEventListener("pointermove", onPointerMove);
		group.traverse((obj) => {
			const o = obj as Mesh;
			o.geometry?.dispose();
			(o.material as Material | undefined)?.dispose();
		});
		renderer.dispose();
		renderer.domElement.remove();
	};
}
