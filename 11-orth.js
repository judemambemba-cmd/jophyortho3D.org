/* JophyOrtho 3D — 11b : construction des orthèses de membres (couverture peinte → coque épaisse, doublure, sangles). */
'use strict';
/* topologie soudée : identifiants de sommets fusionnés, voisinage des triangles par arête */
function orthTopo(mesh) {
  const nv = mesh.nv, nt = mesh.nt, q = 200, map = new Map(), wid = new Int32Array(nv), wp = [];
  for (let i = 0; i < nv; i++) { const k = Math.round(mesh.v[i * 3] * q) + '_' + Math.round(mesh.v[i * 3 + 1] * q) + '_' + Math.round(mesh.v[i * 3 + 2] * q); let id = map.get(k); if (id === undefined) { id = wp.length / 3; map.set(k, id); wp.push(mesh.v[i * 3], mesh.v[i * 3 + 1], mesh.v[i * 3 + 2]); } wid[i] = id; }
  const tw = new Int32Array(nt * 3); for (let i = 0; i < nt * 3; i++) tw[i] = wid[mesh.f[i]];
  const nb = new Int32Array(nt * 3).fill(-1), em = new Map();
  for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) { const a = tw[t * 3 + k], b = tw[t * 3 + (k + 1) % 3]; if (a === b) continue; const key = a < b ? a * 4294967296 + b : b * 4294967296 + a, o = em.get(key); if (o === undefined) em.set(key, t * 3 + k); else { nb[t * 3 + k] = (o / 3) | 0; nb[o] = t; } }
  return { nw: wp.length / 3, wp: Float32Array.from(wp), tw, nb, nt };
}
function orthSign(mesh) { let s = 0; const v = mesh.v, f = mesh.f; for (let i = 0; i < f.length; i += 3) { const a = f[i] * 3, b = f[i + 1] * 3, c = f[i + 2] * 3; s += v[a] * (v[b + 1] * v[c + 2] - v[b + 2] * v[c + 1]) - v[a + 1] * (v[b] * v[c + 2] - v[b + 2] * v[c]) + v[a + 2] * (v[b] * v[c + 1] - v[b + 1] * v[c]); } return s >= 0 ? 1 : -1; }
function orthNormals(mesh, T, sg) {
  const n = new Float32Array(T.nw * 3), wp = T.wp;
  for (let t = 0; t < T.nt; t++) { const a = T.tw[t * 3] * 3, b = T.tw[t * 3 + 1] * 3, c = T.tw[t * 3 + 2] * 3, ux = wp[b] - wp[a], uy = wp[b + 1] - wp[a + 1], uz = wp[b + 2] - wp[a + 2], vx = wp[c] - wp[a], vy = wp[c + 1] - wp[a + 1], vz = wp[c + 2] - wp[a + 2], nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; for (const q of [a, b, c]) { n[q] += nx; n[q + 1] += ny; n[q + 2] += nz; } }
  for (let i = 0; i < T.nw; i++) { const l = Math.hypot(n[i * 3], n[i * 3 + 1], n[i * 3 + 2]) || 1; n[i * 3] *= sg / l; n[i * 3 + 1] *= sg / l; n[i * 3 + 2] *= sg / l; }
  return n;
}
/* nettoyage de la zone peinte : filtre majoritaire + suppression des îlots */
function orthClean(mask, T, passes) {
  let m = Uint8Array.from(mask);
  for (let p = 0; p < passes; p++) { const o = new Uint8Array(m.length); for (let t = 0; t < T.nt; t++) { let c = 0, k = 0; for (let e = 0; e < 3; e++) { const q = T.nb[t * 3 + e]; if (q >= 0) { k++; c += m[q]; } } o[t] = m[t] ? (c >= 1 || k === 0 ? 1 : 0) : (c >= 2 ? 1 : 0); } m = o; }
  const seen = new Uint8Array(m.length), st = [];
  for (let t0 = 0; t0 < m.length; t0++) if (m[t0] && !seen[t0]) { const comp = [t0]; seen[t0] = 1; st.push(t0); while (st.length) { const t = st.pop(); for (let e = 0; e < 3; e++) { const q = T.nb[t * 3 + e]; if (q >= 0 && m[q] && !seen[q]) { seen[q] = 1; comp.push(q); st.push(q); } } } if (comp.length < 40) comp.forEach(t => m[t] = 0); }
  return orthDePinch(m, T);
}
/* supprime les points de pincement (sommets touchés par plusieurs contours) qui rendraient la coque non-manifold */
function orthDePinch(m, T) {
  for (let it = 0; it < 4; it++) {
    const deg = new Uint8Array(T.nw); let bad = 0;
    for (let t = 0; t < T.nt; t++) if (m[t]) for (let e = 0; e < 3; e++) { const q = T.nb[t * 3 + e]; if (q < 0 || !m[q]) { deg[T.tw[t * 3 + e]]++; deg[T.tw[t * 3 + (e + 1) % 3]]++; } }
    for (let t = 0; t < T.nt; t++) if (m[t]) { let rm = false; for (let k = 0; k < 3 && !rm; k++) if (deg[T.tw[t * 3 + k]] > 2) { for (let e = 0; e < 3; e++) { const q = T.nb[t * 3 + e]; if ((q < 0 || !m[q]) && (e === k || (e + 1) % 3 === k)) rm = true; } } if (rm) { m[t] = 0; bad++; } }
    if (!bad) break;
  }
  return m;
}
function orthErode(mask, T, k) { let m = Uint8Array.from(mask); for (let s = 0; s < k; s++) { const o = Uint8Array.from(m); for (let t = 0; t < T.nt; t++) if (m[t]) for (let e = 0; e < 3; e++) { const q = T.nb[t * 3 + e]; if (q < 0 || !m[q]) { o[t] = 0; break; } } m = o; } return m; }
/* patch épaissi : surface décalée de off0 à off1 le long des normales, bord relié par des parois */

// enveloppe « thermoformée » : fermeture morphologique (comble creux inter-doigts/orteils, détails du relief) + lissage ; champ 0..1 (0,5 = surface)
const ORTH_ENV = new WeakMap();
function orthEnvField_(mesh, R, h) {
  const ck = mesh.nt + '|' + R + '|' + h, c0 = ORTH_ENV.get(mesh); if (c0 && c0.ck === ck) return c0;
  const V = mesh.v, F = mesh.f, pad = Math.ceil(2.2 * R + 8); let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
  for (let i = 0; i < V.length; i += 3) { x0 = Math.min(x0, V[i]); x1 = Math.max(x1, V[i]); y0 = Math.min(y0, V[i + 1]); y1 = Math.max(y1, V[i + 1]); z0 = Math.min(z0, V[i + 2]); z1 = Math.max(z1, V[i + 2]); }
  x0 -= pad; y0 -= pad; z0 -= pad; x1 += pad; y1 += pad; z1 += pad;
  const gx = Math.ceil((x1 - x0) / h), gy = Math.ceil((y1 - y0) / h), gz = Math.ceil((z1 - z0) / h), N = gx * gy * gz, O = new Float32Array(N), cols = new Map();
  for (let t = 0; t < F.length; t += 3) { const a = F[t] * 3, b = F[t + 1] * 3, c = F[t + 2] * 3, ax = V[a], ay = V[a + 1], az = V[a + 2], bx = V[b], by = V[b + 1], bz = V[b + 2], cx = V[c], cy = V[c + 1], cz = V[c + 2];
    const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(den) < 1e-12) continue;
    const i0 = Math.max(0, Math.floor((Math.min(ax, bx, cx) - x0) / h)), i1 = Math.min(gx - 1, Math.ceil((Math.max(ax, bx, cx) - x0) / h)), j0 = Math.max(0, Math.floor((Math.min(ay, by, cy) - y0) / h)), j1 = Math.min(gy - 1, Math.ceil((Math.max(ay, by, cy) - y0) / h));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const px = x0 + (i + .5) * h, py = y0 + (j + .5) * h, w1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / den, w2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / den, w3 = 1 - w1 - w2; if (w1 < -1e-9 || w2 < -1e-9 || w3 < -1e-9) continue; const kk = i + gx * j; let L = cols.get(kk); if (!L) cols.set(kk, L = []); L.push(w1 * az + w2 * bz + w3 * cz); } }
  cols.forEach((L, kk) => { L.sort((p, q) => p - q); const i = kk % gx, j = (kk / gx) | 0; for (let q = 0; q + 1 < L.length; q += 2) { const k0 = Math.max(0, Math.round((L[q] - z0) / h - .5)), k1 = Math.min(gz - 1, Math.round((L[q + 1] - z0) / h - .5)); for (let k = k0; k <= k1; k++) O[i + gx * (j + gy * k)] = 1; } });
  const tmp = new Float32Array(N), dims = [gx, gy * gx > 0 ? gy : 0, gz], strides = [1, gx, gx * gy];
  const box = (A, r) => { for (let ax = 0; ax < 3; ax++) { const n = dims[ax], st = strides[ax], o1 = ax === 0 ? 1 : 0, o2 = ax === 2 ? 1 : 2, ia = ax === 0 ? 1 : 0; void o1; void o2; void ia;
      const A1 = ax === 0 ? 1 : 0, A2 = ax === 2 ? 1 : 2, n1 = dims[A1], n2 = dims[A2], s1 = strides[A1], s2 = strides[A2];
      for (let b = 0; b < n2; b++) for (let a = 0; a < n1; a++) { const base = a * s1 + b * s2; let acc = 0; const w = 2 * r + 1;
        for (let k = -r; k <= r; k++) acc += k >= 0 && k < n ? A[base + k * st] : 0;
        for (let k = 0; k < n; k++) { tmp[base + k * st] = acc / w; const kn = k + r + 1, kp = k - r; if (kn < n) acc += A[base + kn * st]; if (kp >= 0) acc -= A[base + kp * st]; } }
      for (let b = 0; b < n2; b++) for (let a = 0; a < n1; a++) { const base = a * s1 + b * s2; for (let k = 0; k < n; k++) A[base + k * st] = tmp[base + k * st]; } } };
  const rr = Math.max(1, Math.round(R / h / 3)), blur3 = (A, r) => { box(A, r); box(A, r); box(A, r); };
  const D = Float32Array.from(O); blur3(D, rr); for (let i = 0; i < N; i++) D[i] = D[i] > .15 ? 1 : 0;
  blur3(D, rr); for (let i = 0; i < N; i++) D[i] = (D[i] > .85 || O[i] > .5) ? 1 : 0;
  box(D, 2); box(D, 2); box(D, 2);
  const smp = (x, y, z) => { const fx = (x - x0) / h - .5, fy = (y - y0) / h - .5, fz = (z - z0) / h - .5, i = Math.floor(fx), j = Math.floor(fy), k = Math.floor(fz); if (i < 0 || j < 0 || k < 0 || i >= gx - 1 || j >= gy - 1 || k >= gz - 1) return 0; const u = fx - i, v = fy - j, w = fz - k, b = i + gx * (j + gy * k), sx = 1, sy = gx, sz = gx * gy;
    return (D[b] * (1 - u) + D[b + sx] * u) * (1 - v) * (1 - w) + (D[b + sy] * (1 - u) + D[b + sy + sx] * u) * v * (1 - w) + (D[b + sz] * (1 - u) + D[b + sz + sx] * u) * (1 - v) * w + (D[b + sy + sz] * (1 - u) + D[b + sy + sz + sx] * u) * v * w; };
  const res = { ck, smp, x0, y0, z0, gx, gy, gz, h, grad: (x, y, z) => { const e = h * .5, g = [(smp(x + e, y, z) - smp(x - e, y, z)) / (2 * e), (smp(x, y + e, z) - smp(x, y - e, z)) / (2 * e), (smp(x, y, z + e) - smp(x, y, z - e)) / (2 * e)]; return g; } };
  ORTH_ENV.set(mesh, res); return res;
}

// maillage d'enveloppe « thermoformée » (surface lisse fermée contenant le corps) + report de la zone couverte
function orthEnvMesh_(anat, R) {
  if (anat.__env !== undefined && anat.__envK === anat.nt + '|' + R) return anat.__env;
  let out = null;
  try { const EF = orthEnvField_(anat, R, 3), iso = globalThis.__iso || .3;
    const sn = surfaceNets_((x, y, z) => iso - EF.smp(x, y, z), EF.x0 + EF.h, EF.y0 + EF.h, EF.z0 + EF.h, EF.gx - 3, EF.gy - 3, EF.gz - 3, EF.h);
    { const Vv = sn.v, Ff = sn.f, n = Vv.length / 3, nb = Array.from({ length: n }, () => []); for (let t = 0; t < Ff.length; t += 3) { const a = Ff[t], b = Ff[t + 1], c = Ff[t + 2]; nb[a].push(b, c); nb[b].push(a, c); nb[c].push(a, b); }
      for (let it = 0; it < 80; it++) for (const lam of [.5, -.53]) { const Q = new Float32Array(Vv); for (let i = 0; i < n; i++) { const L = nb[i]; if (!L.length) continue; for (let k = 0; k < 3; k++) { let a = 0; for (let j = 0; j < L.length; j++) a += Vv[L[j] * 3 + k]; Q[i * 3 + k] = Vv[i * 3 + k] + lam * (a / L.length - Vv[i * 3 + k]); } } Vv.set(Q); } }
    const m = new Mesh(sn.v, sn.f); const an = analyzeMesh(weldIndexed(m));
    if (m.nt > 200 && an.closed && !an.inconsistent && an.signedVolume > 0) { m.isEnv = true; out = m; } } catch (e) { out = null; }
  anat.__env = out; anat.__envK = anat.nt + '|' + R; return out;
}
function orthMapMask_(anat, mask, env) {
  const cs = 6, A = anat.v, Fa = anat.f, grid = new Map(), key = (i, j, k) => i + ',' + j + ',' + k;
  for (let t = 0; t < anat.nt; t++) { const a = Fa[t * 3] * 3, b = Fa[t * 3 + 1] * 3, c = Fa[t * 3 + 2] * 3, x = (A[a] + A[b] + A[c]) / 3, y = (A[a + 1] + A[b + 1] + A[c + 1]) / 3, z = (A[a + 2] + A[b + 2] + A[c + 2]) / 3, kk = key(Math.floor(x / cs), Math.floor(y / cs), Math.floor(z / cs)); let L = grid.get(kk); if (!L) grid.set(kk, L = []); L.push(t, x, y, z); }
  const V = env.v, F = env.f, out = new Uint8Array(env.nt);
  for (let t = 0; t < env.nt; t++) { const a = F[t * 3] * 3, b = F[t * 3 + 1] * 3, c = F[t * 3 + 2] * 3, x = (V[a] + V[b] + V[c]) / 3, y = (V[a + 1] + V[b + 1] + V[c + 1]) / 3, z = (V[a + 2] + V[b + 2] + V[c + 2]) / 3, ci = Math.floor(x / cs), cj = Math.floor(y / cs), ck = Math.floor(z / cs);
    let best = -1, bd = 1e18; for (let r = 1; r <= 4 && best < 0; r++) { for (let i = ci - r; i <= ci + r; i++) for (let j = cj - r; j <= cj + r; j++) for (let k = ck - r; k <= ck + r; k++) { const L = grid.get(key(i, j, k)); if (!L) continue; for (let q = 0; q < L.length; q += 4) { const d = (L[q + 1] - x) ** 2 + (L[q + 2] - y) ** 2 + (L[q + 3] - z) ** 2; if (d < bd) { bd = d; best = L[q]; } } } }
    out[t] = best >= 0 ? mask[best] : 0; }
  return out;
}
function orthPatch(mesh, T, nrm, mask, off0, off1, rimIt, dw, taper, sfn) {
  const used = new Int32Array(T.nw).fill(-1); let nu = 0;
  for (let t = 0; t < T.nt; t++) if (mask[t]) for (let k = 0; k < 3; k++) { const w = T.tw[t * 3 + k]; if (used[w] < 0) used[w] = nu++; }
  if (!nu) return null;
  const P0 = new Float32Array(nu * 3), P1 = new Float32Array(nu * 3), wv = new Int32Array(nu);
  // finition du bord : amincissement progressif de l'épaisseur vers le contour (bord « roulé », sans arête vive)
  const tmin = taper == null ? 1 : taper, hop = new Uint8Array(nu).fill(255), TH = 5;
  if (tmin < 1) {
    for (let t = 0; t < T.nt; t++) if (mask[t]) for (let e = 0; e < 3; e++) { const q = T.nb[t * 3 + e]; if (q < 0 || !mask[q]) { hop[used[T.tw[t * 3 + e]]] = 0; hop[used[T.tw[t * 3 + (e + 1) % 3]]] = 0; } }
    for (let it = 0; it < TH; it++) for (let t = 0; t < T.nt; t++) if (mask[t]) { const a = used[T.tw[t * 3]], b = used[T.tw[t * 3 + 1]], c = used[T.tw[t * 3 + 2]], mn = Math.min(hop[a], hop[b], hop[c]); if (mn < 255) { if (hop[a] > mn + 1) hop[a] = mn + 1; if (hop[b] > mn + 1) hop[b] = mn + 1; if (hop[c] > mn + 1) hop[c] = mn + 1; } }
  }
  const tf = u => { if (tmin >= 1) return 1; const x = Math.min(1, hop[u] / TH), s = x * x * (3 - 2 * x); return tmin + (1 - tmin) * s; };
  for (let w = 0; w < T.nw; w++) if (used[w] >= 0) wv[used[w]] = w;
  // surface de référence lissée (Taubin) : supprime les replis du décalage dans les concavités (tendon d'Achille–talon, creux inter-orteils/doigts) ; les normales sont recalculées sur cette surface
  const Ps = new Float32Array(nu * 3), ns = new Float32Array(nu * 3);
  for (let u = 0; u < nu; u++) for (let k = 0; k < 3; k++) Ps[u * 3 + k] = T.wp[wv[u] * 3 + k];
  if (!globalThis.__noenv && !mesh.isEnv) { try { const EF = orthEnvField_(mesh, globalThis.__envR || 16, 3);
    for (let u = 0; u < nu; u++) { let x = Ps[u * 3], y = Ps[u * 3 + 1], z = Ps[u * 3 + 2]; for (let it = 0; it < 6; it++) { const f = EF.smp(x, y, z), g = EF.grad(x, y, z), gg = g[0] * g[0] + g[1] * g[1] + g[2] * g[2]; if (gg < 1e-6) break; let st = (f - (globalThis.__iso || .3)) / gg; const mx = 6 / Math.sqrt(gg) * 1; if (Math.abs(st) > mx * .05) st = Math.sign(st) * Math.min(Math.abs(st), 8 / Math.sqrt(gg)); x -= st * g[0]; y -= st * g[1]; z -= st * g[2]; }
      Ps[u * 3] = x; Ps[u * 3 + 1] = y; Ps[u * 3 + 2] = z; } } catch (e) { console.warn('env', e); } }
  { const nb0 = Array.from({ length: nu }, () => new Set()); for (let t = 0; t < T.nt; t++) if (mask[t]) { const a = used[T.tw[t * 3]], b = used[T.tw[t * 3 + 1]], c = used[T.tw[t * 3 + 2]]; nb0[a].add(b); nb0[a].add(c); nb0[b].add(a); nb0[b].add(c); nb0[c].add(a); nb0[c].add(b); }
    const nl0 = nb0.map(st => Int32Array.from(st));
    for (let it = 0; it < (globalThis.__rit || 130); it++) for (const lam of [.5, -.53]) { const Q = new Float32Array(Ps); for (let u = 0; u < nu; u++) { const L = nl0[u]; if (!L.length) continue; for (let k = 0; k < 3; k++) { let a = 0; for (let j = 0; j < L.length; j++) a += Ps[L[j] * 3 + k]; Q[u * 3 + k] = Ps[u * 3 + k] + lam * (a / L.length - Ps[u * 3 + k]); } } Ps.set(Q); }
    for (let t = 0; t < T.nt; t++) if (mask[t]) { const a = used[T.tw[t * 3]], b = used[T.tw[t * 3 + 1]], c = used[T.tw[t * 3 + 2]]; const ux = Ps[b * 3] - Ps[a * 3], uy = Ps[b * 3 + 1] - Ps[a * 3 + 1], uz = Ps[b * 3 + 2] - Ps[a * 3 + 2], vx = Ps[c * 3] - Ps[a * 3], vy = Ps[c * 3 + 1] - Ps[a * 3 + 1], vz = Ps[c * 3 + 2] - Ps[a * 3 + 2], cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx; for (const q of [a, b, c]) { ns[q * 3] += cx; ns[q * 3 + 1] += cy; ns[q * 3 + 2] += cz; } }
    for (let u = 0; u < nu; u++) { const w = wv[u], l = Math.hypot(ns[u * 3], ns[u * 3 + 1], ns[u * 3 + 2]) || 1; let x = ns[u * 3] / l, y = ns[u * 3 + 1] / l, z = ns[u * 3 + 2] / l; if (x * nrm[w * 3] + y * nrm[w * 3 + 1] + z * nrm[w * 3 + 2] < 0) { x = -x; y = -y; z = -z; } ns[u * 3] = x; ns[u * 3 + 1] = y; ns[u * 3 + 2] = z; } }
  for (let w = 0; w < T.nw; w++) if (used[w] >= 0) { const u = used[w], dd = dw ? Math.max(-(off0 + 2.5), dw[w]) : 0, o1 = off0 + (off1 - off0) * tf(u); for (let k = 0; k < 3; k++) { P0[u * 3 + k] = Ps[u * 3 + k] + ns[u * 3 + k] * (off0 + dd); P1[u * 3 + k] = Ps[u * 3 + k] + ns[u * 3 + k] * (o1 + dd); } }
  // bout de pied arrondi (AFO) : lissage de Laplace des sommets de l'avant-pied pour que la coque forme une enveloppe lisse autour des orteils
  if (sfn) {
    const nb = Array.from({ length: nu }, () => []), wgt = new Float32Array(nu); let any = false;
    for (let u = 0; u < nu; u++) { const w = wv[u]; wgt[u] = sfn(T.wp[w * 3], T.wp[w * 3 + 1], T.wp[w * 3 + 2]); if (wgt[u] > 0) any = true; }
    if (any) {
      for (let t = 0; t < T.nt; t++) if (mask[t]) { const a = used[T.tw[t * 3]], b = used[T.tw[t * 3 + 1]], c = used[T.tw[t * 3 + 2]]; nb[a].push(b, c); nb[b].push(a, c); nb[c].push(a, b); }
      for (let it = 0; it < 16; it++) for (const P of [P0, P1]) {
        const Q = new Float32Array(P); for (let u = 0; u < nu; u++) { const ns = nb[u]; if (!wgt[u] || !ns.length) continue; for (let k = 0; k < 3; k++) { let a = 0; for (let j = 0; j < ns.length; j++) a += P[ns[j] * 3 + k]; Q[u * 3 + k] = P[u * 3 + k] + .6 * wgt[u] * (a / ns.length - P[u * 3 + k]); } }
        P.set(Q);
      }
    }
  }
  // lissage final des deux faces (Taubin) : surfaces intérieure et extérieure lisses, continues et d'épaisseur régulière
  { const nbS = Array.from({ length: nu }, () => []); for (let t = 0; t < T.nt; t++) if (mask[t]) { const a = used[T.tw[t * 3]], b = used[T.tw[t * 3 + 1]], c = used[T.tw[t * 3 + 2]]; nbS[a].push(b, c); nbS[b].push(a, c); nbS[c].push(a, b); }
    for (let it = 0; it < (globalThis.__fit || 30); it++) for (const lam of [.5, -.53]) for (const P of [P0, P1]) { const Q = new Float32Array(P); for (let u = 0; u < nu; u++) { const L = nbS[u]; if (!L.length) continue; for (let k = 0; k < 3; k++) { let a = 0; for (let j = 0; j < L.length; j++) a += P[L[j] * 3 + k]; Q[u * 3 + k] = P[u * 3 + k] + lam * (a / L.length - P[u * 3 + k]); } } P.set(Q); } }
  // dégagement minimal : la face intérieure ne peut jamais pénétrer dans le membre (concavités, doigts/orteils, malléoles) ; l'extérieur suit du même déplacement
  if (off0 > 0 && !globalThis.__noenf) {
    const cs = Math.max(4, off0 * 1.6), key = (i, j, k) => (i + 512) * 1048576 + (j + 512) * 1024 + (k + 512), G = new Map(), WP = T.wp;
    for (let w = 0; w < T.nw; w++) { const kk = key(Math.floor(WP[w * 3] / cs), Math.floor(WP[w * 3 + 1] / cs), Math.floor(WP[w * 3 + 2] / cs)); (G.get(kk) || G.set(kk, []).get(kk)).push(w); }
    const cl = Math.max(.8, off0 * .8), enforce = () => {
      let moved = 0;
      for (let u = 0; u < nu; u++) {
        const w0 = wv[u]; let x = P0[u * 3], y = P0[u * 3 + 1], z = P0[u * 3 + 2]; const ci = Math.floor(x / cs), cj = Math.floor(y / cs), ck = Math.floor(z / cs); let best = 1e18, bq = -1;
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) { const L = G.get(key(ci + a, cj + b, ck + c)); if (L) for (let i = 0; i < L.length; i++) { const q = L[i], d2 = (WP[q * 3] - x) ** 2 + (WP[q * 3 + 1] - y) ** 2 + (WP[q * 3 + 2] - z) ** 2; if (d2 < best) { best = d2; bq = q; } } }
        if (bq < 0) continue; const d = Math.sqrt(best); if (d >= cl) continue;
        const qx = WP[bq * 3], qy = WP[bq * 3 + 1], qz = WP[bq * 3 + 2], nx = nrm[bq * 3], ny = nrm[bq * 3 + 1], nz = nrm[bq * 3 + 2], sg = (x - qx) * nx + (y - qy) * ny + (z - qz) * nz;
        let dx, dy, dz; if (sg < 0 || d < 1e-6) { dx = nx; dy = ny; dz = nz; } else { dx = (x - qx) / d; dy = (y - qy) / d; dz = (z - qz) / d; }
        const mv = sg < 0 || d < 1e-6 ? cl - sg : cl - d, ex = dx * mv, ey = dy * mv, ez = dz * mv, tx = x + ex, ty = y + ey, tz = z + ez;
        P0[u * 3] = tx; P0[u * 3 + 1] = ty; P0[u * 3 + 2] = tz; P1[u * 3] += ex; P1[u * 3 + 1] += ey; P1[u * 3 + 2] += ez; moved++;
      }
      return moved;
    };
    if (enforce()) {   // lissage local du déplacement puis contrôle final
      const nb = Array.from({ length: nu }, () => []); for (let t = 0; t < T.nt; t++) if (mask[t]) { const a = used[T.tw[t * 3]], b = used[T.tw[t * 3 + 1]], c = used[T.tw[t * 3 + 2]]; nb[a].push(b, c); nb[b].push(a, c); nb[c].push(a, b); }
      for (let it = 0; it < 3; it++) for (const P of [P0, P1]) { const Q = new Float32Array(P); for (let u = 0; u < nu; u++) { const ns = nb[u]; if (!ns.length) continue; for (let k = 0; k < 3; k++) { let a = 0; for (let j = 0; j < ns.length; j++) a += P[ns[j] * 3 + k]; Q[u * 3 + k] = P[u * 3 + k] + .25 * (a / ns.length - P[u * 3 + k]); } } P.set(Q); }
      enforce(); enforce();
    }
  }
  // contrôle par parité : aucun sommet de la face intérieure ne doit se trouver dans le volume du corps (anatomie = surface fermée continue) ; on repousse vers l'extérieur
  if (off0 > 0 && !globalThis.__nopar) { try {
    const V = mesh.v, F = mesh.f, h = 2.5; let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
    for (let i = 0; i < V.length; i += 3) { x0 = Math.min(x0, V[i]); x1 = Math.max(x1, V[i]); y0 = Math.min(y0, V[i + 1]); y1 = Math.max(y1, V[i + 1]); z0 = Math.min(z0, V[i + 2]); z1 = Math.max(z1, V[i + 2]); }
    x0 -= 40; y0 -= 40; z0 -= 40; x1 += 40; y1 += 40; z1 += 40; const gx = Math.ceil((x1 - x0) / h), gy = Math.ceil((y1 - y0) / h), gz = Math.ceil((z1 - z0) / h), occ = new Uint8Array(gx * gy * gz), cols = new Map();
    for (let t = 0; t < F.length; t += 3) { const a = F[t] * 3, b = F[t + 1] * 3, c = F[t + 2] * 3, ax = V[a], ay = V[a + 1], az = V[a + 2], bx = V[b], by = V[b + 1], bz = V[b + 2], cx = V[c], cy = V[c + 1], cz = V[c + 2];
      const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(den) < 1e-12) continue;
      const i0 = Math.max(0, Math.floor((Math.min(ax, bx, cx) - x0) / h)), i1 = Math.min(gx - 1, Math.ceil((Math.max(ax, bx, cx) - x0) / h)), j0 = Math.max(0, Math.floor((Math.min(ay, by, cy) - y0) / h)), j1 = Math.min(gy - 1, Math.ceil((Math.max(ay, by, cy) - y0) / h));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const px = x0 + (i + .5) * h, py = y0 + (j + .5) * h, w1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / den, w2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / den, w3 = 1 - w1 - w2; if (w1 < -1e-9 || w2 < -1e-9 || w3 < -1e-9) continue; const kk = i + gx * j; let L = cols.get(kk); if (!L) cols.set(kk, L = []); L.push(w1 * az + w2 * bz + w3 * cz); } }
    cols.forEach((L, kk) => { L.sort((p, q) => p - q); const i = kk % gx, j = (kk / gx) | 0; for (let q = 0; q + 1 < L.length; q += 2) { const k0 = Math.max(0, Math.round((L[q] - z0) / h - .5)), k1 = Math.min(gz - 1, Math.round((L[q + 1] - z0) / h - .5)); for (let k = k0; k <= k1; k++) occ[i + gx * (j + gy * k)] = 1; } });
    const inside = (x, y, z) => { const i = Math.floor((x - x0) / h), j = Math.floor((y - y0) / h), k = Math.floor((z - z0) / h); if (i < 0 || j < 0 || k < 0 || i >= gx || j >= gy || k >= gz) return false; return occ[i + gx * (j + gy * k)] === 1; };
    const nb = Array.from({ length: nu }, () => []); for (let t = 0; t < T.nt; t++) if (mask[t]) { const a = used[T.tw[t * 3]], b = used[T.tw[t * 3 + 1]], c = used[T.tw[t * 3 + 2]]; nb[a].push(b, c); nb[b].push(a, c); nb[c].push(a, b); }
    for (let round = 0; round < 24; round++) { const mv = []; for (let u = 0; u < nu; u++) if (inside(P0[u * 3], P0[u * 3 + 1], P0[u * 3 + 2])) mv.push(u); if (!mv.length) break;
      const hot = new Set(mv); mv.forEach(u => { for (const q of nb[u]) hot.add(q); });
      mv.forEach(u => { const x = P0[u * 3], y = P0[u * 3 + 1], z = P0[u * 3 + 2]; let dx = P1[u * 3] - P0[u * 3], dy = P1[u * 3 + 1] - P0[u * 3 + 1], dz = P1[u * 3 + 2] - P0[u * 3 + 2]; const l0 = Math.hypot(dx, dy, dz) || 1; dx /= l0; dy /= l0; dz /= l0; let bs = 1e9; const DIRS = [[dx, dy, dz], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [.7, .7, 0], [-.7, .7, 0], [.7, -.7, 0], [-.7, -.7, 0], [.7, 0, .7], [-.7, 0, .7], [.7, 0, -.7], [-.7, 0, -.7], [0, .7, .7], [0, -.7, .7], [0, .7, -.7], [0, -.7, -.7]]; let bd = DIRS[0]; for (let q = 0; q < DIRS.length; q++) { const d = DIRS[q]; let st = 1; for (; st <= 24; st++) if (!inside(x + d[0] * st * 1.5, y + d[1] * st * 1.5, z + d[2] * st * 1.5)) break; const sc = st - (q === 0 ? 1.5 : 0); if (sc < bs) { bs = sc; bd = d; } } const l = Math.hypot(bd[0], bd[1], bd[2]) || 1; dx = bd[0] / l * 1.8; dy = bd[1] / l * 1.8; dz = bd[2] / l * 1.8; P0[u * 3] += dx; P0[u * 3 + 1] += dy; P0[u * 3 + 2] += dz; P1[u * 3] += dx; P1[u * 3 + 1] += dy; P1[u * 3 + 2] += dz; });
      for (let it = 0; it < 2; it++) for (const P of [P0, P1]) { const Q = new Float32Array(P); hot.forEach(u => { const ns = nb[u]; if (!ns.length) return; for (let k = 0; k < 3; k++) { let a = 0; for (let j = 0; j < ns.length; j++) a += P[ns[j] * 3 + k]; Q[u * 3 + k] = P[u * 3 + k] + .3 * (a / ns.length - P[u * 3 + k]); } }); P.set(Q); } }
  } catch (e) { /* contrôle facultatif */ } }
  // arêtes de bord (orientées comme dans le triangle)
  const bnd = []; for (let t = 0; t < T.nt; t++) if (mask[t]) for (let e = 0; e < 3; e++) { const q = T.nb[t * 3 + e]; if (q < 0 || !mask[q]) bnd.push([used[T.tw[t * 3 + e]], used[T.tw[t * 3 + (e + 1) % 3]]]); }
  if (rimIt) { // lissage du contour (même déplacement sur les deux faces)
    const adj = new Map(); bnd.forEach(([a, b]) => { (adj.get(a) || adj.set(a, []).get(a)).push(b); (adj.get(b) || adj.set(b, []).get(b)).push(a); });
    for (let it = 0; it < rimIt; it++) { const d = new Map(); adj.forEach((ns, a) => { if (ns.length !== 2) return; const dv = [0, 0, 0]; for (let k = 0; k < 3; k++) dv[k] = ((P0[ns[0] * 3 + k] + P0[ns[1] * 3 + k]) / 2 - P0[a * 3 + k]) * .5; d.set(a, dv); }); d.forEach((dv, a) => { for (let k = 0; k < 3; k++) { P0[a * 3 + k] += dv[k]; P1[a * 3 + k] += dv[k]; } }); }
  }
  const nt = mask.reduce((s, x) => s + x, 0), v = new Float32Array(nu * 6); v.set(P1, 0); v.set(P0, nu * 3);   // [0,nu) = surface extérieure ; [nu,2nu) = surface intérieure
  const f = []; for (let t = 0; t < T.nt; t++) if (mask[t]) { const a = used[T.tw[t * 3]], b = used[T.tw[t * 3 + 1]], c = used[T.tw[t * 3 + 2]]; f.push(a, b, c, nu + a, nu + c, nu + b); }
  bnd.forEach(([a, b]) => { f.push(b, a, nu + a, b, nu + a, nu + b); });
  const shell = new Mesh(v, new Uint32Array(f)).touch();
  const outerF = [], innerF = []; for (let i = 0; i < f.length; i += 6 * 1) { /* séparation inutile : construite à part */ }
  const oF = [], iF = []; for (let t = 0; t < T.nt; t++) if (mask[t]) { const a = used[T.tw[t * 3]], b = used[T.tw[t * 3 + 1]], c = used[T.tw[t * 3 + 2]]; oF.push(a, b, c); iF.push(nu + a, nu + c, nu + b); }
  return { shell, outer: new Mesh(v, new Uint32Array(oF)).touch(), inner: new Mesh(v, new Uint32Array(iF)).touch(), nu, nt };
}
/* aération : retire des triangles selon un motif de trous (rangées décalées) dans la zone interne */
function orthVent(mask, T, mesh, sec, vent, y0, y1) {
  const inner = orthErode(mask, T, Math.max(1, Math.round(vent.margin / 3.5))), o = Uint8Array.from(mask), s = vent.s, rs = s * .866, r2 = vent.r * vent.r;
  for (let t = 0; t < T.nt; t++) if (inner[t]) {
    const a = T.tw[t * 3] * 3, b = T.tw[t * 3 + 1] * 3, c = T.tw[t * 3 + 2] * 3, x = (T.wp[a] + T.wp[b] + T.wp[c]) / 3, y = (T.wp[a + 1] + T.wp[b + 1] + T.wp[c + 1]) / 3, z = (T.wp[a + 2] + T.wp[b + 2] + T.wp[c + 2]) / 3;
    if (y < y0 || y > y1) continue; const row = Math.round((y - y0) / rs), yr = y0 + row * rs, cc = sec.cAt(y), Rr = Math.max(15, sec.perimeterAt(clamp(yr, sec.y0, sec.y1)) / (2 * Math.PI)), N = Math.max(4, Math.floor(2 * Math.PI * Rr / s)), step = 2 * Math.PI / N, th = Math.atan2(x - cc[0], z - cc[1]), off = (row & 1) * .5, col = Math.round(th / step - off), thc = (col + off) * step, d = Rr * angDiff(th, thc);
    if ((y - yr) * (y - yr) + d * d < r2) o[t] = 0;
  }
  return o;
}
/* ---------- charges / décharges : champ de déplacement local de la surface interne (mm le long de la normale) ---------- */
function orthLoadField(dev, lmList, anat, T, mk) {
  const loads = (dev.loads || []).filter(z => !z.off); if (!loads.length) return null;
  const dw = new Float32Array(T.nw), wp = T.wp, info = []; let eA = null, eB = null;
  const edges = () => { if (eA) return; const a = [], b = []; for (let t = 0; t < T.nt; t++) for (let e = 0; e < 3; e++) { const p = T.tw[t * 3 + e], q = T.tw[t * 3 + (e + 1) % 3]; if (p < q) { a.push(p); b.push(q); } } eA = Int32Array.from(a); eB = Int32Array.from(b); };
  const vin = new Uint8Array(T.nw); if (mk) for (let t = 0; t < T.nt; t++) if (mk[t]) for (let k = 0; k < 3; k++) vin[T.tw[t * 3 + k]] = 1;
  loads.forEach(z => {
    const mm = (z.kind === 'load' ? -1 : 1) * z.mm; let wv = null;
    if (z.src === 'lm') {
      const lm = lmList.find(l => l.id === z.lm); if (!lm) { info.push({ z, missing: true }); return; }
      const sc = z.scale || 1, R = z.r.map(x => x * sc); wv = new Float32Array(T.nw);
      for (let w = 0; w < T.nw; w++) { const dx = (wp[w * 3] - lm.pos[0]) / R[0], dy = (wp[w * 3 + 1] - lm.pos[1]) / R[1], dz = (wp[w * 3 + 2] - lm.pos[2]) / R[2], d2 = dx * dx + dy * dy + dz * dz; if (d2 < 1) wv[w] = .5 * (1 + Math.cos(Math.PI * Math.sqrt(d2))); }
    } else if (z.rle && z.nt === anat.nt) {
      const pm = rleDec(z.rle, z.nt), cnt = new Float32Array(T.nw), tot = new Float32Array(T.nw); wv = new Float32Array(T.nw); edges();
      for (let t = 0; t < T.nt; t++) for (let k = 0; k < 3; k++) { const w = T.tw[t * 3 + k]; tot[w]++; if (pm[t]) cnt[w]++; }
      for (let w = 0; w < T.nw; w++) wv[w] = tot[w] ? cnt[w] / tot[w] : 0;
      for (let it = 0; it < 4; it++) { const sm = Float32Array.from(wv), c = new Float32Array(T.nw).fill(1); for (let e = 0; e < eA.length; e++) { sm[eA[e]] += wv[eB[e]]; sm[eB[e]] += wv[eA[e]]; c[eA[e]]++; c[eB[e]]++; } for (let w = 0; w < T.nw; w++) wv[w] = sm[w] / c[w]; }
    }
    if (!wv) return; let cov = 0; for (let w = 0; w < T.nw; w++) { dw[w] += mm * wv[w]; if (wv[w] > .3 && vin[w]) cov++; } info.push({ z, cov });
  });
  for (let w = 0; w < T.nw; w++) dw[w] = clamp(dw[w], -10, 14);
  dw.info = info; return dw;
}
/* ---------- articulations mécaniques (charnières) : disque d'axe + montants ---------- */
const ORTH_JOINTS = {
  oinf: { cheville: { label: 'cheville', lat: 'malleole_lat', med: 'malleole_med', up: 110, dn: 45, a: 'Butée de flexion dorsale (°)', b: 'Butée de flexion plantaire (°)' }, genou: { label: 'genou', lat: 'condyle_lat', med: 'condyle_med', up: 120, dn: 120, a: 'Butée de flexion (°)', b: 'Butée d\'extension (°)' } },
  osup: { coude: { label: 'coude', lat: 'epicondyle_lat', med: 'epicondyle_med', up: 100, dn: 100, a: 'Butée de flexion (°)', b: 'Butée d\'extension (°)' }, poignet: { label: 'poignet', lat: 'styloide_rad', med: 'styloide_ulna', up: 70, dn: 35, a: 'Butée d\'extension (°)', b: 'Butée de flexion (°)' } }
};
function cylMesh(c, ax, r, h, A) {
  A = A || 24; const u = [0, 1, 0], vv = V.norm(V.cross(ax, u)), rings = [];
  [-h / 2, h / 2].forEach(t => { const ring = []; for (let j = 0; j < A; j++) { const a = j / A * Math.PI * 2; ring.push(V.add(V.add(c, V.mul(ax, t)), V.add(V.mul(u, Math.cos(a) * r), V.mul(vv, Math.sin(a) * r)))); } rings.push(ring); });
  let mm = Prim.fromRings(rings, { capStart: true, capEnd: true }); if (mm.volume() < 0) mm = Prim.fromRings(rings, { capStart: true, capEnd: true, flip: true }); return mm;
}
function orthHinges(P, out, sec, dev) {
  const h = dev.hinge, fam = P.family, J = h && h.on && ORTH_JOINTS[fam][h.joint]; if (!J) return [];
  const res = [], base = (dev.pad || 0) + (dev.gap || 0) + (dev.thick || 3), side = h.side || 'both';
  [['lat', 'latérale'], ['med', 'médiale']].forEach(([k, nm]) => {
    if (side !== 'both' && side !== k) return; const lm = out.landmarkList.find(l => l.id === J[k]); if (!lm) { out.warnings.push('Articulation ' + nm + ' : repère « ' + J[k] + ' » absent (placez-le ou utilisez les mesures).'); return; }
    const y0 = clamp(lm.pos[1], sec.y0, sec.y1), cc = sec.cAt(y0), dir = V.norm([lm.pos[0] - cc[0], 0, lm.pos[2] - cc[1]]), th = ((Math.atan2(dir[0], dir[2]) * 180 / Math.PI) + 360) % 360;
    const rr = (h.bar || 6) / 2, off = base + rr + 1.2, ptsAt = (yy, dd) => { const pts = []; for (let q = 0; q <= 10; q++) { const y = clamp(y0 + dd * q / 10, sec.y0 + 2, sec.y1 - 2), c2 = sec.cAt(y), p = lmAt(sec, y, th, 1), o = V.norm([p[0] - c2[0], 0, p[2] - c2[1]]); pts.push([p[0] + o[0] * off, y, p[2] + o[2] * off]); } return pts; };
    const cen = [lm.pos[0] + dir[0] * (base + 3.2), y0, lm.pos[2] + dir[2] * (base + 3.2)];
    const parts = [cylMesh(cen, dir, (h.d || 18) / 2, 4), sweepTube(ptsAt(y0, J.up * (h.up || J.up) / J.up), Array(11).fill(rr), 10), sweepTube(ptsAt(y0, -(h.dn || J.dn)), Array(11).fill(rr), 10)];
    res.push({ id: 'hinge_' + k, name: 'Articulation ' + nm + ' (' + J.label + ')', mesh: Mesh.merge(parts), color: [.72, .74, .8], schematic: false });
  });
  return res;
}
/* Étendue de la semelle : par défaut, les orthèses cheville-pied (AFO) et la botte couvrent le pied jusqu'à l'extrémité des orteils (bout arrondi) */
function orthFootExt(dev) { return dev.footExt || (['afo_post', 'afo_coque', 'afo_art', 'botte'].includes(dev.type) ? 'toes' : 'mt'); }
/* ---------- zones prédéfinies selon le type d'orthèse ---------- */
function orthPreset(P, anat, sec) {
  const fam = P.family, dev = P.dev[fam], m = P.measures[fam], mask = new Uint8Array(anat.nt), v = anat.v, f = anat.f;
  const Y = ORTH_Y[fam === 'osup' ? 'sup' : fam === 'ocep' ? 'ocep' : 'inf'](m), type = dev.type, sg = orthSign(anat);
  for (let t = 0; t < anat.nt; t++) {
    const a = f[t * 3] * 3, b = f[t * 3 + 1] * 3, c = f[t * 3 + 2] * 3, x = (v[a] + v[b] + v[c]) / 3, y = (v[a + 1] + v[b + 1] + v[c + 1]) / 3, z = (v[a + 2] + v[b + 2] + v[c + 2]) / 3;
    const ux = v[b] - v[a], uy = v[b + 1] - v[a + 1], uz = v[b + 2] - v[a + 2], wx = v[c] - v[a], wy = v[c + 1] - v[a + 1], wz = v[c + 2] - v[a + 2]; let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx; const nl = Math.hypot(nx, ny, nz) || 1; nx *= sg / nl; ny *= sg / nl; nz *= sg / nl;
    const cc = sec.cAt(clamp(y, sec.y0, sec.y1)); let th = Math.atan2(x - cc[0], z - cc[1]) * 180 / Math.PI; if (th < 0) th += 360; const ant = th < 100 || th > 260 ? 1 : 0;
    const inTh = (a0, a1) => th >= a0 && th <= a1;
    let on = false;
    const hT = dev.hTop || 0, hL = dev.hLo || 0, wr = dev.wrap || 0, inW = (a0, a1) => th >= a0 - wr && th <= a1 + wr;   // hT/hL : prolongement du bord supérieur / inférieur (mm) ; wr : enveloppement latéral (°)
    if (fam === 'ocep') on = headPreset(m, dev, th, y, x, z, ny, Y);
    else if (fam === 'osup') {
      const ext = anat.tubeNt != null ? (t >= anat.tubeNt && y < (anat.unionY || 1e9)) : y < Y.yM + 4;
      const yn = y;
      if (type === 'attelle_poignet') on = !ext && yn >= Y.yM + 4 - hL && yn <= Y.yW + m.lenFore * .55 + hT && (th <= 100 + wr || th >= 260 - wr);
      else if (type === 'repos_main') on = ext ? (y < 62 || (nz > .1 - clamp((y - 112) / 13, 0, 1) * .6 - clamp((92 - y) / 30, 0, 1) * 1.3 && (x < m.palmW * .5 + 2 + wr * .4 + Math.max(0, y - 90) * 6 || y < 92)) || (y > 80 && (th <= 70 || th >= 290))) : (yn <= Y.yE - 60 + hT && (th <= 120 + wr || th >= 240 - wr));
      else if (type === 'avant_bras') on = !ext && yn >= Y.yW + 22 - hL && yn <= Y.yE - 28 + hT && !(th > 255 + wr * .5 && th < 285 - wr * .5);
      else if (type === 'coude') on = !ext && yn >= Y.yE - 150 - hL && yn <= Y.yE + 120 + hT && inW(100, 260);
    } else {
      const lowLeg = anat.tubeNt != null ? sec.y0 : Y.yA - 6;   // le fût de la jambe est couvert jusqu'à sa base (pas de trou sous la malléole)
      const foot = anat.tubeNt != null ? t >= anat.tubeNt : y < Y.yA - 6, legOK = !foot && y >= lowLeg && ny > -.6, F = m.footLen, zH = -.19 * F, fx = orthFootExt(dev), zE = zH + ({ heel: .34, mid: .58, mt: .8, toes: 1.25 }[fx]) * F, wall = dev.wall == null ? 22 : dev.wall, plantar = foot && ny < -.25 && z < zE;
      const rimY = fx === 'toes' && z > zH + .62 * F ? Math.min(wall, 16) : wall, side = foot && y < rimY && z < (fx === 'toes' ? zE : Math.min(zE, zH + .62 * F)), heelBack = foot && nz < -.35 && z < zH + .3 * F;
      // arrière-pied et région malléolaire (pied au-dessus du rebord, jusqu'à la cheville) : doit être couvert avec la jambe pour les orthèses cheville-pied
      const hind = foot && y >= wall - 2 && y < Y.yA + 60 && z < zH + .55 * F;
      const yK = Y.yK + 0;
      if (type === 'afo_post') on = foot ? (plantar || side || heelBack || (hind && inW(85, 275))) : (legOK && y <= yK - 55 + hT && inW(85, 275));
      else if (type === 'afo_coque' || type === 'afo_art') on = foot ? (plantar || side || heelBack || (hind && inW(40, 320))) : (legOK && y <= yK - 55 + hT && inW(40, 320));
      else if (type === 'genou' || type === 'genou_art') on = legOK && y >= yK - 100 - hL && y <= yK + 110 + hT && inW(70, 290);
      else if (type === 'jambiere') on = legOK && y >= Y.yA + 15 - hL && y <= yK - 35 + hT && !(th < Math.max(0, 8 - wr * .3) || th > 360 - Math.max(0, 8 - wr * .3));
      else if (type === 'ucbl') on = foot && (plantar || (y < lerp(Math.max(wall, 40), 14, clamp((z - zH) / (.5 * F), 0, 1)) && z < zH + .56 * F));
      else if (type === 'plantaire') on = foot && (plantar || (y < Math.min(wall, 14) && z < zH + .4 * F));
      else if (type === 'stirrup') on = (foot ? (y >= 22 && z < zH + .5 * F && ny > -.5) : (legOK && y <= Y.yA + 120 + hT && y >= sec.y0 + 0 - hL)) && (inW(50, 130) || inW(230, 310));
      else if (type === 'botte') on = foot ? (!(ny > .5 && z > zH + .3 * F) && z < zE && !(y > wall + 50 && th > 340 - wr * .5)) : (legOK && y <= yK - 55 + hT && !(th < Math.max(0, 10 - wr * .3) || th > 360 - Math.max(0, 10 - wr * .3)));
    }
    mask[t] = on ? 1 : 0;
  }
  return mask;
}
/* ---------- sangles ---------- */
function orthStraps(P, sec, dev, off, rng) {
  const out = []; if (!dev.strapOn || !dev.straps || !dev.straps.length) return out; const A = sec.A;
  dev.straps.forEach((s, i) => {
    const lo = rng ? rng[0] : sec.y0, hi = rng ? rng[1] : sec.y1, yc = lo + clamp(s.pos, 0, 1) * (hi - lo), w = Math.max(8, s.w), t = dev.strapT || 2, rings = [];
    const ringAt = (y, o) => { const r = []; for (let j = 0; j < A; j++) { const p = sec.pointAt(clamp(y, sec.y0, sec.y1), j), c = sec.cAt(clamp(y, sec.y0, sec.y1)), dx = p[0] - c[0], dz = p[2] - c[1], l = Math.hypot(dx, dz) || 1; r.push([p[0] + dx / l * o, p[1], p[2] + dz / l * o]); } return r; };
    rings.push(ringAt(yc - w / 2, off), ringAt(yc - w / 2, off + t), ringAt(yc + w / 2, off + t), ringAt(yc + w / 2, off), ringAt(yc - w / 2, off));
    out.push({ id: 'strap' + i, name: 'Sangle ' + (i + 1), mesh: Prim.fromRings(rings, { flip: true }), color: [.25, .27, .32], schematic: false });
  });
  return out;
}
/* ---------- construction complète ---------- */
function buildOrthN(P, ctx) {
  const fam = P.family, eng = ENGINES[fam], dev = P.dev[fam], m = P.measures[fam], out = { warnings: [], family: fam, comps: [], lines: {}, trim: {} };
  let anat, sec, akey;
  if (ctx.scan && ctx.scan.original && P.acq.mode !== 'measures') {
    const sc = prepareScan(P, ctx); if (!sc || sc.error || !sc.cleaned) { out.error = sc && sc.error; return out; }
    if (!sc.sec || sc.secKey !== sc.key + P.acq.smooth) { sc.sec = P.acq.smooth ? smoothSec(extractSections(sc.cleaned, { step: 3 }), P.acq.smooth) : extractSections(sc.cleaned, { step: 3 }); sc.secKey = sc.key + P.acq.smooth; }
    sec = sc.sec; anat = sc.cleaned; out.prov = 'scan'; out.cleaned = sc.cleaned; out.scanStats = sc.stats; akey = 'scan' + sc.key; out.original = anat;
    if (sc.stats && !sc.stats.closed) out.warnings.push(`Scan : maillage ouvert (${sc.stats.open} arêtes libres) : la coque suit tout de même la surface peinte.`);
  } else {
    const key = JSON.stringify(m) + fam; if (!ctx.orthA || ctx.orthKey !== key) { ctx.orthA = orthAnatomy(m, fam); ctx.orthKey = key; ctx.orthShell = null; }
    sec = ctx.orthA.sec; anat = ctx.orthA.mesh; out.prov = 'measures'; akey = key; out.original = anat; out.anatomy = anat;
  }
  CURRENT_SEC = sec; out.sec = sec; out.m = m; out.anatomy = anat;
  // landmarks
  const lms = []; const yfn = fam === 'osup' ? ORTH_Y.sup : ORTH_Y.inf;
  eng.landmarkDefs.forEach(d => { const st = P.landmarks[d.id]; if (st && st.pos) lms.push({ id: d.id, label: d.label, pos: st.pos, source: st.source || 'manuel' }); else if (out.prov === 'measures' && d.foot) { const fp = ctx.orthA && ctx.orthA.footLM && ctx.orthA.footLM[d.id]; if (fp) lms.push({ id: d.id, label: d.label, pos: fp, source: 'reconstruction' }); } else if (out.prov === 'measures') { const y = clamp(d.y(m), sec.y0, sec.y1); lms.push({ id: d.id, label: d.label, pos: lmAt(sec, y, d.th, d.rf), source: 'reconstruction' }); } });
  out.landmarkList = lms;
  // couverture
  let mask = null; if (dev.cover && dev.cover.nt === anat.nt && dev.cover.rle) mask = rleDec(dev.cover.rle, anat.nt);
  out.coverCount = mask ? mask.reduce((s, x) => s + x, 0) : 0;
  const ck = JSON.stringify([akey, dev.cover && dev.cover.rle, dev.gap, dev.thick, dev.pad, dev.vent, dev.rim, dev.clean, dev.taper, dev.loads, P.landmarks]);
  let res = ctx.orthShell && ctx.orthShell.key === ck ? ctx.orthShell : null;
  if (!res) {
    res = { key: ck, shell: null };
    if (mask && out.coverCount) {
      let base = anat, mk0 = mask; if (!globalThis.__noenv) { const eb = orthEnvMesh_(anat, globalThis.__envR || 16); if (eb) { base = eb; mk0 = orthMapMask_(anat, mask, eb); } } res.base = base;
      const T = orthTopo(base), nrm = orthNormals(base, T, orthSign(base)); let mk = orthClean(mk0, T, dev.clean == null ? 3 : dev.clean);
      if (dev.vent && dev.vent.on) mk = orthDePinch(orthVent(mk, T, base, sec, dev.vent, sec.y0, sec.y1), T);
      const pad = dev.pad || 0, g = dev.gap || 0, th = dev.thick || 3, rim = dev.rim == null ? 6 : dev.rim;
      const dw = orthLoadField(dev, lms, base, T, mk); res.dwInfo = dw ? dw.info : null; const sfn = fam === 'oinf' && orthFootExt(dev) === 'toes' ? ((F, zH) => (x, y, z) => clamp((z - (zH + .6 * F)) / (.2 * F), 0, 1))(m.footLen, -.19 * m.footLen) : null; const sh = orthPatch(base, T, nrm, mk, pad + g, pad + g + th, rim, dw, dev.taper == null ? .55 : dev.taper, sfn); if (sh) { res.shell = sh.shell; res.outer = sh.outer; res.inner = sh.inner; }
      if (pad > 0) { const ln = orthPatch(base, T, nrm, mk, .2, pad + .2, rim, dw, dev.taper == null ? .55 : dev.taper, sfn); if (ln) res.liner = ln.shell; }
      res.mask = mk; res.closed = res.shell ? analyzeMesh(weldIndexed(res.shell)) : null;
    }
    ctx.orthShell = res;
  }
  out.shell = res.shell; out.liner = res.liner || null; out.innerSurface = res.inner || null; out.outerSurface = res.outer || null; out.rect = null; out.outerEnvelope = null;
  out.shellClosed = res.closed || { closed: true, open: 0, nonManifold: 0 };
  let rng = null; if (res.mask) { let lo = Infinity, hi = -Infinity; const bs = res.base || anat; for (let t = 0; t < bs.nt; t++) if (res.mask[t]) { const y = (bs.v[bs.f[t * 3] * 3 + 1] + bs.v[bs.f[t * 3 + 1] * 3 + 1] + bs.v[bs.f[t * 3 + 2] * 3 + 1]) / 3; if (y >= sec.y0) { if (y < lo) lo = y; if (y > hi) hi = y; } } if (hi > lo) rng = [lo + 5, hi - 5]; }
  out.comps = orthStraps(P, sec, dev, (dev.pad || 0) + (dev.gap || 0) + (dev.thick || 3) + .4, rng);
  out.comps.push(...orthHinges(P, out, sec, dev));
  if (res.dwInfo) res.dwInfo.forEach(i => { if (i.missing) out.warnings.push('Zone « ' + i.z.label + ' » : repère absent, sans effet.'); else if (i.cov < 3) out.warnings.push('Zone « ' + i.z.label + ' » hors de la coque (non couverte) : sans effet.'); });
  out.warnings.push(...eng.warnings(m));
  if (!out.coverCount) out.warnings.push('Aucune zone couverte : choisissez un type d\'orthèse ou peignez la zone à couvrir.');
  else if (res.shell && !out.shellClosed.closed) out.warnings.push(`Coque : ${out.shellClosed.open} arêtes libres, ${out.shellClosed.nonManifold} non-manifold (zone peinte irrégulière) : lissez ou retouchez la zone.`);
  out.stats = { volShell: res.shell ? Math.round(res.shell.volume() / 1000) : 0, tris: anat.nt + (res.shell ? res.shell.nt : 0), h: Math.round(sec.y1 - sec.y0), volAnat: Math.round(anat.volume() / 1000), volRect: 0, volOuter: 0, volLiner: res.liner ? Math.round(res.liner.volume() / 1000) : 0 };
  return out;
}
function orthDev(fam, type) {
  return { type, zones: [], openings: [], cover: null, presetApplied: '', gap: 1.5, thick: 3, pad: 3, rim: 6, clean: 3, taper: .55, hTop: 0, hLo: 0, wrap: 0, material: 'PETG / polypropylène', vent: { on: false, r: 5, s: 16, margin: 10 }, strapOn: false, strapT: 2, straps: fam === 'osup' ? [{ pos: .3, w: 25 }, { pos: .85, w: 25 }] : [{ pos: .3, w: 28 }, { pos: .8, w: 28 }], align: { flex: 0 }, loads: [], hinge: { on: false, joint: fam === 'osup' ? 'coude' : fam === 'ocep' ? 'cervicale' : 'cheville', side: 'both', d: 18, bar: 6, up: fam === 'osup' ? 100 : 110, dn: fam === 'osup' ? 100 : 45, stopA: 10, stopB: 20 }, wall: 22 };
}

/* ---------- flexion : le modèle est calculé DROIT (mesures exactes) puis chaque section est déplacée sans déformation ---------- */
const FLEXK = { osup: ['elbowFlex', 'wristFlex'], oinf: ['kneeFlex'] };
function orthBendCtx(P, ctx) {
  const fam = P.family, m = P.measures[fam], bm = FLEXK[fam].length ? bendMap(fam === 'osup' ? 'sup' : 'inf', m) : null;
  const mN = Object.assign({}, m); FLEXK[fam].forEach(k => { mN[k] = 0; });
  if (!ctx.bendC || ctx.bendC.key !== (bm ? bm.key : '')) ctx.bendC = { key: bm ? bm.key : '', wm: new WeakMap() };
  return { bm, mN, wm: ctx.bendC.wm };
}
function bendMeshWith(bm, wm, mesh) {
  if (!mesh || !bm) return mesh; if (wm.has(mesh)) return wm.get(mesh);
  const o = mesh.clone(), v = o.v; for (let i = 0; i < v.length; i += 3) { const q = bm.fwd(v[i], v[i + 1], v[i + 2]); v[i] = q[0]; v[i + 1] = q[1]; v[i + 2] = q[2]; }
  o.touch(); o.tubeNt = mesh.tubeNt; o.unionY = mesh.unionY; wm.set(mesh, o); return o;
}
function buildOrth(P, ctx) {
  const fam = P.family; if (ctx.scan && ctx.scan.original && P.acq.mode !== 'measures') return buildOrthN(P, ctx);
  const B = orthBendCtx(P, ctx), bm = B.bm;
  const flexed = !!bm, inv = p => { const q = bm.inv(p[0], p[1], p[2]); return q; };
  const P2 = Object.assign({}, P, { measures: Object.assign({}, P.measures, { [fam]: B.mN }) });
  if (flexed) {
    P2.landmarks = {}; for (const k in P.landmarks) { const st = P.landmarks[k]; P2.landmarks[k] = st && st.pos ? Object.assign({}, st, { pos: inv(st.pos) }) : st; }
    const d = P.dev[fam]; P2.dev = Object.assign({}, P.dev, { [fam]: Object.assign({}, d, { zones: (d.zones || []).map(z => z && z.pos ? Object.assign({}, z, { pos: inv(z.pos) }) : z) }) });
  }
  const out = buildOrthN(P2, ctx); out.m = P.measures[fam];
  if (fam === 'ocep' && P.faceTex && P.faceTex.img && out.original) { if (faceTexReady(P.faceTex)) out.anatColors = faceColors(out.original, P.measures.ocep, P.faceTex); else faceTexLoad(P.faceTex, () => { if (typeof scheduleBuild === 'function') scheduleBuild(); }); }
  out.nomAnat = out.original; out.nomSec = out.sec; if (!flexed) return out;
  const bw = m => bendMeshWith(bm, B.wm, m);
  out.original = bw(out.original); out.anatomy = bw(out.anatomy); out.shell = bw(out.shell); out.liner = bw(out.liner);
  out.comps = (out.comps || []).map(c => c && c.mesh ? Object.assign({}, c, { mesh: bw(c.mesh) }) : c);
  out.landmarkList = (out.landmarkList || []).map(l => Object.assign({}, l, { pos: bm.fwd(l.pos[0], l.pos[1], l.pos[2]) }));
  return out;
}

/* tête et cou : pas de charnière mécanique par défaut, pas de flexion */
ORTH_JOINTS.ocep = { cervicale: { label: 'jonction cervicale', lat: 'tragus_d', med: 'tragus_g', up: 60, dn: 60, a: 'Butée de flexion (°)', b: 'Butée d\'extension (°)' } };
FLEXK.ocep = [];
