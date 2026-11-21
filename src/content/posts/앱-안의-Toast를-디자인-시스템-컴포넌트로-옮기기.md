---
title: "앱 안의 Toast를 디자인 시스템 컴포넌트로 옮기기"
description: "Toast를 디자인 시스템 컴포넌트로 만들기"
published: 2026-10-11T07:39:14.936Z
updated: 2026-11-20T15:16:24.863Z
tags: ["React","useSyncExternalStore","디자인시스템","접근성","컴포넌트설계"]
image: "https://velog.velcdn.com/images/seung365/post/656f8a7f-8c80-4095-b211-503ac8df088d/image.png"
---

![](https://velog.velcdn.com/images/seung365/post/656f8a7f-8c80-4095-b211-503ac8df088d/image.png)
웹뷰 앱 안에 있던 Toast를 디자인 시스템 패키지로 옮기면서, 컴포넌트를 옮기는 것보다 먼저 정해야 했던 게 호출 방식이었어요. 
Toast는 컴포넌트 안에서만 뜨지 않아요. API 에러 핸들러나 유틸 함수처럼 React 트리 밖에서도 띄워야 해요. 
그래서 어디서든 부를 수 있는 `showToast()`를 만들고, 호출부 110여 개 파일을 이 함수로 바꿨어요. 새 디자인은 새 앱 버전에만 보여 줘야 해서 버전별 디자인도 함께 나눴어요.

## 옮기기 전

앱 안의 `useToast` 훅으로 Toast를 띄우고 있었어요. 훅이라 컴포넌트 안에서만 쓸 수 있었고, 나타나고 사라지는 처리는 `getElementsByClassName`과 `setAttribute`로 DOM을 직접 바꾸고 있었어요. 노출 이벤트 로깅도 Toast 코드 안에 섞여 있었어요.

## Radix에 맡긴 것과 직접 만든 것

새 Toast는 Radix UI의 Toast 프리미티브 위에 만들었어요. 다만 Radix Toast는 선언형이에요. `<Toast.Root open>`을 렌더해야 뜨고, `toast('...')`처럼 부르는 명령형 함수는 없어요. 그래서 역할을 이렇게 나눴어요.

| | Radix | 직접 구현 |
|---|---|---|
| 호출 | | 명령형 `showToast()`와 모듈 스토어 |
| 스크린리더 알림, 토스트 영역 | `Provider`, `Viewport`, `Description` | |
| 사라지는 시점 | `duration` 기능이 있지만 끔 | 스토어의 타이머 |
| 여러 개 표시 | Root를 여러 개 그리면 쌓임 | 한 번에 하나, 새 토스트가 교체 |
| 트랜지션 | | opacity 전환과 fade-in |

접근성처럼 직접 만들기 까다로운 부분은 Radix에 맡기고, 언제 띄우고 언제 숨길지는 스토어가 정해요. Radix의 `duration`을 쓰지 않은 건 기존 동작을 그대로 옮겨야 했기 때문이에요. 한 번에 하나, 1.5초, 기존 트랜지션 타이밍. 110개 파일을 바꾸면서 토스트가 다르게 보이면 안 됐어요. 트리 밖에서 호출하니 숨기는 시점도 스토어가 아는 편이 더 자연스러웠어요.

## 명령형 API: 모듈 스토어와 useSyncExternalStore

상태는 모듈 스코프에 두고, Toast 컴포넌트가 `useSyncExternalStore`로 구독해요. 처음엔 zustand로 만들었다가, 상태가 이 정도로 작으면 React 기본 API로 충분해서 바꿨어요. 이에 디자인 시스템 패키지에 상태 관리 라이브러리 의존을 하나 덜 두게 됐어요.

```ts
// 구조를 보여 주기 위한 요약 코드예요
type ToastState = { content: ReactNode; visible: boolean; id: number }

let state: ToastState = { content: null, visible: false, id: 0 }
const listeners = new Set<() => void>()

function setState(patch: Partial<ToastState>) {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const getSnapshot = () => state

let hideTimer: ReturnType<typeof setTimeout> | undefined

export function showToast(content: ReactNode, { time = 1500, onShow }: ShowOptions = {}) {
  clearTimeout(hideTimer) // 연속 호출 시 이전 토스트의 숨김 타이머 해제
  setState({ content, visible: false, id: state.id + 1 }) // opacity 0으로 먼저 마운트

  // 처음 상태가 한 번 그려진 뒤 보이게 해야 fade-in 트랜지션이 동작한다
  requestAnimationFrame(() => requestAnimationFrame(() => setState({ visible: true })))
  hideTimer = setTimeout(() => setState({ visible: false }), time)

  try {
    onShow?.()
  } catch {
    // 트래킹 실패가 토스트를 막지 않게
  }
}
```

`subscribe`와 `getSnapshot`은 모듈 최상위에 고정해 둬요. `useSyncExternalStore`는 `subscribe`의 참조가 바뀌면 구독을 다시 하기 때문에, 컴포넌트 안에서 인라인으로 만들면 렌더마다 구독이 반복돼요. `getSnapshot`은 `setState`가 불릴 때만 새 객체를 돌려줘서 스냅샷이 안정적이에요.

컴포넌트는 이 스토어를 구독해서 Radix Root를 그려요.

```tsx
export function Toast({ variant }: ToastProps) {
  const { content, visible, id } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return (
    <RadixToast.Provider label="알림">
      {content && (
        <RadixToast.Root key={id} forceMount open={visible} duration={Infinity}>
          {typeof content === 'string' ? (
            <Toast.Body variant={variant}>
              <Toast.Description variant={variant}>{content}</Toast.Description>
            </Toast.Body>
          ) : (
            content
          )}
        </RadixToast.Root>
      )}
      <RadixToast.Viewport />
    </RadixToast.Provider>
  )
}
```

`key={id}`로 호출할 때마다 Root를 다시 마운트해요. 같은 Root의 내용만 바꾸면 스크린리더가 새 알림으로 읽지 않을 수 있어서예요. `duration={Infinity}`는 Radix의 자동 닫힘을 끄고, 숨기는 시점을 스토어에 맡긴다는 뜻이에요.

## 슬롯으로 레이아웃 조립하기

아이콘이 있는 토스트, 여러 줄 토스트처럼 변형이 계속 생겨서, prop을 늘리는 대신 슬롯 컴포넌트를 뒀어요. `content`에 문자열을 넘기면 기본 레이아웃으로 그리고, ReactNode를 넘기면 호출부가 조립한 그대로 그려요.

```tsx
showToast(
  <Toast.Body>
    <Toast.Icon>
      <CheckIcon />
    </Toast.Icon>
    <Toast.Description>저장되었어요</Toast.Description>
  </Toast.Body>,
)
```

`Toast.Description`은 Radix의 `Description`을 감싼 거라, 직접 조립할 때도 본문은 이걸로 감싸야 스크린리더가 읽어 줘요.

## 버전별 디자인은 앱이 정한다

새 디자인은 앱 버전 3.0.0 이상에만 보여 줘야 했어요. 
디자인 시스템의 Toast는 `variant`(`default` / `legacy`)만 받고, 앱 쪽의 얇은 래퍼가 앱 버전을 보고 `variant`를 정해요. 버전 정보가 없으면 `legacy`로 가도록 했어요.

패키지는 앱 버전도, 트래킹 도구도 몰라요. 
버전 판정은 래퍼가, 노출 로깅은 `onShow` 콜백이 맡아요. 그래서 다른 앱도 같은 Toast를 그대로 가져다 쓸 수 있어요.

## 110여 개 파일 전환과 함께 고친 것

`useToast` 훅을 지우고 호출부가 `showToast`를 직접 부르게 바꿨어요. 
훅 안에서 하던 노출 로깅은 `onShow`로 옮겼고, DOM 직접 조작은 스토어 상태 기반의 opacity 전환으로 바꾸면서 트랜지션 타이밍은 그대로 맞췄어요.

옮기다가 기존 코드의 버그 두 개도 발견했어요. 하나는 토스트를 연달아 띄우면 이전 토스트의 숨김 타이머가 남아 있어서 새 토스트가 일찍 사라지던 문제예요. 새로 띄울 때 `clearTimeout`을 먼저 하게 했어요. 다른 하나는 로깅 코드가 예외를 던지면 토스트 노출까지 멈출 수 있던 문제예요. `onShow` 호출을 `try/catch`로 감싸 격리했어요.

## 마치며

처음엔 "Radix Toast가 있는데 스토어를 왜 따로 만들어야 하지"라는 생각이 들었어요. 정리해 보니 Radix는 토스트를 어떻게 보여 줄지를 잘 알지만, 언제 띄우고 언제 숨길지는 Radix가 알 수 없는 일이었어요. 
그래서 패키지는 보여 주는 방식과 띄우는 방법(`showToast`)까지만 맡고, 언제 부를지와 버전, 로깅은 앱이 정하게 나눴어요. 
다만 타이머를 직접 쥐면 자동 닫힘이나 언마운트 시점도 직접 챙겨야 해요. Radix의 기본 동작을 끈 곳마다 왜 껐는지 코드에 주석으로 남겨 둔 것도 그래서예요.
