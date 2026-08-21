import Link from "next/link";
import { AdminLink } from "@/components/blog/admin-link";
import { LogoMark } from "@/components/blog/logo-mark";
import { MASCOT } from "@/components/blog/mascot-dots";
import { SearchButton } from "@/components/blog/search-command";
import { siteName } from "@/components/blog/site";

/**
 * 공개 블로그 공통 헤더 (002 T010 — B1) — 마스코트 + 세리프 로고 + [태그 · 검색 · RSS]
 *
 * 여백은 `--header-py`, 마스코트 크기는 `--mascot-h`에서 온다 (blog.css 단일 출처).
 * 예전 `py-5`(20px)는 로고가 화면 꼭대기에 붙어 답답했다.
 *
 * 마스코트를 텍스트로 대체하지 않고 **함께** 두는 이유: siteName()이 사이트 정체성의
 * 단일 출처라 화면에서 사라지면 안 되고, 검색결과·스크린리더에도 이름이 남아야 한다.
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
          <span
            className="relative block shrink-0"
            style={{
              height: "var(--mascot-h)",
              width: `calc(var(--mascot-h) * ${MASCOT.width / MASCOT.seatY})`,
              transform: "translateY(var(--header-py))",
            }}
          >
            <LogoMark className="absolute top-0 left-0 w-full" />
          </span>
          {/* 사이트 정체성의 단일 출처(SITE_NAME) — 하드코딩 금지 (codex-review 반영) */}
          <span className="font-serif text-xl font-bold tracking-tight text-zinc-900">
            {siteName()}
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
