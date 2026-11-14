/* JophyOrtho 3D — 10b : montage trans-fémoral CICR (gobelet nervuré, gobelet conique, disque convexe, genou, tube, cylindre concave, disque de cheville, pied SACH, valve, ceinture)
   Principes du « Guide de fabrication — La prothèse trans-fémorale » (CICR, 2006) : fil à plomb par le grand trochanter et par le centre du gobelet, genou 10 mm en arrière du plomb,
   gobelet horizontal et ouverture vers l'avant, cylindre concave vertical, pied en rotation externe de 5°, talon 0–20 mm (10 mm optimal), tube d'acier introduit de 90 à 100 mm,
   épaisseur minimale des systèmes d'alignement A = 22 mm, face haute du genou → axe B = 40 mm, mesure genou-sol = axe du genou prothétique ↔ plateau tibial médial sain. */
const TF_ASM_DEFAULT = { on: true, heel: 10, footLen: 260, footRot: 5, tubeIns: 95, plumb: 10, valve: false, belt: true, auto: true };
const TF_COL = { pp: [.9, .72, .55], knee: [.22, .24, .28], steel: [.66, .68, .72], foot: [.52, .35, .27], dark: [.1, .1, .12], strap: [.35, .25, .15] };
/* solide fermé à partir d'anneaux (orientation vérifiée par le signe du volume) */
function solidRings_(rings, caps) {
  const sv = q => { let s = 0; const v = q.v, f = q.f; for (let t = 0; t < f.length; t += 3) { const a = f[t] * 3, b = f[t + 1] * 3, c = f[t + 2] * 3; s += v[a] * (v[b + 1] * v[c + 2] - v[b + 2] * v[c + 1]) - v[a + 1] * (v[b] * v[c + 2] - v[b + 2] * v[c]) + v[a + 2] * (v[b] * v[c + 1] - v[b + 1] * v[c]); } return s; };
  let m = Prim.fromRings(rings, { flip: true, capStart: caps !== false, capEnd: caps !== false });
  if (sv(m) < 0) m = Prim.fromRings(rings, { flip: false, capStart: caps !== false, capEnd: caps !== false });
  return m;
}
function boxMesh_(cx, cy, cz, sx, sy, sz) {
  const r = [], hx = sx / 2, hy = sy / 2, hz = sz / 2;
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(() => { }); // (anneaux construits ci-dessous)
  const ring = y => [[-hx, y, -hz], [hx, y, -hz], [hx, y, hz], [-hx, y, hz]].map(p => [cx + p[0], p[1], cz + p[2]]);
  return solidRings_([ring(cy - hy), ring(cy + hy)]);
}
/* pied SACH schématique : lofté le long de Z (talon → orteils), repère local : origine = centre de la cheville (dessus), Y haut, Z avant */
function sachFoot_(FL, H0) {
  const rings = [], n = 28, ne = 3.2, nz = 22, zH = -.2 * FL, zT = .8 * FL;
  for (let i = 0; i <= nz; i++) {
    const t = i / nz, z = zH + (zT - zH) * t, u = clamp((z - .1 * FL) / (zT - .1 * FL), 0, 1);
    let top = -(H0 - 24) * smooth(u) ** 1.3, bot = -H0 + (z > .55 * FL ? 14 * smooth((z - .55 * FL) / (zT - .55 * FL)) : 0), hw = FL * lerp(.115, .195, smooth(clamp((z - zH) / (.62 * FL - zH), 0, 1)));
    if (z > .62 * FL) hw = lerp(hw, FL * .12, smooth((z - .62 * FL) / (zT - .62 * FL)));
    if (t < .04) { const k = t / .04; hw *= Math.sqrt(k * (2 - k)) * .98 + .02; top = lerp(top - 6, top, k); bot = lerp(bot + 6, bot, k); }
    if (t > .96) { const k = (1 - t) / .04; hw *= Math.sqrt(k * (2 - k)) * .98 + .02; }
    const yc = (top + bot) / 2, hh = Math.max((top - bot) / 2, 1.5), ring = [];
    for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); ring.push([hw * Math.sign(c) * Math.pow(Math.abs(c), 2 / ne), yc + hh * Math.sign(s) * Math.pow(Math.abs(s), 2 / ne), z]); }
    rings.push(ring);
  }
  return solidRings_(rings);
}
/* géométrie de référence du montage dans le repère « neutre » (vertical sous le pôle P0) — retourne {parts, info} */
function tfAsmBuild_(m, dev, out, P0, Ma, outerR, al) {
  const a = Object.assign({}, TF_ASM_DEFAULT, dev.asm || {}), parts = [], add = (name, mesh, color, o) => parts.push(Object.assign({ name, mesh, color }, o));
  const yP = out.sec.y0 + m.lenPer, S = [out.sec.cAt(yP)[0], yP, out.sec.cAt(yP)[1]], d3 = M4.applyDir ? M4.applyDir(Ma, [0, -1, 0]) : (() => { const o = M4.apply(Ma, [0, 0, 0]), q = M4.apply(Ma, [0, -1, 0]); return V.sub(q, o); })();
  const dn = V.norm(d3), w = V.mul(dn, -1), Pc = [P0[0] + al.ml, P0[1], P0[2] + al.ap];
  const hP = V.dot(w, V.sub(S, Pc)), lenC = m.lenContra || 800, yF = P0[1] + (hP - lenC);                 // plan du sol (repère neutre, hauteur le long de la verticale)
  const kneeFloor = m.kneeFloor || 470, yK = yF + kneeFloor, B = 40, yKt = yK + B, H0 = 75, heel = clamp(a.heel, 0, 20), FL = a.footLen;
  const cupH = 16, cupBot = P0[1] - cupH, disc = 6, A = P0[1] - yKt;                              // A = bord distal de l'emboîture → face haute du genou
  const X0 = P0[0], Z0 = P0[2], cone0 = yKt + disc, coneLen = Math.max(0, cupBot - cone0), RC = 42;
  // prolongement distal : relie le bout de l'emboîture au gobelet (plâtre/PP sous le modèle) lorsque l'alignement décale le gobelet
  if (outerR) { const A_n = outerR[0].length, ctrOf = r => { let x = 0, z = 0; r.forEach(p => { x += p[0]; z += p[2]; }); return [x / r.length, z / r.length]; };
    let k = 3; for (let i = 1; i < outerR.length * .5; i++) { const c = ctrOf(outerR[i]); if (outerR[i].reduce((q, p) => q + Math.hypot(p[0] - c[0], p[2] - c[1]), 0) / A_n >= RC + 4) { k = i; break; } }
    const r0 = outerR[k], cc = ctrOf(r0), rr = [];
    const circ = r0.map((p, j) => { const th = j / A_n * Math.PI * 2; return M4.apply(Ma, [X0 + RC * Math.sin(th), P0[1], Z0 + RC * Math.cos(th)]); });
    for (let q = 0; q <= 6; q++) { const t = q / 6, e = t * t * (3 - 2 * t); rr.push(r0.map((p, j) => [lerp(p[0], circ[j][0], e), lerp(p[1], circ[j][1], e), lerp(p[2], circ[j][2], e)])); }
    parts.push({ name: 'Prolongement distal (PP)', mesh: solidRings_(rr), color: TF_COL.pp, part: 'bridge', _final: true }); }
  // gobelet nervuré (intégré à l'emboîture)
  const prof = [[20, cupBot], [RC - 4, cupBot]]; for (let i = 0; i < 4; i++) { const y = cupBot + 1.5 + i * 3.6; prof.push([RC - 4, y], [RC, y + .6], [RC, y + 2.4], [RC - 4, y + 3]); } prof.push([RC - 4, P0[1]], [20, P0[1]], [20, cupBot]);
  add('Gobelet trans-fémoral (nervuré)', lathe(prof, 48).transformed(M4.translate([X0, 0, Z0])), TF_COL.pp, { part: 'cup' });
  // gobelet conique + ouverture vers l'avant
  if (coneLen > 1) {
    add('Gobelet conique', tube(RC, RC - 5, cone0, cupBot, 48).transformed(M4.translate([X0, 0, Z0])), TF_COL.pp, { part: 'cone' });
    const wl = Math.min(coneLen * .55, 60); add('Ouverture du gobelet (avant)', boxMesh_(X0, cone0 + coneLen * .5, Z0 + RC - 2.5, 24, wl, 4), TF_COL.dark, { part: 'cone' });
  }
  add('Disque convexe', lathe([[0, yKt], [RC - 4, yKt], [RC - 4, yKt + disc], [0, yKt + disc + 1.5]], 48).transformed(M4.translate([X0, 0, Z0])), TF_COL.pp, { part: 'disc' });
  // coque de genou + axe + butée
  add('Coque de genou', lathe([[0, yKt - 98], [26, yKt - 98], [34, yKt - 70], [RC - 4, yKt - 40], [RC - 4, yKt], [0, yKt]], 40).transformed(M4.translate([X0, 0, Z0])), TF_COL.knee, { part: 'knee' });
  const zAx = Z0 - clamp(a.plumb, 0, 25);
  add('Axe du genou', rod([X0 - 50, yK, zAx], [X0 + 50, yK, zAx], 7), TF_COL.steel, { part: 'knee' });
  // tube (béquille), cylindre concave, disque de cheville, pied
  const ayD = yF + H0 + heel * .55, yAd = ayD + 6, yCc = Math.min(yAd + 150, yK - 20), cc0 = yAd, tubeIns = clamp(a.tubeIns, 60, 110), tubeBot = yCc - tubeIns;
  const tubeLen = (yK - yCc) + tubeIns;
  add('Tube d\'acier (béquille)', rod([X0, tubeBot, Z0], [X0, yKt - 90, Z0], 12.5), TF_COL.steel, { part: 'tube' });
  add('Cylindre concave', tube(24, 14, cc0, yCc, 36).transformed(M4.translate([X0, 0, Z0])), TF_COL.pp, { part: 'ccyl' });
  add('Ouverture du cylindre (avant)', boxMesh_(X0, (cc0 + yCc) / 2, Z0 + 22.5, 14, 50, 3), TF_COL.dark, { part: 'ccyl' });
  add('Barre de renfort (arrière)', boxMesh_(X0, (cc0 + yCc) / 2, Z0 - 21.5, 12, yCc - cc0, 6), TF_COL.pp, { part: 'ccyl' });
  add('Disque de cheville', solidRings_([0, 6].map(dy => { const r = []; for (let k = 0; k < 40; k++) { const t = k / 40 * Math.PI * 2; r.push([X0 + 40 * Math.sin(t), ayD + dy, Z0 + 55 * Math.cos(t) + 12]); } return r; })), TF_COL.pp, { part: 'ankle' });
  const psi = Math.asin(clamp(heel / (.85 * FL), 0, .5)), Mf = M4.mul(M4.translate([X0, ayD, Z0]), M4.mul(M4.rotY(rad(a.footRot)), M4.rotX(psi)));
  add('Pied SACH', sachFoot_(FL, H0).transformed(Mf), TF_COL.foot, { part: 'foot' });
  if (heel > .5) add('Talon (cale)', boxMesh_(X0 + Math.sin(rad(a.footRot)) * (-.1 * FL), yF + heel / 2, Z0 - .1 * FL * Math.cos(rad(a.footRot)), FL * .22, heel, FL * .24), TF_COL.strap, { part: 'foot' });
  // contrôle du fil à plomb : la verticale du gobelet doit passer par le grand trochanter (sagittal) et par le centre du pourtour proximal (frontal)
  const tro = out.lm && out.lm.trochanter ? out.lm.trochanter.pos : null, c0 = out.sec.cAt(yP); let plumbZ = 0, plumbX = 0;
  if (tro) { const o = M4.apply(Ma, P0), q = M4.apply(Ma, [P0[0], P0[1] - 1, P0[2]]), dd = V.norm(V.sub(q, o)), t = (tro[1] - o[1]) / dd[1]; plumbZ = o[2] + t * dd[2] - tro[2]; plumbX = o[0] + t * dd[0] - c0[0]; }
  // valve de succion : antéro-médiale, sur la partie distale (guide §6)
  if (a.valve && outerR) { const A_n = outerR[0].length, j = Math.round(A_n * 315 / 360) % A_n; let ir = 2; for (let i = 1; i < outerR.length; i++) if (outerR[i][j][1] >= P0[1] + 62) { ir = i; break; }
    const p = outerR[ir][j], cc = (() => { let x = 0, z = 0; outerR[ir].forEach(q => { x += q[0]; z += q[2]; }); return [x / A_n, z / A_n]; })(), n = V.norm([p[0] - cc[0], .25, p[2] - cc[1]]), M = basisMatrix(p, n);
    parts.push({ name: 'Plat de valve (EVA/plâtre)', mesh: cyl(18, -1, 5, 32).transformed(M), color: TF_COL.pp, part: 'valve', _final: true });
    parts.push({ name: 'Valve de succion', mesh: tube(9, 5, 5, 28, 24).transformed(M), color: TF_COL.steel, part: 'valve', _final: true });
    parts.push({ name: 'Clapet', mesh: cyl(7, 28, 33, 24).transformed(M), color: TF_COL.dark, part: 'valve', _final: true }); }
  // ceinture de suspension : grand trochanter → taille → crête iliaque opposée → triangle de Scarpa (guide §5)
  let belt = null;
  if (a.belt) { try { const B = tfBody_(m, out.sec), yW = B.yP + .8 * (m.pelvH || 200), pr = B.ab(yW), yT = tro ? tro[1] : B.yP + 20, yS = B.yP + 25, pts = [], th0 = 90, th1 = 380, nn = 40;
      pts.push([B.xmid + pr.a, yT, pr.zc]); for (let i = 0; i <= nn; i++) { const th = rad(th0 + (th1 - th0) * i / nn), t = i / nn, y = yW + (t > .5 ? -(yW - yS) * smooth((t - .75) / .25) * 1 : 0); pts.push([B.xmid + pr.a * Math.sin(th), y, pr.zc + pr.b * Math.cos(th)]); }
      let Ls = 0; for (let i = 1; i < pts.length; i++) Ls += V.len(V.sub(pts[i], pts[i - 1])); belt = { len: Math.round(Ls + 40), pts };
      const segs = []; for (let i = 1; i < pts.length; i++) segs.push(rod(pts[i - 1], pts[i], 7)); parts.push({ name: 'Ceinture de suspension', mesh: Mesh.merge(segs), color: TF_COL.strap, part: 'belt', _final: true }); } catch (e) { console.error('ceinture', e); } }
  const pl = [X0, Z0], info = { A: Math.round(A * 10) / 10, B, tubeLen: Math.round(tubeLen), tubeIns, yF, yK, yKt, plumbOff: a.plumb, heel, footRot: a.footRot, coneLen: Math.round(coneLen), kneeFloor, cutFromAxis: Math.round(yK - yCc), hP: Math.round(hP), plumbZ: Math.round(plumbZ * 10) / 10, plumbX: Math.round(plumbX * 10) / 10, belt: belt ? belt.len : null };
  return { parts: parts.map(p => p._final ? p : Object.assign(p, { mesh: p.mesh.transformed(Ma) })), info, Pc, w };
}
/* alignement théorique du guide : le fil à plomb (vertical du gobelet) passe par le grand trochanter (sagittal) et par le centre du pourtour proximal (frontal) */
function tfAutoAlign_(m, out, dev) {
  const P0 = out.pole, sec = out.sec, tro = out.lm && out.lm.trochanter ? out.lm.trochanter.pos : [sec.cAt(sec.y0 + m.lenPer)[0], sec.y0 + m.lenPer + 25, sec.cAt(sec.y0 + m.lenPer)[1]];
  const yP = sec.y0 + m.lenPer, c = sec.cAt(yP), flex = Math.max(0, m.flex || 0), abd = -(m.add || 0);
  const Ma0 = composeTransform(flex, abd, 0, [0, 0, 0], P0), o = M4.apply(Ma0, P0), q = M4.apply(Ma0, [P0[0], P0[1] - 1, P0[2]]), d = V.norm(V.sub(q, o));
  const t = (tro[1] - P0[1]) / d[1], xq = c[0], zq = tro[2];
  return { flex, abd, rot: 0, ml: Math.round((xq - P0[0] - t * d[0]) * 10) / 10, ap: Math.round((zq - P0[2] - t * d[2]) * 10) / 10 };
}
