// Turborepo 실행 계획 시뮬레이터 화면. 규칙은 turbo-model.ts
import { createTasks, type Env, simulate, type SimEvent, type Target, TYPES } from "./turbo-model";

// 그래프 배치 (viewBox 720×294). 왼쪽 열부터 먼저 실행될 수 있는 작업
const POS: Record<string, [number, number]> = {
	"@repo/api-client#openapi:generate": [16, 16],
	"@repo/http#build": [16, 86],
	"@repo/utils#build": [16, 156],
	"@repo/icons#build": [16, 226],
	"@repo/api-client#build:types": [266, 16],
	"@repo/api-client#build": [266, 86],
	"@repo/ui#build": [266, 191],
	"web#build": [516, 100],
	"admin#build": [516, 226],
};
const W = 188;
const H = 52;
const RUN_LABEL: Record<Target, string> = { web: "turbo run build --filter=web", admin: "turbo run build --filter=admin", all: "turbo run build" };

type State = "idle" | "waiting" | "running" | "done" | "fail" | "out";

export function mountTurboSim(root: HTMLElement): () => void {
	root.innerHTML = `
<div class="not-prose rounded-2xl border border-black/10 dark:border-white/10 p-4 md:p-5 my-6 text-sm">
  <div class="flex items-baseline justify-between gap-2 mb-3">
    <div class="font-bold text-90">turbo run build 시뮬레이터</div>
    <div class="font-mono text-50" data-clock>0.0s</div>
  </div>
  <div class="flex flex-wrap items-center gap-2 mb-2">
    <span class="text-75 w-16">빌드 대상</span>
    <div class="flex flex-wrap rounded-lg bg-[var(--btn-regular-bg)] p-0.5">
      <button data-target="web" aria-pressed="true" class="race-seg">web만</button>
      <button data-target="admin" aria-pressed="false" class="race-seg">admin만</button>
      <button data-target="all" aria-pressed="false" class="race-seg">전체</button>
    </div>
  </div>
  <div class="flex flex-wrap items-center gap-2 mb-2">
    <span class="text-75 w-16">실행 환경</span>
    <div class="flex flex-wrap rounded-lg bg-[var(--btn-regular-bg)] p-0.5">
      <button data-env="local" aria-pressed="true" class="race-seg">로컬 (예전 생성물 있음)</button>
      <button data-env="ci" aria-pressed="false" class="race-seg">CI (깨끗한 상태)</button>
    </div>
  </div>
  <label class="flex items-start gap-2 mb-3 cursor-pointer">
    <input data-wired type="checkbox" checked class="mt-1 accent-[var(--primary)]">
    <span class="text-75">web의 <code class="text-90">dependsOn</code>에 <code class="text-90">@repo/api-client#build:types</code> 적기</span>
  </label>
  <div class="flex flex-wrap gap-2 mb-3">
    <button data-a="run" class="btn-regular rounded-lg h-9 px-4 font-bold font-mono active:scale-95"></button>
    <button data-a="dry" class="btn-plain rounded-lg h-9 px-3 font-mono active:scale-95">--dry (계획만)</button>
  </div>
  <div class="overflow-x-auto"><svg data-g viewBox="0 0 720 294" class="w-full min-w-[34rem] block" role="img" aria-label="작업 의존 그래프"></svg></div>
  <p class="sm:hidden text-50 text-xs mt-1">← 옆으로 밀면 오른쪽의 앱까지 볼 수 있어요</p>
  <ul class="mt-3 space-y-1 text-xs text-50">
    <li>화살표는 "먼저 끝나야 하는" 방향이에요. 기다릴 게 없는 작업부터 동시에 시작해요.</li>
    <li><b class="text-75">점선 상자(건너뜀)</b>: build 스크립트가 없는 패키지예요. 앱이 <code>^build</code>로 의존 패키지의 build를 기다리니 그래프에는 들어가지만, 할 일이 없어 바로 넘어가요. dry run에서는 command가 <code>&lt;NONEXISTENT&gt;</code>로 나와요.</li>
    <li><b class="text-75">흐린 상자(계획에 없음)</b>: 이번 빌드 대상과 이어지지 않아서 돌지 않는 작업이에요.</li>
  </ul>
  <p data-result hidden class="mt-3 rounded-lg px-3 py-2 text-sm"></p>
  <ol data-log class="mt-3 font-mono text-xs space-y-0.5 text-75"></ol>
</div>`;

	const $ = <T extends Element>(s: string) => root.querySelector(s) as T;
	const svg = $<SVGSVGElement>("[data-g]");
	const log = $<HTMLOListElement>("[data-log]");
	const resultEl = $<HTMLElement>("[data-result]");
	const clock = $<HTMLElement>("[data-clock]");
	const runBtn = $<HTMLButtonElement>('[data-a="run"]');
	let env: Env = "local";
	let target: Target = "web";
	let raf = 0;
	let run: { events: SimEvent[]; plan: string[]; start: number; result: string; message: string } | null = null;

	const wired = () => $<HTMLInputElement>("[data-wired]").checked;

	const stateAt = (id: string, t: number, plan: string[], events: SimEvent[] | null): { s: State; p: number } => {
		if (!plan.includes(id)) return { s: "out", p: 0 };
		if (!events) return { s: "idle", p: 0 };
		const st = events.find((e) => e.id === id && e.type === "start");
		const end = events.find((e) => e.id === id && e.type !== "start");
		if (!st || t < st.t) return { s: "waiting", p: 0 };
		if (end && t >= end.t) return { s: end.type === "fail" ? "fail" : "done", p: 1 };
		return { s: "running", p: end && end.t > st.t ? (t - st.t) / (end.t - st.t) : 1 };
	};

	const draw = (t: number) => {
		const tasks = createTasks(wired());
		const plan = run?.plan ?? simulate(target, wired(), env).plan;
		const events = run?.events ?? null;
		const parts: string[] = [
			`<defs><marker id="tsim-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>`,
		];
		// 화살표: 선행 작업 → 기다리는 작업 (적지 않은 build:types 화살표는 점선으로 흐리게)
		for (const task of createTasks(true)) {
			for (const d of task.deps) {
				const [x1, y1] = POS[d];
				const [x2, y2] = POS[task.id];
				const active = tasks.find((x) => x.id === task.id)!.deps.includes(d) && plan.includes(d) && plan.includes(task.id);
				const sx = x1 + W;
				const sy = y1 + H / 2;
				const ex = x2 - 4;
				const ey = y2 + H / 2;
				const mx = (sx + ex) / 2;
				parts.push(
					`<path d="M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex},${ey}" fill="none" stroke="currentColor" stroke-width="1.6" opacity="${active ? 0.55 : 0.15}" ${active ? "" : 'stroke-dasharray="4 4"'} marker-end="url(#tsim-arrow)"/>`,
				);
			}
		}
		for (const task of tasks) {
			const [x, y] = POS[task.id];
			const { s, p } = stateAt(task.id, t, plan, events);
			const skip = task.command === null;
			const fill = s === "fail" ? "#ef4444" : s === "done" && !skip ? "#10b981" : s === "running" ? "var(--primary)" : "var(--btn-regular-bg)";
			const strong = (s === "done" && !skip) || s === "fail" || s === "running";
			const textColor = strong ? "#fff" : "currentColor";
			const badge =
				s === "out" ? "계획에 없음" : skip ? (s === "done" ? "건너뜀 ✓" : "건너뜀") : s === "done" ? "완료" : s === "fail" ? "실패" : s === "running" ? "실행 중" : s === "waiting" ? "대기" : `${task.duration}s`;
			parts.push(`<g opacity="${s === "out" ? 0.3 : 1}">
<rect x="${x}" y="${y}" width="${W}" height="${H}" rx="10" fill="${fill}" ${s === "out" || skip ? 'stroke="currentColor" stroke-dasharray="4 3" stroke-opacity=".45"' : ""}/>
${s === "running" ? `<rect x="${x}" y="${y + H - 4}" width="${W * p}" height="4" rx="2" fill="#fff" opacity=".7"/>` : ""}
<text x="${x + 12}" y="${y + 20}" font-size="11" fill="${textColor}" opacity=".75">${task.pkg}</text>
<text x="${x + 12}" y="${y + 39}" font-size="14" font-weight="700" fill="${textColor}" font-family="ui-monospace,monospace">${task.task}</text>
<text x="${x + W - 10}" y="${y + 20}" font-size="10" text-anchor="end" fill="${textColor}" opacity=".8">${badge}</text>
<title>${task.id} · ${task.command ?? "build 스크립트 없음 (&lt;NONEXISTENT&gt;)"}</title></g>`);
		}
		svg.innerHTML = parts.join("");
	};

	const label = (id: string) => {
		const task = createTasks(true).find((x) => x.id === id)!;
		return task.command ? `${id} (${task.command})` : `${id} (스크립트 없음, 건너뜀)`;
	};

	const showResult = () => {
		if (!run) return;
		resultEl.hidden = false;
		resultEl.textContent = run.message;
		resultEl.className = `mt-3 rounded-lg px-3 py-2 text-sm ${run.result === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : run.result === "stale" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-red-500/10 text-red-700 dark:text-red-300"}`;
	};

	const tick = () => {
		if (!run) return;
		const t = (performance.now() - run.start) / 1000;
		const last = Math.max(...run.events.map((e) => e.t));
		clock.textContent = `${Math.min(t, last).toFixed(1)}s`;
		draw(t);
		log.replaceChildren(
			...run.events
				.filter((e) => e.t <= t)
				.map((e) => {
					const li = document.createElement("li");
					const mark = e.type === "start" ? "▶" : e.type === "done" ? "✓" : "✗";
					li.textContent = `[${e.t.toFixed(1)}s] ${mark} ${e.type === "start" ? label(e.id) : e.id} ${e.type === "start" ? "시작" : e.type === "done" ? "끝" : "실패"}`;
					if (e.type === "fail") li.className = "text-red-500";
					return li;
				}),
		);
		if (t >= last) {
			showResult();
			raf = 0;
			return;
		}
		raf = requestAnimationFrame(tick);
	};

	const reset = () => {
		cancelAnimationFrame(raf);
		raf = 0;
		run = null;
		clock.textContent = "0.0s";
		resultEl.hidden = true;
		log.replaceChildren();
		runBtn.textContent = RUN_LABEL[target];
		draw(0);
	};

	const start = () => {
		reset();
		run = { ...simulate(target, wired(), env), start: performance.now() };
		tick();
	};

	const dry = () => {
		reset();
		const tasks = createTasks(wired());
		const plan = simulate(target, wired(), env).plan;
		log.replaceChildren(
			...plan.map((id) => {
				const task = tasks.find((x) => x.id === id)!;
				const li = document.createElement("li");
				li.textContent = `${id} · command: ${task.command ?? "<NONEXISTENT>"} · dependencies: [${task.deps.join(", ")}]`;
				return li;
			}),
		);
		resultEl.hidden = false;
		resultEl.className = "mt-3 rounded-lg px-3 py-2 text-sm bg-[var(--btn-regular-bg)] text-75";
		resultEl.textContent = `실행하지 않고 계획만 출력했어요: ${plan.length}개 작업${target !== "admin" && !plan.includes(TYPES) ? " (코드 생성·타입 생성이 계획에 없어요)" : ""}`;
	};

	const onClick = (e: Event) => {
		const el = (e.target as HTMLElement).closest<HTMLElement>("[data-a], [data-env], [data-target]");
		if (!el) return;
		if (el.dataset.env || el.dataset.target) {
			if (el.dataset.env) env = el.dataset.env as Env;
			if (el.dataset.target) target = el.dataset.target as Target;
			const group = el.dataset.env ? "[data-env]" : "[data-target]";
			root.querySelectorAll(group).forEach((b) => b.setAttribute("aria-pressed", String(b === el)));
			reset();
		} else if (el.dataset.a === "run") start();
		else if (el.dataset.a === "dry") dry();
	};
	const onChange = () => reset();

	root.addEventListener("click", onClick);
	root.addEventListener("change", onChange);
	reset();

	return () => {
		cancelAnimationFrame(raf);
		root.removeEventListener("click", onClick);
		root.removeEventListener("change", onChange);
		root.innerHTML = "";
	};
}
