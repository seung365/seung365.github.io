---
title: "캐시가 만료된 다음에 일어나는 일: ETag와 stale-while-revalidate"
description: "max-age가 끝난 캐시는 버려지지 않고 서버에 다시 물어요. ETag와 If-None-Match로 가볍게 묻는 법, stale-while-revalidate로 기다리지 않고 묻는 법을 실측으로 정리했어요."
published: 2026-11-22T09:00:00.000Z
tags: ["Cache","HTTP 캐시","ETag","stale-while-revalidate"]
image: "/og/post-cache-revalidate.png"
---

[지난 글](/posts/캐시를-넣기-전에-ttl보다-먼저-물어야-할-세-가지/)에서는 캐시를 붙이기 전에 TTL보다 먼저 답해야 할 질문들을 정리했어요. 이번 글은 그 TTL이 끝난 다음 이야기예요. 팀에서 `stale-while-revalidate`, `ETag`, `If-None-Match`가 함께 언급된 적이 있는데, 세 개는 따로 외우기보다 "만료된 캐시를 어떻게 다시 쓰는가"라는 한 흐름으로 보면 정리가 쉬워요.

## 만료는 삭제가 아니다

`Cache-Control: max-age=600`을 받은 응답은 600초 동안 신선(fresh)해요. 이 동안 브라우저는 서버에 묻지 않고 저장된 응답을 그대로 써요.

600초가 지나면 응답은 만료(stale)돼요. 그렇다고 바로 버려지지는 않아요. 다시 쓰기 전에 서버에 "이거 아직 유효해?"라고 물어보는데, 이걸 재검증(revalidation)이라고 해요. `ETag`와 `If-None-Match`는 안 바뀌었을 때 본문 없이 답할 수 있게 해서 이 질문을 가볍게 만드는 장치고, `stale-while-revalidate`는 이 질문을 기다리지 않게 만드는 장치예요.

## ETag와 If-None-Match: 바뀌었는지만 묻는다

서버는 응답에 `ETag`라는 버전 표시를 붙여요. 브라우저는 만료된 응답을 재검증할 때 갖고 있던 ETag를 `If-None-Match` 헤더에 실어 보내요. 서버의 현재 ETag와 같으면 서버는 본문 없이 `304 Not Modified`만 돌려주고, 브라우저는 저장된 응답을 다시 신선한 상태로 써요. 다르면 `200`과 새 본문을 보내요.

이 블로그가 올라가 있는 GitHub Pages로 직접 확인해 봤어요.

```bash
curl -sI https://seung365.github.io/lab/
# HTTP/2 200
# etag: "6b01b0ac-e01c"
# cache-control: max-age=600

curl -s -o /dev/null -w "%{http_code} %{size_download}\n" \
  -H 'If-None-Match: "6b01b0ac-e01c"' https://seung365.github.io/lab/
# 304 0
```

| 요청 | 응답 | 본문 크기 |
| --- | --- | --- |
| 조건 없이 | `200` | 57,372 bytes |
| `If-None-Match: "6b01b0ac-e01c"` | `304` | 0 bytes |
| `If-None-Match: "nope"` | `200` | 57,372 bytes |

GitHub Pages는 10분 동안은 묻지 않고, 그 뒤에는 ETag로 바뀌었는지만 확인하는 구조예요.

몇 가지 덧붙이면 이래요.

- ETag에는 강한 것(`"abc"`)과 약한 것(`W/"abc"`)이 있어요. 강한 ETag는 "바이트까지 똑같다", 약한 ETag는 "압축 방식처럼 바이트는 달라도 내용은 같다"는 약속이에요.
- 다만 `If-None-Match`는 `W/`를 무시하고 값만 비교해요. 캐시 재검증에서는 "가진 걸 계속 써도 되는지"만 알면 되니까요. 그래서 304가 나오느냐는 강한지 약한지와 상관없고, 차이는 파일을 이어받는 범위 요청처럼 바이트가 정확히 같아야 할 때 생겨요.
- 수정 시각으로 비교하는 `If-Modified-Since`도 함께 오면 `If-None-Match`가 우선이에요.
- 반대 방향으로 쓰는 `If-Match`도 있어요. `PUT` 같은 수정 요청에 ETag를 실어 보내서, 그사이 다른 사람이 고쳤다면 `412 Precondition Failed`로 막아요. 동시 편집 충돌을 막는 용도예요.

### 304도 왕복은 한다

304는 본문을 아껴 줄 뿐 왕복 자체를 없애지는 않아요. 아래 실험에서 응답을 1초 늦게 주는 서버로 재검증하면, 결과가 304여도 1초를 그대로 기다렸어요. 네트워크가 느리거나 서버가 멀수록 "바뀌었는지만 묻는" 그 한 번의 왕복이 사용자 체감 대기 시간이 돼요. 이 대기를 없애려는 게 `stale-while-revalidate`예요.

## stale-while-revalidate: 기다리지 않고 묻는다

[RFC 5861](https://www.rfc-editor.org/rfc/rfc5861)의 예시를 보면 이래요.

```http
Cache-Control: max-age=600, stale-while-revalidate=30
```

- 0~600초: 신선하니 그대로 써요.
- 600~630초: 만료됐지만 저장된 응답을 바로 돌려주고, 재검증은 뒤에서 해요.
- 630초 이후: 정말 만료돼서, 재검증이 끝날 때까지 기다려요.

RFC는 이 30초 동안 캐시가 "기다리지 않고(without blocking)" 재검증을 시도해야 한다고 적고 있어요. 뒤에서 하는 그 재검증이 바로 앞에서 본 `If-None-Match` 요청이에요. 그래서 둘은 따로 쓰는 기능이 아니라 한 쌍이에요. ETag는 "어떻게 가볍게 물을지"를, `stale-while-revalidate`는 "언제 기다리지 않을지"를 맡아요.

MDN의 브라우저 호환성 데이터 기준으로 Chrome 75, Firefox 68, Safari 14부터 지원해요.

### Chrome에서 시간대별로 찍어 보기

설명만으로는 "뒤에서"가 어떤 모습인지 잘 안 보여서, 작은 서버를 띄워 Chrome으로 시간대별 요청을 보내 봤어요. 서버는 `max-age=2, stale-while-revalidate=5`를 주고, 기다렸는지 드러나도록 응답을 1초 늦게 보내요.

```js
const etag = `"v${version}"`
setTimeout(() => {
  const headers = {
    'Cache-Control': 'max-age=2, stale-while-revalidate=5',
    ETag: etag,
  }
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers)
    return res.end()
  }
  res.writeHead(200, headers)
  res.end(JSON.stringify({ version }))
}, 1000)
```

페이지에서는 `fetch('/data')`를 아래 시점에 보내고, 걸린 시간과 받은 버전을 기록했어요.

| 시점 | 상황 | 걸린 시간 | 받은 버전 | 서버에 간 요청 |
| --- | --- | --- | --- | --- |
| 0초 | 첫 요청 | 1003ms | v1 | 조건 없이 → 200 |
| 1초 | 신선 | 0ms | v1 | 없음 |
| 3초 | 만료, 창 안 | 1ms | v1 | 뒤에서 `If-None-Match: "v1"` → 304 |
| 3.5초 | 뒤에서 재검증 중 | 503ms | v1 | 없음 |
| 4.5초 | 재검증 후 | 1ms | v1 | 없음 |
| 5초 | 서버 데이터를 v2로 변경 | | | |
| 7.6초 | 만료, 창 안 | 1ms | v1 | 뒤에서 `If-None-Match: "v1"` → 200 |
| 8.8초 | 재검증 후 | 3ms | v2 | 없음 |
| 16초 | 창도 지남 | 1004ms | v2 | `If-None-Match: "v2"` → 304, 기다림 |

아래에서 같은 실험을 직접 돌려 볼 수 있어요. "글의 실험 재생"을 누르면 위 표가 그대로 다시 만들어지고, 값을 바꿔 가며 직접 요청을 보내 볼 수도 있어요.

<swr-sim></swr-sim>

설명대로인 부분과 설명에 없던 부분이 같이 보였어요.

### 재검증 중에 온 요청은 기다렸다

3초 요청은 옛 응답을 1ms 만에 받았고, 서버에는 조건부 요청이 따로 들어왔어요. 여기까지는 RFC 설명 그대로예요.

그런데 그 재검증이 아직 끝나지 않은 3.5초에 보낸 요청은 503ms를 기다렸어요. 옛 응답을 또 바로 주지 않고, 진행 중인 재검증이 끝나기를 기다렸다가 받은 거예요. 서버에 요청이 하나 더 가지는 않았어요. RFC는 이 상황을 정해 두지 않아서, 이건 Chrome의 동작으로 봐야 해요. "창 안에서는 항상 즉시"라고 기대하면 재검증이 느린 순간에 붙은 요청에서 어긋날 수 있어요.

### 바뀐 데이터는 한 번 늦게 보인다

5초에 서버 데이터를 v2로 바꿨지만, 7.6초 요청은 v1을 받았어요. 그 요청이 뒤에서 일으킨 재검증이 v2를 받아 왔고, v2는 다음 요청인 8.8초에야 보였어요.

이게 `stale-while-revalidate`의 대가예요. 기다림을 없애는 대신 "한 번은 옛 값을 보여 준다"를 받아들이는 거예요. 지난 글의 표현을 빌리면, 이 응답은 최대 `max-age + stale-while-revalidate`초 동안 틀려도 된다는 약속이에요. RFC도 두 값의 합을 "견딜 수 있는 가장 긴 신선도"로 정하라고 권해요.

반대로 창 안에 요청이 한 번도 없으면 미리 재검증할 기회가 없어요. 16초 요청처럼 창이 지나 버리면 평소처럼 1초를 기다려요. 방문이 드문 페이지라면 `stale-while-revalidate`를 붙여도 효과를 거의 못 볼 수 있어요.

## 헷갈리기 쉬운 지시어

- `no-cache`는 "저장하지 마"가 아니라 "저장은 하되 쓸 때마다 재검증해"예요. 저장 자체를 막는 건 `no-store`예요.
- `must-revalidate`는 만료된 뒤에는 반드시 재검증하고, 재검증할 수 없으면 옛 응답 대신 `504`를 돌려주라는 뜻이에요. nextjs.org와 vercel.com은 HTML에 `public, max-age=0, must-revalidate`를 주고 있었어요. 매번 ETag로 바뀌었는지 확인하는 전략이에요.
- `s-maxage`는 CDN 같은 공유 캐시에만 적용되는 `max-age`예요. 브라우저에는 짧게, CDN에는 길게 주고 싶을 때 `max-age`와 따로 써요.

## 앱 안의 stale-while-revalidate

TanStack Query의 `staleTime`도 같은 발상이에요. `staleTime`이 지난 데이터는 화면에 먼저 보여 주고, 마운트나 창 포커스 같은 시점에 뒤에서 다시 가져와요. 다만 이건 앱 메모리 안의 캐시라서 HTTP 캐시와는 다른 층이에요. TanStack Query가 다시 가져오기로 한 요청도 브라우저 HTTP 캐시를 한 번 더 지나가요. 둘 다 "만료된 값을 먼저 보여 준다"는 같은 이름의 전략을 쓰지만, 어느 층의 약속인지는 따로 따져야 해요.

## 마치며

TTL은 캐시가 묻지 않고 버티는 시간이고, 그 뒤의 동작은 두 장치가 정해요. ETag와 `If-None-Match`는 물을 때 오가는 바이트를 줄이지만 왕복은 그대로 남아요. `stale-while-revalidate`는 그 왕복을 사용자 몰래 치르게 해 주는 대신 한 번은 옛 값을 보여 줘요. 실험해 보니 재검증 중에 온 요청은 기다린다는 점, 요청이 없으면 창이 그냥 지나간다는 점처럼 헤더 한 줄만 봐서는 안 보이는 동작도 있었어요. 캐시 헤더를 정할 때는 값보다 "몇 초까지 옛 값을 보여 줘도 되는가"를 먼저 정해 두는 게 순서예요.
