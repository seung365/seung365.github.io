---
title: "TypeScript 알쓰(알고 쓰기)"
description: "TS 알고쓰자~!"
published: 2025-06-23T22:00:41.358Z
updated: 2026-11-20T15:16:33.620Z
tags: ["typescript"]
image: "https://velog.velcdn.com/images/seung365/post/78ede1e2-65c2-45a3-8809-765ad1e52e21/image.png"
---

![](https://velog.velcdn.com/images/seung365/post/78ede1e2-65c2-45a3-8809-765ad1e52e21/image.png)


JavaScript 언어를 사용하는 개발자라면 TypeScript를 한번쯤은 사용해본 경험이 있을겁니다. 또한 많은 개발자 분들이 TypeScript를 사용해 컴파일 타임에 에러를 잡고자 할탠데요.

이 타입스크립트를 사용하면서 회사에서 코드를 리뷰받다 보면 생각보다 아쉽게 사용하고 있단 느낌을 받았습니다. 꽤나 다양한 기능이 있고 다양한 부분에서 타입추론이 이루어지고 있었습니다.

그래서 **오늘은 타입스크립트 알고 쓰자!!** 라는 주제로 글을 써보려 합니다.



## 1. 타입 추론(Type Inference)

TypeScript의 가장 큰 강점 중 하나는 **타입 추론**입니다.  
타입을 명시하지 않아도 TS가 알아서 타입을 "추측"해줍니다.

```ts
let x = 5;         // x: number로 추론
let y = "hello";   // y: string으로 추론

function add(a = 1, b = 2) {
  return a + b;    // a, b: number로 추론
}
```
- 변수, 함수 매개변수, 반환값 등에서 타입을 자동으로 추론합니다.
- 단 복잡한 객체나 배열은 **최적의 공통 타입**(Best Common Type)으로 추론합니다.

```ts
const arr = [1, "hello"]; // (number | string)[]
```
- 타입 추론을 믿되 **명확성이 필요한 곳엔 타입 명시**를 권장합니다.
특히 API를 통해 외부 데이터를 받아올 경우 타입 명시가 이루어져야 합니다.

---

## 2. 유니온 & 인터섹션 타입 (Union & Intersection Types)

### **유니온 타입 (`|`)**
여러 타입 중 하나일 수 있음을 의미합니다.

```ts
function printId(id: string | number) {
  console.log(id);
}
printId(123);
printId("abc");
```

### **인터섹션 타입 (`&`)**
여러 타입을 모두 만족해야 함을 의미합니다.

```ts
interface Person { name: string; }
interface Worker { company: string; }
type Employee = Person & Worker;

const e: Employee = { name: "Kim", company: "Naver" };
```

---

## 3. 제네릭(Generics) – 타입도 함수처럼

**제네릭**은 타입을 변수처럼 받아 재사용성을 높여줍니다.

```ts
function identity<T>(value: T): T {
  return value;
}
identity<number>(10); // 10
identity<string>("hi"); // "hi"
```
- 제네릭 인터페이스, 제네릭 타입 제한(extends) 등 다양한 활용이 가능합니다.

---

## 4. 조건부 타입(Conditional Types) & infer

조건부 타입은 **타입에 따라 다른 타입을 반환**합니다.

```ts
type IsString<T> = T extends string ? true : false;
type A = IsString<"hi">; // true
type B = IsString<123>;  // false
```

**infer** 키워드를 활용하면 타입 내부에서 부분 타입을 추출할 수 있습니다.

```ts
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type Foo = ReturnType<() => number>; // number
```
- 복잡한 타입 변환, 추출에 매우 유용합니다.

---

## 5. 템플릿 리터럴 타입(Template Literal Types)

문자열 타입을 조합하거나 패턴을 엄격하게 제한할 수 있습니다.

```ts
type HttpMethod = "GET" | "POST";
type ApiRoute = `/api/${string}/${HttpMethod}`;

const route: ApiRoute = "/api/user/GET"; // OK
const wrong: ApiRoute = "/api/user/DELETE"; // Error
```
- 동적 문자열 패턴을 타입 수준에서 제한하고 싶을 때 강력합니다.

---

## 6. 유틸리티 타입(Utility Types)

TypeScript는 다양한 내장 유틸리티 타입을 제공합니다.

- **Partial<T>**: 모든 속성을 optional로 만듦
- **Required<T>**: 모든 속성을 필수로 만듦
- **Readonly<T>**: 모든 속성을 읽기 전용으로 만듦
- **Record<K, T>**: 특정 key 집합에 대해 value 타입을 지정
- **Pick<T, K> / Omit<T, K>**: 일부 속성만 선택/제외

```ts
interface User { name: string; age: number; }
type PartialUser = Partial<User>; // { name?: string; age?: number }
type ReadonlyUser = Readonly<User>; // { readonly name: string; readonly age: number }
```
- 실전에서 타입 변환 API 응답 타입 정의 등에 매우 자주 사용됩니다.

---

## 7. satisfies 연산자 (TS 4.9+)

`satisfies`는 **값이 특정 타입을 만족하는지 컴파일 타임에만 체크**합니다.  
타입 단언(as)과 달리 실제 값의 리터럴 타입을 유지합니다.

```ts
const point = { x: 1, y: 2 } satisfies { x: number; y: number }; // OK
```
- 타입 안정성을 높이고 타입 단언보다 안전하게 타입 체크가 가능합니다.

---

## 8. 매핑 타입(Mapped Types) & 인덱스 접근 타입

매핑 타입은 객체 타입의 각 속성을 일괄적으로 변환할 때 사용합니다.

```ts
type ReadonlyUser = {
  readonly [K in keyof User]: User[K];
};
```

인덱스 접근 타입은 객체의 특정 속성 타입을 추출할 때 사용합니다.

```ts
type UserName = User['name']; // string
```
- 대규모 코드베이스에서 타입 자동화에 매우 유리합니다.

---

## 9. 타입 가드, 타입 단언, 함수 오버로딩

- **타입 가드**: 런타임에 타입을 좁히는 함수 (`typeof`, `instanceof`, 커스텀 타입 가드)
- **타입 단언(as)**: 개발자가 타입을 강제로 지정
- **함수 오버로딩**: 다양한 인자 타입에 따라 함수 시그니처를 다르게 선언

```ts
function isString(val: any): val is string {
  return typeof val === 'string';
}
```
- 타입 안정성과 코드 가독성을 높이는 핵심 패턴입니다.

---


## 마치며

타입스크립트는 단순히 타입을 붙이는 언어가 아니라
**타입 자체로 로직을 설계하고 코드의 안정성을 극대화하는 도구**입니다. 
처음에는 어려울 수 있지만 컴파일 과정에서 에러를 잡아주고 타입 추론을 통해 자동 완성도 제공해 줘 잘쓰면 좋은 도구 입니다.



출처

https://www.heropy.dev/p/WhqSC8
https://wonsss.github.io/typescript/basic-typescript/
https://f-lab.kr/insight/understanding-typescript
