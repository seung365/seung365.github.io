---
title: "[JavaScript] 동기와 비동기에 대해"
description: "동기 코드는 순차적으로 코드가 실행이 된다. 비동기 코드의 경우 순차적으로 코드가 실행되지 않는다."
published: 2024-05-12T11:23:05.508Z
updated: 2026-11-12T18:23:26.467Z
tags: ["JavaScript"]
image: "https://velog.velcdn.com/images/seung365/post/b19ebcf5-2e0e-462f-963f-8477b8c5553d/image.png"
---

### 동기(Synchronous)와 비동기(Asynchronous)
동기 코드는 순차적으로 코드가 실행이 된다.
비동기 코드의 경우 순차적으로 코드가 실행되지 않는다.

비동기 코드를 사용할때 여러 패턴이 존재한다.

#### 1) 콜백 패턴
```javascript
const a = (callback) => {
    setTimeout(() => {
        console.log(1)
        callback()
    },1000)
}


a(() => {
    b(() => {
        c()
    })
}) 
```

이때 콜팩 패턴이 너무 많이 반복되면 
=> 콜백 안에 콜백 구조가 너무 많으면 이를 **콜백 지옥**이라 한다.

콜백 지옥의 해결 방안 => 프로미스(Promise) 클래스

#### 2) 프로미스(Promise)
```javascript
//콜백(Callback) 패턴 , 이걸 이용해 비동기의 흐름을 제어
//Promise

const a = () => {
  return new Promise((resolve) => {  //생성자 함수
      setTimeout(() => {
        console.log(1)
        resolve()
    },1000)
  }) 
}
const b = () => {
  return new Promise((resolve) => {  
      setTimeout(() => {
        console.log(2)
        resolve()
    },1000)
  }) 
}
const c = () => {
  return new Promise((resolve) => {  
      setTimeout(() => {
        console.log(3)
        resolve()
    },1000)
  }) 
}
const d = () => console.log(4)

/* a()
  .then(() => {
    return b()
  }).then(() => {
    return c()
  }).then(() => {
    d()
  }) */
//then 메소드 체이닝
//return을 사용해 결과를 반환

a()
  .then(b)
  .then(c)
  .then(d)
//이렇게 함수 자체를 넣을 수 있음

```
하지만 메소드 체이닝이 많이 일어날 경우 여전히 복잡하다. 

이러한 callback,promise 체인의 단점을 async와 await로 보완할 수 있다.

#### 3) async / await
await의 경우 **Promise가 return이 되어야 사용할 수 있다.
**

```javascript
const wrap = async()⇒ { 
//async라는 키워드가 붙어있는 함수 내부에서 사용해야 한다.

await a()
await b()
await c()
await d()
}
```

위의 Promise 체인을 이렇게 async와 await을 사용해 표현할 수 있다.

코드의 경우 주로 함수로 묶여있는 경우 많은데 그 앞에 async를 붙여 간결하게 비동기 함수를 제어할 수 있다.
