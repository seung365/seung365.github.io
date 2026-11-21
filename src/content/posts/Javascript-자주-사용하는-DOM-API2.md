---
title: "[JavaScript] 자주 사용하는 DOM API(2)"
description: "이전의 DOM API(1)에 이어지는 내용입니다."
published: 2024-06-21T05:13:56.758Z
updated: 2026-10-31T09:39:16.076Z
tags: ["JavaScript"]
image: "https://velog.velcdn.com/images/seung365/post/c3819c3f-f0d2-44bf-bd5c-b77a42d13e2c/image.png"
---

이전의 DOM API(1)에 이어지는 내용입니다.

DOM 문서의 경우 Node의 계층으로 이루어져 있다. 그렇기에
Node와 Element라는 개념이 자주 등장하는데 간략하게 설명하면
Node는 Element의 상위 개념이다. 아래의 이미지와 같이 Node안에 Element, Text, Comment 등이 Node의 하위 개념이란걸 알 수 있다.
![](https://velog.velcdn.com/images/seung365/post/7695d5c2-75cf-4a5b-b7ca-499a9c6f501d/image.png)(이미지 출처: https://ko.javascript.info/basic-dom-node-properties)
</br>
아래의 사이트에도 간략하게 설명이 되어 있으니 읽어보기를 추천한다.
https://developer.mozilla.org/en-US/docs/Web/API/Node


## DOM API

> N.previousSibling / N.nextSibling

노드의 이전 형제 혹은 다음 형제 노드를 반환한다. 여기서 N은 노드를 의미한다.

```javascript
const el = document.querySelector('.child')
console.log(el.previousSibling)
console.log(el.nextSibling) 
```

>E.previousElementSibling / E.nextSibling

요소의 이전 형제 혹은 다음 형제 노드를 반환한다. 이는 당연히 요소에서만 사용할 수 있다.

왜 굳이 노드 이전 형제 혹은 다음 형제가 있는데 이게 필요한가 간단하게 생각해면 내 앞뒤의 요소가 필요할 때 편하게 사용하라고 따로 이런 속성이 존재하는거라 생각한다.

```javascript
const el = document.querySelector('.child')
console.log(el.previousElementSibling)
console.log(el.nextElementSibling)
```


>E.children

요소의 모든 자식 요소를 반환합니다.
```javascript
const el = document.querySelector('.parent')
console.log(el.children)
Array.from(el.children)
//필요하면 유사 배열을 배열로 바꿔 배열의 메소드를 사용할 수 있다.

```

>E.firstElementChild / E.lastElementChild

요소의 첫번째 자식 혹은 마지막 자식 요소를 반환한다.

```javascript
const el = document.querySelector('.parent')
console.log(el.firstElementChild)
console.log(el.lastElementChild)
console.log(el.childNodes)
```

 > document.createElement()
 
메모리에만 존재하는 새로운 HTML 요소를 생성해 반환한다.

```javascript
const divEl = document.createElement('div')
console.log(divEl)

const inputEl = document.createElement('input')
console.log(inputEl)
```

>E.prepend() / E.append()
//노드를 요소의 첫 번째 / 마지막 '자식'으로 삽입한다.


인수로 노드를 삽입할 수 있다. + 인수를 여러개 사용할 수 있다.
이때 자식 요소로 들어간다

```javascript
const parentEl = document.querySelector('.parent')

const el = document.createElement('div')
el.textContent = 'Hello' //해당 요소의 내용으로 문자가 들어간다.

parentEl.prepend(new Comment(' 주석 '))
parentEl.append(el,'Text!')
```

>E.remove()

요소를 삭제한다.

```
const el = document.querySelector('.child') 
//제일 먼저 찾아진 child요소가 선택된다
el.remove() //그부분을 제거
```

>E.insertAdjacentElement()

'대상 요소'의 지정한 위치에 '새로운 요소'를 삽입한다. + 내부에 요소를 넣을것이면 prepend나 append를 사용할 수 도 있다.
대상_요소.insertAdjacentElement(위치, 새로운_요소)

```html
<!-- 'beforebegin' -->
<div class="target">
  <!-- 'afterbegin' -->
  Content
  <!-- 'beforeend' -->
</div>
<!-- 'afterend' -->`

```
```javascript
const childEl = document.querySelector('.child')
const newEl = document.createElement('span')
newEl.textContent = 'hello'
childEl.insertAdjacentElement('beforeend',newEl)
```
