// stale-while-revalidate 시뮬레이터 화면. 규칙은 swr-model.ts
import { ARTICLE_PLAN, createSim, OUTCOME_LABEL, type Outcome } from "./swr-model";

const COLOR: Record<Outcome, string> = {
	fresh: "var(--primary)",
	stale: "#f59e0b",
	wait: "#ef4444",
	miss: "#8b93a3",
	blocking: "#8b93a3",
};

const fmt = (s: number) => `${s.toFixed(1)}초`;

export function mountSwrSim(root: HTMLElement): () => void {
	root.innerHTML = `
<div class="swr-sim not-prose rounded-2xl border border-black/10 dark:border-white/10 p-4 md:p-5 my-6 text-sm">
  <div class="flex items-baseline justify-between gap-2 mb-3">
    <div class="font-bold text-90">직접 눌러 보는 stale-while-revalidate</div>
    <div class="font-mono text-50" data-clock>0.0초</div>
  </div>
  <div class="grid gap-3 sm:grid-cols-3 mb-3">
    <label class="block"><span class="text-75">max-age <b data-v="maxAge" class="text-90"></b></span>
      <input data-p="maxAge" type="range" min="1" max="8" step="1" value="2" class="w-full accent-[var(--primary)]"></label>
    <label class="block"><span class="text-75">stale-while-revalidate <b data-v="swr" class="text-90"></b></span>
      <input data-p="swr" type="range" min="0" max="8" step="1" value="5" class="w-full accent-[var(--primary)]"></label>
    <label class="block"><span class="text-75">서버 응답 지연 <b data-v="delay" class="text-90"></b></span>
      <input data-p="delay" type="range" min="0.2" max="3" step="0.1" value="1" class="w-full accent-[var(--primary)]"></label>
  </div>
  <div class="flex flex-wrap gap-2 mb-4">
    <button data-a="request" class="btn-regular rounded-lg h-9 px-4 font-bold active:scale-95">요청 보내기</button>
    <button data-a="bump" class="btn-plain rounded-lg h-9 px-3 active:scale-95">서버 데이터 바꾸기</button>
    <button data-a="replay" class="btn-plain rounded-lg h-9 px-3 active:scale-95">글의 실험 재생</button>
    <button data-a="reset" class="btn-plain rounded-lg h-9 px-3 active:scale-95">처음부터</button>
  </div>
  <svg data-tl class="w-full h-[150px] block" role="img" aria-label="캐시 상태와 요청 타임라인"></svg>
  <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-50 mt-2 mb-4">
    <span><i class="swr-dot" style="background:var(--primary)"></i>신선 → 바로</span>
    <span><i class="swr-dot" style="background:#f59e0b"></i>옛 값 바로 + 뒤에서 재검증</span>
    <span><i class="swr-dot" style="background:#ef4444"></i>재검증 끝날 때까지 기다림</span>
    <span><i class="swr-dot" style="background:#8b93a3"></i>서버 응답을 기다림</span>
  </div>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[34rem] text-xs md:text-sm">
      <thead><tr class="text-left text-50"><th class="py-1 pr-2 font-medium">시점</th><th class="py-1 pr-2 font-medium">무슨 일</th><th class="py-1 pr-2 font-medium">걸린 시간</th><th class="py-1 pr-2 font-medium">받은 버전</th><th class="py-1 font-medium">서버</th></tr></thead>
      <tbody data-log></tbody>
    </table>
  </div>
  <p data-empty class="text-50 text-xs mt-1">"요청 보내기"를 눌러 보세요. 1초 안에 또 누르면 신선한 캐시를, 몇 초 뒤에 누르면 옛 값과 뒤쪽 재검증을 볼 수 있어요.</p>
  <p class="text-50 text-xs mt-3">브라우저 HTTP 캐시 규칙을 흉내 낸 시뮬레이터예요. 재검증 중에 온 요청이 기다리는 동작은 위 Chrome 실측대로 넣었어요.</p>
</div>`;

	const $ = <T extends Element>(s: string) => root.querySelector(s) as T;
	const svg = $<SVGSVGElement>("[data-tl]");
	const log = $<HTMLTableSectionElement>("[data-log]");
	const clockEl = $<HTMLElement>("[data-clock]");
	const sliders = [...root.querySelectorAll<HTMLInputElement>("[data-p]")];
	const params = () => Object.fromEntries(sliders.map((s) => [s.dataset.p, Number(s.value)])) as { maxAge: number; swr: number; delay: number };

	let sim = createSim(params());
	let t0 = 0; // 첫 동작 시각 (performance.now 기준). 0이면 아직 시작 전
	let raf = 0;
	let timers: number[] = [];
	const now = () => (t0 ? (performance.now() - t0) / 1000 : 0);

	const showParams = () => {
		for (const s of sliders) {
			const v = Number(s.value);
			($(`[data-v="${s.dataset.p}"]`) as HTMLElement).textContent = s.dataset.p === "delay" ? `${v.toFixed(1)}초` : `${v}초`;
		}
	};

	const reset = () => {
		timers.forEach(clearTimeout);
		timers = [];
		cancelAnimationFrame(raf);
		raf = 0;
		sim = createSim(params());
		t0 = 0;
		sliders.forEach((s) => (s.disabled = false));
		render();
	};

	const start = () => {
		if (t0) return;
		t0 = performance.now();
		sliders.forEach((s) => (s.disabled = true)); // 진행 중에 규칙이 바뀌면 결과가 섞인다
	};

	// at: 재생할 때는 예정된 시점을 그대로 쓴다 (setTimeout이 몇 ms 밀려도 글의 표와 같게)
	const act = (kind: "request" | "bump", at?: number) => {
		start();
		if (!raf) loop(); // 한동안 멈춰 있던 시계를 다시 돌린다
		const t = at ?? now();
		kind === "bump" ? sim.bump(t) : sim.request(t);
		render();
	};

	const replay = () => {
		sliders.find((s) => s.dataset.p === "maxAge")!.value = "2";
		sliders.find((s) => s.dataset.p === "swr")!.value = "5";
		sliders.find((s) => s.dataset.p === "delay")!.value = "1";
		showParams();
		reset();
		start();
		for (const [t, kind] of ARTICLE_PLAN) timers.push(window.setTimeout(() => act(kind, t), t * 1000));
	};

	const loop = () => {
		render();
		const t = now();
		const lastEvent = Math.max(0, ...sim.reqs.map((r) => r.doneAt), ...sim.hits.map((h) => h.end));
		// 마지막 일 이후 한동안 아무것도 안 하면 시계를 멈춘다 (배터리)
		const planEnd = timers.length ? ARTICLE_PLAN[ARTICLE_PLAN.length - 1][0] : 0;
		raf = t < Math.max(lastEvent, planEnd) + 30 ? requestAnimationFrame(loop) : 0;
	};

	const render = () => {
		const t = now();
		sim.settle(t);
		clockEl.textContent = fmt(t);
		const span = Math.max(20, Math.ceil(t) + 2);
		const W = svg.clientWidth || 600;
		const x = (s: number) => 8 + (s / span) * (W - 16);
		const parts: string[] = [];
		// 눈금
		for (let s = 0; s <= span; s += span > 30 ? 5 : 2) parts.push(`<line x1="${x(s)}" x2="${x(s)}" y1="18" y2="128" stroke="var(--line-divider)"/><text x="${x(s)}" y="144" font-size="10" text-anchor="middle" fill="currentColor" opacity=".5">${s}s</text>`);
		// 캐시 상태 띠: 신선 → 창 → 진짜 만료
		parts.push(`<text x="8" y="12" font-size="10" fill="currentColor" opacity=".6">캐시</text>`);
		sim.bands.forEach((b, i) => {
			const next = sim.bands[i + 1]?.from ?? Math.max(t, b.swrUntil);
			const seg = (from: number, to: number, fill: string, op: number) => {
				const a = Math.max(from, b.from);
				const z = Math.min(to, next, t);
				if (z > a) parts.push(`<rect x="${x(a)}" y="18" width="${x(z) - x(a)}" height="14" fill="${fill}" opacity="${op}" rx="2"/>`);
			};
			seg(b.from, b.freshUntil, "var(--primary)", 0.55);
			seg(b.freshUntil, b.swrUntil, "#f59e0b", 0.45);
			seg(b.swrUntil, Infinity, "#8b93a3", 0.35);
		});
		// 요청
		parts.push(`<text x="8" y="50" font-size="10" fill="currentColor" opacity=".6">요청</text>`);
		sim.reqs.forEach((r) => {
			const c = COLOR[r.outcome];
			if (r.doneAt > r.at) parts.push(`<rect x="${x(r.at)}" y="62" width="${Math.max(2, x(Math.min(r.doneAt, Math.max(t, r.at))) - x(r.at))}" height="8" fill="${c}" opacity=".5" rx="4"/>`);
			parts.push(`<circle cx="${x(r.at)}" cy="66" r="6" fill="${c}"><title>${fmt(r.at)} · ${OUTCOME_LABEL[r.outcome]}</title></circle>`);
		});
		// 서버
		parts.push(`<text x="8" y="92" font-size="10" fill="currentColor" opacity=".6">서버</text>`);
		sim.hits.forEach((h) => {
			const done = t >= h.end;
			const w = x(Math.min(h.end, Math.max(t, h.at))) - x(h.at);
			parts.push(`<rect x="${x(h.at)}" y="100" width="${Math.max(2, w)}" height="16" rx="3" fill="${h.status === 200 ? "var(--primary)" : "#8b93a3"}" opacity="${done ? 0.85 : 0.4}"/>`);
			if (done && x(h.end) - x(h.at) > 24) parts.push(`<text x="${(x(h.at) + x(h.end)) / 2}" y="112" font-size="10" text-anchor="middle" fill="#fff" font-weight="700">${h.status}</text>`);
		});
		// 서버 데이터 변경
		sim.bumps.forEach((b) => parts.push(`<line x1="${x(b.at)}" x2="${x(b.at)}" y1="18" y2="128" stroke="#ef4444" stroke-dasharray="3 3"/><text x="${x(b.at) + 3}" y="128" font-size="10" fill="#ef4444">v${b.version}</text>`));
		// 현재 시각
		if (t0) parts.push(`<line x1="${x(t)}" x2="${x(t)}" y1="14" y2="132" stroke="currentColor" stroke-width="1.5" opacity=".7"/>`);
		svg.innerHTML = parts.join("");

		// 기록 표
		log.replaceChildren(
			...sim.reqs.map((r) => {
				const tr = document.createElement("tr");
				tr.className = "border-t border-[var(--line-divider)]";
				const pending = t < r.doneAt;
				const cells = [
					fmt(r.at),
					OUTCOME_LABEL[r.outcome],
					pending ? "기다리는 중…" : `${Math.round((r.doneAt - r.at) * 1000)}ms`,
					pending ? "" : `v${r.version}`,
					r.hit ? `If-None-Match: ${r.hit.inm ? `v${r.hit.inm}` : "-"} → ${t >= r.hit.end ? r.hit.status : "…"}` : "-",
				];
				cells.forEach((text, i) => {
					const td = document.createElement("td");
					td.className = `py-1.5 pr-2 align-top ${i === 1 ? "text-90" : "text-75 font-mono whitespace-nowrap"}`;
					if (i === 1) {
						const dot = document.createElement("i");
						dot.className = "swr-dot";
						dot.style.background = COLOR[r.outcome];
						td.append(dot);
					}
					td.append(text);
					tr.append(td);
				});
				return tr;
			}),
		);
		($("[data-empty]") as HTMLElement).hidden = sim.reqs.length > 0;
	};

	const onClick = (e: Event) => {
		const a = (e.target as HTMLElement).closest<HTMLElement>("[data-a]")?.dataset.a;
		if (a === "request" || a === "bump") act(a);
		else if (a === "replay") replay();
		else if (a === "reset") reset();
	};
	const onInput = () => {
		showParams();
		if (!t0) sim = createSim(params());
	};
	const ro = new ResizeObserver(() => render());

	root.addEventListener("click", onClick);
	root.addEventListener("input", onInput);
	ro.observe(svg);
	showParams();
	render();

	return () => {
		cancelAnimationFrame(raf);
		timers.forEach(clearTimeout);
		ro.disconnect();
		root.removeEventListener("click", onClick);
		root.removeEventListener("input", onInput);
		root.innerHTML = "";
	};
}
