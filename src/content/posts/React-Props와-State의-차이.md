---
title: "[React] Props와 State의 차이"
description: "리액트를 공부하다 보면 Props와 State는 지나칠 수 없습니다."
published: 2024-07-02T13:15:42.538Z
updated: 2026-11-06T13:54:52.326Z
tags: ["React"]
image: "https://velog.velcdn.com/images/seung365/post/aaae52af-42f1-4652-a624-2f8e9c4d5a10/image.png"
---

리액트를 공부하다 보면 Props와 State는 지나칠 수 없습니다. 이 둘은 정말 중요한데요. 그렇기에 한번 정리해 보았습니다.


#### Props 

Props의 경우 부모 컴포넌트가 자식 컴포넌트에게 데이터를 전달할 때 사용됩니다. 

이 데이터는 컴포넌트의 속성처럼 동작합니다.

또한 props는 읽기 전용이기에 자식 컴포넌트는 전달받은 props를 변경할 수 없습니다. 

그리고 props는 부모 컴포넌트에서 자식 컴포넌트로 전달됩니다.

아래는 예시 코드입니다.

```tsx
const ParentComponent = () => {
const name = 'John';
return <ChildComponent name={name} />;
};
```

```tsx
const ChildComponent = (props) => {
return <div>Hello, {[props.name](http://props.name/)}</div>;
};
```

#### State

State는 컴포넌트 내부에서 관리하는 데이터입니다. 그러므로 컴포넌트 내에서 변경할 수 있는데요. 이 state가 변경될 때 마다 컴포넌트는 다시 렌더링 되게 됩니다.

또한 State는 컴포넌트 내에서 초기화 되며 함수형 컴포넌트의 경우에는 ‘useState’라는 훅을 사용해 변경할 수 있습니다.

아래는 예시 코드입니다.

```tsx
import React, { useState } from 'react';

const MyComponent = () => {
const [count, setCount] = useState(0);
// 여기선 count를 0으로 초기화 한것이다.

const increment = () => {
setCount(count + 1);
};

return (
<div>
<p>Count: {count}</p>
<button onClick={increment}>Increment</button>
</div>
);
};
```

이때 해당 count는 setCount로만 바꿀 수 있습니다.

### 요약

- **Props**: 부모에서 자식으로 전달되는 데이터며 읽기 전용이며 자식 컴포넌트에서 변경할 수 없습니다. 또한 Props가 변경되면 Props를 받은 자식 컴포넌트는 리렌더링 됩니다. (이에 props drilling을 하게 될 경우 불필요한 리렌더링이 발생할 수 있습니다. => 전역 상태를 사용하는 대체 방법 존재)
- **State**: 컴포넌트 내부에서 관리되는 데이터이며 변경 가능하며 변경 시 컴포넌트가 다시 렌더링됩니다.

### Props와 State의 차이점

- **데이터의 소유권**: Props는 부모 컴포넌트가 소유하고, State는 해당 컴포넌트가 소유합니다.
- **데이터의 수정**: Props는 변경할 수 없지만, State는 변경할 수 있습니다.
- **용도**: Props는 부모에서 자식에게 데이터를 전달하는 데 사용되고, State는 컴포넌트 내부에서 동적인 데이터를 관리하는 데 사용됩니다.

+추가)

이 글을 읽다 보면 이런 생각이 들거 같습니다. State가 자식 컴포넌트로 전해주게 되면 그게 곧 Props인거 아닌가?

=> 맞습니다. State가 자식에게 전해주게 되는 경우 이를 Props라고 부를 수 있게 되는겁니다. Props의 경우에는 State말고도 자식에게 전해주고 싶은 속성을 준다고 생각하면 될것 같습니다. State의 경우에는 좀 더 복잡하지만 간단하게 생각하면 어떠한 속성이 변했을때 이걸 반영하고 재렌더링을 시켜주고 싶을때 사용한다고 생각하면 좀 더 쉽습니다.

그리고 앞에서 말했듯이 Props를 자식이 받았을때 자식이 해당 Props를 변경할 순 없다고 했는데 그래서 State를 넘겨줄때는 State를 변경시킬수 있는 함수까지 같이 넘겨주어 부모의 State를 바꿀수 있습니다. 보통 이것을 **상태 끌어올리기**라 합니다. 이러한 방법을 통해 상태를 중앙(부모)에서 관리할 수 있게 됩니다. 상태 끌어올리기에 대해 궁금하다면 아래 링크를 참조해주시기 바랍니다!
https://ko.react.dev/learn/sharing-state-between-components
