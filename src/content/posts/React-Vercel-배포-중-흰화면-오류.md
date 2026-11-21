---
title: "[React] Vercel 배포 중 흰화면 오류"
description: "리액트를 vercel을 통해 배포하는 중 흰화면이 뜨는 문제가 생겼다."
published: 2024-07-06T17:17:13.610Z
updated: 2026-11-07T09:51:17.082Z
tags: ["React","Vercel"]
image: "https://velog.velcdn.com/images/seung365/post/9a85880a-02e9-45dc-9d49-5a44119afe9d/image.png"
---

리액트를 vercel을 통해 배포를 하였는데 배포에는 문제가 없었다.
하지만 아래와 같이 흰화면이 뜨는 문제가 생겼다.
![](https://velog.velcdn.com/images/seung365/post/9a85880a-02e9-45dc-9d49-5a44119afe9d/image.png)


왜 제대로 렌더링이 안되는지 몰라서 구글링을 하다가 발견하였다.
vercel.json을 만들고 거기에 rewrites를 해주니 해결이 되었다!

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "build" }
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

위 코드를 추가해주고 나니 해결 완료 되었다!
아래 페이지는 카카오 테크 캠퍼스 선물하기 클론코딩을 vercel로 배포 한것이다.
![](https://velog.velcdn.com/images/seung365/post/fef66522-b027-40ca-bc1d-85422987360e/image.png)
