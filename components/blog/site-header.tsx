import Link from "next/link";
import { AdminLink } from "@/components/blog/admin-link";
import { LogoMark } from "@/components/blog/logo-mark";
import { MASCOT } from "@/components/blog/mascot-dots";
import { SearchButton } from "@/components/blog/search-command";
import { siteName } from "@/components/blog/site";

/**
 * 공개 블로그 공통 헤더 (002 T010 — B1) — 마스코트 + 말풍선 + [태그 · 검색 · RSS]
 *
 * 여백은 `--header-py`, 마스코트 크기는 `--mascot-h`에서 온다 (blog.css 단일 출처).
 * 예전 `py-5`(20px)는 로고가 화면 꼭대기에 붙어 답답했다.
 *
 * 보이는 "지니로그" 텍스트 로고는 만화 말풍선으로 교체됐다 (C15). 다만 siteName()이
 * 사이트 정체성의 단일 출처라 화면에서 사라지면 안 되므로 sr-only로 링크 안에 남긴다 —
 * 검색결과·스크린리더에는 이름이, 눈에는 말풍선이 보인다.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200">
      <div
        className="flex items-center justify-between gap-4"
        style={{ paddingBlock: "var(--header-py)" }}
      >
        <Link href="/" className="flex items-center gap-3">
          {/* 마스코트는 헤더 밑선(border-bottom)에 팔을 걸치고 앉는다 — 원본 그림에서
              팔을 걸치던 테이블 선을 밑선이 대신하고, 손(seatY 아래)은 밑선을 넘어
              본문 쪽으로 늘어진다. 이 입체감이 의도된 모양이다.

              수치: --mascot-h 는 "선까지의 높이"(seatY)다. 캔버스 전체는 손까지라 그
              비율(height/seatY)만큼 더 크고, 그만큼 더 내려야 seatY 지점이 밑선에 닿는다.
              손이 내려오는 길이는 --mascot-h 기준 약 35% — 본문 상단 패딩(py-12=48px)
              안이라 글과 겹치지 않는다(데스크톱 --mascot-h 9rem 기준 50px).
              transform이라 레이아웃(행 높이·텍스트·메뉴 정렬)은 seatY 기준 그대로다. */}
          {/* 래퍼가 레이아웃 몫(선까지 = --mascot-h)만 차지하고, 캔버스는 그 안에서
              손까지 아래로 넘친다(absolute) — 안 그러면 손 길이만큼 헤더 위쪽에
              빈 공간이 생긴다. 래퍼 bottom = 캔버스의 seatY 지점이므로,
              래퍼를 아래 패딩만큼 내리면 seatY가 정확히 밑선에 앉는다. */}
          {/* aria-hidden: 링크 안에서는 마스코트가 장식이다 — canvas의
              aria-label("지니로그 마스코트")이 홈 링크의 접근 가능한 이름에 섞이면
              "지니로그 마스코트 지니로그"처럼 이름이 중복·오염된다 (C15). */}
          <span
            aria-hidden="true"
            className="relative block shrink-0"
            style={{
              height: "var(--mascot-h)",
              width: `calc(var(--mascot-h) * ${MASCOT.width / MASCOT.seatY})`,
              transform: "translateY(var(--header-py))",
            }}
          >
            <LogoMark className="absolute top-0 left-0 w-full" />
          </span>
          {/* 사이트 정체성의 단일 출처(SITE_NAME) — 하드코딩 금지 (codex-review 반영).
              보이는 텍스트 로고는 말풍선으로 교체됐지만(C15) siteName()은 화면에서
              사라지면 안 된다 — sr-only로 홈 링크의 접근 가능한 이름을 유지한다.
              검색결과·스크린리더·seo.spec의 정체성 계약이 여기 걸려 있다. */}
          <span className="sr-only">{siteName()}</span>
          {/* 만화 말풍선 — 마스코트가 하는 대사. 장식이므로 aria-hidden.
              타원(border-radius 50%) + SVG 꼬리 조합: 꼬리의 흰 면이 타원 테두리를
              덮고, 바깥 두 변만 선을 그어 말풍선에서 이어져 나온 것처럼 보인다.
              래퍼(translateY 있는 마스코트 캔버스) 바깥에 일반 정렬로 둔다 —
              같이 내려앉으면 밑선 아래로 뚫고 나간다. */}
          {/* sm 미만에서는 말풍선을 숨긴다 — 390px에서 문구를 10px까지 줄여도
              말풍선+메뉴가 한 줄에 안 들어가 메뉴가 글자 단위로 세로 줄바꿈됐다
              (스크린샷으로 실측). 장식이라 숨겨도 정보 손실이 없다. */}
          <span aria-hidden="true" className="relative hidden sm:block">
            <span className="block rounded-[50%] border border-zinc-800 bg-white px-6 py-2.5 text-center text-xs leading-snug whitespace-nowrap text-zinc-800">
              엄마가 모르셔서 그렇지
              <br />
              요즘은 다들 이렇게 입어요
            </span>
            {/* 꼬리 — 왼쪽 아래로 뾰족하게, 마스코트 머리 쪽을 가리킨다 */}
            <svg
              className="absolute -bottom-[11px] left-6"
              width="26"
              height="18"
              viewBox="0 0 26 18"
              fill="none"
            >
              <path d="M13 1 C12 8 8 13 1 17 C11 14 19 9 23 3 Z" fill="#fff" />
              <path
                d="M13 1 C12 8 8 13 1 17 C11 14 19 9 23 3"
                stroke="#27272a"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </Link>
        <nav aria-label="사이트 메뉴" className="flex items-center gap-4 text-sm">
          <Link href="/tags" className="text-zinc-500 transition-colors hover:text-zinc-900">
            태그
          </Link>
          <SearchButton />
          <a href="/feed.xml" className="text-zinc-500 transition-colors hover:text-zinc-900">
            RSS
          </a>
          {/* 어드민 진입점 — 목적지는 항상 /admin이고 문구만 세션에 따라 바뀐다 (C4).
              세션 확인은 클라이언트에서 — 서버에서 auth()를 부르면 전 페이지가 SSG를 잃는다. */}
          <AdminLink className="text-zinc-500 transition-colors hover:text-zinc-900" />
        </nav>
      </div>
    </header>
  );
}
