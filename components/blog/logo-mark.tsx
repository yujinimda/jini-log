/**
 * 사이트 마스코트 — 후드티 입고 담배 문 로우폴리 토끼.
 *
 * 왜 3D가 아니라 인라인 SVG인가: 헤더는 공통 레이아웃이라 모든 공개 페이지에 비용이 붙는다.
 * three.js는 최소 구성도 gzip 150KB 안팎이고, 헤더는 화면 최상단(LCP 영역)이라 캔버스가
 * 첫 페인트를 잡아먹는다. 로우폴리는 결국 평면 다각형 덩어리라 SVG로 그리면
 * **런타임 JS 0바이트**로 같은 인상을 낼 수 있다 — 공개 페이지의 SSG도 그대로다.
 *
 * 색: 사이트 전체가 무채색(zinc)이라 **담배 불씨가 유일한 색**이다. 이 한 점이 포인트로
 * 작동하므로 다른 곳에 색을 더 넣지 않는다.
 *
 * 애니메이션(연기)은 blog.css의 `.mascot-smoke`에 있다 — `prefers-reduced-motion`에서 멈춘다.
 */
export function LogoMark({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 200 270"
      className={className}
      style={style}
      role="img"
      aria-label="지니로그 마스코트"
      // 무채색 면들은 장식이다 — 스크린리더에는 위 aria-label 하나로 충분하다
      focusable="false"
    >
      {/* 귀 — 앞면(밝음) + 안쪽 면(그늘) */}
      <polygon points="72,78 66,32 72,12 84,8 92,18 92,80" fill="#ddd9d3" />
      <polygon points="84,8 92,18 92,80 86,78 86,20" fill="#c9c4bd" />
      <polygon points="128,78 134,32 128,12 116,8 108,18 108,80" fill="#d3cec7" />
      <polygon points="116,8 108,18 108,80 114,78 114,20" fill="#bdb7b0" />

      {/* 다리 */}
      <polygon points="76,224 74,252 94,252 94,224" fill="#8f8a83" />
      <polygon points="106,224 106,252 126,252 124,224" fill="#7e7973" />
      <polygon points="74,252 72,260 96,260 94,252" fill="#78736d" />
      <polygon points="106,252 104,260 128,260 126,252" fill="#6c6862" />

      {/* 후드티 */}
      <polygon points="64,164 100,160 100,232 62,228" fill="#9c968e" />
      <polygon points="100,160 136,164 138,228 100,232" fill="#8a847d" />
      <polygon points="64,164 62,228 54,212 56,176" fill="#8b857d" />
      <polygon points="136,164 138,228 146,212 144,176" fill="#79736c" />
      {/* 주머니에 넣은 손 */}
      <polygon points="56,176 54,212 66,218 68,184" fill="#938d85" />
      <polygon points="144,176 146,212 134,218 132,184" fill="#817b74" />
      <polygon points="70,196 130,196 126,216 74,216" fill="#7d7770" />
      {/* 후드 칼라 + 끈 */}
      <polygon points="68,156 100,152 100,170 66,166" fill="#a8a29a" />
      <polygon points="100,152 132,156 134,166 100,170" fill="#948e86" />
      <rect x="92" y="168" width="3" height="20" rx="1.5" fill="#ddd9d3" />
      <rect x="106" y="168" width="3" height="18" rx="1.5" fill="#cdc8c1" />

      {/* 머리 — 면을 방사형이 아니라 가로 4단으로 나눈다.
          방사형으로 쪼개면 거미줄처럼 보여서 형태가 안 읽힌다. */}
      <polygon points="74,72 100,68 100,88 54,88" fill="#e8e5e0" />
      <polygon points="100,68 126,72 146,88 100,88" fill="#dbd7d1" />
      <polygon points="54,88 100,88 100,116 48,116" fill="#e3dfda" />
      <polygon points="100,88 146,88 152,116 100,116" fill="#d2cdc6" />
      <polygon points="48,116 100,116 100,142 54,142" fill="#dedad4" />
      <polygon points="100,116 152,116 146,142 100,142" fill="#ccc7c0" />
      <polygon points="54,142 100,142 100,164 74,158" fill="#d8d4ce" />
      <polygon points="100,142 146,142 126,158 100,164" fill="#c5c0b9" />

      {/* 눈 — 작게. 크게 그리면 가면처럼 보여서 캐릭터가 아니라 위협이 된다. */}
      <polygon points="72,110 94,110 94,116 84,122 72,118" fill="#332f2b" />
      <polygon points="128,110 106,110 106,116 116,122 128,118" fill="#332f2b" />

      {/* 담배 — 필터(회색)·몸통(흰)·불씨(주황) */}
      <polygon points="104,138 111,139 111,143 104,142" fill="#b8b3ac" />
      <polygon points="111,139 148,145 148,149 111,143" fill="#f4f1ec" />
      <polygon points="148,145 156,146 156,150 148,149" fill="#ea580c" />

      {/* 연기 — 얼굴 **바깥**으로 피어오르게 한다. 얼굴 위를 지나가면 회색 선이
          회색 면에 묻혀서 보이지 않는다. */}
      <path
        className="mascot-smoke"
        d="M158 144 C 170 132, 160 124, 172 112 C 180 103, 172 95, 178 86"
        fill="none"
        stroke="#cbc6bf"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
