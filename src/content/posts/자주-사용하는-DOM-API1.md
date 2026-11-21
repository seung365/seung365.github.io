---
title: "[JavaScript] 자주 사용하는 DOM API(1)"
description: "DOM이란 HTML 문서를 객체로 표현한 것으로, 자바스크립트에서 HTML을 제어할 수 있게 해줍니다. DOM API를 통해 우리는 웹페이지의 요소들을 다룰 수 있다."
published: 2024-05-15T16:43:17.750Z
updated: 2026-10-31T10:30:13.765Z
tags: ["JavaScript"]
image: "https://velog.velcdn.com/images/seung365/post/455882a1-a1b9-45fe-ac7a-6eb79468ef57/image.png"
---

DOM이란 HTML 문서를 객체로 표현한 것으로, 자바스크립트에서 HTML을 제어할 수 있게 해줍니다. 

DOM API를 통해 우리는 웹페이지의 요소들을 다룰 수 있다.
여기서 API란 단순하게 사용할 수 있는 명령으로 이해하면 편하다.

우리가 자주 사용하는 DOM API들을 정리해보았다.

## DOM API
> 
document.getElementById()

HTML 'id'속성값으로 검색한 요소를 반환한다.
여러 요소가 검색되면, 가장 먼저 찾은 요소만 반환한다.
검색결과가 없으면 'null'을 반환하게 된다.

```javascript
const el = document.getElementById('child2') 
console.log(el)
```
>
document.querySelector()

'CSS 선택자'로 검색한 요소를 하나 반환한다.
여러 요소가 검색되면, 가장 먼저 찾은 요소만 반환한다.
검색 결과가 없으면, 'null'을 반환한다.
```javascript
const el = document.querySelector('.child')
console.log(el)
```
>
document.querySelectorAll()

'CSS 선택자'로 검색한 모든 요소를 NodeList로 반환한다. 
NodeList란 Node가 여러개 들어있는 객체, 유사배열이다.
NodeList 객체는 '.forEach()' 를 사용할 수 있다.
```javascript
const nodeList = document.querySelectorAll('.child')
console.log(nodeList)
nodeList.forEach(el => console.log(el.textContent))
//console.log(Array.from(nodeList).reverse()) 
//실제 배열의 메소드를 사용하고 싶을 땐 Array.from을 사용해 실제 배열로 바꿔준다.
```
>
N.parentElement (N은 Node를 의미한다)

노드의 부모 요소를 반환한다. 
당연히 parentElement는 요소에서도 사용 가능하다.
```javascript
const el = document.querySelector('.child')
console.log(el.parentElement)
```
>
E.closest() (E는 element를 의미한다)

"**자신**"을 포함한 조상 요소 중 'CSS 선택자'와 일치하는, 가장 가까운 요소를 반환한다. 여기서 중요한점은 **자신**을 포함한다는 것이다.
요소를 찾지 못하면, 'null'을 반환한다.
