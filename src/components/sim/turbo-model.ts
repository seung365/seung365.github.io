// Turborepo 실행 계획 시뮬레이터의 규칙. 화면과 분리해 scripts/check-turbo-sim.ts로 확인한다.
// 흔한 모노레포 모양의 예시: 앱 2개(web, admin), 공용 패키지 5개
export type TaskId = string;
export type Task = { id: TaskId; pkg: string; task: string; command: string | null; duration: number; deps: TaskId[] };
export type Env = "local" | "ci";
export type Target = "web" | "admin" | "all";
export type SimEvent = { t: number; id: TaskId; type: "start" | "done" | "fail" };
export type Outcome = { plan: TaskId[]; events: SimEvent[]; result: "ok" | "stale" | "fail"; message: string };

export const GEN = "@repo/api-client#openapi:generate";
export const TYPES = "@repo/api-client#build:types";

/** wired: web의 dependsOn에 @repo/api-client#build:types를 적었는지 */
export const createTasks = (wired: boolean): Task[] => [
	{ id: GEN, pkg: "@repo/api-client", task: "openapi:generate", command: "orval", duration: 1.8, deps: [] },
	{ id: TYPES, pkg: "@repo/api-client", task: "build:types", command: "tsc -p tsconfig.gen.json", duration: 1, deps: [GEN] },
	{ id: "@repo/http#build", pkg: "@repo/http", task: "build", command: null, duration: 0, deps: [] },
	// api-client는 http에 의존한다 → ^build로 http#build를 기다린다 (둘 다 build 스크립트는 없다)
	{ id: "@repo/api-client#build", pkg: "@repo/api-client", task: "build", command: null, duration: 0, deps: ["@repo/http#build"] },
	{ id: "@repo/utils#build", pkg: "@repo/utils", task: "build", command: "tsc", duration: 0.9, deps: [] },
	{ id: "@repo/icons#build", pkg: "@repo/icons", task: "build", command: "svgr", duration: 0.7, deps: [] },
	{ id: "@repo/ui#build", pkg: "@repo/ui", task: "build", command: "vite build", duration: 1.5, deps: ["@repo/utils#build", "@repo/icons#build"] },
	{
		id: "web#build",
		pkg: "web",
		task: "build",
		command: "next build",
		duration: 2.2,
		// utils·http는 ui·api-client를 거쳐 이미 기다리므로 그래프에서는 생략한다
		deps: ["@repo/ui#build", "@repo/api-client#build", ...(wired ? [TYPES] : [])],
	},
	{ id: "admin#build", pkg: "admin", task: "build", command: "vite build", duration: 1.6, deps: ["@repo/ui#build"] },
];

const TARGETS: Record<Target, TaskId[]> = {
	web: ["web#build"],
	admin: ["admin#build"],
	// turbo run build (필터 없음): 모든 패키지의 build. build:types는 누가 dependsOn에 적었을 때만 끌려온다
	all: ["@repo/http#build", "@repo/api-client#build", "@repo/utils#build", "@repo/icons#build", "@repo/ui#build", "web#build", "admin#build"],
};

/** Turborepo처럼 대상 작업에서 dependsOn을 따라가며 실행할 작업을 모은다 */
export const planFor = (tasks: Task[], target: Target): TaskId[] => {
	const byId = new Map(tasks.map((t) => [t.id, t]));
	const seen = new Set<TaskId>();
	const visit = (id: TaskId) => {
		if (seen.has(id)) return;
		seen.add(id);
		for (const d of byId.get(id)?.deps ?? []) visit(d);
	};
	TARGETS[target].forEach(visit);
	return tasks.filter((t) => seen.has(t.id)).map((t) => t.id);
};

/** 선행 작업이 다 끝난 작업부터 동시에 실행한다. 명령이 없는 작업은 바로 끝난다 */
export const simulate = (target: Target, wired: boolean, env: Env): Outcome => {
	const tasks = createTasks(wired);
	const plan = planFor(tasks, target);
	const byId = new Map(tasks.map((t) => [t.id, t]));
	const doneAt = new Map<TaskId, number>();
	const events: SimEvent[] = [];
	const generated = plan.includes(TYPES);
	let result: Outcome["result"] = "ok";
	let message = "모든 작업이 순서대로 끝났어요";

	while (doneAt.size < plan.length) {
		for (const id of plan) {
			if (doneAt.has(id)) continue;
			const t = byId.get(id)!;
			if (!t.deps.every((d) => doneAt.has(d))) continue;
			const start = Math.max(0, ...t.deps.map((d) => doneAt.get(d)!));
			const end = Math.round((start + t.duration) * 10) / 10;
			events.push({ t: start, id, type: "start" });
			// web은 api-client의 생성 코드를 쓴다. 생성 작업이 계획에 없으면 예전 생성물이 있는 로컬에서만 통과한다
			if (id === "web#build" && !generated && env === "ci") {
				events.push({ t: end, id, type: "fail" });
				result = "fail";
				message = "CI에는 생성된 파일이 없어서 web#build가 실패했어요: Cannot find module '@repo/api-client/gen-browser/…'";
			} else {
				events.push({ t: end, id, type: "done" });
				if (id === "web#build" && !generated) {
					result = "stale";
					message = "로컬에 남아 있던 예전 생성물로 통과했어요. 백엔드 API가 바뀌었어도 반영되지 않은 채예요";
				}
			}
			doneAt.set(id, end);
		}
	}
	// 시각순. 같은 시각이면 만든 순서(시작 → 끝)를 지킨다 (sort는 안정 정렬)
	events.sort((a, b) => a.t - b.t);
	return { plan, events, result, message };
};
