'use client';

import React, { useEffect, useRef } from 'react';

interface SpiderWebCanvasProps {
  primaryColor?: string;
  glowColor?: string;
  strandCount?: number;
  ringCount?: number;
  travelerCount?: number;
}

export default function SpiderWebCanvas({
  primaryColor = '#ff1a40',
  glowColor = 'rgba(255, 26, 64, 0.6)',
  strandCount = 26,
  ringCount = 13,
  travelerCount = 12,
}: SpiderWebCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let isMobile = window.innerWidth < 768;

    const CONFIG = {
      strandCount: isMobile ? 18 : strandCount,
      ringCount: isMobile ? 8 : ringCount,
      baseAlpha: 0.28,
      driftSpeed: 0.00032,
      parallaxAmt: isMobile ? 10 : 36,
      pluckRadius: 220,
      pluckForce: 38,
      travelerCount: isMobile ? 6 : travelerCount,
      primaryHex: primaryColor,
      glowHex: glowColor,
    };

    let w = 0;
    let h = 0;
    let dpr = 1;
    let cx = 0;
    let cy = 0;
    let maxR = 0;
    let strandAngles: number[] = [];
    let ringRadii: number[] = [];
    let ringWobble: {
      amp: number;
      phase: number;
      freq: number;
      tensionOffset: number;
      tensionVelocity: number;
    }[][] = [];

    let pointer = {
      x: 0,
      y: 0,
      tx: 0.5,
      ty: 0.4,
      vx: 0,
      vy: 0,
    };
    let depth = 1;

    interface Traveler {
      strand: number;
      t: number;
      speed: number;
      size: number;
      color: string;
      glow: string;
    }

    let travelers: Traveler[] = [];

    function spawnTraveler(): Traveler {
      const isBright = Math.random() > 0.4;
      return {
        strand: Math.floor(Math.random() * CONFIG.strandCount),
        t: Math.random(),
        speed: (Math.random() * 0.0035 + 0.002) * (Math.random() > 0.5 ? 1 : -1),
        size: Math.random() * 1.6 + 1.2,
        color: isBright ? 'rgba(255, 255, 255,' : 'rgba(255, 26, 64,',
        glow: isBright ? '#ffffff' : '#ff1a40',
      };
    }

    function buildGeometry() {
      strandAngles = [];
      for (let i = 0; i < CONFIG.strandCount; i++) {
        strandAngles.push((i / CONFIG.strandCount) * Math.PI * 2);
      }

      ringRadii = [];
      for (let i = 1; i <= CONFIG.ringCount; i++) {
        ringRadii.push(Math.pow(i / CONFIG.ringCount, 0.84) * maxR);
      }

      ringWobble = ringRadii.map(() =>
        strandAngles.map(() => ({
          amp: (Math.random() * 0.04 + 0.015) * maxR,
          phase: Math.random() * Math.PI * 2,
          freq: Math.random() * 0.6 + 0.4,
          tensionOffset: 0,
          tensionVelocity: 0,
        }))
      );

      travelers = Array.from({ length: CONFIG.travelerCount }, () => spawnTraveler());
    }

    function resize() {
      if (!canvas) return;
      isMobile = window.innerWidth < 768;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width = Math.floor(window.innerWidth * dpr);
      h = canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      cx = w * 0.5;
      cy = h * 0.42;
      maxR = Math.hypot(w, h) * 0.68;
      buildGeometry();
    }

    function getPoint(ringIdx: number, strandIdx: number, time: number) {
      const angle = strandAngles[strandIdx];
      const wob = ringWobble[ringIdx][strandIdx];

      // Organic breathing oscillation
      const breathing = Math.sin(time * CONFIG.driftSpeed * wob.freq * 60 + wob.phase) * wob.amp;
      let r = ringRadii[ringIdx] + breathing + wob.tensionOffset;

      const baseX = cx + Math.cos(angle) * r;
      const baseY = cy + Math.sin(angle) * r;

      // Interactive Silk Plucking / Cursor Tension
      const dx = baseX - pointer.x;
      const dy = baseY - pointer.y;
      const dist = Math.hypot(dx, dy);
      const influence = Math.max(0, 1 - dist / (CONFIG.pluckRadius * dpr));

      if (influence > 0) {
        const tensionPush = influence * influence * CONFIG.pluckForce * dpr;
        r += tensionPush;

        if (Math.hypot(pointer.vx, pointer.vy) > 8 && Math.random() < 0.03) {
          wob.tensionVelocity += (Math.random() - 0.5) * 14;
        }
      }

      // Spring physics
      wob.tensionOffset += wob.tensionVelocity;
      wob.tensionVelocity -= wob.tensionOffset * 0.12;
      wob.tensionVelocity *= 0.88;

      return {
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        dist,
        influence,
      };
    }

    function draw(time: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      const parallaxX = (pointer.tx - 0.5) * CONFIG.parallaxAmt * dpr * depth;
      const parallaxY = (pointer.ty - 0.5) * CONFIG.parallaxAmt * dpr * depth;

      ctx.save();
      ctx.translate(parallaxX, parallaxY);

      const alpha = CONFIG.baseAlpha * depth;

      if (alpha > 0.005) {
        // 1. Radial Anchor Strands (#ff1a40 silk filaments)
        for (let s = 0; s < CONFIG.strandCount; s++) {
          ctx.beginPath();
          for (let r = 0; r < CONFIG.ringCount; r++) {
            const pt = getPoint(r, s, time);
            if (r === 0) {
              ctx.moveTo(cx, cy);
            }
            ctx.lineTo(pt.x, pt.y);
          }

          const endX = cx + Math.cos(strandAngles[s]) * maxR;
          const endY = cy + Math.sin(strandAngles[s]) * maxR;
          const grad = ctx.createLinearGradient(cx, cy, endX, endY);
          grad.addColorStop(0, `rgba(255, 26, 64, ${alpha * 1.4})`);
          grad.addColorStop(0.65, `rgba(255, 26, 64, ${alpha * 0.75})`);
          grad.addColorStop(1, 'rgba(180, 0, 40, 0)');

          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.0 * dpr * 0.75;
          ctx.stroke();
        }

        // 2. Concentric Capture Silk Spirals
        for (let r = 0; r < CONFIG.ringCount; r++) {
          ctx.beginPath();
          for (let s = 0; s <= CONFIG.strandCount; s++) {
            const sIdx = s % CONFIG.strandCount;
            const pt = getPoint(r, sIdx, time);
            if (s === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }

          const ringRatio = r / CONFIG.ringCount;
          const ringFade = 1 - ringRatio * 0.5;

          const strokeGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
          strokeGrad.addColorStop(0, `rgba(255, 26, 64, ${alpha * ringFade * 0.95})`);
          strokeGrad.addColorStop(0.5, `rgba(255, 77, 109, ${alpha * ringFade * 0.8})`);
          strokeGrad.addColorStop(1, `rgba(204, 0, 43, ${alpha * ringFade * 0.6})`);

          ctx.strokeStyle = strokeGrad;
          ctx.lineWidth = 0.9 * dpr * 0.75;
          ctx.stroke();
        }

        // 3. Glowing Bio-Luminescent Junction Dew Drops (#ff1a40 Red Nodes)
        ctx.save();
        for (let s = 0; s < CONFIG.strandCount; s += 2) {
          for (let r = 1; r < CONFIG.ringCount; r += 2) {
            const pt = getPoint(r, s, time);
            const pulse = (Math.sin(time * 0.001 + s * 1.6 + r * 2.2) + 1) * 0.5;
            const nodeAlpha = alpha * (0.45 + pulse * 0.75);

            if (nodeAlpha < 0.02) continue;

            ctx.beginPath();
            ctx.fillStyle = `rgba(255, 26, 64, ${nodeAlpha})`;
            ctx.shadowColor = '#ff1a40';
            ctx.shadowBlur = 10 * dpr * (0.6 + pulse * 0.8);
            ctx.arc(pt.x, pt.y, (1.3 + pulse * 0.7) * dpr, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();

        // 4. Action Potential Pulses Traveling Along Silk Strands
        ctx.save();
        travelers.forEach((tr) => {
          tr.t += tr.speed;
          if (tr.t > 1) {
            tr.t = 0;
            tr.strand = Math.floor(Math.random() * CONFIG.strandCount);
          } else if (tr.t < 0) {
            tr.t = 1;
            tr.strand = Math.floor(Math.random() * CONFIG.strandCount);
          }

          const ringFloat = tr.t * (CONFIG.ringCount - 1);
          const r0 = Math.floor(ringFloat);
          const frac = ringFloat - r0;
          const p0 = getPoint(r0, tr.strand, time);
          const p1 = getPoint(Math.min(r0 + 1, CONFIG.ringCount - 1), tr.strand, time);

          const px = p0.x + (p1.x - p0.x) * frac;
          const py = p0.y + (p1.y - p0.y) * frac;
          const pulseAlpha = 0.95 * depth * (1 - Math.abs(tr.t - 0.5) * 0.5);

          ctx.beginPath();
          ctx.fillStyle = `${tr.color}${pulseAlpha})`;
          ctx.shadowColor = tr.glow;
          ctx.shadowBlur = 14 * dpr;
          ctx.arc(px, py, tr.size * dpr, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();

        // 5. Central Arachnid Core Glow / Vortex
        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 280 * dpr);
        coreGrad.addColorStop(0, `rgba(255, 26, 64, ${0.14 * depth})`);
        coreGrad.addColorStop(0.4, `rgba(255, 26, 64, ${0.06 * depth})`);
        coreGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 280 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    function loop(time: number) {
      pointer.vx = (pointer.tx * w - pointer.x) * 0.08;
      pointer.vy = (pointer.ty * h - pointer.y) * 0.08;
      pointer.x += pointer.vx;
      pointer.y += pointer.vy;

      draw(time || 0);
      animId = requestAnimationFrame(loop);
    }

    const onMouseMove = (e: MouseEvent) => {
      pointer.tx = e.clientX / window.innerWidth;
      pointer.ty = e.clientY / window.innerHeight;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        pointer.tx = e.touches[0].clientX / window.innerWidth;
        pointer.ty = e.touches[0].clientY / window.innerHeight;
      }
    };

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    resize();
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [primaryColor, glowColor, strandCount, ringCount, travelerCount]);

  return (
    <canvas
      ref={canvasRef}
      id="web-canvas"
      className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-80"
      style={{ willChange: 'transform' }}
    />
  );
}
