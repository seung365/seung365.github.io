// 예약 발행 확인: 공개 날짜(published)가 지났는데 실제 사이트에 아직 없는 글이 있으면 due=true.
// GitHub Actions 정기 실행(deploy.yml, 6시간마다)이 이 결과로 빌드할지 정한다. 로컬: node scripts/due-posts.mjs
// 정기 실행은 몇 시간씩 밀리거나 빠질 수 있어서, "오늘 공개될 글"이 아니라 "공개됐어야 하는데 안 올라간 글"을 본다
import { appendFileSync, readdirSync, readFileSync } from "node:fs";

const SITE = "https://seung365.github.io";
const DIR = new URL("../src/content/posts/", import.meta.url);
const LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000; // 이보다 오래된 글은 이미 올라갔다고 본다
const now = Date.now();

const recent = readdirSync(DIR)
	.filter((f) => f.endsWith(".md") || f.endsWith(".mdx"))
	.flatMap((f) => {
		const src = readFileSync(new URL(f, DIR), "utf8");
		const fm = src.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
		if (/^draft:\s*true/m.test(fm)) return [];
		const raw = fm.match(/^published:\s*["']?([^"'\n]+)/m)?.[1];
		const t = raw ? Date.parse(raw) : Number.NaN;
		// Astro가 파일 이름으로 만드는 주소 (소문자)
		const slug = f.replace(/\.mdx?$/, "").toLowerCase();
		return t <= now && t > now - LOOKBACK_MS ? [{ f, raw, slug }] : [];
	});

let live = null;
try {
	const res = await fetch(`${SITE}/sitemap-0.xml`, { cache: "no-store" });
	if (res.ok) live = decodeURIComponent(await res.text());
} catch {
	// 사이트맵을 못 읽으면 아래에서 최근 글이 있으면 빌드한다 (한 번 더 빌드해도 결과는 같다)
}

const due = recent.filter(({ slug }) => !live || !live.includes(`/posts/${slug}/`));
console.log(
	due.length
		? `공개해야 할 글:\n${due.map((d) => `${d.f} (${d.raw})`).join("\n")}`
		: `공개 대기 중인 글 없음 (최근 ${recent.length}개는 이미 올라가 있음)`,
);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `due=${due.length > 0}\n`);
