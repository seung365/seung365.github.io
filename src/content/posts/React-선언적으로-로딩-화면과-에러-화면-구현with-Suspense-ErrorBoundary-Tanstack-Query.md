---
title: "[React] 선언적으로 로딩 화면과 에러 화면 구현(with Suspense, ErrorBoundary)"
description: "우아하게 로딩 및 에러 처리하기"
published: 2024-11-12T14:00:45.962Z
updated: 2026-11-20T03:16:05.040Z
tags: ["React","Suspense","errorBoundary"]
image: "https://velog.velcdn.com/images/seung365/post/cbb80ce7-599f-441c-b675-75a64637a321/image.png"
---

카카오 테크 캠퍼스 프로젝트를 진행하던 도중 같이 작업 하던 동료가 Suspense와 ErrorBoundary를 통해 로딩 및 에러 상태를 처리하는 것을 보았습니다. 이에 멘토님께서도 다음과 같이 피드백을 주었는데요
![](https://velog.velcdn.com/images/seung365/post/f0e39703-0f4c-45dc-b502-8d2f78764340/image.png)
그래서 저도 Suspense와 ErrorBoundary를 사용해보기로 했습니다.

먼저 Suspense의 경우에는 react에서 제공하는 컴포넌트입니다.
간략하게 설명하자면 자식 요소가 로드되기 전까지 화면에 대체 UI를 보여주는 역할을 하게 됩니다.

```jsx
<Suspense fallback={<Loading />}>
  <SomeComponent />
</Suspense>
```
위의 코드를 보시면 SomeComponent가 실제 우리가 보여주고자 하는 UI입니니다. 하지만 해당 children 즉 SomeComponent의 렌더링이 지연이 되게 되면 fallback을 통해 실제 UI가 로드되기전까지 대체 UI를 보여주게 되는것 입니다. 
해당 코드에서는 대체 UI로 Loading이라는 컴포넌트를 보여주게 되겠습니다.

ErrorBoundray의 경우에도 이와 비슷합니다.
React18부터는 ComponetDidCatch라는 메서드를 통해 직접 class component로 ErrorBoundary를 구현이 가능합니다.
```js
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Example "componentStack":
    //   in ComponentThatThrows (created by App)
    //   in ErrorBoundary (created by App)
    //   in div (created by App)
    //   in App
    logErrorToMyService(error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback;
    }

    return this.props.children;
  }
}
```
하지만 다행인것이 이 또한 라이브러리가 존재합니다.
그래서 저는 react-error-boundary라는 라이브러리를 통해 Suspense처럼 바로 가져와서 사용하였습니다.

> npm install react-error-boundary

먼저 install을 해주고 나서

Suspense를 사용하는것 처럼 

```jsx
import {ErrorBoundary} from "react-error-boundary";

<ErrorBoundary fallback={<Error/>}>
  <SomeComponent />
</ErrorBoundary>

```
다음과 같이 import 후 사용할 수 있습니다.
위에서 말했듯이 fallback에 들어있는 Error 컴포넌트는 SomeCompoent가 렌더링 되는데 문제가 생기게 되면 대체 UI로 Error 컴포넌트가 렌더링 되게 되는것 입니다.

이처럼 선언적으로 리액트스럽게 에러와 로딩상태일때의 UI 렌더링 대체가 간편하게 이루어 질 수 있습니다.

여기서 주로 로딩 및 에러가 나오는 상황이 API를 호출한 결과를 보여줄 때 많이 존재하게 되는데
이러한 실전 응용의 경우 다음 글에서 알아보겠습니다.



참고자료
https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
https://ko.react.dev/reference/react/Suspense
