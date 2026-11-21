---
title: "[React] Ref 자식으로 전해주기"
description: "누군가는 나와 비슷한 에러를 맞이할꺼 같아 작성해 본다."
published: 2024-07-18T06:12:25.099Z
updated: 2026-11-15T18:28:30.286Z
tags: ["React"]
image: "https://velog.velcdn.com/images/seung365/post/74f766a9-66f3-4a43-83c7-06cfed4eb5ce/image.png"
---

누군가는 나와 비슷한 에러를 맞이할꺼 같아 작성해 본다.

컴포넌트를 관리해주면서 OrderPage의 부분에 있는 요소들을 나눠주면서 ref를 전해줘야 하는 상황이 오게 되었다. 다른 props의 경우 자주 해오던거라 문제 없었는데 ref의 경우 바로 되지 않았던것이다. 

처음에는 아래와 같이 하였다. 이때 중요한점은 전해줄때 

          <MyPresentMessage ref={messageRef} />
          
다음과 같이 ref 이름을 꼭 써서 전해줘야 한다는 것이다.

```tsx
const OrderPage = () => {          
          <MyPresentMessage ref={messageRef} />
};

export const MyPresentMessage = React.forwardRef<HTMLInputElement>((ref) => {
  return (
    <LetterBox>
      <div>나에게 주는 선물</div>
      <Input
        backgroundColor={'lightgray'}
        placeholder="선물과 함께 보낼 메시지를 적어보세요"
        height="30%"
        width="80%"
        ref={ref}
      ></Input>
    </LetterBox>
  );
});
```

그런데 이렇게 할 경우 
ref에서

**'{}' 형식은 'LegacyRef<HTMLInputElement> | undefined' 형식에 할당할 수 없습니다.ts(2322)**

다음과 같은 에러가 떴다.

그래서 공식문서를 참조해보니 props를 전해줘야 한다는 것이다.

![](https://velog.velcdn.com/images/seung365/post/74f766a9-66f3-4a43-83c7-06cfed4eb5ce/image.png)

  
다음과 같이 말이다.

하지만 나는 props를 전해줄 생각도 없고 따로 사용할 생각도 없었다.

그래서 ‘_’를 사용하여 props를 사용하지 않음을 선언했다.

```tsx
export const MyPresentMessage = React.forwardRef<HTMLInputElement>((_,ref) => {
  return (
    <LetterBox>
      <div>나에게 주는 선물</div>
      <Input
        backgroundColor={'lightgray'}
        placeholder="선물과 함께 보낼 메시지를 적어보세요"
        height="30%"
        width="80%"
        ref={ref}
      ></Input>
    </LetterBox>
  );
});

```

다음과 같이 해주니 에러가 사라지고 정상적으로 동작하였다.

  <br><br>
  

- Reference

https://ko.legacy.reactjs.org/docs/forwarding-refs.html
