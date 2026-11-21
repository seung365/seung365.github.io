---
title: "[MFA] \"분명 고쳤는데 왜 안 변해?\" -  HMR 심폐소생하기"
description: "\"HMR(Hot Module Replacement)의 실종\""
published: 2026-02-02T13:42:56.877Z
updated: 2026-11-20T15:16:34.605Z
image: "https://velog.velcdn.com/images/seung365/post/738e0910-c0bb-4464-9775-bd6a53d8916c/image.png"
---

## 1. 시작하며

이전에 TVING MFA(Micro Frontend Architecture) 프로젝트를 진행하면서 가장 먼저 맞닥뜨린 벽은 **"HMR(Hot Module Replacement)의 실종"**이었습니다.

Remote 앱(Vite)을 단독으로 띄울 땐 번개처럼 반영되던 코드 수정이, Host 앱(Next.js)에 Import Map으로 로드되는 순간 작동을 멈췄습니다. 매번 새로고침을 해야 하는 상황.. 개발 생산성을 위해 이 문제를 뿌리부터 파헤쳐 보기로 했습니다.

---

## 2. HMR은 어떻게 동작하는가?

트러블슈팅 전에 HMR의 기본 원리를 이해해야 합니다. HMR은 마법이 아니라 잘 짜인 네트워크 통신입니다.

1. **파일 변경 감지**: Vite 서버가 파일 수정을 감지합니다.
2. **모듈 업데이트**: 서버는 변경된 부분만 재컴파일하고 모듈 그래프를 갱신합니다.
3. **WebSocket 브로드캐스트**: 서버가 연결된 브라우저(HMR Client)에 "파일 변했으니 이 부분만 다시 받아가!"라고 메시지를 보냅니다.
4. **런타임 교체**: 브라우저의 **React Fast Refresh**가 컴포넌트 상태를 유지하면서 모듈만 갈아 끼웁니다.

---

## 3. MFA 환경에서 HMR이 죽는 결정적 이유

MFA 구조에서는 3번(WebSocket 브로드캐스트 수신)과 4번(React Refresh 실행)을 담당하는 런타임이 Host 환경에 존재하지 않았습니다.

### ① 안테나(HMR Client)의 부재

일반적인 SPA는 빌드 시 Vite 클라이언트(`/@vite/client`)가 자동으로 주입됩니다. 하지만 Import Map 방식은 런타임에 모듈을 가져옵니다.

- 문제의 핵심: Import Map으로 로드된 Remote 번들은 개발 서버에서 서빙되더라도 HMR 클라이언트(/@vite/client)가 Host 페이지에 주입되지 않으면, Host(Next.js) 역시 Vite 기반이 아니므로 자체적으로 Vite HMR 클라이언트를 가지고 있지 않습니다. 신호를 보내도 받을 친구가 없는 것입니다.

### ② 독립적인 Fast Refresh 런타임

물론 Host인 Next.js도 자체적인 Fast Refresh를 가지고 있습니다. 하지만 이는 Next.js의 번들러(Turbopack/Webpack)와 통합된 것이라 Vite의 @react-refresh 런타임과는 완전히 독립적으로 동작합니다. 즉, Next.js 엔진은 Vite 서버가 보내는 업데이트 패킷을 해석하거나 처리할 수 없습니다.

### ③ 다중 서버의 혼선

Host 하나에 여러 개의 Remote(뉴스, 플레이어 등)가 붙습니다. 각 Remote마다 독립적인 Vite 서버가 있으므로, Host는 여러 개의 WebSocket 연결을 동시에 관리해야 하는 복잡한 상황이었습니다.
(각 Remote의 Vite 클라이언트가 개별 WebSocket을 생성하므로, Host 환경에서는 이를 수용할 수 있는 런타임 구성이 필요했습니다.)

---

## 4. 해결책: HMR 심폐소생술

### Step 1. Host에 다중 HMR 안테나 세우기

Host의 `<head>`에서 각 Remote 앱의 포트에 맞는 Vite 클라이언트 스크립트를 명시적으로 주입했습니다.

```tsx
// Host의 layout.tsx
// 각 Remote 서버(5179, 5180...)의 클라이언트를 모두 로드
<script type="module" src="http://localhost:5179/@vite/client" />
<script type="module" src="http://localhost:5180/@vite/client" />

```

### Step 2. React Refresh 런타임 수동 초기화

Vite 클라이언트가 제대로 동작하려면 **Preamble(서문)** 스크립트가 필요합니다. 이를 Host 앱에서 직접 실행해 줍니다.

```html
<script type="module">
  import RefreshRuntime from 'http://localhost:5179/@react-refresh'
  RefreshRuntime.injectIntoGlobalHook(window)
  
  // Host 환경에서 Remote의 HMR만 처리하면 되므로, 
  // 실제 등록 로직 대신 인터페이스(빈 함수)만 제공하여 런타임 오류를 방지합니다.
  window.$RefreshReg$ = () => {} // 컴포넌트 등록 함수
  window.$RefreshSig$ = () => (type) => type // 컴포넌트 시그니처 추적 함수
  
  window.__vite_plugin_react_preamble_installed__ = true
</script>

```

> `import.meta.hot`을 직접 코딩할 필요는 없습니다. 환경만 깔아주면 Vite가 알아서 WebSocket을 연결하고 모듈을 교체합니다.

---

## 5. 결과: 다시 찾은 HMR

HMR을 복구한 결과, 코드 수정 후 화면 반영까지 걸리는 시간이 **10초(새로고침)에서 1초 미만**으로 줄었습니다. 무엇보다 **테스트 중이던 상태(State)가 유지**된다는 점이 개발자 경험(DX)을 극적으로 향상시켰습니다.

---

## 6. 마치며..

MFA 도입 시 화면을 나누는 것만큼 중요한 것이 **개발 환경의 통합**입니다. HMR은 당연히 작동해야 하는 기능처럼 보이지만, 아키텍처가 바뀌면 그 동작 원리부터 다시 고민해야 한다는 걸 배웠습니다.
