---
title: "[JavaScript] 정규표현식이란"
description: "정규 표현식은 문자를 검색하고 대체하고 추출할 수 있는 방법을 제공한다.크게 다음과 같은 역할을 한다."
published: 2024-05-10T13:19:53.019Z
updated: 2026-10-18T23:57:50.411Z
tags: ["JavaScript"]
image: "https://velog.velcdn.com/images/seung365/post/7ab1ed79-811f-4736-a84c-d92c281e43a1/image.png"
---

# 정규표현식(RegExp)

정규식 , Regular Expression

정규 표현식은 문자를 검색하고 대체하고 추출할 수 있는 방법을 제공한다.






## 역할

크게 다음과 같은 역할을 한다.

1.문자 검색(search)

2.문자 대체(replace)

3.문자 추출(extract)
## 테스트 사이트

http://regexr.com/

## 정규식 생성
정규식 생성법은 두가지가 있다.

1) 생성자 함수 방식

2) 리터럴 방식 ← 이 방식 추천

```js
// 생성자
new RegExp('표현','옵션')
new RegExp('[a-z]','gi')
//표현 : 패턴 , 일치하는 모든내용(g) + 대소문자 구분 x(i)

//리터럴
/표현/옵션
/[a-z]/gi

```

## 예제 문자
```js
const str=`
010-1234-5678
thesecon@gmail.com
hi im seungbeom
aaabbbbbccddd
The hannam the hill
the quick brown fox and dog.
www.naver.com
`
```

## 메소드

메소드 | 문법 | 설명
--|--|--
test | `정규식.test(문자열)` | 일치 여부(Boolean) 반환
math | `문자열.match(정규식)` | 일치하는 문자의 배열(Array) ex) ['the', 'the' ]
replace | `문자열.replace(정규식, 대체문자)` | 일치하는 문자를 대체, 원본 데이터 손상 x

## 플래그(옵션)

플래그 | 설명
--|--
g | 모든 문자 일치(global)
i | 영어 대소문자를 구분 않고 일치(ignore case)
m | 여러 줄에 대한 내용 일치(multi line), 각각의 줄을 시작과 끝으로 인식하게 해준다.

## 패턴(표현)

패턴 | 설명
--|--
^ab | 줄(Line) 시작에 있는 ab와 일치
ab$ | 줄(Line) 끝에 있는 ab와 일치
. | 임의의 한 문자와 일치
a&verbar;b | a 또는 b와 일치
ab? | b가 없거나 b와 일치, a와는 상관이 없다.
{3} | 3개 연속 일치
{3,} | 3개 이상 연속 일치
{3,5} | 3개 이상 5개 이하 연속 일치
[abc] | a 또는 b 또는 c
[a-z] | a부터 z 사이의 문자 구간에 일치(영어 소문자)
[A-Z] | A부터 Z 사이의 문자 구간에 일치(영어 대문자)
[0-9] | 0부터 9 사이의 문자 구간에 일치(숫자)
[가-힣] | 가부터 힣 사이의 문자 구간에 일치(한글)
\w | 63개 문자(Word, 대소영문52개 + 숫자10개 + _)에 일치
\b | 63개 문자에 일치하지 않는 문자 경계(Boundary)
\d | 숫자(Digit)에 일치
\s | 공백(Space, Tab 등)에 일치
(?=) | 앞쪽 일치(Lookahead) -> 패턴 위치 앞쪽
(?<=) | 뒤쪽 일치(Lookbehind) -> 패턴 위치 뒤쪽
