---
title: "맞으면서 배우는 프론트엔드 배포 - HTTPS"
description: "HTTPS 적용 어렵지 않아요!"
published: 2025-03-08T08:05:46.991Z
updated: 2026-11-07T09:10:24.763Z
tags: ["https","프론트엔드"]
image: "https://velog.velcdn.com/images/seung365/post/af68949f-ff27-4d38-b40f-7ece58143aee/image.jpeg"
---

저번 글에서는 docker를 통해 배포하는 글을 작성했습니다.
여기까지만 하면 기본적으로 http가 적용되어 있을 겁니다.
하지만 저는 Auth0를 프로젝트 내에서 사용 중에 있었습니다.
이 Auth0의 경우 기본적으로 HTTPS를 지원하는 것 입니다!
![](https://velog.velcdn.com/images/seung365/post/0b19b0ea-a58a-42c6-ac34-517b291462bc/image.png)
다음과 같이 보안상의 이유로 인증 관련 SKD가 HTTPS 환경에서만 동작하기에 
>"auth0-spa-js must run on a secure origin"

라고 에러메시지가 뜨는 것 입니다.
(위의 에러 이유는 아래 사이트에서 힌트를 얻었습니다!)
https://community.auth0.com/t/auth0-spa-js-must-run-on-a-secure-origin/42890

그래서 https를 한번 적용시켜 보았습니다!

사실은 그렇게 어렵지 않은데요? domain이 있다면 바로 붙여볼 수 있습니다.
따로 돈을 들이지 않고 무료 TLS/SSL 인증서를 붙여볼 수 있습니다.
아래에 letsencrypt라는 인증 기관에서 무료로 인증서를 제공해줍니다!
https://letsencrypt.org/ko/

먼저 Cerbot을 설치 해 줍니다.
>```
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx
```

그 후 SSL 인증서를 얻어줍니다.
>```
sudo certbot certonly --nginx -d [domain-url]
```

이렇게 인증서를 붙여 준 다음 해당 vm에 nginx 리버스 프록시를 적용해주었습니다.

>```nginx
>server {
>    listen 80;
>    server_name kdt-pt-1-pj-2-team03.elicecoding.com;
>    return 301 https://$server_name$request_uri;
>}
>
>server {
    listen 443 ssl;
    server_name kdt-pt-1-pj-2-team03.elicecoding.com;
    ssl_certificate /etc/letsencrypt/live/kdt-pt-1-pj-2-team03.elicecoding.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kdt-pt-1-pj-2-team03.elicecoding.com/privkey.pem;
>
>    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
     location /api {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**첫번째 server 블록에서는**
먼저 포트 80 즉 HTTP의 기본포트로 들어올 경우 HTTPS로 리다이렉트 하도록 해주었습니다.

그리고 **두번째 server 블록에서는**
443포트 즉 HTTPS의 기본 포트로 들어올 경우 SSL 암호화를 사용하며 Let'sEncrypt에서 발급한 인증서를 사용하도록 하였습니다.

**location / 블록의 경우**
루트 경로로 들어오는 모든 요청을 local 3000번으로 프록시 해주었습니다. 
전 글에서 보았던것 처럼 이곳으로 올 경우 다시 Docker의 80포트로 포트 매핑 해주었습니다.

### 그런데 여기서 왜 이렇게 로컬 루트 경로 -> 로컬 3000 -> 도커 80 이런식으로 매핑을 해주었을까요?

로컬 시스템에서 실행되는 NGINX는 도커 컨테이너에 직접 컨테이너 이름으로 접근 불가하기에 도커가 호스트에 노출한 포트인 3000으로 보내 준 후 거기서 또 프론트 도커 컨테이너의 80포트로 호스트의 3000포트를 매핑해 주었습니다.

이렇게 HTTPS를 연결 해 주고 다시 사이트를 접속 한 결과 Auth0오류가 뜨지 않고 잘 화면이 보이는것을 확인할 수 있었습니다!
