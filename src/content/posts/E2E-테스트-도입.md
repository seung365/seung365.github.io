---
title: "E2E 테스트 도입"
description: "일단 도입 해보자 E2E 테스트!"
published: 2025-06-30T08:30:58.212Z
updated: 2026-11-20T15:16:35.255Z
tags: ["E2E 테스트","frontend","playwright"]
image: "https://velog.velcdn.com/images/seung365/post/9be74b85-41cf-43eb-bf7b-f8b8dd530556/image.jpeg"
---

![](https://velog.velcdn.com/images/seung365/post/9be74b85-41cf-43eb-bf7b-f8b8dd530556/image.jpeg)


이번에 YAPP에서 동아리를 진행하면서 E2E 테스트를 도입하게 되었습니다..
그래서 왜 E2E 테스트를 도입하게 되었고 Playwright를 쓴 이유와 함께 간단하게 E2E 테스트에 대해서 알아보겠습니다.

## E2E 테스트? 그게 뭐지

E2E 테스트란 End To End의 약자이다. 말 그대로 어플리케이션의 처음부터 끝까지 테스트를 하는 것입니다.
즉 실제 사용자의 사용 시나리오를 테스트함으로써 애플리케이션 동작을 테스트하게 되는데요.

테스트를 검색하시게 되면 아래와 같은 표를 자주 보게 됩니다.
맨 아래는 단위테스트, 그위는 통합테스트, 맨 꼭대기에 E2E 테스트가 위치하게 되죠.

이미지에서 나타나듯이 E2E 테스트는 다른 테스트들 보다 느리고 노력이 많이 들어가게 됩니다. 그만큼 비용이 높다는것인데요.

이런 단점에도 불구하고, 실제 서비스 품질을 보장하고 사용자 경험을 최우선으로 생각한다면 E2E 테스트는 꼭 필요한 과정이라 할 수 있습니다.



![](https://velog.velcdn.com/images/seung365/post/e7ad7cc2-39b4-4345-bac1-64df7fb970ac/image.png)



### E2E 테스트 좋은건 알겠는데 왜 필요하지?

E2E 테스트를 통해 애플리케이션이 실제 환경에서 어떻게 사용될지 보여주고 모든 상호 작용 지점에서 사용자 기대를 충족하는지 확인할 수 있게 됩니다.
실제 사용자 시나리오를 시뮬레이션함으로써 E2E 테스트는 개발 프로세스 초기에 잠재적인 문제를 식별하여 리소스 관리의 전반적인 효율성에 기여할 수 있게 됩니다.

결국 초기 투자 비용이 들더다로 장기적으로는 예기치 못한 장애나 버그로 인한 리스크를 줄여주는 효과가 있습니다.

---
개념적으로는 이러합니다.

저는 완성된 E2E 테스트를 기반으로 기능을 수정한 경험이 있었는데요.
E2E 테스트가 만들어져 있어 제가 수정한 기능에 대해 체크가 바로 가능하단 점이 좋았습니다.
그러면서 서비스에 대한 이해를 이 테스트 코드를 보면서도 이해 할 수 있었습니다.
마치 명세서와 같은 느낌을 받았습니다..!
그리고 마지막으로 확실히 오류를 잡기 쉽다고 느꼈습니다. 어느 부분에서 걸리는지 확실히 나오고 예상과 다른 결과가 어디서 나오는지도 알 수 있어 오류를 잡기에 용의했습니다.

이러한 좋은점이 매력적으로 다가왔고
YAPP에서는 현재 모바일, 데스크탑을 대상으로 하는 서비스를 준비 중인데
거기에 사용자의 플로우가 또 중요한 서비스라 이 E2E 테스트가 적합하다고 생각했습니다!

## Playwright vs Cypress

이제 E2E 테스트가 왜 필요한지, 그리고 어떠한 점에서 좋은지 알 게 되었습니다.
그렇담 어떤 툴을 사용해야 할까요?
대표적인 E2E 테스트 툴로는 Playwright가 Cypress가 있습니다.

저희 팀은 Playwright가 선택하게 되었는데요
간단한 이유를 들자면..

>
1. npm 다운로드수가 Playwright가 Cypress 대비 현재 weekly 기준 약 4배
2. Cypress 보다 더 다양한 브라우저, 모바일 지원
3. 속도 측면에서 하나의 테스트 파일 당 하나의 워커를 실행 해 병렬 처리로 속도가 빠름
(Cypress의 경우에도 병렬 테스트가 가능하나 성능 상의 이슈로 권하지 않는다고 하네요.)

이러한 이유들이 있습니다.

Cypress의 병렬화 관련 문제는
https://docs.cypress.io/cloud/features/smart-orchestration/parallelization#:~:text=Cypress%20can%20run%20recorded%20tests,to%20run%20your%20tests%20efficiently
해당 사이트를 통해 좀 더 알아볼 수 있습니다.


### E2E 테스트 그럼 어떻게 하는가..

저희 팀은 Playwright를 쓰기로 해 Playwright를 기준으로 설명하겠습니다.

pnpm을 사용하기에 아래와 같은 명령어로 playwright를 설치할 수 있습니다.

>pnpm create playwright

다른 패키지 매니저를 사용하시는 분들은 아래의 문서를 참조하시면 됩니다.
https://playwright.dev/docs/intro


이런식으로 먼저 설치를 하고 그 과정에서 CI나 tests 폴더 등을 자동으로 만들게 할 수 있습니다. 


```ts
import { expect, test } from "@playwright/test";

test("About 페이지로 이동해야 합니다.", async ({ page }) => {
  await page.goto("/");
  await page.click("text=About");
  await expect(page).toHaveURL("/about");
  await expect(page.locator("h1")).toContainText("About");
});
```

저희는 tests 폴더 내에 example.spec.ts를 다음과 같이 추가해주었습니다.

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],

  webServer: {
    command: "pnpm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

그리고 다음과 같이 playwright.config.ts를 만들어 주었습니다. 기본적으로 세팅해주는 부분에서 크게 차이가 없지만 간단하게 설명을 하자면

- 해당 설정 파일에서는 테스트를 어떤 디렉토리에서 실행할지
- 병렬 실행 여부 (fullyParallel)
- CI 환경에서의 재시도 횟수
- 어떤 브라우저에서 테스트 할지 (projects)

등의 옵션들을 지정할 수 있습니다.

```json
scripts {
  ...
    "test": "playwright test",
    "test:ui": "playwright test -c ./playwright.config.ts tests --ui"
}
```

또한 다음과 같이 scripts에 `test`와 `test:ui`를 추가해주었습니다.

`test`의 경우 기본적인 테스트가 진행됩니다. 테스트가 끝나게 되면 새로운 브라우저 탭에 테스트 결과가 나오게 됩니다.

`test:ui`의 경우에는 Playwright UI 모드를 사용할 수 있습니다.

> npx playwright test --ui
를 해주시면 UI 모드가 실행이 가능합니다.

https://playwright.dev/docs/test-ui-mode
해당 링크에 상세한 내용이 담겨있습니다.



이렇게 세팅을 해주고 Playwright UI 모드를 실행하게 되면
아래와 같은 화면이 나오고 실행 버튼을 누르면 아래 gif와 같이 테스트가 실행되는 것을 확인 할 수 있습니다.

![](https://velog.velcdn.com/images/seung365/post/7b3291ed-70c4-4f49-9f89-81aeeca10de1/image.gif)


### 마무리하며..

E2E 테스트를 도입하며 초기세팅을 하는 과정에서 알게된 내용이나 느낀점들을 정리해보았는데요.

E2E 테스트를 사용해보면서 테스트의 중요성에 대해 알 수 있었고 
특히 요즘은 LLM을 통해서도 테스트 코드를 작성 할 수 있어 더 쉽게 도입할 수 있습니다.
서비스를 더욱 견고하게 만들고 싶다면 E2E 테스트를 도입 해보는 것을 추천드립니다!


### 참고한 자료들
https://techblog.woowahan.com/17404/
https://playwright.dev/
https://payproglobal.com/ko/%EB%8B%B5%EB%B3%80/%EC%97%94%EB%93%9C-%ED%88%AC-%EC%97%94%EB%93%9C-%ED%85%8C%EC%8A%A4%ED%8A%B8%EB%9E%80-%EB%AC%B4%EC%97%87%EC%9D%B8%EA%B0%80/
https://docs.cypress.io/app/get-started/why-cypress
https://tech.kakaoent.com/front-end/2023/230209-e2e/
