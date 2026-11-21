---
title: "webOS란 무엇일까"
description: "webOS란 하나의 운영체제입니다."
published: 2024-09-18T17:58:11.501Z
updated: 2026-11-19T08:41:07.832Z
tags: ["webos"]
image: "https://velog.velcdn.com/images/seung365/post/e0e4576e-6e31-4376-a807-ebed74bdf0d2/image.png"
---

최근에 산하프로젝트를 LG와 진행하면서 webOS에 대해 알게 되었습니다. 그래서 webOS에 대해 특강을 듣게 되었고 정리해보았습니다.

## webOS란

![](https://velog.velcdn.com/images/seung365/post/36b1ca8c-fbc3-462e-b901-dc00680f22da/image.png)

먼저 webOS에 대해 간략하게 설명해 보겠습니다. 이름에서부터 느껴지듯이 안드로이드와 iOS와 같은 운영체제입니다. 웹 중심적이고 확장 가능한 구조를 지니고 있고 LG전자의 TV와 Signage, 스마트워치에 주로 사용이 됩니다. 우리가 알고있는 스탠바이미 제품에 사용되는 운영체제입니다.

webOS의 디자인 철학의 경우 간단하고, UX에 신경을 썼다고 합니다. 또한 웹 기술을 중심으로 하여 다양한 플랫폼에서 호환 가능하도록 설계되었다고 합니다.

## webOS OSE로 살펴보는 구조
![](https://velog.velcdn.com/images/seung365/post/f78b3167-81e0-4bf0-a65a-5454fbbbc277/image.png)
webOS OSE란 webOS의 오픈소스 에디션 버전이란 뜻입니다. 즉 누구나 webOS를 사용할수 있게 오픈소스화 한 버전이라 보시면 됩니다.

webOS의 계층을 그럼 하나씩 살펴보겠습니다

- **Core Application** : webOS OSE의 가장 상위층에 존재합니다. 해당 층에서는 System UI(앱 알림)와 System app(설정 앱)이 존재합니다.

- **Application Framework** : 개발자들이 더 좋은 서비스를 만들수 있게 도와줍니다. 단순히 HTML, CSS, JS로만 개발하지 않고 다양한 도구나 프레임워크를 제공해 줍니다. 이때 Enact가 여기에 포함 됩니다.

- **Managers & Services** : 여기에는 SAM이나 WAM과 같은 다양한 Manager 및 Service들이 존재합니다.
주요 Manager들을 설명하자면
**SAM**의 경우 앱 생성 및 life cycle을 관리해 줍니다. 그리고 Memory 사용을 관리해줍니다.
**WAM**의 경우 Web App 수행 및 종료, 중단을 관리합니다. 또한 Web App의 Low Memory를 책임집니다.
**LSM**의 경우 그래픽 및 윈도우 관리자 역할을 합니다.

- **Base Components** : 운영체제의 핵심적인 구성요소들이 포함됩니다. 시스템의 기본적인 동작을 지원하는데 여기에는 LS2나 web engine, Nods.js가 포함됩니다. 
**LS2**란 루나버스라고도 불립니다. 루나버스의 경우 webOS의 핵심적인 역할을 합니다. 모든 서비스가 LS2를 통해 서로 상호작용을 하고 데이터를 전달하게 됩니다. 이 LS2의 경우 안드로이드에서 Binder와 비슷한 역할을 한다고 합니다.
**web engine**의 경우 HTML, CSS, JS로 구성된 웹 앱을 실행하도록 해줍니다.
**Node.js**의 경우 JS를 실행시키는 하나의 환경입니다. 이 Node.js가 webOS에 내장되어 있어 다양한 서비스 개발을 할 수 있게 해줍니다.

- **BSP/Kernel** : 이 둘은 webOS OSE의 가장 하단에 위치하는 계층입니다.
하드웨어와 밀접한 관련이 있습니다.

## webOS를 실행하는 방법
webOS를 통해 개발환경을 준비하기 위해서는 두가지 방법이 존재합니다.
하나는 **라즈베리파이 4모델**을 통해 실물 기기에 탑재하는 방법입니다.
또 하나는 **에뮬레이터**를 이용해 Virtual Box 환경에서 동작하도록 하는 방법입니다.

**라즈베리파이**를 사용할 경우 라즈베리파이 4와 microSD카드 (8GB이상), 이를 보여줄 디스플레이 기기가 필요로 하게됩니다.

**에뮬레이터**를 사용하게 될 경우 virtual box를 사용하여 webOS OSE 최신 버전을 다운 받은 후 설치해주면 됩니다.



---
webOS에 대해 알아보면서 매번 mac, window, linux, ios, android 정도만 사용해왔었는데 webOS라는 새로운 운영체제를 경험하게 되어 색다른 기분을 느꼈는데요. webOS를 설치하고 webOS에서 사용될 웹앱을 개발하하는 과정을 거치면서 webOS에서 제공하는 다양한 API를 사용해볼 예정입니다.

더 많은 정보는 https://www.webosose.org/
에서 확인할 수 있습니다.
