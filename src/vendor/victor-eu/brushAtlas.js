// Extracted makeBrushAtlas only. Original source and MIT attribution in provenance.json.
// The brush. Every mark in the world -- sky, wheat, cypress, the paintings
// themselves -- is drawn through one atlas of procedurally made brush prints:
// bristles that start loaded and run dry, a rounded body of paint, and a
// height field so the light can find the ridges. The GLSL below is shared.
import * as THREE from 'three';
import { rng, noise2, smoothstep, clamp } from './util.js';

export const BRUSH_ROWS = 8;
const L = 256, W = 64, PAD = 5;

export function makeBrushAtlas() {
  const data = new Uint8Array(L * W * BRUSH_ROWS * 4);
  const R = rng(9127);
  for (let b = 0; b < BRUSH_ROWS; b++) {
    const cov = new Float32Array(L * W), hgt = new Float32Array(L * W);
    const tone = new Float32Array(L * W), sec = new Float32Array(L * W);
    const nb = 22 + Math.floor(R() * 22);
    const dryStart = 0.42 + R() * 0.38;
    const inner = W - 2 * PAD;
    for (let j = 0; j < nb; j++) {
      const yc = ((j + 0.5) / nb) * 2 - 1 + (R() - 0.5) * 0.08;
      const thick = (1.1 + R() * 1.9) / inner * 2;
      const x0 = R() * 0.06 + Math.pow(Math.abs(yc), 2.2) * 0.10;
      const x1 = clamp(dryStart + R() * (1.02 - dryStart) * (1 - 0.35 * Math.abs(yc)), 0.3, 0.995);
      const tj = R(), sj = R() < 0.24 ? 1 : 0, load = 0.55 + R() * 0.45;
      const wob = R() * 6.28;
      for (let xi = 0; xi < L; xi++) {
        const x = (xi + 0.5) / L;
        if (x < x0 || x > x1) continue;
        const dry = smoothstep(dryStart - 0.12, x1 + 0.05, x);
        if (noise2(j * 17.3 + b * 91.7, x * 34) < dry * 0.85) continue;
        const yw = yc + Math.sin(x * 7 + wob) * 0.012;
        const ya = Math.floor(((yw - thick) + 1) / 2 * inner) + PAD;
        const yb = Math.ceil(((yw + thick) + 1) / 2 * inner) + PAD;
        for (let yi = Math.max(PAD, ya); yi <= Math.min(W - PAD - 1, yb); yi++) {
          const y = ((yi - PAD + 0.5) / inner) * 2 - 1;
          const d = Math.abs(y - yw) / thick;
          if (d > 1) continue;
          const k = 1 - d * d, i = yi * L + xi;
          if (k > cov[i]) { tone[i] = tj; sec[i] = sj; }
          cov[i] = Math.max(cov[i], k);
          hgt[i] = Math.max(hgt[i], k * load * (1 - 0.55 * dry));
        }
      }
    }
    // a light blur so edges are paint, not pixels
    const blur = src => {
      const out = new Float32Array(L * W);
      for (let y = 1; y < W - 1; y++)
        for (let x = 1; x < L - 1; x++) {
          const i = y * L + x;
          out[i] = (src[i] * 4 + src[i - 1] + src[i + 1] + src[i - L] + src[i + L]) / 8;
        }
      return out;
    };
    const cb = blur(blur(cov)), hb = blur(hgt);
    for (let yi = 0; yi < W; yi++)
      for (let xi = 0; xi < L; xi++) {
        const i = yi * L + xi;
        const x = (xi + 0.5) / L, y = ((yi - PAD + 0.5) / inner) * 2 - 1;
        const body = Math.sqrt(Math.max(0, 1 - y * y)) * (1 - 0.45 * smoothstep(0.25, 1, x));
        const h = clamp(0.5 * body * smoothstep(0.05, 0.5, cb[i]) + 0.6 * hb[i], 0, 1);
        const o = ((b * W + yi) * L + xi) * 4;
        data[o] = h * 255;
        data[o + 1] = clamp(cb[i] * 1.35, 0, 1) * 255;
        data[o + 2] = tone[i] * 255;
        data[o + 3] = sec[i] * 255;
      }
  }
  const tex = new THREE.DataTexture(data, L, W * BRUSH_ROWS, THREE.RGBAFormat);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

