---
title: "@repo 패키지를 import하면 무슨 일이 일어날까"
description: "모노레포에서 import 한 줄이 실제 파일과 빌드 작업으로 이어지는 과정을 pnpm workspace 연결, exports 진입점, 소스·dist·.d.ts 공급 방식, Turborepo 태스크 그래프 순서로 따라가요."
published: 2026-11-25T09:00:00+09:00
tags: ["모노레포","pnpm","Turborepo","Next.js"]
image: "/og/post-repo-import.png"
---

모노레포에서 공용 패키지를 쓰는 코드는 대부분 이렇게 생겼어요.

```ts
import { resolveQueryRetry } from '@repo/http'
```

이 한 줄이 동작하기까지 도구가 여러 개 끼어들어요. "패키지를 찾지 못한다", "고쳤는데 반영이 안 된다", "생성된 타입이 없다" 같은 문제는 대부분 이 중 한 단계에서 생기는데, 도구 하나가 전부 처리한다고 생각하면 어디를 봐야 할지 알기 어려워요. 팀 스터디에서 발표한 내용을 바탕으로, import 한 줄이 실제 파일과 빌드 작업으로 이어지는 경로를 순서대로 따라가 볼게요.

## 설치와 빌드는 서로 다른 단계다

import 한 줄 뒤에서는 네 가지 일이 따로 일어나요.

| 단계 | 담당 | 하는 일 |
| --- | --- | --- |
| 연결 | pnpm install | workspace 패키지를 앱에 연결한다 |
| 진입점 | package.json의 exports | 패키지에서 어떤 파일을 읽을지 정한다 |
| 변환 | Next · Vite · tsc | TS·JSX를 실행할 수 있는 코드로 바꾼다 |
| 순서 | Turborepo | 위 작업의 스크립트를 필요한 순서로 실행한다 |

표의 순서는 개념적인 순서예요. 앱 번들 안에는 서버용과 클라이언트용 그래프가 따로 있을 수도 있어요.

## 연결: workspace:*는 로컬 패키지를 가리킨다

`@repo`라는 접두사 자체에는 경로를 찾는 기능이 없어요. 연결은 이름으로 해요.

```jsonc
// apps/web/package.json
"@repo/http": "workspace:*"

// packages/http/package.json
"name": "@repo/http"
```

pnpm은 `pnpm-workspace.yaml`에 선언된 폴더를 훑으면서 각 `package.json`의 `name`을 확인하고, 이름이 같은 로컬 패키지를 앱에 연결해요. 기준은 폴더 이름이 아니라 `name`이에요.

`workspace:*`는 workspace 안의 패키지만 허용해요. 찾지 못하면 레지스트리에서 같은 이름의 패키지를 대신 가져오지 않고 설치가 실패해요. 별표는 버전 제약을 두지 않는다는 뜻이고, 중앙 버전 표를 참조하는 `catalog:`와는 다른 개념이에요.

연결은 패키지가 "어디에 있는가"만 해결해요. 연결됐다고 빌드 결과물이 생기지는 않아요.

## 진입점: exports가 패키지의 입구를 정한다

이름으로 패키지 폴더를 찾은 다음, 실제로 어떤 파일을 읽을지는 `package.json`의 `exports`가 정해요.

```json
"exports": {
  ".": "./index.ts"
}
```

`@repo/http`를 import하면 resolver는 `exports["."]`를 따라 `./index.ts`에 도착하고, 이 파일이 `src` 아래 모듈들을 다시 export해요. `@repo/http`라는 경로는 폴더를 실행한다는 뜻이 아니라 공개된 입구를 따라간다는 뜻이에요.

`exports`가 있으면 거기 적지 않은 서브패스는 일반적인 패키지 해석에서 막혀요. 그래서 "특정 import 경로만 안 된다"면 `exports`에 그 서브패스가 공개돼 있는지부터 보면 돼요. 참고로 tsconfig의 `paths`는 타입 검사기에 주는 해석 힌트일 뿐이라 런타임 파일을 만들어 주지 않아요.

## 빌드는 세 가지 일을 묶어 부르는 이름이다

"빌드"라고 뭉뚱그려 부르는 작업은 사실 세 가지예요.

- 타입 검사(`tsc --noEmit`): 타입 오류를 찾아요. 실행할 JS를 만드는 일과는 별개예요.
- 코드 변환(SWC, esbuild): TS·JSX를 실행할 수 있는 형태로 바꿔요. 변환에 성공했다고 타입이 안전하다는 뜻은 아니에요.
- 번들링(Next, Vite): import 관계를 따라 배포할 파일과 청크를 만들어요. 서버용과 브라우저용을 나눠요.

한 도구가 여러 역할을 할 수 있어도 역할은 구분해야 해요.

## 코드를 공급하는 방식은 패키지마다 다르다

같은 `workspace:*`로 연결돼도, 패키지가 앱에 코드를 넘기는 방식은 달라요. 기본형은 두 가지예요.

### 소스를 그대로 주는 패키지

```json
"exports": {
  ".": "./index.ts"
}
```

`@repo/http`에는 JS 빌드 단계가 없어요. 패키지 쪽에서 빌드를 관리할 일은 줄지만, 대신 앱의 빌드 도구가 TS 소스를 변환해 줘야 해요. Next.js는 같은 모노레포 안의 workspace 패키지를 대부분 알아서 변환해 줘서, 따로 설정할 일이 거의 없어요.

### 미리 빌드해서 주는 패키지

```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.es.js",
    "require": "./dist/index.cjs"
  }
}
```

`@repo/ui`는 `vite build`로 `dist`를 먼저 만들어요. 앱은 생성된 JS와 타입 선언을 읽어요. `types`는 TypeScript가, `import`는 ESM으로 가져가는 번들러가, `require`는 CommonJS로 가져가는 도구가 읽는 입구예요. resolver는 위에서부터 맞는 첫 조건을 골라요. 앱 쪽 설정은 단순해지지만, 대신 `dist`를 최신으로 유지해야 해요.

정리하면 `workspace:*`는 연결 방식이고, 소스냐 `dist`냐는 코드 공급 방식이에요. 둘은 따로 정해져요.

### 고쳤는데 반영이 안 될 때

`@repo/ui`의 `src`를 고쳐도 `exports`가 `dist`를 가리키면, 다시 빌드하기 전까지 앱은 예전 `dist`를 읽어요. 이 경우는 다시 설치해도 해결되지 않아요. 재설치보다 `exports`가 가리키는 파일이 무엇인지, 그 `dist`를 언제 만들었는지를 먼저 확인하는 게 빨라요.

### 실행 코드와 타입의 입구가 다를 수도 있다

세 번째 경우도 있어요. OpenAPI 스펙으로 API 클라이언트를 생성하는 `@repo/api-client`는 소스와 생성된 타입 선언을 함께 내보내요.

```json
"./gen-browser/*": {
  "types": "./dist/gen-browser/*.d.ts",
  "default": "./gen-browser/*"
}
```

`types`는 TypeScript가 읽는 입구이고, `default`는 앱 빌드 도구가 읽는 입구예요. 이 패키지가 앱에서 쓰이기까지는 세 단계가 순서대로 필요해요.

1. `openapi:generate`: Orval로 API 소스를 생성해요.
2. `build:types`: `tsc -p tsconfig.gen.json`으로 `.d.ts`만 만들어요. 이 tsconfig는 `emitDeclarationOnly`라서 실행용 JS를 만들지 않아요.
3. 앱의 `next build`: 생성된 TS 소스를 앱이 직접 변환해요.

"타입 선언을 빌드하면 JS도 미리 생긴다"고 생각하면 이 순서를 잘못 이해하게 돼요. 그리고 이 순서를 지켜 주는 게 다음 단계인 Turborepo예요.

## 순서: Turborepo는 스크립트의 실행 순서를 조율한다

Turborepo는 코드를 직접 컴파일하지 않아요. 실제 작업 내용은 각 `package.json`의 스크립트에 있고, Turborepo는 그 스크립트를 어떤 순서로 실행할지와 결과를 재사용할지를 관리해요.

- pnpm: 어떤 패키지에 의존하는가 (설치·연결)
- TS · Vite · Next: 각 스크립트가 무슨 일을 하는가 (검사·변환·빌드)
- Turborepo: 어떤 작업을 먼저 실행하는가 (실행 순서·캐시)

이름이 비슷한 Turbopack은 Next.js의 번들러라서 역할이 전혀 달라요. 또 Turborepo가 앱 코드의 import를 보고 필요한 생성 스크립트를 알아서 추론해 주지도 않아요. 패키지 의존과 태스크 의존을 명시해야 해요.

### 패키지 그래프와 태스크 그래프는 다르다

두 그래프는 화살표 방향이 반대로 읽혀요.

- 패키지 그래프: `web` → `@repo/ui` (web이 ui에 의존한다)
- 태스크 그래프: `@repo/ui#build` → `web#build` (ui의 build가 먼저 끝나야 한다)

```json
"dependsOn": ["^build"]
```

`^build`는 "내가 의존하는 패키지의 build가 먼저 끝나야 한다"는 뜻이에요. 재미있는 건 build 스크립트가 없는 패키지도 그래프에는 남는다는 점이에요. `@repo/http`에는 build 스크립트가 없지만, `web#build`의 선행 작업 목록에는 `@repo/http#build`가 들어 있어요. 실행할 명령이 없는 중간 노드예요. 그래프가 허용하는 독립 태스크는 병렬로 실행되니, 모든 작업이 한 줄로 도는 것도 아니에요.

### 실제 실행 계획: 생성 → 타입 → 앱

앱을 빌드하기 전에 api-client의 코드 생성과 타입 생성이 순서대로 끝나 있어야 해요. 이 순서는 두 군데에 나눠 적어요.

먼저 api-client 안에서, 타입을 만들기 전에 코드부터 생성하라고 적어요.

```jsonc
// packages/api-client/turbo.json
"build:types": {
  "dependsOn": ["openapi:generate"]
}
```

그리고 앱에서, 빌드하기 전에 api-client의 타입 생성이 끝나 있어야 한다고 적어요.

```jsonc
// apps/web/turbo.json (발췌)
"build": {
  "dependsOn": ["^build", "@repo/api-client#build:types"]
}
```

`dependsOn`은 "이 작업 전에 먼저 끝나 있어야 하는 작업" 목록이고, 적는 방법은 세 가지예요.

| 적은 모양 | 뜻 |
| --- | --- |
| `"openapi:generate"` | 같은 패키지의 이 작업을 먼저 |
| `"^build"` | 내가 의존하는 패키지들의 `build`를 먼저 |
| `"@repo/api-client#build:types"` | 그 패키지의 그 작업을 콕 집어서 먼저 |

앱에 `^build`가 있는데도 마지막 줄을 따로 적는 이유는, `^build`가 이름이 정확히 `build`인 작업만 찾기 때문이에요. api-client에서 기다려야 할 작업은 이름이 `build:types`라서 `^build`로는 걸리지 않아요.

### 순서를 안 적으면 생기는 일

이 설정을 알아야 하는 이유는 문제가 로컬이 아니라 CI에서 터지기 때문이에요.

Turborepo는 `dependsOn`을 따라가며 실행할 작업을 모아요. 그래서 앱의 `dependsOn`에서 `@repo/api-client#build:types`가 빠지면, 앱을 빌드할 때 코드 생성과 타입 생성이 실행 계획에 아예 들어가지 않아요.

생성된 코드(`gen-browser/`)는 `.gitignore`에 들어 있어서 커밋되지 않아요. 로컬에는 예전에 한 번 생성해 둔 파일이 남아 있으니 앱 빌드가 그 파일을 읽고 통과해요. 반면 깨끗한 상태에서 시작하는 CI에는 그 파일이 없어서 "모듈을 찾을 수 없다"거나 "타입 선언이 없다"며 실패해요. 내 컴퓨터에서는 되는데 CI에서만 안 되니 원인을 찾기도 어려워요.

그래서 생성 코드를 쓰는 패키지를 새로 만들거나 앱에 붙일 때는, `dependsOn`에 순서를 적었는지까지 확인해야 해요.

아래에서 앱 두 개(web, admin)와 공용 패키지 다섯 개로 된 예시 레포를 직접 돌려 볼 수 있어요. 그대로 실행하면 기다릴 게 없는 작업부터 동시에 시작해서 순서대로 끝나요. 빌드 대상을 바꾸면 실행 계획이 어떻게 달라지는지, 체크를 끄고 실행 환경을 "CI"로 바꾸면 web 빌드가 왜 실패하는지 볼 수 있어요.

<turbo-sim></turbo-sim>

### 빌드 없이 실행 계획 읽어 보기

순서가 제대로 걸렸는지는 빌드를 돌리지 않고 확인할 수 있어요.

```bash
pnpm exec turbo run build --filter=web --dry=json
```

dry run은 명령을 실행하지 않고, 실행할 작업 목록과 순서만 JSON으로 출력해요. Turbo 2.9.16에서 39개 작업이 나왔고, 그중 api-client 경로만 추리면 이래요.

```json
[
  {
    "taskId": "@repo/api-client#openapi:generate",
    "command": "rm -rf gen-browser … && orval --config orval.config.cjs.js",
    "dependencies": []
  },
  {
    "taskId": "@repo/api-client#build:types",
    "command": "tsc -p tsconfig.gen.json",
    "dependencies": ["@repo/api-client#openapi:generate"]
  },
  {
    "taskId": "web#build",
    "command": "next build",
    "dependencies": [
      "@repo/api-client#build",
      "@repo/api-client#build:types",
      "@repo/http#build",
      "… 모두 30개"
    ]
  }
]
```

읽는 법은 간단해요. `dependencies`가 "이 작업 전에 끝나야 하는 작업"이에요.

- `openapi:generate`는 기다릴 게 없어서 가장 먼저 시작해요.
- `build:types`는 `openapi:generate`를 기다려요.
- `web#build`는 `build:types`를 포함해 30개 작업을 기다려요.

앞에서 말한 "스크립트가 없는 노드"도 여기서 보여요. `web#build`가 기다리는 `@repo/http#build`를 찾아보면 실행할 명령이 `<NONEXISTENT>`로 나와요. 그래프에는 있지만 실제로 돌릴 명령은 없는 작업이에요.

dry run은 계획만 보여 줄 뿐, 빌드가 성공하는지나 시간이 얼마나 걸리는지는 알려 주지 않아요. 원본 JSON에는 환경 값이나 캐시 경로가 들어갈 수 있으니 공유할 때는 taskId와 의존 관계만 추리는 게 좋아요.

### 캐시는 입력이 같을 때만 결과를 재사용한다

Turborepo는 소스, 설정, 의존 작업의 해시, 선언한 환경변수를 입력으로 해시를 만들고, 같으면 이전 결과를 재생해요. 그래서 두 가지를 정확히 적어야 해요.

- `inputs`: 결과를 바꾸는 입력이에요. 빠뜨리면 바뀐 코드에도 예전 결과가 재생돼요.
- `outputs`: 캐시가 맞았을 때 되살릴 산출물이에요.

`passThroughEnv`는 값을 넘기기만 하고 해시에는 넣지 않아요. 실제로 레포의 루트 `test` 태스크에는 테스트 파일만 해시에 들어가서 소스만 고친 변경이 캐시로 재생된 적이 있다는 주석과 함께, 소스 변경까지 캐시 키에 넣는 `$TURBO_DEFAULT$`가 들어 있어요.

## 문제가 생기면 어느 단계부터 볼까

증상을 도구 이름이 아니라 책임에 연결하면 볼 곳이 좁혀져요.

| 증상 | 먼저 확인할 곳 | 단계 |
| --- | --- | --- |
| 패키지를 찾지 못함 | workspace 범위, name, dependencies | 연결 |
| 특정 import 경로가 막힘 | exports의 공개 서브패스 | 진입점 |
| 소스 변경이 반영되지 않음 | exports가 소스인지 dist인지, 재빌드 여부 | 변환 |
| 생성 타입 선언을 찾지 못함 | openapi:generate → build:types 순서 | 순서 |
| 예전 실행 결과가 재사용됨 | 캐시 inputs, 환경변수, outputs | 순서 |

이 표는 진단의 출발점이고, 같은 증상에도 원인은 여럿일 수 있어요. 먼저 실패를 재현하고, 실제 해석 경로나 dry run으로 확인하는 게 순서예요.

## 마치며

import 한 줄 뒤에는 pnpm이 패키지를 연결하고, exports가 공개 입구를 정하고, TS와 앱 빌드 도구가 타입과 실행 코드를 처리하고, Turborepo가 선행 작업과 재사용을 관리하는 경로가 있어요. "이 패키지는 왜 먼저 빌드해야 하죠?"라는 질문에 exports가 dist를 가리켜서인지, 생성된 .d.ts가 필요해서인지 파일과 태스크를 근거로 구분해 답할 수 있다면 이 경로를 이해한 거예요. 캐시 무효화와 환경변수, ESM과 CJS 상호 운용, 타입 검사와 변환의 분리는 이 글의 범위 밖이에요.

### 참고 자료

- [pnpm: Workspace](https://pnpm.io/workspaces)
- [Node.js: Package entry points](https://nodejs.org/api/packages.html#package-entry-points)
- [Turborepo: Internal packages](https://turborepo.dev/docs/core-concepts/internal-packages)
- [Turborepo: Package and task graphs](https://turborepo.dev/docs/core-concepts/package-and-task-graph)
- [Turborepo: Caching](https://turborepo.dev/docs/crafting-your-repository/caching)
