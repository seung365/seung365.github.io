---
title: "로띠 로드 실패는 ErrorBoundary에 잡힐까: 실패 처리를 호출부에 맡기는 설계"
description: "디자인 시스템을 만들던 당시 \"이 에러가 나면 가장 가까운 ErrorBoundary가 잡아서 화면이 에러 UI로 바뀌나요?\"라는 질문을 받았어요."
published: 2026-10-11T06:18:35.732Z
updated: 2026-11-20T15:16:34.797Z
tags: ["React","errorBoundary","디자인시스템","에러처리"]
image: "https://velog.velcdn.com/images/seung365/post/dc6c7f80-f51e-471f-882c-be52f6eebeda/image.png"
---

![](https://velog.velcdn.com/images/seung365/post/dc6c7f80-f51e-471f-882c-be52f6eebeda/image.png)

디자인 시스템의 로띠 컴포넌트는 CDN에서 JSON을 받다가 실패하면 `LottieLoadFailedError`를 만들어요. 
디자인 시스템을 만들던 당시 "이 에러가 나면 가장 가까운 ErrorBoundary가 잡아서 화면이 에러 UI로 바뀌나요?"라는 질문을 받았어요. 
저도 처음엔 막연히 그렇다고 생각했는데, 코드를 따라가 보니 기본으로는 잡히지 않았어요. 잡히게 할지는 컴포넌트를 쓰는 쪽이 정하게 돼 있었어요.

## ErrorBoundary가 잡는 범위

React ErrorBoundary는 렌더 중, 생명주기 메서드와 effect 실행 중, constructor에서 던져진 에러를 잡아요. 
이벤트 핸들러, `setTimeout`이나 Promise 콜백처럼 React 바깥에서 실행되는 코드의 에러는 잡지 못해요.

로띠 데이터 훅은 fetch 실패를 Promise의 `.catch()`에서 상태로 저장하고 끝내요.

```ts
// 데이터 훅 (요약)
useEffect(() => {
  fetchLottieData(url, controller)
    .then(setData)
    .catch((error) => {
      if (isCancelled) return // 언마운트·URL 변경으로 취소된 건 에러가 아니다
      if (document.visibilityState === 'hidden') {
        // 웹뷰가 닫히거나 백그라운드로 간 사이 끊긴 요청은 화면 복귀 시 다시 요청
        document.addEventListener('visibilitychange', retry, { once: true })
        return
      }
      setError(error)
    })
}, [url, retryCount])
```

렌더 중에 다시 throw하는 곳이 없으니, 이 실패가 ErrorBoundary까지 저절로 올라갈 길이 없어요.

## 처리 방침은 onError로 받는다

컴포넌트는 에러를 받으면 `onError` 콜백을 부르고, 화면에는 대체 이미지를 보여 줘요.

```tsx
function PastaLottie({ path, firstFrameSrc, errorFallbackSrc, onError, ...props }: Props) {
  const { data, error } = useLottieCdnData(getLottieCdnUrl(path))

  useEffect(() => {
    if (error) onError?.(error)
  }, [error, onError])

  // 실패 시 errorFallbackSrc → firstFrameSrc → 빈 영역 순으로 대체
  const fallbackSrc = error ? (errorFallbackSrc ?? firstFrameSrc) : firstFrameSrc
  // …
}
```

그래서 같은 실패를 화면마다 다르게 다룰 수 있어요.

| 호출부 | 결과 |
|---|---|
| `onError` 없음 (기본) | 보고하지 않고 대체 이미지나 빈 영역 유지 |
| `onError={Sentry.captureException}` | 화면은 유지하고 기록만 |
| `onError={(e) => { throw e }}` | effect 안의 throw라 가까운 ErrorBoundary가 잡음 |

처음 이 구조를 설계할땐 "기본값이 아무것도 안 하는 건 너무 조용하지 않나" 싶었어요. 실패를 놓칠 것 같았거든요. 하지만 이유가 있었어요. 
이전에 디자인 시스템의 정적 리소스 로드 실패를 전부 Sentry에 보고하게 했다가 되돌린 적이 있어요. 
쌓인 이벤트 대부분이 웹뷰가 닫히는 순간 끊긴 요청처럼 사용자가 겪지도 않은 실패였어요.
로띠는 대부분 장식이니, 기본은 조용히 대체 이미지로 낮추고 기록이 필요한 화면만 `onError`를 연결하는 쪽이 맞았어요.

공용 패키지가 Sentry를 직접 부르지 않는 것도 장점이에요. 
이 패키지는 Pages Router, App Router, Storybook에서 모두 쓰이는데, 모니터링 도구를 고르는 일까지 패키지가 떠안을 필요는 없어요.

출석 성공 여부처럼 로띠 자체가 정보인 화면은 그 화면에서만 throw하거나, 부모가 실패 UI를 그리면 돼요. 
기본값을 throw로 바꾸면 장식용 로띠 하나 때문에 화면 전체가 에러 UI가 되는 곳이 생겨요.

한 가지 예외는 있어요. 이 컴포넌트는 lottie 런타임(약 330KB)을 `React.lazy`로 따로 받는데, 이 청크 로드가 실패하면 렌더 중 에러가 돼서 `onError`와 상관없이 ErrorBoundary로 올라가요. "로띠가 실패했다"고 해도 JSON 요청이 실패했는지 런타임 청크가 실패했는지에 따라 경로가 달라요.

## 마치며

"ErrorBoundary가 잡나요?"라는 질문은 결국 "실패했을 때 화면을 누가 결정하나요?"라는 질문이었어요. 
공용 컴포넌트가 그 결정을 대신하면 어떤 화면에는 너무 시끄럽고 어떤 화면에는 너무 조용해져요. 그래서 실패를 알려 주기만 하고 결정은 호출부에 넘기는 지금 구조가 맞다고 봐요. 공용 컴포넌트를 만들 때 "이 실패를 어떻게 보여 줄까"보다 "누가 정하게 할까"를 먼저 묻게 된 계기였어요.
