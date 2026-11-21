---
title: "safe-area-inset 제대로 쓰기: env(), viewport-fit, 그리고 웹뷰에서 달라지는 것"
description: "노치나 홈 인디케이터가 있는 기기에서 화면 아래 버튼이 홈 바에 깔리거나, 위쪽 내용이 상태 바에 가려지는 문제는 모바일 웹을 만들다 보면 한 번은 만나요. CSS에는 이런 영역을 피하기 위한 값이 따로 있어요. env(safe-area-inset-*)예요."
published: 2026-10-11T07:01:04.167Z
updated: 2026-11-16T13:56:20.005Z
tags: ["CSS","iOS","safe area","웹뷰"]
image: "https://velog.velcdn.com/images/seung365/post/b1d8e45a-533f-41de-a75c-10037c15a316/image.png"
---

![](https://velog.velcdn.com/images/seung365/post/b1d8e45a-533f-41de-a75c-10037c15a316/image.png)


노치나 홈 인디케이터가 있는 기기에서 화면 아래 버튼이 홈 바에 깔리거나, 위쪽 내용이 상태 바에 가려지는 문제는 모바일 웹을 만들다 보면 한 번은 만나요. 
CSS에는 이런 영역을 피하기 위한 값이 따로 있어요. `env(safe-area-inset-*)`예요. 이 글에서는 이 값이 무엇인지, 언제 0이 나오는지, 그리고 앱 웹뷰에서는 무엇이 달라지는지 정리해요.

## safe area와 inset

기기 화면은 직사각형이 아닌 경우가 많아요. 모서리가 둥글고, 위에는 노치나 카메라 구멍이, 아래에는 홈 인디케이터가 있어요. 이런 것들에 가려지지 않고 내용을 안전하게 보여 줄 수 있는 영역을 safe area라고 해요.

`safe-area-inset-*`는 화면 가장자리에서 safe area까지의 거리예요.

| 값 | 의미 |
|---|---|
| `env(safe-area-inset-top)` | 위쪽 가장자리 ~ safe area (노치, 상태 바) |
| `env(safe-area-inset-bottom)` | 아래쪽 가장자리 ~ safe area (홈 인디케이터) |
| `env(safe-area-inset-left)` / `right` | 가로 모드의 좌우 (노치 쪽과 반대쪽 모두) |

가로로 돌리면 `top`은 줄고 좌우에 값이 생겨요. iOS는 노치가 없는 쪽에도 같은 크기의 inset을 줘서, 보통 `left`와 `right`가 함께 생겨요. 값은 회전에 따라 바뀌어요. 화면이 직사각형이고 가리는 것이 없으면 값은 0이에요.

`var()`처럼 생겼지만 사용자가 정의하는 값이 아니라, 브라우저가 기기와 화면 상태를 보고 채워 주는 환경 변수예요.

`env()`는 2020년 1월부터 주요 브라우저에서 모두 쓸 수 있어요(Baseline). iOS Safari 11.2에서는 `env()` 대신 `constant()`라는 이름으로 먼저 나왔고, 11.3부터 `env()`가 됐어요. Internet Explorer와 Opera Mini는 지원하지 않아요.

![env() 브라우저 지원 범위 (caniuse)](https://velog.velcdn.com/images/seung365/post/634c82aa-9151-450b-8c94-4c5bbf9235ce/image.png)


출처: [Can I use: CSS Environment Variables env()](https://caniuse.com/css-env-function), 2026년 10월 기준

## viewport-fit=cover부터 확인한다

iOS Safari는 기본으로 페이지를 safe area 안쪽에만 그려요. 노치 옆이나 홈 바 영역은 브라우저가 알아서 비워 두는 거예요. 이 상태에서는 페이지가 가려질 일이 없으니, inset을 써도 눈에 띄는 효과가 없어요.

페이지를 화면 끝까지 채우겠다고 선언해야 inset 값이 의미를 가져요.

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

`viewport-fit=cover`를 주면 페이지가 화면 전체로 확장되고, 그때부터 가려지는 영역을 `safe-area-inset-*`로 직접 피해야 해요. "inset을 썼는데 아무 효과가 없다"면 대부분 이 선언이 빠진 경우예요.

## 쓰는 패턴

가장 흔한 건 기존 여백에 inset을 더하는 거예요.

```css
.bottom-bar {
  position: fixed;
  bottom: 0;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
}
```

홈 바가 있는 기기에서는 16px에 홈 바 높이가 더해지고, 없는 기기에서는 16px만 남아요.

여백을 더하는 대신 "최소한 이만큼"을 원하면 `max()`를 써요.

```css
.bottom-bar {
  padding-bottom: max(16px, env(safe-area-inset-bottom, 0px));
}
```

홈 바가 16px보다 높으면 홈 바 높이만큼, 낮거나 없으면 16px이에요. 홈 바 위에 16px을 더 띄우는 `calc()`와는 결과가 달라요.

`position: fixed`인 요소는 `body`의 padding과 상관없이 화면 기준으로 붙어요. 그래서 `body`에 inset을 줬더라도 하단 고정 바는 따로 처리해야 해요.

## 두 번째 인자: fallback

`env()`의 두 번째 인자는 fallback이에요. 브라우저가 그 변수를 모르거나 값을 줄 수 없을 때 대신 쓰여요.

```css
env(safe-area-inset-bottom, 0px)
```

fallback이 없는데 값을 쓸 수 없으면, 선언이 통째로 무효가 되고 속성은 초기값이나 상속값으로 돌아가요. `calc(16px + env(safe-area-inset-bottom))`에서 이 일이 생기면 inset만 빠지는 게 아니라 16px까지 함께 사라져요.

다만 지금 쓰이는 브라우저와 웹뷰는 `safe-area-inset-*`라는 이름을 모두 알고 있어서, 가리는 영역이 없으면 0을 줄 뿐 값을 못 쓰는 일은 거의 없어요. fallback이 실제로 쓰이는 건 이 변수를 지원하지 않는 오래된 환경이에요. 그런 환경까지 신경 써야 한다면 `calc()` 안에서는 fallback을 붙여 두세요.

## Tailwind에서

`tailwindcss-safe-area` 플러그인을 쓰면 위 패턴을 유틸리티로 쓸 수 있어요. 최신 버전은 Tailwind v4용이고, v3에서는 0.8.0을 써요. 아래 값은 Tailwind 기본 spacing(`4` = 1rem) 기준이라, spacing을 바꿔 쓰는 프로젝트라면 숫자의 의미도 달라져요.

| 유틸 | 생성되는 값 |
|---|---|
| `pb-safe` | `env(safe-area-inset-bottom)` |
| `pb-safe-offset-4` | `calc(env(safe-area-inset-bottom) + 1rem)` |
| `pb-safe-or-4` | `max(env(safe-area-inset-bottom), 1rem)` |

다만 이 유틸이 만드는 `env()`에는 fallback이 없어요. fallback이 꼭 필요한 곳은 임의 값(`pb-[calc(16px+env(safe-area-inset-bottom,0px))]`)으로 쓰는 게 맞아요.

## 앱 웹뷰에서는 네이티브가 정한다

브라우저가 아니라 네이티브 앱 안의 웹뷰라면 한 가지가 더 있어요. inset 값은 웹뷰가 화면의 어디까지 차지하느냐에 따라 달라지는데, 그건 네이티브 레이아웃이 정해요.

- 네이티브가 웹뷰를 safe area 안쪽에만 배치하면, 웹뷰 입장에서는 가려지는 영역이 없으니 inset이 0이에요. 여백은 네이티브가 이미 확보해 준 거예요.
- 네이티브가 웹뷰를 화면 끝까지 펼치면, 웹 쪽에서 inset으로 피해야 해요.

그래서 같은 페이지라도 어느 화면에서 여느냐에 따라 아래 여백이 다르게 보일 수 있어요. 저희 앱은 웹 화면을 여는 딥링크에 웹뷰를 화면 끝까지 펼칠지 정하는 파라미터를 두고 있는데, 이렇게 네이티브와 웹이 "누가 여백을 책임지는지"를 맞춰 두지 않으면 여백이 두 번 들어가거나 아예 빠져요.



결국 safe-area-inset은 값 하나를 더하는 단순한 기능이지만, 그 기대한 값이 나오지 않는 이유가 여러 겹이에요. viewport-fit 선언, fallback, 그리고 웹뷰라면 네이티브의 배치까지. 값이 이상하면 이 셋을 차례로 보면 대부분 원인이 나와요.
