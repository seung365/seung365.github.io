---
title: "useCallback, 클로저에 대해.."
description: "useCallback과 클로저를 섞어먹어보자!"
published: 2025-01-17T09:15:09.057Z
updated: 2026-11-05T20:06:56.484Z
tags: ["js","useCallback","클로저"]
image: "https://velog.velcdn.com/images/seung365/post/83533509-d1d0-4f4e-ae8f-548a1c1f803f/image.png"
---

**useCallback과 클로저에 대해 정리해 보았습니다.**

### useCallback은 React의 Hook중 하나로 함수를 메모이제이션 하기 위해 사용된다.

⇒ 컴포넌트가 리렌더링 될 때마다 새로운 함수가 생성됩니다.

하지만 useCallback을 사용할 경우 의존성 배열이 변경되지 않는 한 동일한 함수 참조를 유지합니다.

```js
  const [multiplier, setMultiplier] = useState(2);
  const [total, setTotal] = useState(0);
 
 // ❌ 잘못된 사용
  const handleCalculate = useCallback((num) => {
    // multiplier의 변화를 감지하지 못함
    setTotal(prev => prev + (num * multiplier));
  }, []); 

  // ✅ 올바른 사용
  const handleCalculateCorrect = useCallback((num) => {
    // multiplier의 변화를 감지함
    setTotal(prev => prev + (num * multiplier));
  }, [multiplier]);
```
이런식으로 외부에서 선언한 값은 의존성 배열에 넣어줘야합니다.

### 그럼 클로저 개념은 왜 나오는가?
우리가 state뿐만 아니라 함수 내에서는 직접 선언한 변수도 올 수 있기 때문인데요.

### 클로저란
클로저란 외부함수보다 내부함수가 더 오래 유지 되는 경우, 외부 함수 밖에서 내부함수가 호출되더라도 외부 함수의 지역 변수에 접근할 수 있는데 이러한 함수를 클로저라고 부릅니다.

이때 내부 함수가 외부 함수에 있는 변수의 복사본이 아니라 **실제 변수** 즉 **주소**를 통해 값에 접근한다는 것을 주의해야하는데요.
좀 더 쉽게 말하자면 
클로저의 경우 외부 함수의 변수의 주소를 가져와서 실제 변수의 값을 참조하게 되어.. ⇒ 내부 함수는 해당 외부 변수의 값의 주소를 가져와 사용하게 된다는 말입니다.

- 이때 당연한 말이지만 state가 아닌 우리가 직접 선언한 변수의 경우 리렌더링이 되게 되면 초기화가 됩니다.

## 클로저와 useCallback을 섞어 먹어보자!
- 클로저의 경우 내부 함수는 외부 함수가 선언한 변수에 대해 접근이 가능하고 그래서 외부 함수가 죽어도 내부 함수에서 여전히 외부 함수의 변수가 참조 가능한 상태

- useCallback의 경우 함수의 의존성배열이 바뀌지 않게 되면 함수가 새로 생성되지 않습니다.

이때 useCallback이 내부 외부 변수, 함수 의존성을 담고 있거나 아니거나 일때 케이스를 담아 정리해보았습니다..

#### 1. 내부 변수를 변경할 경우
```js
function Component() {
  const handleClick = useCallback(() => {
    let innerCount = 0;  // 내부 변수
    innerCount++;        // 내부 변수 변경
    console.log(innerCount);  // 항상 1이 출력됨
  }, []); // 함수가 재생성되지 않음
}

```
주석만으로도 이해가 될 수 있지만 설명을 더하자면
기본적으로 내부 변수의 경우 함수가 재생성 + 실행 될때 초기화가 되는데요.
그렇기에 항상 1이 출력되게 됩니다.
useCallback의 경우 함수 자체의 참조를 메모이제이션 하는 것이지(함수를 새로 생성하지 않는 것 뿐) 함수를 실행할 때 마다 innerCount의 값은 초기화가 됩니다.

#### 2. 일반 외부 변수를 변경할 경우
```js
function Component() {
  let normalCount = 0;  // 일반 변수

  const handleClick = useCallback(() => {
    normalCount++;      // 외부 변수 변경
    console.log(normalCount);  // 증가는 되지만 렌더링 시 다시 0으로 초기화
  }, []); 
}
```
이때는 이제 클로저의 개념을 생각 해보게 됩니다. 당연하게도 클로저를 통해 normalCount의 주소를 handleClick 내의 함수에서는 가지게 되고 이를 바탕으로 normalCount의 값이 증가하게 된다. 그치만 재 렌더링 시 다시 0으로 초기화가 되게 됩니다. => 이를 막고 싶다면 useState를 써야 해결 가능합니다.

이 useCallback을 통해 얻을 수 있는 부분은 함수를 생성하는 비용과 클로저 형성 비용(함수가 재생성 되지 않으므로 클로저도 재형성 되지 않는다)을 줄이게 되었다고 볼 수 있습니다.

#### 3. state를 변경하는 경우
```js
function Component() {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    setCount(count + 1);  // 의존성 배열에 count가 없으면 항상 0 + 1
    // 또는
    setCount(prev => prev + 1);  // 이렇게 하면 의존성 배열이 비어있어도 정상 동작
  }, []); 
}
```
이 경우에도 클로저의 개념을 생각 할 수 있는데 왜 setCount의 값이 항상 1이 되는가 하면 setCount를 실행할 경우 count의 주소값을 새로 배정해 1이 더해진 값은 새로 생성된다고 볼 수 있습니다. 그래서 해당 클로저를 통해 가지고 있는 주소값의 count는 여전히 0이 유지되어 값이 없데이트 되지 않는데요.

그래서 아래처럼 그 setCount 내부에 또 함수를 넣어 prev를 통해 react가 제공하는 최신 state값을 가져와 바로 더한 값을 count에 넣어주게 됩니다. 그럼 클로저를 통해 외부 count를 참조하는 것이 아닌 직접 이전의 count 값을 가져온다고 생각하면 좋을 거 같습니다.
더 쉽게 설명하자면 컴포넌트의 count변수를 클로저로 참조하지 않고 react가 관리하는 최신 state값을 직접 받아 사용하는 방식인 것이죠.

### 그렇담 의존성 배열에 값이 존재하는 케이스도 살펴봅시다!(즉 함수가 재생성 될 경우에는?)
대부분의 내용은 위에서 자세히 설명해서 사실관계 위주로 설명하겠습니다.
#### 1. 내부 변수 + 의존성 배열이 있는 경우
```js
function Component() {
  const [trigger, setTrigger] = useState(0);
  
  const handleClick = useCallback(() => {
    let innerCount = 0;  // 내부 변수
    innerCount++;        // 내부 변수 변경
    console.log(innerCount);  // 항상 1이 출력됨
  }, [trigger]); // trigger가 변경될 때마다 함수 재생성
}
```
=> 이 경우에는 함수가 호출 될때 마다 innerCount가 0으로 초기화 됩니다. 
물론 함수가 재생성 되는 경우 또한 동일합니다.

#### 2. 일반 외부 변수 + 의존성 배열이 있는 경우
```js
function Component() {
  let normalCount = 0;  // 일반 변수
  const [trigger, setTrigger] = useState(0);

  const handleClick = useCallback(() => {
    normalCount++;      // 외부 변수 변경
    console.log(normalCount);  // 증가는 되지만 여전히 리렌더링 시 초기화
  }, [trigger]); 
}
```
여기도 여전히 리렌더링이 될 경우 0으로 초기화 됩니다. 물론 리렌더링이 되기 전까지는 앞에서 보았듯이 값이 증가하게 됩니다.

#### 3. state + 의존성 배열이 있는 경우
```js
function Component() {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    setCount(count + 1);  // count 값이 변경될 때마다 함수가 재생성되어 최신 count 반영
  }, [count]); 
}
```
이 경우에는 count의 값이 변경될 때 마다 함수가 재생성 되어 최신값을 반영하게 됩니다.

> 제가 이해한 바를 바탕으로 적었으며 아래는 참고 링크입니다.
혹시 틀린 부분이 있다면 댓글로 말씀해주시면 감사하겠습니다!!

https://poiemaweb.com/js-closure
https://velog.io/@hjthgus777/React-%EB%8B%A4%EC%8B%9C-%ED%95%9C%EB%B2%88-useCallback%EC%9D%84-%ED%8C%8C%ED%97%A4%EC%B3%90%EB%B3%B4%EC%9E%90
https://react.dev/reference/react/useCallback
