---
title: "Vanilla Extract 도입기"
description: "Vanilla Extract, 처음이라도 괜찮아요."
published: 2025-07-08T07:33:26.093Z
updated: 2026-11-20T15:16:35.481Z
tags: ["vanilla-extract"]
image: "https://velog.velcdn.com/images/seung365/post/ed0753f0-9028-41cf-a7d9-0b4e269fe09b/image.png"
---

![](https://velog.velcdn.com/images/seung365/post/ed0753f0-9028-41cf-a7d9-0b4e269fe09b/image.png)


## 도입 계기
Next가 AppRouter이 도입된 이후 기본적으로 서버 컴포넌트를 제공하게 됩니다. 이 서버 컴포넌트를 적절하게 사용하기 위해서는 서버 사이드에서 CSS가 적용이 되어야 하는데요. 그래서 CSS in JS를 사용하기는 쉽지 않습니다. styled components나 emotion이 대표적인 CSS in JS 라이브러리인데요. JS로 CSS가 표현되어 런타임에서 CSS로 변환 되기에 `use client`를 사용할 수 밖에 없는데요.

이러한 이유 때문에 Next.js App Router을 사용할 때는 Vanilla Extract나 Tailwind를 많이 사용합니다.
저는 Tailwind는 사용해본 경험이 있기도 하고
코드의 볼륨이 커질수록 className이 많이 붙어 유지 보수 측면에서 아쉽다는 느낌을 받아왔습니다. 그래서 이번엔 Vanilla Extract를 사용하기로 했는데요!
잘 사용하기 위해 한번 알아보겠습니다.

## Vanilla Extract란 무엇인가?
Vanilla Extract는 **빌드 타임에 스타일을 생성하는 Zero‑runtime CSS-in-TypeScript 라이브러리**입니다.  
런타임이 아닌 빌드 과정에서 `.css.ts` 파일을 CSS로 변환하므로, 실행 중 JavaScript 로직 없이도 스타일이 적용될 수 있고 번들 사이즈 최적화에 유리하다는 점이 특징입니다.

## 왜 vanilla-extract를 선택했는가?

### 1. 성능 및 번들 최적화
- JavaScript 실행 없이 CSS가 적용되므로 런타임 오버헤드가 발생하지 않습니다.
- 특히 **Next.js의 SSR/SSG 환경**에서 번들 크기를 줄이고 초기 로딩 성능을 향상시킬 수 있습니다.

### 2. 타입 안정성 확보
- TypeScript 기반 스타일 정의 (`style()`, `styleVariants()`, `createVar()`) 시 **잘못된 클래스명이나 값이 있을 경우 컴파일 에러 발생**.
- 코드 완전성을 높은 수준으로 유지할 수 있습니다.

### 3. 유지보수 및 코드 가독성에서의 강점
- JSX 내부에 스타일 정의가 섞이지 않아서 CSS와 로직이 분리되어 깔끔함.
- 스타일 리팩토링이 필요한 경우도 직관적인 구조 덕분에 개선 가능성이 높습니다.

## ❌ 단점 및 주의점
위와 같은 장점들이 있지만 그 장점들이 있는 만큼 단점도 있습니다.

### 1. 런타임에 props 기반 동적 스타일 직접 적용 불가능
```tsx
const dynamicStyle = style({
  width: props.width // ← 불가능
});
```
위와 같이 바로 props 대신 styleVariants 또는 CSS Custom Properties (createVar)를 사용해 미리 스타일을 정의해야 합니다.

### 2. HTML 속성에 따른 조건적 스타일 지정 제한
- props.disabled, props.readOnly 같은 값만으로 스타일이 결정되는 경우에는 클래스를 미리 정의하고 조건부로 적용해야 합니다.

### 3. 외부 JS 변수나 API 기반 스타일 값 적용 어려움
- 런타임 값을 직접 CSS에 반영하는 방식은 vanilla-extract 구조상 지원되지 않습니다.
- 필요한 경우 CSS 변수 방식 또는 클라이언트 컴포넌트로 분리하는 접근이 필요합니다.

## 🛠️ 기본 설정 및 사용 예시

이제 도입 이유와 장점, 단점 모두 알아 보았으니 어떻게 쓰는지 간단하게 알아보겠습니다.

### 패키지 설치
```bash
pnpm add @vanilla-extract/css @vanilla-extract/next @vanilla-extract/recipes
pnpm add -D @vanilla-extract/next-plugin
```
일단 전 pnpm 패키지를 사용해 다음과 같은 명령어를 사용했습니다.
사용하시는 패키지 명령어로 설치해주면 되겠습니다.

여기서 설치해준 것들을 간단히 설명하자면

- **@vanilla-extract/css**
Vanilla Extract의 핵심 패키지
style(), styleVariants(), createVar() 등 기본 API 제공

- **@vanilla-extract/next**
Next.js와의 통합을 위한 패키지
Next.js 환경에서 .css.ts 파일을 올바르게 처리할 수 있게 해줌

- **@vanilla-extract/recipes**
복잡한 스타일 조합을 쉽게 만들 수 있는 고급 API
여러 variants와 조건을 조합한 컴포넌트 스타일링에 유용
-> 이게 없이도 스타일 구성이 되지만 복잡한 다중 variant 조합이 번거로워집니다.


- **@vanilla-extract/next-plugin (개발 의존성)**
Next.js의 webpack 설정에 Vanilla Extract 지원을 추가하는 플러그인
빌드 시 .css.ts 파일을 CSS로 변환하는 역할

이 4개면 충분히 Next에서 Vanilla Extract를 사용할 수 있습니다.

### 스타일 정의 (예제)
```tsx
// styles.css.ts
import { style, createVar, styleVariants } from '@vanilla-extract/css';

export const colorVar = createVar();

export const baseButton = style({
  padding: '8px 16px',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '1rem',
  color: colorVar,
  transition: 'all 0.2s'
});

export const buttonVariants = styleVariants({
  primary: { backgroundColor: '#007bff' },
  secondary: { backgroundColor: '#6c757d' },
});
```

### Button 컴포넌트 적용
```tsx
import { baseButton, colorVar, buttonVariants } from './styles.css';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?: string;
  variant?: 'primary' | 'secondary';
}

const MyButton = ({ color = 'white', variant = 'primary', children, ...props }: Props) => {
  return (
    <button
      className={`${baseButton} ${buttonVariants[variant]}`}
      style={{ [colorVar]: color }}
      {...props}
    >
      {children}
    </button>
  );
};
```

이런식으로 button을 만들고 사용 할 수 있습니다!
하나 간단하게 주의할 점은 `styles.css.ts` 이런식으로 css.ts 확장자를 사용해줘야 합니다.

## 핵심 비교: Vanilla Extract vs Emotion

이제까지의 내용들을 바탕으로 간단하게 Vanilla Extract와 Emotion간의 차이점을 표로 정리해보았습니다.

| 항목 | Vanilla Extract (Zero Runtime) | Emotion / styled-components (Runtime CSS-in-JS) |
|------|-------------------------------|------------------------------------------------|
| **스타일 생성 시점** | 빌드 타임 | 런타임 |
| **props 기반 동적 스타일링** | 제한적 (styleVariants, CSS 변수 사용) | props 값 직접 활용 가능 |
| **번들 사이즈 영향** | 최소화됨 | 스타일 로직 포함 시 번들 증가 가능 |
| **SSR / SSG 호환성** | 우수 | 일부 제약 존재 |
| **타입 안전성** | TypeScript 오류로 검증됨 | 지원되지만 런타임 오류 가능성 존재 |

## 마무리하며
저도 프로젝트에서 vanilla-extract를 도입했는데 SSR 프로젝트 구성 시 번들 성능 최적화와 스타일 로직 분리 측면에서 큰 장점을 느꼈습니다.
물론 런타임 동적 스타일링이 필요한 상황에서는 Emotion이나 styled-components가 더 유연하겠지만 정적이더라도 미리 정의된 조건으로 충분한 경우에는 vanilla-extract가 더 안정적이고 특히 Next.js에서 App Router를 사용하신다면 제로 런타임 CSS 라이브러리인 vanilla-extract를 추천드립니다!


### 참고 자료
https://vanilla-extract.style/ << 공식 문서가 잘 되어 있으니 한번 읽어 보는것을 추천드립니다!
https://just-take-the-first-step.tistory.com/58
https://yong-nyong.tistory.com/92
