// 블로그 PWA 서비스 워커: 한 번 본 글은 오프라인에서도 다시 볼 수 있게 한다.
// - 페이지(HTML): 네트워크 먼저, 안 되면 저장해 둔 사본 → 새 글·수정이 바로 보인다
// - 빌드 결과물(/_astro/: 파일 이름에 해시가 있어 내용이 안 바뀜)·아이콘·폰트·이미지: 저장본 먼저
// 캐시 구조를 바꾸면 VERSION을 올린다 (예전 캐시는 activate에서 지운다)
const VERSION = "v1";
const PAGES = `pages-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const OFFLINE_HTML = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>오프라인</title>
<body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#eef1f7;color:#333;text-align:center">
<div><p style="font-size:48px;margin:0">📡</p><h1 style="font-size:20px">지금은 오프라인이에요</h1><p>한 번 열어 본 글은 오프라인에서도 볼 수 있어요.<br><a href="/">홈으로</a></p></div>`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== PAGES && k !== ASSETS).map((k) => caches.delete(k))))
			.then(() => self.clients.claim()),
	);
});

const isAsset = (url) => url.pathname.startsWith("/_astro/") || url.pathname.startsWith("/icons/") || /\.(woff2?|png|jpe?g|webp|avif|svg|gif)$/.test(url.pathname);

self.addEventListener("fetch", (event) => {
	const req = event.request;
	const url = new URL(req.url);
	if (req.method !== "GET" || url.origin !== self.location.origin) return;

	// 페이지: 주소창 이동과 swup의 fetch 이동 둘 다 HTML을 달라고 한다
	if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
		event.respondWith(
			fetch(req)
				.then((res) => {
					if (res.ok) {
						const copy = res.clone();
						caches.open(PAGES).then((c) => c.put(req, copy));
					}
					return res;
				})
				.catch(() =>
					caches.match(req, { ignoreSearch: true }).then(
						(hit) => hit || new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
					),
				),
		);
		return;
	}

	if (isAsset(url)) {
		event.respondWith(
			caches.match(req).then(
				(hit) =>
					hit ||
					fetch(req).then((res) => {
						if (res.ok) {
							const copy = res.clone();
							caches.open(ASSETS).then((c) => c.put(req, copy));
						}
						return res;
					}),
			),
		);
	}
	// 그 밖(검색 색인 등)은 브라우저 기본 동작
});
