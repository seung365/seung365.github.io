// 예약 발행 확인: 공개 날짜(published)가 지난 25시간 안에 있는 글이 있으면 due=true.
// GitHub Actions 정기 실행(deploy.yml)이 이 결과로 빌드할지 정한다. 로컬: node scripts/due-posts.mjs
import { appendFileSync, readdirSync, readFileSync } from "node:fs";

const DIR = new URL("../src/content/posts/", import.meta.url);
const WINDOW_MS = 25 * 60 * 60 * 1000; // 하루 + cron 지연 여유 1시간 (두 번 걸려도 다시 빌드할 뿐이라 안전)
const now = Date.now();

const due = readdirSync(DIR)
	.filter((f) => f.endsWith(".md") || f.endsWith(".mdx"))
	.flatMap((f) => {
		const src = readFileSync(new URL(f, DIR), "utf8");
		const fm = src.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
		if (/^draft:\s*true/m.test(fm)) return [];
		const raw = fm.match(/^published:\s*["']?([^"'\n]+)/m)?.[1];
		const t = raw ? Date.parse(raw) : Number.NaN;
		return t <= now && t > now - WINDOW_MS ? [`${f} (${raw})`] : [];
	});

console.log(due.length ? `오늘 공개할 글:\n${due.join("\n")}` : "오늘 공개할 글 없음");
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `due=${due.length > 0}\n`);
