---
title: "webOS에서 리액트 앱 배포"
description: "webOS에 제가 만든 리액트 앱을 배포를 해보는 과정을 기록해보았습니다."
published: 2024-09-30T14:55:41.383Z
updated: 2026-11-14T02:57:18.815Z
tags: ["React","webos"]
image: "https://velog.velcdn.com/images/seung365/post/f2dd05fe-8a93-40da-9543-744b962d8d4f/image.png"
---

산하 프로젝트를 진행하면서 webOS에 내가 만든 리액트 앱을 배포를 해보는 과정을 기록해보았습니다. 
그전에 먼저 webOS CLI 도구가 필요합니다.
webOS CLI 도구의 경우 해당 명령어를 통해 설치할 수 있습니다.

>```
npm install -g @webos-tools/cli
```

또한 장치가 등록되어 있어야 합니다. 해당 명령어를 통해 확인할 수 있습니다.
>```
ares-setup-device -l
```



저는 일단 CRA로 리액트를 시작하였습니다.
![](https://velog.velcdn.com/images/seung365/post/d1dd6b3a-9c1b-447e-acc7-1fc020059834/image.png)

다음과 같이 프로젝트가 되어있을 때 먼저 해당 리액트 앱을 빌드하여야 합니다.
저는 npm을 사용하였기에
> ```
npm run build
```

해당 명령어를 통해 현재까지 작업한 리액트 앱을 빌드합니다. 
![](https://velog.velcdn.com/images/seung365/post/62a457c4-3425-4921-9ddc-a802fa417088/image.png)
그럼 다음과 같이 현재 작업중인 폴더의 루트에 build 폴더가 생성되게 됩니다. 이 build 과정을 통해 코드를 최적화 하고 압축하여 배포를 위한 정적 파일들이 생성되게 됩니다.

그 후 이 build 폴더 내에 appinfo.json의 파일이 반드시 존재해야 합니다.
물론 appfin.json 파일 내에 맞는 icon.png도 함께 넣어줍니다.
아래 코드는 appinfo.json의 예시입니다.
> 
{
    "id": "test",
    "version": "1.0.0",
    "vendor": "My Company",
    "type": "web",
    "main": "index.html",
    "title": "testapp",
    "icon": "icon.png",
    "requiredPermissions": [
      "time.query",
      "activity.operation"]
}

그렇게 해준 후 
>```
ares-package build
```

해당 명령어를 수행해 줍니다. 




ares-package build 를 할때 저의 경우에는 
![](https://velog.velcdn.com/images/seung365/post/dd62339a-65b0-4f8f-aedc-efac39ab5b26/image.png)

**Failed to minify code
** 라는 오류가 떴습니다. 이경우의 구글링을 한 결과 ares-package 할때 옵션을 추가해줄 수 있다고 합니다.

그래서 저는
>```
ares-package -n build
```

해당 명령어를 통해 minify를 추가로 해주지 않고 ipk로 패키징을 해주었습니다.

build 폴더 안의 내용을 .ipk로 패키징 해준 후
패키징 된 ipk를 

>```
ares-install your-app-name.ipk
```

해당 명령어로 설치를 해주면 됩니다!

이 후 webOS 에뮬레이터를 확인해주면 설치가 잘 된 모습을 볼 수 있습니다.

![](https://velog.velcdn.com/images/seung365/post/f2dd05fe-8a93-40da-9543-744b962d8d4f/image.png)




오류 해결에 도움 받은 사이트 : https://forum.webostv.developer.lge.com/t/ares-package-err-tips-failed-to-minify-code-please-check-the-source-code/3967
