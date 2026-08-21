"use client";
// 사이트 마스코트 — 이미지를 하프톤 점으로 그리고, 마우스가 지나가면 점이 밀려났다 돌아온다.
//
// 알고리즘은 v0 템플릿 "image to particles"(Railly)의 것을 헤더용으로 다시 짠 것이다.
// 원리: 격자마다 밝기를 재서 점 크기를 정하고(하프톤), 마우스 궤적 근처의 점에 반발력을
// 준 뒤 원위치로 당기는 힘과 감쇠를 섞는다. 반경을 노이즈로 흔들어 경계를 "액체"처럼 만든다.
//
// 원본과 다르게 한 것 — 헤더는 **모든 공개 페이지**에 들어가고 화면 최상단(LCP 영역)이다:
//   1. 점 데이터를 빌드 전에 미리 계산해 둔다(mascot-dots.ts). 런타임 이미지 fetch·decode·
//      getImageData가 없다. 원본은 업로드 데모라 그게 필요했지만 우리는 그림이 고정이다.
//   2. **평소에는 rAF를 아예 돌리지 않는다.** 마우스가 들어오면 시작하고, 나간 뒤 점이
//      제자리로 돌아오면 스스로 멈춘다. 정지 상태의 CPU 비용이 0이다.
//   3. 배경을 칠하지 않는다(원본은 검정으로 덮었다). 투명해야 흰 페이지에 얹힌다.
//   4. prefers-reduced-motion이면 인터랙션 없이 정지 화면만 그린다.
//
// 정지 화면은 마운트 직후 한 번 그리므로 자바스크립트가 늦어도 레이아웃은 안 밀린다
// (캔버스 크기가 CSS로 고정돼 있다).
import { useEffect, useRef } from "react";
import { MASCOT } from "./mascot-dots";

/** base64 자리값 — 생성기와 같은 순서여야 한다 */
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** 마우스 반발이 닿는 거리(px) */
const MOUSE_RADIUS = 26;
/** 미는 힘 */
const REPULSION = 1.6;
/** 제자리로 당기는 힘 */
const RETURN = 0.12;
/** 속도 감쇠 — 1에 가까울수록 오래 출렁인다 */
const DAMPING = 0.86;
/** 이 속도 아래로 전부 잦아들면 루프를 멈춘다 */
const REST_SPEED = 0.02;

interface Dot {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  r: number;
  color: string;
  vx: number;
  vy: number;
}

/** 격자 문자열을 점 배열로 편다 */
function buildDots(): Dot[] {
  const { cols, rows, cell, radii, colors, palette } = MASCOT;
  const dots: Dot[] = [];
  for (let i = 0; i < radii.length; i += 1) {
    const q = B64.indexOf(radii[i]);
    if (q <= 0) continue; // 빈 칸
    const gx = i % cols;
    const gy = Math.floor(i / cols);
    const x = gx * cell + cell / 2;
    const y = gy * cell + cell / 2;
    dots.push({
      x,
      y,
      baseX: x,
      baseY: y,
      // 0.66: 큰 점끼리 살짝 맞닿아 면이 차 보인다 — '더 진하게' 요청 반영
      r: (q / 63) * cell * 0.66,
      color: palette[B64.indexOf(colors[i])] ?? palette[0],
      vx: 0,
      vy: 0,
    });
  }
  if (rows * cols !== radii.length) {
    // 생성기와 소비자가 어긋나면 조용히 이상한 그림이 나온다 — 개발 중에 드러나게 한다
    console.warn("[LogoMark] 격자 크기와 데이터 길이가 맞지 않습니다");
  }
  return dots;
}

/** 경계를 울퉁불퉁하게 만드는 값 — 결정적이라 프레임마다 튀지 않는다 */
function noise(x: number, y: number, t: number): number {
  const a = Math.sin(x * 12.9898 + y * 78.233 + t) * 43758.5453;
  return a - Math.floor(a);
}

export function LogoMark({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = MASCOT;
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // 3x 기기에서 픽셀 4배는 낭비다
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const dots = buildDots();
    const mouse = { x: -9999, y: -9999, active: false };
    let raf = 0;
    let running = false;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const d of dots) {
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const step = () => {
      const t = performance.now() * 0.001;
      let moving = false;

      for (const d of dots) {
        if (mouse.active) {
          const dx = mouse.x - d.x;
          const dy = mouse.y - d.y;
          const dist = Math.hypot(dx, dy);
          // 반경을 노이즈로 흔들면 경계가 원이 아니라 액체처럼 보인다
          const radius = MOUSE_RADIUS * (0.7 + noise(d.baseX, d.baseY, t) * 0.6);
          if (dist < radius && dist > 0.1) {
            const f = 1 - dist / radius;
            const smooth = f * f * (3 - 2 * f); // 경계에서 갑자기 튀지 않게
            const force = REPULSION * smooth;
            d.vx -= (dx / dist) * force;
            d.vy -= (dy / dist) * force;
          }
        }
        d.vx += (d.baseX - d.x) * RETURN;
        d.vy += (d.baseY - d.y) * RETURN;
        d.vx *= DAMPING;
        d.vy *= DAMPING;
        d.x += d.vx;
        d.y += d.vy;
        if (Math.abs(d.vx) > REST_SPEED || Math.abs(d.vy) > REST_SPEED) moving = true;
      }

      draw();

      // 마우스가 나갔고 전부 잦아들었으면 스스로 멈춘다 — 헤더가 배터리를 계속 먹지 않게
      if (!mouse.active && !moving) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(step);
    };

    const start = () => {
      if (running || reduced.matches) return;
      running = true;
      raf = requestAnimationFrame(step);
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      // 캔버스가 CSS로 늘어나 있을 수 있으므로 표시 크기 기준으로 환산한다
      mouse.x = ((e.clientX - rect.left) / rect.width) * width;
      mouse.y = ((e.clientY - rect.top) / rect.height) * height;
      mouse.active = true;
      start();
    };
    const onLeave = () => {
      mouse.active = false;
      start(); // 제자리로 돌아가는 것까지는 마저 그린다
    };

    draw(); // 정지 화면 먼저 — 마우스가 없어도 보여야 한다

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ ...style, aspectRatio: `${MASCOT.width} / ${MASCOT.height}` }}
      role="img"
      aria-label="지니로그 마스코트"
    />
  );
}
