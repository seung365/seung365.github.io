// Turborepo 시뮬레이터 규칙 확인: npx -y node@24 scripts/check-turbo-sim.ts
import { GEN, simulate, TYPES } from "../src/components/sim/turbo-model.ts";

const assert = (ok: boolean, msg: string) => {
	if (!ok) throw new Error(msg);
	console.log("✓", msg);
};
type O = ReturnType<typeof simulate>;
const startOf = (o: O, id: string) => o.events.find((e) => e.id === id && e.type === "start")!.t;
const endOf = (o: O, id: string) => o.events.find((e) => e.id === id && e.type !== "start")!.t;

const web = simulate("web", true, "ci");
assert(web.plan.includes(GEN) && web.plan.includes(TYPES) && !web.plan.includes("admin#build"), "--filter=web: 생성 작업 포함, admin 제외");
assert(startOf(web, TYPES) >= endOf(web, GEN), "build:types는 openapi:generate 뒤");
assert(startOf(web, "@repo/ui#build") >= Math.max(endOf(web, "@repo/icons#build"), endOf(web, "@repo/utils#build")), "ui는 icons·utils 뒤 (사슬)");
assert(startOf(web, "web#build") >= Math.max(endOf(web, TYPES), endOf(web, "@repo/ui#build")), "web은 build:types와 ui 뒤");
assert(endOf(web, "@repo/http#build") === 0 && endOf(web, "@repo/api-client#build") === 0, "스크립트 없는 작업은 바로 끝남");
assert(web.result === "ok", "적어 두면 CI에서도 성공");

const admin = simulate("admin", true, "ci");
assert(!admin.plan.includes(GEN) && !admin.plan.includes("web#build"), "--filter=admin: 코드 생성과 web은 계획에 없음");

const all = simulate("all", true, "ci");
assert(all.plan.filter((id) => id === "@repo/ui#build").length === 1 && startOf(all, "web#build") >= endOf(all, "@repo/ui#build") && startOf(all, "admin#build") >= endOf(all, "@repo/ui#build"), "전체: ui는 한 번만, 두 앱이 함께 기다림");

assert(!simulate("all", false, "ci").plan.includes(TYPES), "전체로 돌려도 dependsOn에 없으면 build:types는 안 돎");
assert(simulate("web", false, "ci").result === "fail", "빼면 CI에서 web 실패");
assert(simulate("web", false, "local").result === "stale", "빼면 로컬은 예전 생성물로 통과");
assert(simulate("admin", false, "ci").result === "ok", "admin은 생성 코드를 안 써서 상관없음");
console.log("turbo sim ok");
