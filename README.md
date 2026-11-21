# seung365.github.io

개인 블로그. [Fuwari](https://github.com/saicaca/fuwari) 테마(Astro) + GitHub Pages, `main`에 push하면 자동 배포된다.

- 글 쓰기: `pnpm new-post <파일명>` → `src/content/posts/<파일명>.md`
- 설정(제목·프로필·링크): `src/config.ts`
- 로컬: `pnpm dev` (Node 24, `.nvmrc`)
- velog 글 다시 가져오기: `node scripts/import-velog.mjs` (같은 slug 파일은 덮어씀)
