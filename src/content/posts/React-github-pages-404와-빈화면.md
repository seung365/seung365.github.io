---
title: "[React] github pages 404와 빈화면"
description: "gh-pages를 통해 github pages 사이트를 배포"
published: 2024-07-30T16:20:08.768Z
updated: 2026-11-03T04:40:17.306Z
tags: ["React","github pages"]
image: "https://velog.velcdn.com/images/seung365/post/143cc2a2-0d3c-4557-ad77-c671b2017f09/image.png"
---

현재 프로젝트를 배포할일이 있어 gh-pages를 통해 github pages 사이트를 배포하려 하였다.
이때 처음에는 화면이 제대로 렌더링이 되었었는데 새로고침을 하였을때 아래와 같이 404가 떴었다. 
![](https://velog.velcdn.com/images/seung365/post/60f214e5-05a4-4781-b3f4-a71c08b37694/image.png)

그래서 인터넷 서칭 결과

404.html을 public 폴더 내에 추가해주었다.

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Single Page Apps for GitHub Pages</title>
    <script type="text/javascript">
      // Single Page Apps for GitHub Pages
      // https://github.com/rafrex/spa-github-pages
      // Copyright (c) 2016 Rafael Pedicini,  licensed under the MIT License
      //  ---------------------------------------------- ------------------------
      // This script takes the current url and  converts the path and query
      // string into just a query string, and then  redirects the browser
      // to the new url with only a query string  and hash fragment,
      // e.g. http://www.foo.tld/one/two?a=b& c=d#qwe, becomes
      // http://www.foo.tld/?p=/one/two&  q=a=b~and~c=d#qwe
      // Note: this 404.html file must be at least  512 bytes for it to work
      // with Internet Explorer (it is currently >  512 bytes)

      // If you're creating a Project Pages site  and NOT using a custom domain,
      // then set segmentCount to 1 (enterprise   users may need to set it to > 1).
      // This way the code will only replace the  route part of the path, and not
      // the real directory in which the app  resides, for example:
      //  https://username.github.io/repo-name/one/two?  a=b&c=d#qwe becomes
      // https://username.github.io/repo-name/? p=/one/two&q=a=b~and~c=d#qwe
      // Otherwise, leave segmentCount as 0.
      var segmentCount = 1;

      var l = window.location;
      l.replace(
        l.protocol +
          '//' +
          l.hostname +
          (l.port ? ':' + l.port : '') +
          l.pathname
            .split('/')
            .slice(0, 1 + segmentCount)
            .join('/') +
          '/?p=/' +
          l.pathname.slice(1).split('/').slice(segmentCount).join('/').replace(/&/g, '~and~') +
          (l.search ? '&q=' + l.search.slice(1).replace(/&/g, '~and~') : '') +
          l.hash,
      );
    </script>
  </head>
  <body></body>
</html>

```
또한 index.html에 아래 코드를 추가해주었다.<head> 태그 안에 넣어주면 된다.

```html
<!-- Start Single Page Apps for GitHub Pages -->
    <script type="text/javascript">
      // Single Page Apps for GitHub Pages
      // https://github.com/rafrex/spa-github-pages
      // Copyright (c) 2016 Rafael Pedicini, licensed under the MIT License
      // ----------------------------------------------------------------------
      // This script checks to see if a redirect is present in the query string
      // and converts it back into the correct url and adds it to the
      // browser's history using window.history.replaceState(...),
      // which won't cause the browser to attempt to load the new url.
      // When the single page app is loaded further down in this file,
      // the correct url will be waiting in the browser's history for
      // the single page app to route accordingly.
      (function (l) {
        if (l.search) {
          var q = {};
          l.search
            .slice(1)
            .split('&')
            .forEach(function (v) {
              var a = v.split('=');
              q[a[0]] = a.slice(1).join('=').replace(/~and~/g, '&');
            });
          if (q.p !== undefined) {
            window.history.replaceState(
              null,
              null,
              l.pathname.slice(0, -1) + (q.p || '') + (q.q ? '?' + q.q : '') + l.hash,
            );
          }
        }
      })(window.location);
    </script>
    <!-- End Single Page Apps for GitHub Pages -->
```

위의 코드를 추가해주고 나니 404 에러는 해결이 되었지만 흰화면이 배포되는 것이다.
이때 이 URL이 의심스러웠다. 
  ![](https://velog.velcdn.com/images/seung365/post/d514170a-5400-43b7-b5bc-1eba49bdf69a/image.png)
분명 내가 homepage로 설정한 주소는 뒤에 레포지토리의 이름도 있어야 하는것이다.

그래서 또 인터넷 서칭을 해주었다..
  
 인터넷 서칭 결과 basename을 사용해주라는 것이다. 그런데 이때 대부분의 예제가 BrowserRouter을 사용하는 것이였다. 나는 createBrowserRouter를 사용해서 이 basename을 어떻게 지정해줘야 할까 생각해보았다. 사실 이 둘은 사용용도가 비슷해서 createBrowserRouter에서도 비슷할꺼 같았다. 그래서 createBroserRouter의 정의를 살펴보았다.
  ![](https://velog.velcdn.com/images/seung365/post/405bd4b3-3043-466a-8057-e149bff79a0f/image.png)
아닐까 다를까 opts에서 basename을 지원하는것이였다. 그래서 아래처럼 basename을 추가해주었다.
  이때 process.env.PUBLIC_URL는 package.json에서 우리가 선언해준 basename이 된다.
  
```tsx
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';

import { Layout } from '@/components/features/Layout';
import { CategoryPage } from '@/pages/Category';
import { GoodsDetailPage } from '@/pages/Goods/Detail';
import { HomePage } from '@/pages/Home';
import { LoginPage } from '@/pages/Login';
import { Membership } from '@/pages/Membership';
import { MyAccountPage } from '@/pages/MyAccount';
import { OrderPage } from '@/pages/Order';

import { PrivateRoute } from './components/PrivateRoute';
import { RouterPath } from './path';

const routes = [
  {
    path: RouterPath.root,
    element: <Layout />,
    children: [
      {
        path: RouterPath.home,
        element: <HomePage />,
      },
      {
        path: RouterPath.category,
        element: <CategoryPage />,
      },
      {
        path: RouterPath.productsDetail,
        element: <GoodsDetailPage />,
      },
      {
        path: RouterPath.myAccount,
        element: <PrivateRoute />,
        children: [
          {
            path: RouterPath.myAccount,
            element: <MyAccountPage />,
          },
        ],
      },
      {
        path: RouterPath.order,
        element: <PrivateRoute />,
        children: [
          {
            path: RouterPath.order,
            element: <OrderPage />,
          },
        ],
      },
      {
        path: RouterPath.notFound,
        element: <Navigate to={RouterPath.home} />,
      },
    ],
  },
  {
    path: RouterPath.login,
    element: <LoginPage />,
  },
  {
    path: RouterPath.membership,
    element: <Membership />,
  },
];

const router = createBrowserRouter(routes, {
  basename: process.env.PUBLIC_URL,
});

export const Routes = () => {
  return <RouterProvider router={router} />;
};
```


그러니 아래처럼 URL 주소도 바뀌었고 새로고침을 해도 제대로 렌더링이 되는것을 확인할 수 있었다!


![](https://velog.velcdn.com/images/seung365/post/396ef084-a9cb-4db9-aaad-1bc98293a3fa/image.png)
