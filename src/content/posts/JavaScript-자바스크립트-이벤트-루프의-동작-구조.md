---
title: "[JavaScript] 자바스크립트 이벤트 루프의 동작 구조"
description: "GDG on KNU에서 발표했던 자바스크립트의 이벤트 루프 동작 구조에 대한 내용을 정리한 글입니다."
published: 2025-01-03T07:05:03.212Z
updated: 2026-11-12T21:07:06.628Z
tags: ["이벤트 루프","자바스크립트"]
image: "https://velog.velcdn.com/images/seung365/post/b31a49c4-a210-4b1d-98bd-15a8e1510aa0/image.png"
---

> GDG on KNU에서 발표했던 자바스크립트의 이벤트 루프 동작 구조에 대한 내용을 정리한 글입니다.

최근 GDG on KNU에서 자바스크립트의 이벤트 루프에 대해 발표를 하게 되었습니다. 그래서 해당 내용을 블로그에도 정리해서 공유해보려 합니다.

## 싱글 스레드와 블로킹/논블로킹

### 싱글 스레드란?
스레드는 프로세스의 실행 단위입니다. 쉽게 말해 일을 처리하는 작은 일꾼이라고 생각하면 됩니다. 싱글 스레드라는 것은 이 일꾼이 단 한 명뿐이라는 뜻이죠.

### 블로킹과 논블로킹
- **블로킹**: 하나의 작업이 오래 걸릴 경우, 그 작업이 완료될 때까지 다른 모든 작업들이 멈춰있는 상태
- **논블로킹**: 하나의 작업이 오래 걸리더라도 다른 작업들이 계속 진행될 수 있는 방식

예를 들어, 우리가 웹에서 파일을 다운로드 받으면서 동시에 웹 서핑을 할 수 있는 것이 바로 논블로킹 방식 덕분입니다.

## JS는 싱글 스레드 언어입니다
자바스크립트는 기본적으로 싱글 스레드 언어입니다. 그런데 우리가 개발을 하다 보면 네트워크 요청이나 이벤트 처리, 타이머와 같은 작업들을 동시에 처리해야 하는 경우가 많이 있죠. 이런 경우에는 어떻게 처리할까요?

바로 자바스크립트 엔진이 아닌 브라우저 내부의 멀티 스레드인 Web API에서 비동기 + 논블로킹으로 처리하게 됩니다.

## 근데 왜 JS는 싱글 스레드일까요?
처음 자바스크립트가 만들어졌을 때는 멀티 코어 프로세서가 보편화되지 않았고 복잡한 병렬 처리가 필요하지 않았다고 합니다. 하지만 현재는 멀티 코어 프로세서가 보편화되었고 자바스크립트를 통해 많은 작업을 수행하게 되었죠.

그래서 언어 자체를 바꾸기보다는 브라우저의 멀티 스레드 기능을 활용하는 방향으로 발전하게 되었습니다.

## 이벤트 루프란?
이벤트 루프는 자바스크립트의 동시성을 관리하는 매커니즘입니다. 주요 역할은 아래와 같습니다.
- Call Stack, Callback Queue, Web APIs 등을 모니터링
- 비동기적으로 실행되는 작업들을 관리
- 적절한 순서로 작업을 처리하여 프로그램의 실행 흐름을 제어

쉽게 말해, 브라우저의 동작 타이밍을 관리하는 관리자라고 할 수 있습니다.

## 이벤트 루프의 주요 구성 요소들
![이벤트 루프 구조](https://velog.velcdn.com/images/seung365/post/b31a49c4-a210-4b1d-98bd-15a8e1510aa0/image.png)

### 1. Call Stack
자바스크립트 엔진이 코드 실행을 위해 사용하는 메모리 구조입니다.

### 2. Web APIs
브라우저에서 제공하는 API 모음으로, 비동기적으로 실행되는 작업들을 전담하여 처리합니다.
- DOM 조작
- AJAX 요청 (XMLHttpRequest, Fetch API)
- 타이머 함수들 (setTimeout, setInterval)
- 그 외 여러 작업들...

### 3. Callback Queue
비동기적 작업이 완료되면 실행되는 함수들이 대기하는 공간입니다.

### 4. Event Loop
비동기 함수들을 적절한 시점에 실행시키는 관리자 역할을 합니다.

### 5. Event Table
특정 이벤트(timeout, click, mouse 등)가 발생했을 때 어떤 콜백 함수가 호출되어야 하는지를 알고 있는 자료구조입니다. Web API가 이 Event Table을 확인하고 처리하게 됩니다.

## Web APIs의 종류들
이 Web API또한 다양한 종류가 존재합니다. 이때 DOM과 Console API의 경우 동기적으로 동작합니다.
1. **DOM**: HTML 문서의 구조와 내용을 표현하고 조작할 수 있는 객체
2. **XMLHttpRequest**: 서버와 비동기적으로 데이터를 교환할 수 있는 객체. AJAX기술의 핵심
3. **Timer API**: 일정한 시간 간격으로 함수를 실행하거나 지연시키는 메소드들을 제공
4. **Console API**: 개발자 도구에서 콘솔 기능을 제공
5. **Canvas API**: `<canvas>` 요소를 통해 그래픽을 그리거나 애니메이션을 만들 수 있는 메소드들을 제공
6. **Geolocation API**: 웹 브라우저에서 사용자의 현재 위치 정보를 얻을 수 있는 메소드들을 제공

## DOM은 왜 Web APIs에 포함될까요?
대부분의 이벤트 루프 자료를 찾아보게 되면 DOM 조작 자체는 동기적으로 수행되지만 WebAPIs에 포함되게 그려져 있습니다. 제가 위에 첨부한 사진 또한 그런데요. 그래서 왜 포함되는지 생각해보게 되었습니다. 
이때 DOM을 통해 웹사이트에 나올 내용을 그리게 되는데 그 과정에서 비동기작업들이 처리가 되어야 DOM이 렌더링이 된다는것을 이해하게 되었습니다.
그래서 DOM은 기본적으로 동기적으로 수행되지만 다음과 같은 작업들이 비동기적으로 처리될 필요가 있기때문에 Web APIs에 포함되게 되는것 입니다.
- 이미지 로딩
- AJAX 요청 (XMLHttpRequest, Fetch API)
- 파일 읽기 (FileReader API)
- 타이머 작업 (setTimeout, setInterval)
- 애니메이션 (requestAnimationFrame)

## 콜백 큐의 우선순위
![](https://velog.velcdn.com/images/seung365/post/edca9cb1-3508-42a0-8b62-8d21681909ad/image.png)

이벤트 루프를 자세히 들여다보면, Callback Queue는 사실 세 가지 Queue로 구성되어 있으며, 각각 다른 우선순위를 가지고 있습니다.

### 1. Microtask Queue (최상위 우선순위)
- Promise의 then/catch/finally 핸들러
- queueMicrotask()
- MutationObserver
- process.nextTick (Node.js)

### 2. Animation Frames (중간 우선순위)
- requestAnimationFrame
- UI 렌더링/리페인팅
- 브라우저 렌더링 작업
- 화면 주사율에 맞춰 실행되어야 하는 작업들

### 3. Task Queue (Macrotask Queue, 최하위 우선순위)
- setTimeout, setInterval
- I/O 작업
- 이벤트 콜백 (click, scroll 등)
- MessageChannel
- postMessage

중요한 점은 이벤트 루프가 이 세 개의 큐를 **우선순위 순서대로** 처리한다는 것입니다. Call Stack이 비었을 때
1. 먼저 Microtask Queue의 모든 작업을 처리합니다
2. 그 다음 Animation Frames의 작업들을 처리합니다
3. 마지막으로 Task Queue의 작업을 처리합니다

간단한 예제 코드로 살펴보겠습니다:
```javascript
console.log('Start');

setTimeout(() => {
   console.log('Timeout');
}, 0);

requestAnimationFrame(() => {
   console.log('Animation Frame');
});

Promise.resolve().then(() => {
   console.log('Promise');
});

console.log('End');

// 실행 결과:
// "Start"
// "End"
// "Promise"         (Microtask Queue)
// "Animation Frame" (Animation Frames)
// "Timeout"         (Task Queue)

```
## 발표 후 받았던 질문

### Q1: 콜 스택이 가득 차면 어떻게 되나요?
콜 스택이 가득 차는 경우는 주로 다음과 같은 상황에서 발생합니다
- 무한 루프
- 과도한 재귀 호출 
- 과도한 비동기 작업

이런 경우 "Stack Overflow Error"가 발생하며 브라우저마다 호출 스택의 최대치가 다릅니다. 일반적으로 함수를 만 번 이상 중첩해서 호출하지 않도록 주의해야 합니다.

해결 방법
- 재귀 함수의 경우 반복문으로 전환
- 비동기 작업의 적절한 분배
- 무한 루프 방지를 위한 종료 조건 확인

### Q2: 비동기와 논블로킹의 차이는 무엇인가요?
- **비동기(Asynchronous)**: 작업의 완료를 기다리지 않고 다음 작업을 실행하는 방식
- **논블로킹(Non-blocking)**: 한 작업이 다른 작업의 진행을 막지 않는 방식

비동기는 작업의 실행 방식을 설명하는 개념이고, 논블로킹은 작업 간의 상호작용 방식을 설명하는 개념입니다.

## 추천 사이트
[loupe 사이트](http://latentflip.com/loupe/) 해당 사이트를 통해 코드와 시각적 자료를 통해 추가적인 이해를 하기에 좋을꺼 같습니다.

## 참고자료
- https://devyihyun.tistory.com/160
- https://inpa.tistory.com/entry/자바스크립트-이벤트-루프-구조-동작-원리
- https://amkorousagi-money.tistory.com/entry/DOM-은-무엇인가
