---
title: ".env를 커밋하지 않으면 값은 어디에 둘까"
description: ".env 유출 사고 사례에서 출발해, 환경 변수를 GitHub Secrets와 배포 워크플로로 나눠 두는 기준과 옮길 때 빠지기 쉬운 함정을 Next.js와 GitHub Actions 기준으로 정리했어요."
published: 2026-12-02T09:00:00+09:00
tags: ["GitHub Actions","보안","Next.js","CI/CD"]
image: "/og/post-env-secrets.png"
---

`.env` 파일에서 시작되는 보안 사고가 계속 나오고 있어요.

- **노출된 `.env`를 노린 협박** — 2024년 Palo Alto Networks Unit 42가 공개한 사례예요. 공격자는 웹에 그대로 노출된 `.env` 파일을 대량으로 찾아 클라우드 접근 키를 얻었고, 데이터를 빼낸 뒤 공개하겠다고 협박했어요. 보고서는 클라우드 서비스의 취약점이 아니라 환경 변수 노출, 오래 쓰는 자격 증명, 최소 권한 부재가 원인이었다고 짚어요.
- **시크릿을 로그로 흘린 GitHub Action** — 2025년 3월, 많이 쓰이던 `tj-actions/changed-files`가 변조됐어요. 이 액션을 쓰는 워크플로는 실행될 때마다 시크릿을 로그에 그대로 찍었어요. 공개 레포라면 누구나 그 로그를 볼 수 있었고요.

첫 번째는 비밀이 파일로 남아 있어서, 두 번째는 비밀을 받는 코드가 바뀌어서 생긴 사고예요. 이 글에서는 `.env`를 레포에 두지 않을 때 값을 어디에 두면 좋은지, 그리고 옮길 때 빠지기 쉬운 함정을 Next.js와 GitHub Actions 기준으로 정리해 볼게요.

## 흔한 출발점: 환경별 .env를 커밋한다

처음에는 이런 구조가 흔해요.

```text
apps/web/
  .env.development
  .env.staging
  .env.production        ← 모두 git에 커밋
  package.json           "build:stg": "env-cmd -f .env.staging next build" …
  Dockerfile             ARG ENV 값에 따라 build:dev / build:stg / build:prd 중 하나를 실행
```

편하지만 문제가 여럿이에요.

- **레포를 읽을 수 있으면 토큰도 읽을 수 있어요.** 사람뿐 아니라 레포를 읽는 도구와 AI 에이전트도 마찬가지예요. 레포가 한 번이라도 공개되거나 클론이 새면 비밀도 같이 새요.
- **값의 출처가 갈려요.** 대부분은 커밋된 파일에 있고, 배포 워크플로가 시크릿 몇 개만 덧붙이는 식이 되기 쉬워요. 그러면 실제 배포에 어떤 값이 들어가는지 한 곳에서 볼 수 없어요.
- **커밋된 값은 낡아요.** 발급처에서 토큰을 폐기하거나 교체해도 파일은 그대로 남아요. 유효하지 않은 값이 커밋돼 있어도 빌드가 실패하기 전까지는 아무도 모르기 쉬워요.
- **환경을 잘못 넘겨도 조용히 빌드돼요.** Dockerfile 분기에서 `else`를 prd 빌드로 두면, 환경 이름이 비거나 오타가 났을 때 에러 없이 prd 설정 이미지가 만들어져요.

## 값부터 세 가지로 나누자

무엇을 Secrets에 넣을지 정하기 전에 값부터 나누는 게 좋아요. 기준은 "브라우저에 그대로 보여도 괜찮은가"예요.

| 종류 | 예 | 둘 곳 |
| --- | --- | --- |
| 서버에서만 쓰는 비밀 | 외부 API 토큰, 키가 들어간 웹훅 URL, 소스맵 업로드 토큰 | Secrets. 번들과 이미지에도 남기지 않는다 |
| 공개되지만 키처럼 생긴 값 | 분석 SDK 키, 지도·로그인 SDK의 JS 키 (`NEXT_PUBLIC_*`) | 환경별 Secrets |
| 그냥 설정 | API 주소, 환경 이름, 기능 플래그 | 워크플로에 인라인 |

가운데 줄이 헷갈리기 쉬워요. Next.js 문서에 따르면 `NEXT_PUBLIC_`로 시작하는 값은 `next build` 때 JavaScript 번들에 그대로 들어가요. 브라우저 개발자 도구만 열어도 보이는 값이라 Secrets에 넣는다고 비밀이 되지는 않아요.

그래도 Secrets에 두는 편이 좋아요. 레포에 평문으로 둘 이유가 없고, 환경별 값을 코드 PR 없이 바꿀 수 있고, 레포 검색에 키가 줄줄이 걸리지도 않아요. 다만 이미 공개되는 값이라, 옮긴다고 해서 재발급까지 할 필요는 거의 없어요.

마지막 줄은 오히려 워크플로에 그대로 적는 게 나아요. 로그에 찍혀도 문제없는 값이고, 바뀌면 PR diff에 바로 보여서 리뷰하기 쉬워요.

### 이름이 노출 범위를 정한다

서버나 빌드에서만 쓰는 값에 `NEXT_PUBLIC_`를 붙이면 안 돼요. 소스맵 업로드 토큰을 `NEXT_PUBLIC_SENTRY_AUTH_TOKEN`처럼 이름 붙이는 실수가 흔한데, 이 접두사가 붙은 값은 클라이언트 코드에서 참조하는 순간 번들에 실려요. 빌드 도구가 읽는 토큰이라면 `SENTRY_AUTH_TOKEN`처럼 접두사 없이 두는 게 맞아요.

## CI가 .env를 통째로 만들게 하자

레포에는 값이 담긴 env 파일을 두지 않아요. 배포 워크플로가 빌드 직전에 `.env` 하나를 만들고, Dockerfile은 그 파일을 복사한 뒤 빌드만 해요.

```yaml
- name: Make envfile
  uses: ./.github/actions/create-envfile   # 레포 안에 두는 이유는 아래에서
  with:
    directory: apps/web
    # 그냥 설정: 워크플로에 인라인
    envkey_NEXT_PUBLIC_API_URL: https://stg-api.example.com
    envkey_NEXT_PUBLIC_APP_ENV: staging
    # 공개되지만 키인 값: 환경별 Secrets
    envkey_NEXT_PUBLIC_GA_ID: ${{ secrets.STG_GA_ID }}
    # 서버 전용 비밀
    envkey_EXTERNAL_API_TOKEN: ${{ secrets.EXTERNAL_API_TOKEN }}
```

```dockerfile
COPY apps/web/.env apps/web/.env
RUN pnpm exec turbo build --filter=web
```

이렇게 하면 좋은 점이 있어요.

- **환경 차이가 값에만 남아요.** 빌드 스크립트, Dockerfile 분기, env 파일이 환경마다 하나씩 있을 필요가 없어요. 빌드 방법은 `next build` 하나이고, 환경은 CI가 넣는 값으로만 갈려요.
- **시크릿 이름만 봐도 무슨 값인지 알 수 있어요.** 예를 들어 `<DEV|STG|PRD>_<키에서 NEXT_PUBLIC_를 뗀 것>`처럼 규칙을 정해 두면, 워크플로만 읽어도 어느 환경의 어떤 값인지 보여요. 환경과 상관없이 값이 하나인 서버 전용 키는 접두사 없이 두면 돼요.
- **로컬은 `.env.example`로 시작해요.** 키 목록만 담은 파일을 커밋해 두고, `cp .env.example .env` 후에 필요한 값만 채우게 해요.

기존 값을 Secrets로 옮길 때는 옮긴 값이 원래 값과 같은지도 확인해야 해요. 이때 값을 로그에 찍어 비교하면 안 돼요. 해시를 비교하거나, 다른 키의 이름만 출력하는 식으로 값을 드러내지 않고 확인하는 게 좋아요.

## 옮길 때 빠지기 쉬운 함정

### 1. 파일 끝에 덧붙이면 값이 이어 붙는다

커밋된 파일을 그대로 두고 CI에서 토큰만 덧붙이는 방식은 흔해요.

```bash
printf 'SENTRY_AUTH_TOKEN=%s\n' "$TOKEN" >> .env.production
```

그런데 파일이 개행 없이 끝나 있으면 마지막 줄과 새 줄이 한 줄로 합쳐져요.

```text
NEXT_PUBLIC_PIXEL_ID=1234567890SENTRY_AUTH_TOKEN=sntrys_…
```

픽셀 ID가 깨지는 것도 문제지만, 더 큰 문제는 서버 전용 토큰이 `NEXT_PUBLIC_` 값 안으로 들어간다는 점이에요. 그 값은 번들에 실리니까 토큰도 같이 밖으로 나가요.

앞에 개행을 넣는 `printf '\nSENTRY_AUTH_TOKEN=%s\n'`으로 당장은 막을 수 있어요. 그래도 근본적인 해결은 덧붙이지 않는 거예요. CI가 파일 전체를 만들면 이런 일이 생길 틈이 없어요.

### 2. .gitignore는 이미 올라간 파일을 지우지 않는다

예전 `.env.*` 파일을 `.gitignore`에 추가하는 것만으로는 부족해요. 이미 추적 중인 파일은 `.gitignore`에 넣어도 레포에 그대로 남아요.

이게 특히 위험한 건 Next.js의 env 파일 우선순위 때문이에요. `next build`는 production 모드라 `.env.production`을 읽고, 이 파일이 `.env`보다 우선해요. 예전 `.env.production`이 레포에 남아 있으면 CI가 만든 stg용 `.env`가 prd 값에 덮여서, stg 빌드가 prd API를 부르고 prd OAuth 클라이언트로 로그인을 시도하게 돼요.

`env-cmd`처럼 값을 프로세스 환경 변수로 먼저 넣어 주는 도구를 쓰고 있었다면 이 문제가 가려져 있다가, 그 도구를 빼는 순간 드러나요. 파일은 추적까지 끊어야 해요.

```bash
git rm --cached apps/web/.env.production   # 추적을 끊어야 레포에서 빠진다
```

옮긴 뒤에는 빌드 로그의 이 줄을 꼭 확인하세요. Next.js가 실제로 읽은 env 파일 목록을 찍어 줘요.

```text
- Environments: .env.production, .env     ← .env 하나만 있어야 한다
```

### 3. 이미지 안에 .env가 남는다

CI가 만든 `.env`에 비밀을 넣으면, 이 파일이 배포 이미지까지 따라 들어가기 쉬워요. 경로는 두 가지예요.

- Dockerfile이 `.env`를 직접 `COPY`하는 경우
- Next.js `output: 'standalone'`을 쓰는 경우. 빌드 때 읽은 `.env`와 `.env.production`을 `.next/standalone`에 복사한다고 공식 문서에 나와 있어요. 문서는 이 파일에 비밀이 아닌 기본값만 두고, 비밀은 `server.js`를 실행할 때 환경 변수로 넘기라고 권해요.

소스맵 업로드 토큰처럼 빌드할 때만 필요한 값은 env 파일에 쓰지 말고, 멀티 스테이지 빌드의 빌드 스테이지에만 넘기는 게 좋아요.

```dockerfile
FROM node:22-alpine AS installer
ARG SENTRY_AUTH_TOKEN          # 이 스테이지의 RUN에서만 환경 변수로 보인다
RUN pnpm exec turbo build --filter=web

FROM node:22-alpine AS runner  # installer를 상속하지 않으니 ARG도 history도 따라오지 않는다
COPY --from=installer /app/apps/web/.next/standalone ./
```

워크플로에서는 `--build-arg SENTRY_AUTH_TOKEN`처럼 값 없이 이름만 넘기면, docker CLI가 스텝 환경 변수에서 값을 읽어서 명령줄에 값이 드러나지 않아요. BuildKit을 쓸 수 있다면 `RUN --mount=type=secret`이 더 확실해요.

배포 뒤에는 이미지에 토큰이 없는지 이렇게 확인할 수 있어요.

```bash
docker run --rm --entrypoint sh <image> -c 'grep -r SENTRY_AUTH_TOKEN /app || echo clean'
docker history --no-trunc <image> | grep -c SENTRY_AUTH_TOKEN   # 0이어야 한다
```

### 4. 로그 마스킹은 등록된 값만 가린다

GitHub Actions는 Secrets에 등록된 값이 로그에 나오면 `***`로 가려 줘요. 다만 가려 주는 건 등록된 값 그대로일 때뿐이에요. GitHub 보안 문서도 값이 변환될 수 있는 방법이 여러 가지라 자동 마스킹이 보장되지 않는다고 적고 있어요. Base64나 URL 인코딩처럼 변환한 값은 따로 시크릿으로 등록하라고 하고, JSON 같은 구조화된 데이터를 시크릿 하나로 넣으면 마스킹이 실패할 수 있다고도 해요.

재사용 워크플로의 입력값도 조심해야 해요. 입력은 시크릿이 아니라서 로그에 그대로 찍힐 수 있어요. 공용 배포 워크플로를 만든다면 env 줄을 그대로 받는 입력에는 공개값만 넣게 하세요. 토큰은 `KEY=SECRET_NAME`처럼 시크릿 이름만 받아서 워크플로 안에서 값을 꺼내는 식으로 나누는 게 안전해요.

### 5. 배포 경로가 여러 개면 한 곳은 빠진다

앱 하나가 배포되는 경로는 생각보다 많아요. 환경별 배포, e2e, 프리뷰처럼 워크플로가 여러 개면 새 키를 추가할 때 한 곳을 빠뜨리기 쉽고, 그 경로만 조용히 빈 값으로 떠요.

env 파일을 만드는 액션은 빈 시크릿도 빈 문자열로 그대로 쓰는 경우가 많아요. 의도적으로 비워 두는 키가 있으면 블록 전체를 "비면 실패"로 걸 수도 없어요. 반드시 있어야 하는 시크릿만 먼저 검사하는 스텝을 두면 좋아요.

```yaml
- name: Verify required secrets
  env:
    STG_GA_ID: ${{ secrets.STG_GA_ID }}
    EXTERNAL_API_TOKEN: ${{ secrets.EXTERNAL_API_TOKEN }}
    REQUIRED: STG_GA_ID EXTERNAL_API_TOKEN
  run: |
    missing=""
    for name in $REQUIRED; do [ -z "${!name:-}" ] && missing="$missing $name"; done
    if [ -n "$missing" ]; then echo "::error::필수 secret이 비어 있어요:$missing"; exit 1; fi
```

빈 값으로 배포되는 것보다 빌드 전에 실패하는 게 훨씬 싸요.

### 6. 시크릿을 등록할 때도 값을 명령줄에 쓰지 않는다

`gh secret set NAME --body "$VALUE"`처럼 값을 인자로 넘기면 셸 히스토리에 남고, 실행 중에는 프로세스 목록에도 보여요. `gh secret set`은 `--body`를 생략하면 표준 입력에서 값을 읽어요.

```bash
printf '%s' "$VALUE" | gh secret set STG_GA_ID --repo <owner>/<repo>
```

`echo` 대신 `printf '%s'`를 쓰면 값 끝에 개행이 붙지 않아요.

## 시크릿을 받는 액션도 코드다

값을 전부 Secrets로 옮겨도, 그 값을 받는 스텝의 코드가 바뀌면 소용이 없어요. `tj-actions/changed-files` 사고가 바로 그런 경우였어요. 액션의 태그가 악성 커밋을 가리키도록 바뀌었고, 그 태그를 쓰던 워크플로는 다음 실행부터 바뀐 코드에 시크릿을 넘겼어요. 태그는 소유자가 언제든 옮길 수 있어서, 태그로 고정했다고 코드가 고정되지는 않아요.

특히 앞에서 본 `.env` 생성 단계는 배포 시크릿을 통째로 받는 자리예요. 여기에 개인이 관리하는 외부 액션을 태그로 걸어 두고 있다면 먼저 점검해 보세요.

- **전체 커밋 SHA로 고정하기** — GitHub 보안 문서가 안내하는 방법이에요. 업데이트는 SHA를 바꾸는 PR로만 들어와요.
- **레포 안으로 옮기기** — `envkey_*` 입력을 `.env` 줄로 쓰는 정도의 일이라면 코드가 수십 줄이에요. 로컬 액션으로 옮기면 외부 의존이 없어지고, 바뀔 때마다 PR 리뷰를 거쳐요.

## 지운 파일은 끝이 아니다

env 파일을 지우는 커밋을 올려도 예전 커밋에는 값이 그대로 남아 있어요. GitHub 문서도 민감한 데이터가 비밀번호나 토큰 같은 자격 증명이라면, 첫 단계는 그 값을 폐기하거나 교체하는 거라고 안내해요. 히스토리를 다시 쓰는 것만으로는 부족하다는 거예요.

재발급 대상은 앞의 분류로 정하면 돼요.

- **서버 전용 비밀**: 발급처에서 재발급하고 Secrets를 갱신해요.
- **`NEXT_PUBLIC_` 키**: 이미 번들로 공개돼 있던 값이라 재발급해도 얻는 게 거의 없어요.

파일을 지우는 PR에 재발급할 키 목록을 같이 적어 두면 빠뜨리지 않아요.

## 마치며

`.env`를 걷어낼 때 확인할 것들을 체크리스트로 남겨요.

- [ ] 값마다 "브라우저에 보여도 되나"를 기준으로 비밀, 공개 키, 설정 중 하나로 나눴다
- [ ] 서버나 빌드에서만 쓰는 값에 `NEXT_PUBLIC_`가 붙어 있지 않다
- [ ] CI가 `.env`를 통째로 만든다 (커밋된 파일에 덧붙이지 않는다)
- [ ] 예전 `.env.*`는 `.gitignore`만이 아니라 `git rm --cached`까지 했고, 빌드 로그의 `Environments` 줄을 확인했다
- [ ] 빌드에만 쓰는 토큰이 배포 이미지에 남지 않는다
- [ ] 필수 시크릿이 비어 있으면 빌드 전에 실패한다
- [ ] 시크릿을 받는 서드파티 액션은 SHA로 고정하거나 레포 안으로 옮겼다
- [ ] 커밋된 적 있는 서버 전용 비밀은 재발급했다

### 참고 자료

- [Unit 42 — Leaked Environment Variables Allow Large-Scale Extortion Operation in Cloud Environments](https://unit42.paloaltonetworks.com/large-scale-cloud-extortion-operation/)
- [CISA — Supply Chain Compromise of Third-Party GitHub Action, CVE-2025-30066](https://www.cisa.gov/news-events/alerts/2025/03/18/supply-chain-compromise-third-party-github-action-cve-2025-30066)
- [Next.js — Environment Variables](https://nextjs.org/docs/app/guides/environment-variables)
- [Next.js — output (standalone)](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [GitHub Docs — Security hardening for GitHub Actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions)
- [GitHub Docs — Using secrets in GitHub Actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)
- [GitHub Docs — Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [GitHub CLI — gh secret set](https://cli.github.com/manual/gh_secret_set)
