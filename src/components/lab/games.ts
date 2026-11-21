// 놀이터 게임 목록. 놀이터 메인 카드, 게임 페이지 상단·하단, 검색용 구조화 데이터가 이 목록을 함께 쓴다
export type LabGame = {
	slug: string;
	kicker: string;
	title: string;
	/** 검색 결과·공유 미리보기 제목 (검색어가 들어가게) */
	seoTitle: string;
	/** 카드·페이지 소개 */
	desc: string;
	/** meta description (검색 결과 요약) */
	metaDesc: string;
	tags: string[];
	icon: string;
	best: { key: string; unit: string; label?: string; low?: boolean };
};

export const LAB_GAMES: LabGame[] = [
	{
		slug: "bug-hunt",
		kicker: "ARCADE · 30초",
		title: "버그 잡기",
		seoTitle: "버그 잡기 - 30초 클릭 아케이드 게임",
		desc: "에디터 위를 기어다니는 버그를 잡아라. 크리티컬은 빠르고, 초록 체크는 기능이니 건드리지 말 것.",
		metaDesc: "30초 동안 화면을 기어다니는 버그를 클릭해 잡는 무료 웹 아케이드 게임. 매일 모두에게 같은 판이 나오는 오늘의 챌린지와 결과 공유를 지원해요.",
		tags: ["오늘의 챌린지", "콤보", "Canvas 2D"],
		icon: "material-symbols:bug-report-rounded",
		best: { key: "bug-hunt", unit: "점" },
	},
	{
		slug: "deploy-tower",
		kicker: "3D · 원터치",
		title: "배포 타워",
		seoTitle: "배포 타워 - 3D 블록 쌓기 게임",
		desc: "움직이는 블록을 타이밍 맞춰 떨어뜨려 쌓아 올리기. 어긋난 만큼 잘려 나간다. 몇 층까지 배포할 수 있을까?",
		metaDesc: "움직이는 블록을 타이밍 맞춰 떨어뜨려 높이 쌓는 3D 블록 쌓기 웹 게임. 설치 없이 브라우저와 모바일에서 바로 할 수 있어요.",
		tags: ["Three.js", "퍼펙트 연속", "모바일 OK"],
		icon: "material-symbols:stacks-rounded",
		best: { key: "deploy-tower", unit: "층" },
	},
	{
		slug: "one-second",
		kicker: "TIMING · 한 번에 1초",
		title: "1초 맞추기",
		seoTitle: "1초 맞추기 - 감으로 정확히 1초 재는 타이밍 게임",
		desc: "누르고 있다가 정확히 1초에 손을 떼세요. 화면엔 시계가 없어요. 오차 몇 ms까지 줄일 수 있을까?",
		metaDesc: "버튼을 누르고 있다가 감으로 정확히 1초에 떼는 1초 맞추기 게임. 오차를 ms 단위로 재고 결과를 친구에게 공유할 수 있어요.",
		tags: ["타이밍", "ms 단위", "키보드 OK"],
		icon: "material-symbols:timer-outline-rounded",
		best: { key: "one-second", unit: "ms", label: "최소 오차", low: true },
	},
	{
		slug: "marble-race",
		kicker: "RACE · 제비뽑기",
		title: "공 레이스",
		seoTitle: "공 레이스 - 이름 공을 굴려 뽑는 제비뽑기·당첨자 추첨·순서 정하기",
		desc: "참가자 이름이 적힌 공들이 같은 코스를 굴러 내려가요. 먼저 도착한 공, 혹은 마지막 공이 당첨. 커피 내기, 당번, 경품 추첨에.",
		metaDesc: "참가자 이름을 넣으면 이름 공들이 핀·회전 막대·범퍼 코스를 굴러 내려가 도착 순서로 당첨자를 뽑는 무료 제비뽑기. 당첨 인원, 먼저/마지막 도착 기준을 고를 수 있고 출발 위치를 매번 섞어 공정해요.",
		tags: ["제비뽑기", "당첨자 추첨", "최대 100명"],
		icon: "material-symbols:sports-score-rounded",
		best: { key: "marble-race", unit: "회", label: "레이스 횟수" },
	},
	{
		slug: "drop-pick",
		kicker: "RANDOM · 공 떨어뜨리기",
		title: "공 뽑기",
		seoTitle: "공 뽑기 - 핀볼처럼 공을 떨어뜨리는 랜덤 뽑기 (점심 메뉴·벌칙 정하기)",
		desc: "공을 떨어뜨려 핀에 튕기고 들어간 칸이 당첨. 점심 메뉴, 벌칙, 순서 정하기를 직접 입력해서 쓸 수 있어요.",
		metaDesc: "공을 떨어뜨려 핀에 튕기며 들어간 칸으로 정하는 랜덤 뽑기. 점심 메뉴 고르기, 벌칙·당번·순서 정하기 항목을 직접 입력해 무료로 쓸 수 있어요.",
		tags: ["점심 메뉴", "내기", "항목 직접 입력"],
		icon: "material-symbols:casino-outline",
		best: { key: "drop-pick", unit: "회", label: "뽑은 횟수" },
	},
];
