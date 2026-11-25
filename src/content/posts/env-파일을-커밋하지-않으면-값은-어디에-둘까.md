---
title: ".env를 커밋하지 않으면 값은 어디에 둘까"
description: "커밋된 .env.* 파일을 걷어내고 값을 GitHub Secrets와 배포 워크플로로 나눠 옮기면서, 어떤 값을 어디에 둘지 정한 기준과 옮기는 동안 실제로 겪은 함정을 정리했어요."
published: 2026-12-02T09:00:00+09:00
tags: ["GitHub Actions","보안","Next.js","CI/CD"]
image: "/og/post-env-secrets.png"
---

`.env` 파일에서 시작되는 보안 사고가 계속 나오고 있어요. 2024년 Palo Alto Networks Unit 42가 공개한 사례에서는 공격자가 웹에 그대로 노출된 `.env` 파일을 대량으로 찾아 클라우드 접근 키를 얻고, 데이터를 빼낸 뒤 공개하겠다고 협박했어요. 보고서는 클라우드 서비스의 취약점이 아니라 환경 변수 노출, 오래 쓰는 자격 증명, 최소 권한 부재가 원인이었다고 짚어요. 2025년 3월에는 많이 쓰이던 GitHub Action `tj-actions/changed-files`가 변조돼서, 이 액션을 쓰는 워크플로의 시크릿이 로그에 그대로 찍혀 나왔어요.

저희 팀 레포에도 환경별 `.env.development`, `.env.staging`, `.env.production` 파일이 커밋돼 있었고, 그중 일부에는 실제 토큰이 들어 있었어요. 이 파일들을 걷어내고 값을 GitHub Secrets와 배포 워크플로로 옮기면서 정한 기준과, 옮기는 동안 실제로 겪은 함정을 정리해 볼게요. 예시는 Next.js 앱과 GitHub Actions 기준이에요.

## 처음에는 어떻게 돼 있었나

```text
apps/web/
  .env.development
  .env.staging
  .env.production        ← 모두 git에 커밋
  package.json           "build:stg": "env-cmd -f .env.staging next build" …
  Dockerfile             ARG ENV 값에 따라 build:dev / build:stg / build:prd 중 하나를 실행
```

배포 워크플로는 이 파일 끝에 시크릿 몇 개만 덧붙였어요. 이 구조에는 문제가 세 가지 있었어요.

- **값의 출처가 두 곳이에요.** 대부분은 커밋된 파일에, 일부는 워크플로에 있어서 실제 배포에 어떤 값이 들어가는지 한 곳에서 볼 수 없었어요. 값 하나를 바꾸는 데도 코드 PR이 필요했고요.
- **레포를 읽을 수 있으면 토큰도 읽을 수 있어요.** 사람뿐 아니라 레포를 읽는 도구와 에이전트도 마찬가지예요.
- **환경을 잘못 넘겨도 에러가 나지 않았어요.** Dockerfile 분기의 `else`가 prd 빌드였어서, 환경 이름이 비거나 오타가 나면 조용히 prd 설정으로 이미지가 만들어질 수 있었어요.

커밋된 값은 낡기도 해요. 소스맵 업로드가 403으로 실패하는 걸 조사해 보니, 커밋돼 있던 업로드 토큰이 이미 폐기된 토큰이었어요. 파일에 적힌 값과 실제로 유효한 값이 어긋나 있었는데, 아무도 알아채지 못했던 거예요.

## 값부터 세 가지로 나눴다

무엇을 Secrets에 넣을지 정하기 전에 값부터 나눴어요. 기준은 "브라우저에 그대로 보여도 괜찮은가"예요.

| 종류 | 예 | 둘 곳 |
| --- | --- | --- |
| 서버에서만 쓰는 비밀 | 외부 API 토큰, 키가 들어간 웹훅 URL, 소스맵 업로드 토큰 | Secrets. 번들과 이미지에도 남기지 않는다 |
| 공개되지만 키처럼 생긴 값 | 분석 SDK 키, 지도·로그인 SDK의 JS 키 (`NEXT_PUBLIC_*`) | 환경별 Secrets |
| 그냥 설정 | API 주소, 환경 이름, 기능 플래그 | 워크플로에 인라인 |

가운데 줄이 헷갈리기 쉬워요. Next.js 문서에 따르면 `NEXT_PUBLIC_`로 시작하는 값은 `next build` 때 JavaScript 번들에 그대로 들어가요. 브라우저 개발자 도구만 열어도 보이는 값이라 Secrets에 넣는다고 비밀이 되지는 않아요.

그래도 Secrets에 둔 이유는 레포에 평문으로 둘 이유가 없어서예요. 환경별 값을 코드 PR 없이 바꿀 수 있고, 레포 검색에 키가 줄줄이 걸리지도 않아요. 대신 이 값들은 옮기면서 재발급하지 않았어요. 이미 공개돼 있던 값이라 재발급해도 얻는 게 거의 없어서예요.

마지막 줄은 일부러 워크플로에 그대로 적었어요. 로그에 찍혀도 문제없는 값이고, 바뀌면 PR diff에 바로 보여서 리뷰하기 쉬워요.

### 이름이 노출 범위를 정한다

옮기다 보니 소스맵 업로드 토큰이 `NEXT_PUBLIC_SENTRY_AUTH_TOKEN`이라는 이름으로 들어가 있었어요. 이 접두사가 붙은 값은 클라이언트 코드에서 참조하는 순간 번들에 실려요. 서버나 빌드에서만 쓰는 값에는 `NEXT_PUBLIC_`를 붙이지 않아야 해요. 이 토큰은 `SENTRY_AUTH_TOKEN`으로 이름을 바꿨어요.

## CI가 .env를 통째로 만든다

바꾼 구조에서는 레포에 값이 담긴 env 파일이 없어요. 배포 워크플로가 빌드 직전에 `.env` 하나를 만들고, Dockerfile은 그 파일을 복사한 뒤 빌드만 해요.

```yaml
- name: Make envfile
  uses: ./.github/actions/create-envfile   # 레포 안에 둔 이유는 아래에서
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

얻은 것은 이래요.

- **환경 차이가 값에만 남아요.** 예전에는 환경별 차이가 빌드 스크립트 4개, Dockerfile 분기, env 파일 4개에 흩어져 있었어요. 이제 빌드 방법은 `next build` 하나이고, 환경은 CI가 넣는 값으로만 갈려요.
- **시크릿 이름만 봐도 무슨 값인지 알 수 있어요.** 이름 규칙은 `<DEV|STG|PRD>_<키에서 NEXT_PUBLIC_를 뗀 것>`으로 정했어요. 환경과 상관없이 값이 하나인 서버 전용 키는 접두사를 붙이지 않아요.
- **로컬은 `.env.example`로 시작해요.** 키 목록만 담은 파일을 커밋해 두고 `cp .env.example .env` 후에 필요한 값만 채워요.

옮기기 전에, 재사용할 기존 Secrets가 커밋된 값과 정말 같은지도 CI에서 대조했어요. 값은 출력하지 않고 서로 다른 키의 이름만 출력하는 임시 워크플로를 돌렸고, 12개 모두 같은 걸 확인한 뒤 지웠어요. 값을 확인하는 과정에서 값을 흘리면 안 되니까요.

## 옮기면서 실제로 겪은 함정

### 1. 파일 끝에 덧붙이면 값이 이어 붙는다

예전 구조에서는 커밋된 파일 끝에 토큰을 덧붙였어요.

```bash
printf 'SENTRY_AUTH_TOKEN=%s\n' "$TOKEN" >> .env.production
```

파일이 개행 없이 끝나 있으면 마지막 줄과 새 줄이 한 줄로 합쳐져요.

```text
NEXT_PUBLIC_PIXEL_ID=1234567890SENTRY_AUTH_TOKEN=sntrys_…
```

픽셀 ID가 깨져서 분석 픽셀이 초기화되지 못했어요. 더 큰 문제는 서버 전용 토큰이 `NEXT_PUBLIC_` 값 안으로 들어갔다는 점이에요. 그 값은 번들에 실리니까 토큰도 같이 밖으로 나가요. 그래서 토큰은 재발급 대상이 됐어요.

당장은 `printf '\nSENTRY_AUTH_TOKEN=%s\n'`처럼 앞에 개행을 넣어 막았어요. 근본적인 해결은 덧붙이지 않는 거예요. CI가 파일 전체를 만들면 이런 일이 생길 틈이 없어요.

### 2. .gitignore는 이미 올라간 파일을 지우지 않는다

한 앱을 옮기면서 예전 `.env.*` 파일들을 `.gitignore`에 추가했어요. 그런데 git에서는 지우지 않았어요. 이미 추적 중인 파일은 `.gitignore`에 넣어도 레포에 그대로 남아요.

평소라면 드러나지 않았을 문제인데, 이번에는 같은 PR에서 `env-cmd`를 뺐어요. `env-cmd`가 `.env.staging` 값을 프로세스 환경 변수로 먼저 넣어 주던 동안에는 문제가 가려져 있었어요. 이게 빠지자 `next build`가 production 모드로 env 파일을 직접 읽었어요. Next.js는 `.env.production`을 `.env`보다 우선해요. 그래서 CI가 만든 stg용 `.env`가 남아 있던 `.env.production`에 덮였고, stg와 dev 빌드에 prd 값이 들어갔어요. stg에서 Google 로그인을 누르면 prd 클라이언트 ID로 요청이 나가서 `origin_mismatch`로 막혔어요.

```bash
git rm --cached apps/web/.env.production   # 추적을 끊어야 레포에서 빠진다
```

이후로는 옮긴 뒤 빌드 로그의 이 줄을 꼭 확인해요. Next.js가 실제로 읽은 env 파일 목록을 찍어 줘요.

```text
- Environments: .env.production, .env     ← .env 하나만 있어야 한다
```

### 3. 이미지 안에 .env가 남는다

CI가 만든 `.env`에 소스맵 업로드 토큰도 같이 넣고 있었는데, 확인해 보니 이 파일이 배포 이미지까지 따라 들어가는 구조였어요. 경로는 두 가지였어요.

- Dockerfile이 `.env`를 직접 `COPY`해요.
- Next.js `output: 'standalone'`은 빌드 때 읽은 `.env`와 `.env.production`을 `.next/standalone`에 복사해요. 공식 문서에 나와 있는 동작이에요.

소스맵 업로드 토큰은 빌드할 때만 필요하고 실행 중인 서버는 쓰지 않아요. 그래서 env 파일에 쓰지 않고, 멀티 스테이지 빌드의 빌드 스테이지에만 build arg로 넘기도록 바꿨어요.

```dockerfile
FROM node:22-alpine AS installer
ARG SENTRY_AUTH_TOKEN          # 이 스테이지의 RUN에서만 환경 변수로 보인다
RUN pnpm exec turbo build --filter=web

FROM node:22-alpine AS runner  # installer를 상속하지 않으니 ARG도 history도 따라오지 않는다
COPY --from=installer /app/apps/web/.next/standalone ./
```

워크플로에서는 `--build-arg SENTRY_AUTH_TOKEN`처럼 값 없이 이름만 넘겨요. docker CLI가 스텝 환경 변수에서 값을 읽어서 명령줄에 값이 드러나지 않아요. 가장 좋은 방법은 BuildKit의 `RUN --mount=type=secret`이에요. 다만 저희 셀프 호스티드 러너에는 buildx가 없어서 이건 후속으로 남겼어요.

배포 뒤에는 이미지에 토큰이 없는지 이렇게 확인해요.

```bash
docker run --rm --entrypoint sh <image> -c 'grep -r SENTRY_AUTH_TOKEN /app || echo clean'
docker history --no-trunc <image> | grep -c SENTRY_AUTH_TOKEN   # 0이어야 한다
```

### 4. 로그 마스킹은 등록된 값만 가린다

GitHub Actions는 Secrets에 등록된 값이 로그에 나오면 `***`로 가려 줘요. 다만 가려 주는 건 등록된 값 그대로일 때뿐이에요. GitHub 보안 문서도 값이 변환될 수 있는 방법이 여러 가지라 자동 마스킹이 보장되지 않는다고 적고 있어요. Base64나 URL 인코딩처럼 변환한 값은 따로 시크릿으로 등록하라고 하고, JSON 같은 구조화된 데이터를 시크릿 하나로 넣으면 마스킹이 실패할 수 있다고도 해요.

재사용 워크플로의 입력값도 마찬가지예요. 입력은 시크릿이 아니라서 로그에 그대로 찍힐 수 있어요. 그래서 저희 공용 배포 워크플로에서는 env 줄을 그대로 받는 입력에는 공개값만 넣어요. 토큰은 `KEY=SECRET_NAME`처럼 시크릿 이름만 받는 별도 입력으로 넘기고, 값은 워크플로 안에서 꺼내요.

### 5. 배포 경로가 여러 개면 한 곳은 빠진다

앱 하나가 배포되는 경로가 생각보다 많았어요. 환경별 Cloud Run 배포 4개, e2e 1개, GitOps dev·stg 2개를 합쳐 7곳이에요. 새 키를 추가할 때 한 곳이라도 빠뜨리면 그 경로만 조용히 빈 값으로 떠요.

env 파일 생성 액션은 `fail_on_empty`가 기본값 `false`라서 비어 있는 시크릿도 빈 문자열로 그대로 써요. 의도적으로 비워 두는 키도 있어서 블록 전체에 `fail_on_empty: true`를 걸 수는 없었어요. 그래서 반드시 있어야 하는 시크릿만 먼저 검사하는 스텝을 뒀어요.

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

값을 전부 Secrets로 옮겨도, 그 값을 받는 스텝의 코드가 바뀌면 소용이 없어요. 앞에서 말한 `tj-actions/changed-files` 사고가 바로 그런 경우였어요. 액션의 태그가 악성 커밋을 가리키도록 바뀌었고, 그 태그를 쓰던 워크플로는 다음 실행부터 바뀐 코드에 시크릿을 넘겼어요.

팀에서 공급망을 점검해 보니, 앞의 `.env` 생성 단계가 바로 그런 자리였어요. 개인이 소유한 외부 액션을 태그로만 고정해서 쓰고 있었고, 이 액션이 배포 시크릿을 통째로 받는 곳이 63군데였어요. 액션이 하는 일은 `envkey_*` 입력을 `.env` 줄로 쓰는 것뿐이라, 원본 로직은 60줄 남짓이었어요. 그래서 커밋 SHA로 고정하는 대신 레포 안의 로컬 액션으로 옮겼어요. 이제 이 코드는 PR 리뷰를 거쳐야만 바뀌어요.

모든 액션을 이렇게 옮길 수는 없어요. 그럴 때는 GitHub 보안 문서가 안내하는 대로 태그 대신 전체 커밋 SHA로 고정하는 방법이 있어요.

## 지운 파일은 끝이 아니다

env 파일을 지우는 커밋을 올려도 예전 커밋에는 값이 그대로 남아 있어요. GitHub 문서도 민감한 데이터가 비밀번호나 토큰 같은 자격 증명이라면, 첫 단계는 그 값을 폐기하거나 교체하는 거라고 안내해요. 히스토리를 다시 쓰는 것만으로는 부족하다는 거예요.

그래서 파일을 지운 PR에는 재발급할 키 목록을 같이 적어 뒀어요. 기준은 앞의 분류와 같아요.

- **서버 전용 비밀**: 발급처에서 재발급하고 Secrets를 갱신해요.
- **`NEXT_PUBLIC_` 키**: 이미 번들로 공개돼 있던 값이라 재발급해도 얻는 게 거의 없어요.

## 마치며

옮기는 동안 기준으로 삼은 것들을 체크리스트로 남겨요.

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
