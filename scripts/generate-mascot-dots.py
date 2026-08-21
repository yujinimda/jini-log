"""마스코트 하프톤 점 데이터 생성기.

assets/mascot/source.webp 를 격자로 샘플링해 components/blog/mascot-dots.ts 를 만든다.
런타임에 이미지를 받아 getImageData 하지 않으려는 것 — 헤더는 모든 공개 페이지의
최상단(LCP 영역)이라 fetch·decode를 한 번이라도 줄이는 편이 낫다.

## 좌석(seat) 구조 — "진짜 선 위에 걸려 있는 것처럼"

원본 그림에서 캐릭터는 테이블 선에 팔을 걸치고 손을 선 아래로 늘어뜨리고 있다.
그 구도를 헤더에 그대로 옮긴다:

    몸통(선 위)   → 그대로 점으로
    테이블 선     → **제거** — 헤더의 border-bottom 이 그 선 역할을 한다
    손(선 아래)   → 남긴다 — 헤더 밑선을 넘어 본문 쪽으로 늘어진다 (입체감)

그래서 출력에 seatY(선의 캔버스 y좌표)를 실어 보내고, site-header.tsx 가 캔버스의
seatY 지점을 헤더 밑선에 정렬한다. 선 영역·선 아래에서는 배경거리 마스크 대신
**살색/분홍(따뜻한 색) 판정**으로 손·소매만 남기고 테이블 회색과 그림자를 버린다.

실행:  python3 scripts/generate-mascot-dots.py        (PIL 필요)
"""
from PIL import Image, ImageEnhance
import math, os

SRC = "/Users/zini/orca/projects/jini-log/assets/mascot/source.webp"
OUT = "/Users/zini/orca/projects/jini-log/components/blog/mascot-dots.ts"

# 원본 크롭(y 36~1371) 안에서 테이블 선이 차지하는 세로 비율 — 원본에서 실측한 값
LINE_TOP_FRAC = (1028 - 36) / 1335   # 선 윗변
LINE_END_FRAC = (1076 - 36) / 1335   # 선 아랫변(검은 밑줄 포함)

SEAT_H = 144          # 선 윗변까지의 표시 높이(px) — blog.css --mascot-h(데스크톱)와 맞춘다
CELL   = 2            # 격자 간격(px) — 점을 작게, 촘촘하게
BG     = (250, 232, 230)   # 원본 배경색
MASK_T = 0.35
FLOOR  = 0.34
GAMMA  = 0.85
DARK_MULT = 2.2
SATURATION = 1.45
CONTRAST   = 1.12
PALETTE_N  = 40

B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

def is_warm(r, g, b):
    """손·소매(따뜻한 색) 판정. 벽 배경(r-b≈15, r-g≈10)과 테이블 회색(r-g≈7)은 떨어진다."""
    return r > 195 and (r - b) >= 25 and (r - g) >= 15

im = Image.open(SRC).convert("RGB")
w, h = im.size
H = round(SEAT_H / LINE_TOP_FRAC)          # 전체 표시 높이 (손끝까지)
im = im.resize((round(w * H / h), H), Image.LANCZOS)
W, H = im.size
seat_y = round(H * LINE_TOP_FRAC)
band_end = round(H * LINE_END_FRAC)

# 실루엣 판정은 원본 색으로, 색·크기 샘플링은 보정본으로 (배경색 상수가 어긋나지 않게)
mask_px = im.load()
enhanced = ImageEnhance.Contrast(ImageEnhance.Color(im).enhance(SATURATION)).enhance(CONTRAST)
enhanced = enhanced.quantize(colors=PALETTE_N, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")
px = enhanced.load()

cols, rows = W // CELL, H // CELL
palette, pidx = [], {}
radii, colors = [], []
filled = 0

for gy in range(rows):
    for gx in range(cols):
        x = min(gx * CELL + CELL // 2, W - 1)
        y = min(gy * CELL + CELL // 2, H - 1)
        mr, mg, mb = mask_px[x, y]
        if y < seat_y:
            # 몸통: 배경거리 or 따뜻한 색 — 살색은 배경과 가까워서 거리로만 걸면 뚫린다
            keep = (min(1.0, math.dist((mr, mg, mb), BG) / 45) >= MASK_T) or is_warm(mr, mg, mb)
        else:
            # 선 영역·선 아래: 손·소매만. 테이블 회색·검은 선·그림자·벽은 버린다
            keep = is_warm(mr, mg, mb)
        if not keep:
            radii.append(B64[0]); colors.append(B64[0]); continue
        r_, g_, b_ = px[x, y]
        lum = (r_ * 299 + g_ * 587 + b_ * 114) / 1000
        v = FLOOR + (1 - FLOOR) * min(1.0, ((1 - lum / 255) ** GAMMA) * DARK_MULT)
        q = max(1, min(63, round(v * 63)))
        key = (r_, g_, b_)
        if key not in pidx:
            pidx[key] = len(palette); palette.append(key)
        radii.append(B64[q]); colors.append(B64[pidx[key] % 64])
        filled += 1

assert len(palette) <= 64, f"팔레트가 64색을 넘었습니다: {len(palette)}"
assert len(B64) == 64

hexes = ",".join(f'"#{r:02x}{g:02x}{b:02x}"' for r, g, b in palette)
ts = f'''// 자동 생성 — 직접 고치지 마세요.
// 생성기: scripts/generate-mascot-dots.py (원본: assets/mascot/source.webp)
// 파라미터: SEAT_H={SEAT_H} CELL={CELL} BG={BG} MASK_T={MASK_T} FLOOR={FLOOR} GAMMA={GAMMA}
//          DARK_MULT={DARK_MULT} SATURATION={SATURATION} CONTRAST={CONTRAST} PALETTE_N={PALETTE_N}
//
// seatY: 원본에서 캐릭터가 팔을 걸치던 테이블 선의 캔버스 y좌표. 선 자체는 점에서
// 제거돼 있고, site-header 가 이 지점을 헤더 border-bottom 에 정렬한다 —
// seatY 아래 부분(손)이 밑선을 넘어 늘어지는 게 의도된 모양이다.
//
// radii/colors 는 격자를 왼쪽→오른쪽, 위→아래로 훑은 것이고 한 칸당 문자 하나다.
// radii 의 "A"(=0) 는 빈 칸. 나머지는 base64 자리값(1..63)을 반지름 비율로 쓴다.

export const MASCOT = {{
  width: {W},
  height: {H},
  seatY: {seat_y},
  cell: {CELL},
  cols: {cols},
  rows: {rows},
  palette: [{hexes}],
  radii: "{"".join(radii)}",
  colors: "{"".join(colors)}",
}} as const;
'''
os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, "w").write(ts)
print(f"표시 {W}x{H} (선 y={seat_y}, 밴드끝 y={band_end})  격자 {cols}x{rows}  점 {filled}개  팔레트 {len(palette)}색")
print(f"파일 {os.path.getsize(OUT)/1024:.1f} KB → {OUT}")
