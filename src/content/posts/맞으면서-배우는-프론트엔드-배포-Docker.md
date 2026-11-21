---
title: "맞으면서 배우는 프론트엔드 배포 - Docker"
description: "Docker 어렵지 않아요!"
published: 2025-03-08T05:32:34.565Z
updated: 2026-11-17T20:16:51.299Z
image: "https://velog.velcdn.com/images/seung365/post/eaaca5d3-1349-4825-8f79-719ba1e418a1/image.jpeg"
---

현재 프로젝트를 진행하면서 vm을 통해 프론트엔드를 배포 해야할 일이 생겨 진행하게 되었습니다.

### 왜 굳이 Docker를 사용하는가??
단순히 shell 방식으로 배포를 진행해도 됩니다. 또한 저번 프로젝트의 경우 nginx를 통해 단순히 shell 방식으로 배포를 진행하였습니다.
이번에도 또 배포할 일이 생겨 설정을 처음부터 해주려 하니 생각보다 귀찮은 것입니다. 
**하지만 도커의 경우 Dockerfile만 있으면 처음 셋업이 빠르다는것이 좋았습니다.**

두번째로 하나의 vm으로 배포를 진행하게 되는데 백엔드 측에서 도커를 통해 배포를 진행하는데요. 그래서 Docker를 사용하면 Docker 컨테이너끼리 충돌의 문제가 적다고 판단했습니다. 실제로 저번의 경우 백엔드는 Docker 프론트엔드의 경우 shell로 배포를 진행하였는데 백엔드 측에서 CI/CD를 연결하는 과정에서 두개의 환경이 겹쳤는지 그 과정에서 프론트엔드의 배포가 다운되는 경험을 한적이 있습니다. 그래서 프론트도 처음부터 도커로 배포해 컨테이너 간에 분리해 **충돌의 위험을 막기 위해서 사용하게 되었습니다.**

## 그럼 Docker로 어떻게 배포하는가?

### 1단계: Docker로 프론트엔드 컨테이너화 하기

일단 먼저 필요한 Dockerfile과 nginx.conf를 생성해 줍니다.
저는 Docker내에서 nginx를 통해 배포를 할 예정이기에 nginx.conf도 같이 추가해 줍니다.

그 후 먼저 image를 빌드해주면 됩니다.

>
```
docker build -t react-image .
```

다음과 같이 image를 build 해주고 컨테이너 화 해주면 되는데요.

>
```
docker run -d --name react-app react-image
```

하지만 접근이 안될겁니다. 포트를 접근하게 해줘야하기 때문입니다.

>
```
docker stop react-app
docker rm react-app -f
```

다음과 같이 react-app을 멈추고 삭제한 다음 다시 컨테이너 화 해주면 됩니다.

>
```
docker run -d -p 80:80 --name react-app react-image
```

처음 컨테이너 화 했을 때 보다 **캐싱이** 되어 있어 **빠르게 진행** 되는것을 확인할 수 있습니다.


저 같은 경우에는 호스트의 80포트가 Docker내부의 80포트를 바라보게 하였습니다.

이런식으로 하면 배포가 되면서 해당 vm의 ip 및 domain으로 접근이 가능하게 됩니다.

아래는 제가 이번 프로젝트에서 사용한 Dockerfile과 nginx.conf 파일입니다.


> ```
> FROM node:20 AS build
> ARG VITE_AUTH0_DOMAIN
> ARG VITE_AUTH0_CLIENT_ID
> ARG VITE_API_BASE_URL
> ENV VITE_AUTH0_DOMAIN=$VITE_AUTH0_DOMAIN
> ENV VITE_AUTH0_CLIENT_ID=$VITE_AUTH0_CLIENT_ID
> ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
> WORKDIR /app
> COPY package*.json ./
> RUN npm install
> COPY . .
> RUN npm run build
> FROM nginx:alpine
> COPY --from=build /app/dist /usr/share/nginx/html
> COPY nginx.conf /etc/nginx/conf.d/default.conf
> EXPOSE 80
> CMD ["nginx", "-g", "daemon off;"]
> ```


아래는 nginx.conf 파일입니다.
>```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 2단계: Docker compose 파일 생성
이정도만 해도 Docker를 활용해 nginx를 통해 배포가 가능하게 됩니다. 하지만 nginx를 restart 할 경우 docker를 새로 켜줘야 하는 번거로움이 있는데요!
그래서 저희는 docker-compose 파일을 만들어 줄 겁니다. 

docker-compose 파일의 경우 프로젝트의 루트에 두어도 됩니다. 
저의 경우 프론트 프로젝트는 따로 더 추가할 내용이 없어 아래와 같이 껐다 켰을 경우 restart를 추가해 주었습니다. 

>```yaml
>#docker-compose.yml
> 
version: "3"
services:
  react-app:
    container_name: react-app
    build:
      context: ./assign-frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    restart: always
```

해당 파일을 통해 nginx가 restart 되어도 자동으로 docker가 restart 되게 됩니다.
(참고로 이 version의 경우 docker compose 버전을 명시합니다. 버전에 따라 형식이 다르기에 버전에 맞춰 작성해줘야 합니다!)

다음과 같이 docker-compose.yml을 생성해 준 후
아래의 명령어를 통해 docker-compose.yml의 내용을 적용할 수 있게 됩니다. 
>
```
docker compose up
```


여기에 CI/CD까지 연결해 주면 gitlab이나 github에 코드를 올릴 때 마다 자동으로 docker가 컨테이너 화 되는것을 볼 수 있습니다.

저의 경우 gitlab-runner을 통해 CI/CD를 구현 하였는데요.

> ```yml
> #gitlab-ci.yml
>
> stages:
>   - build
>   - deploy
> 
> variables:
>   DOCKER_IMAGE: react-image
> 
> build:
>   stage: build
>   tags:
>     - frontend
>   script:
>     - docker build
>       --build-arg VITE_AUTH0_DOMAIN="$VITE_AUTH0_DOMAIN"
>       --build-arg VITE_AUTH0_CLIENT_ID="$VITE_AUTH0_CLIENT_ID"
>       --build-arg VITE_API_BASE_URL="$VITE_API_BASE_URL"
>       -t $DOCKER_IMAGE .
>   only:
>     - dev
> 
> deploy:
>   stage: deploy
>   tags:
>     - frontend
>   script:
>     - docker rm -f react-app || true
>     - docker run -d -p 3000:80 --name react-app $DOCKER_IMAGE
>   only:
>     - dev
>```

간단하게 살펴주면 build 단계에서 docker를 빌드하고 deploy 단계에서 이전에 실행 중이던 컨테이너가 있다면 제거 후 새로 빌드된 이미지로 컨테이너화 하게 됩니다.
