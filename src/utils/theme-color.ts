// 테마 색(--primary 등, oklch)을 sRGB 0~1 로 읽는다. THREE.Color 는 oklch 를 못 읽어서
// 1px 캔버스에 칠한 뒤 픽셀을 읽는다.
let probe: CanvasRenderingContext2D | null | undefined;

export const resolveCssColor = (value: string): [number, number, number] => {
	probe ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
	if (!probe) return [0.4, 0.6, 1];
	probe.clearRect(0, 0, 1, 1);
	probe.fillStyle = "#000";
	probe.fillStyle = value;
	probe.fillRect(0, 0, 1, 1);
	const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
	return [r / 255, g / 255, b / 255];
};

export const cssVar = (name: string) =>
	getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export const themeColor = () => resolveCssColor(cssVar("--primary"));

export const isDark = () => document.documentElement.classList.contains("dark");

export const prefersReducedMotion = () =>
	window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** 다크모드 토글·테마 색(hue) 변경을 구독한다. 해제 함수를 돌려준다. */
export const onThemeChange = (cb: () => void) => {
	const observer = new MutationObserver(cb);
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
	return () => observer.disconnect();
};
