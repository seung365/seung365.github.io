---
title: "shadcn/ui을 사용하며 latest와 canary 중 어떤 버전을 사용할까?"
description: "이번에 프로젝트를 하면서 shadcn/ui를 사용하게 되었습니다."
published: 2025-02-19T16:24:00.787Z
updated: 2026-11-20T15:16:36.512Z
tags: ["shadcn"]
image: "https://velog.velcdn.com/images/seung365/post/fdb50750-42ad-4025-92ce-e98ebc351fbb/image.jpeg"
---

이번에 프로젝트를 하면서 shadcn/ui를 사용하게 되었습니다.
이때 최근 프론트엔드 생태계에 중요한 업데이트가 있었습니다.
React 19가 vite 설치시 적용되게 되었고 Tailwind 또한 1월 말에 4버전이 나오게 된겁니다.
![](https://velog.velcdn.com/images/seung365/post/461c0a7c-aa38-4bc1-9fe6-7cb82b01b025/image.png)
그래서 이번에 shadcn 공식 문서를 보게 되면 Tailwind v4와 React19에 맞춰 npx shadcn@canary init으로 시작하라는 문서를 보게 되었습니다.

저희는 당연히 latest 버전을 사용하려 했고 사용중에 있습니다. 하지만 현재는 React19와 Tailwind v4에 맞는 **shadcn@canary가 더 적합하다고 판단하였습니다.**

### 이유 1 - shadcn의 배포 주기는 상당히 빠르다.
기본적으로 canary라고 하면 정식 배포된 버전이 아닌 체험판 버전이 되겠습니다. 그래서 저희는 shadcn의 버전 배포 주기를 알아보게 되었습니다.
![](https://velog.velcdn.com/images/seung365/post/a50d7145-e135-47f1-a677-142c539b04b5/image.png)
현재 2.3.0이 latest 버전이 되겠구요. minor 버전이 변화된 2.4.0이 현재 canary 버전이 되겠습니다.
이때 2.3.0과 2.4.0 버전 업데이트 간격을 보시게 되면 
![](https://velog.velcdn.com/images/seung365/post/c78ed9a0-5a4a-4706-8813-4da76d20b916/image.png)

단지 **8일** 차이가 나는것을 확인할 수 있었습니다.
그래서 저희는 shadcn의 배포 주기가 빠름을 인지하고 최신에 나온 canary를 사용해도 될 것 같단 판단이 들었습니다.

### 이유 2 - shadcn의 canary.6 canary 중에서도 어느새 6번째 업데이트가 된 버전이다.
![](https://velog.velcdn.com/images/seung365/post/5f36f225-c733-4200-8848-7b2670b5dd1e/image.png)
다음과 같이 초기 canary.0에서 부터 이미 6번째나 배포된 상태를 볼 수 있습니다. 아마 여러번의 오류 수정 및 업데이트가 거쳐진것으로 보이는데요.
그렇기에 더 믿고 쓸 수 있다고 생각하였습니다.

### 이유 3 - React 19와 Tailwind4에 적합한 버전
사실 공식문서에서까지 이렇게 이번 React와 Tailwind4의 업데이트에 대한 대응 버전으로 소개한 만큼 해당 canary 버전을 사용하는게 프로젝트 진행에 있어서 다시 마이그레이션 불편함을 한번에 줄일 수 있다고 생각합니다. 그렇기에 조만간 2.4.0이 정식 버전이 될 가능성이 높다 판단 하였습니다.

## 결론 
평소라면 항상 latest 버전을 사용했고 현재도 그렇지만 항상 latest를 사용하곤 합니다. 하지만 React나 Tailwind와 같은 주요 라이브러리들이 업데이트가 진행되면서 그에 맞게 서드파티 라이브러리들이 같이 업데이트 됨을 볼 수 있었습니다. 
그래서 평소에는 버전 업데이트가 큰 이슈는 아니지만 이렇게 여러 라이브러리들이 영향을 받는 주요한 업데이트가 있을 경우 다른 라이브러리들의 버전은 어떤걸 쓸지 그리고 그것을 쓰는데 어떠한 선택을 할지 중요하다고 생각합니다. 
**그에 따른 판단을 바탕으로 최신 버전의 라이브러리를 써 보는 것도 좋은 선택이라 생각이 듭니다. **

여러분들도 이러한 점을 고려해서 선택하면 **더 좋은 개발 경험**을 얻을 수 있을꺼라 생각합니다.

---
*추가 2025.04.14
Canary가 다른곳에서도 많이 사용되는데 알고 보니 
애플리케이션의 점진적 출시 방식인 카나리아 배포에서 사용되는 버전을 의미한다고 합니다..

>** 참고 링크 **
https://cloud.google.com/deploy/docs/deployment-strategies/canary?hl=ko

----
*추가 2025.06.17
이 글을 작성했을 때가 2월 20일이라는점을 봤을 때 2.4.0 버전의 경우 4월 7일날 정식 배포가 되었음을 알 수 있습니다.

아래와 같이 tailwind v4 반영에 대한 업데이트가 많았습니다. 또한 상대적으로 다른 버전의 업데이트 보다 바뀐 부분이 많았는데요?
![](https://velog.velcdn.com/images/seung365/post/4800c397-417f-4728-a15c-56971649a6e3/image.png)

그래서 생각보다 2.4.0까지 오는데 시간이 걸린거 같습니다.

현재 06.17일을 기준 2.6.4가 배포가 되었음을 알 수 있구요

![](https://velog.velcdn.com/images/seung365/post/938af2c5-33c5-4f70-b097-7a94fc4b98d7/image.png)

동시에 2.7.0 canary버전도 올라온것을 알 수 있습니다. (배포한지 12시간밖에 안지나 다운로드 수가 0이군요..)

![](https://velog.velcdn.com/images/seung365/post/c7253529-097a-4082-bca4-57e620b8a5bd/image.png)

여전히 느끼는 것이지만 shadcn의 경우에는 마이너 버전 업데이트가 활발하게 일어난다고 느낍니다. 또한 canary의 경우에도 주기적으로 업데이트가 됨을 알 수 있는데요. 이처럼 해당 라이브러리의 다운로드 수를 참고해보시고 canary를 써야하는 주요 업데이트가 있을 경우(tailwind 업데이트나 react 업데이트 같은..) 사용해보는것을 추천드립니다.

>**버전 확인 사이트**
https://www.npmjs.com/package/shadcn?activeTab=versions
https://github.com/shadcn-ui/ui/releases
