/* JophyOrtho 3D — 08z : TÊTE ET COU (famille « ocep ») : modèle 3D à partir des mesures, repères, types d'orthèses (colliers, minerve, SOMI, casques, masque facial).
   Repère : Y = axe vertical (vertex en haut), Z = antérieur (visage), X = latéral (th = 90° → +X). Y = 0 : haut du thorax (sous la fourchette sternale). */
'use strict';
ORTH_YN.ocep = function (m) {
  const K = (m.hHead || 225) / 225, yS = 50, yMen = yS + m.lenNeck, yV = yMen + m.hHead, rN = m.cNeck / (2 * Math.PI) * 1.02;
  return { K, yS, yMen, yV, yT: yV, yMouth: yMen + 38 * K, ySubn: yMen + 62 * K, yEye: yMen + 103 * K, yBr: yMen + 118 * K, yEar0: yMen + 66 * K, yEar1: yMen + 112 * K, yIn: yMen + 100 * K, yEu: yMen + 145 * K, yHair: yMen + 175 * K, rN, y0: 0 };
};
const OHEAD_LM = [
  { id: 'vertex', label: 'Vertex (sommet du crâne)', y: m => ORTH_Y.ocep(m).yV - 3, th: 0, rf: 1 },
  { id: 'glabelle', label: 'Glabelle (entre les sourcils)', y: m => ORTH_Y.ocep(m).yBr, th: 0, rf: 1 },
  { id: 'nez', label: 'Pointe du nez', y: m => ORTH_Y.ocep(m).ySubn + 6 * ORTH_Y.ocep(m).K, th: 0, rf: 1 },
  { id: 'menton', label: 'Menton (gnathion)', y: m => ORTH_Y.ocep(m).yMen, th: 0, rf: 1 },
  { id: 'angle_mand_d', label: 'Angle de la mandibule droit', y: m => ORTH_Y.ocep(m).yMen + 14 * ORTH_Y.ocep(m).K, th: 62, rf: 1 },
  { id: 'angle_mand_g', label: 'Angle de la mandibule gauche', y: m => ORTH_Y.ocep(m).yMen + 14 * ORTH_Y.ocep(m).K, th: 298, rf: 1 },
  { id: 'tragus_d', label: 'Tragus droit (conduit auditif)', y: m => ORTH_Y.ocep(m).yMen + 84 * ORTH_Y.ocep(m).K, th: 92, rf: 1 },
  { id: 'tragus_g', label: 'Tragus gauche (conduit auditif)', y: m => ORTH_Y.ocep(m).yMen + 84 * ORTH_Y.ocep(m).K, th: 268, rf: 1 },
  { id: 'mastoide_d', label: 'Processus mastoïde droit', y: m => ORTH_Y.ocep(m).yMen + 74 * ORTH_Y.ocep(m).K, th: 118, rf: 1 },
  { id: 'mastoide_g', label: 'Processus mastoïde gauche', y: m => ORTH_Y.ocep(m).yMen + 74 * ORTH_Y.ocep(m).K, th: 242, rf: 1 },
  { id: 'inion', label: 'Inion (protubérance occipitale externe)', y: m => ORTH_Y.ocep(m).yIn, th: 180, rf: 1 },
  { id: 'occiput_d', label: 'Occiput droit (zone d\'aplatissement)', y: m => ORTH_Y.ocep(m).yMen + 118 * ORTH_Y.ocep(m).K, th: 148, rf: 1 },
  { id: 'occiput_g', label: 'Occiput gauche (zone d\'aplatissement)', y: m => ORTH_Y.ocep(m).yMen + 118 * ORTH_Y.ocep(m).K, th: 212, rf: 1 },
  { id: 'frontal_d', label: 'Bosse frontale droite', y: m => ORTH_Y.ocep(m).yMen + 150 * ORTH_Y.ocep(m).K, th: 32, rf: 1 },
  { id: 'frontal_g', label: 'Bosse frontale gauche', y: m => ORTH_Y.ocep(m).yMen + 150 * ORTH_Y.ocep(m).K, th: 328, rf: 1 },
  { id: 'fourchette', label: 'Fourchette sternale', y: m => ORTH_Y.ocep(m).yS, th: 0, rf: 1 },
  { id: 'c7', label: 'Vertèbre C7 (proéminente)', y: m => ORTH_Y.ocep(m).yS + 22, th: 180, rf: 1 },
  { id: 'acromion_d', label: 'Acromion droit', y: m => 10, th: 90, rf: 1 },
  { id: 'acromion_g', label: 'Acromion gauche', y: m => 10, th: 270, rf: 1 }
];
/* Interpolation monotone (PCHIP, Fritsch–Carlson) entre les nœuds d'un tableau trié [x, v1, v2, ...] : C1, sans paliers ni dépassements */
function crTab(T, x, i) {
  const n = T.length; if (x <= T[0][0]) return T[0][i]; if (x >= T[n - 1][0]) return T[n - 1][i];
  let k = 0; while (k < n - 2 && x > T[k + 1][0]) k++;
  const d = q => (T[q + 1][i] - T[q][i]) / (T[q + 1][0] - T[q][0]);
  const slope = q => { if (q === 0) return d(0); if (q === n - 1) return d(n - 2); const a = d(q - 1), b = d(q); if (a * b <= 0) return 0; const h0 = T[q][0] - T[q - 1][0], h1 = T[q + 1][0] - T[q][0], w1 = 2 * h1 + h0, w2 = h1 + 2 * h0; return (w1 + w2) / (w1 / a + w2 / b); };
  const h = T[k + 1][0] - T[k][0], u = (x - T[k][0]) / h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * T[k][i] + (u3 - 2 * u2 + u) * h * slope(k) + (-2 * u3 + 3 * u2) * T[k + 1][i] + (u3 - u2) * h * slope(k + 1);
}
/* ---------- construction des sections ---------- */
/* ===== Modèle de la tête et du cou : champ de distance (surface lisse, anatomie réaliste) + sections déduites ===== */
const HEAD_CACHE = { key: '', val: null };
function headModel(m) {
  const key = JSON.stringify([m.lenNeck, m.hHead, m.headL, m.headW, m.cHead, m.cNeck, m.shoulderW, m.chestAP, m.chinProj, m.noseProj, m.plagio]);
  if (HEAD_CACHE.key === key) return HEAD_CACHE.val;
  const Y = ORTH_YN.ocep(m), { K, yS, yMen, yV } = Y, A = m.shoulderW / 2, D = m.chestAP;
  const per = (aW, bA, bP, n) => { let s = 0, px = 0, pz = 0; for (let i = 0; i <= 72; i++) { const t = i / 72 * 2 * Math.PI, b = Math.cos(t) >= 0 ? bA : bP, r = superR(aW, b, t, n), x = r * Math.sin(t), z = r * Math.cos(t); if (i) s += Math.hypot(x - px, z - pz); px = x; pz = z; } return s; };
  let aN = m.cNeck / ellipsePerimeter(1, .92) / 2, bN = aN * .92; { const k = m.cNeck / per(aN, bN, bN, 2.2); aN *= k; bN *= k; }
  const Lf = m.headL / 190, Wf = m.headW / 150, Lh = m.headL / 2;
  /* --- cou, épaules, haut du thorax : fonction radiale --- */
  const torso = orthRows0([
    [0, A * .96, D / 2 + 20, D / 2 - 20], [yS - 40, A * .97, D / 2 + 14, D / 2 - 18], [yS - 20, A * .91, bN + 40, bN + 36], [yS - 6, A * .74, bN + 24, bN + 30], [yS + 8, Math.max(A * .48, aN * 1.9), bN + 14, bN + 22],
    [yS + 20, aN * 1.8, bN + 8, bN + 14], [yS + 35, aN * 1.3, bN * 1.05, bN * 1.1], [yS + 55, aN * 1.07, bN * 1.01, bN * 1.04], [yMen - 30, aN, bN, bN]]);
  const g = gAng;
  const radBody = (y, th) => {
    const h = (y - yMen) / K, c = Math.cos(th), tr = torso(y), tf = 1 - smooth((y - (yMen - 70)) / 60), nkf = 1 - smooth((h - 28) / 34);
    const aW = Math.max(tr.a * tf, y > yS ? aN * nkf : 0), bA = Math.max(tr.bA * tf, y > yS ? bN * nkf : 0), bP = Math.max(tr.bP * tf, y > yS ? bN * nkf : 0), b = bP + (bA - bP) * smooth((c + .25) / .5);
    let r = superR(Math.max(aW, .3), Math.max(b, .3), th, 2.2);
    const u = clamp((y - (yS - 5)) / (yMen + 40 * K - yS + 5), 0, 1), tc = 32 + 86 * u, w = smooth(u / .12) * (1 - smooth((u - .86) / .14)), neck = (1 - smooth((h - 20) / 25)) * (y > yS - 6 ? 1 : 0);
    r += neck * (5 * w * (g(th, tc, 13) + g(th, 360 - tc, 13)) + 6.5 * g(th, 0, 13) * Math.exp(-.5 * Math.pow((y - (yMen - 46 * K)) / 12, 2)) + 3 * g(th, 0, 22) * Math.exp(-.5 * Math.pow((y - (yMen - 20 * K)) / 8, 2)));
    r += 4 * (g(th, 64, 20) + g(th, 296, 20)) * Math.exp(-.5 * Math.pow((y - (yS + 7)) / 7, 2)) * (y > yS - 14 && y < yS + 24 ? 1 : 0);
    return Math.max(r, .3);
  };
  /* --- tête : primitives anatomiques (ellipsoïdes, capsules) fondues par minimum lissé --- */
  const X = v => v * Wf, YY = v => yMen + v * K, Z = v => v * Lf;
  const E = (x, y, z, cx, cy, cz, rx, ry, rz) => sdEll_(x, y, z, X(cx), YY(cy), Z(cz), X(rx), ry * K, rz * Lf);
  const CP = (x, y, z, a, b, ra, rb) => sdCap_(x, y, z, [X(a[0]), YY(a[1]), Z(a[2])], [X(b[0]), YY(b[1]), Z(b[2])], ra * K, rb * K, 1);
  const noseZ = 88 + m.noseProj * .95, chinZ = 75 + (m.chinProj - 18) * .45, pl = m.plagio || 0, sw = Math.max(0, pl) >= 0 ? 1 : -1;
  const bnd = (x, y, z) => sdEll_(x, y, z, 0, YY(125), Z(10), X(104), 130 * K, 128 * Lf);   // enveloppe de la tête (évite le calcul loin de la surface)
  const headD = (x, y, z) => {
    const ax = Math.abs(x); let d;
    const axc = ax / (1 - .15 * smooth((z + Z(10)) / Z(115)));                          // crâne en œuf : plus étroit vers l'avant
    d = E(axc, y, z, 0, 135, -4, 75, 92, 96);                                           // crâne
    d = smin_(d, E(axc, y, z, 0, 124, 36, 62, 50, 60), 14);                             // front
    d = smin_(d, E(ax, y, z, 0, 78, -18, 56, 40, 52), 20);                              // occiput / nuque haute
    d = smin_(d, E(ax, y, z, 0, 62, 32, 58, 48, 58), 14);                               // massif facial
    d = smin_(d, E(ax, y, z, 0, 34, 24, 49, 38, 54), 14);                               // bas du visage (joues, mâchoire)
    d = smin_(d, E(ax, y, z, 45, 76, 52, 11, 8, 12), 16);                               // pommettes
    d = smin_(d, CP(ax, y, z, [45, 28, 6], [12, 9, 66], 10, 9), 14);                    // corps de la mandibule
    d = smin_(d, CP(ax, y, z, [45, 28, 6], [53, 66, 4], 10, 9), 12);                    // branche montante
    d = smin_(d, E(ax, y, z, 0, 8, chinZ + 1, 13, 10, 12), 8);                              // menton
    d = smin_(d, E(ax, y, z, 0, 46.5, 81, 17.5, 5, 8.5), 3.5);                          // lèvre supérieure
    d = smin_(d, E(ax, y, z, 0, 34.5, 80, 16.5, 5.6, 8.5), 3.5);                        // lèvre inférieure
    d = smin_(d, E(ax, y, z, 0, 56, 84, 14, 4, 8), 6);                                  // base du nez / philtrum
    d = smax_(d, -E(ax, y, z, 0, 22, 86, 11, 3.6, 8), 7);                               // sillon mento-labial
    d = smax_(d, -E(ax, y, z, 0, 40.2, 98, 12.5, 1.5, 10), 1.6);                        // fente buccale
    d = smax_(d, -E(ax, y, z, 0, 51, 90, 3.2, 5, 5), 3);                                // philtrum
    d = smax_(d, -CP(ax, y, z, [15, 60, 84], [23, 40, 80], 1.8, 2.4), 6);               // sillons naso-géniens
    d = smin_(d, E(ax, y, z, 0, 80, 76, 15, 30, 18), 12);                               // pyramide nasale pleine (soude le nez au visage)
    d = smin_(d, CP(ax, y, z, [0, 108, 92], [0, 68, noseZ - 8], 7, 8.5), 14);           // dos du nez : simple coin lisse
    d = smin_(d, E(ax, y, z, 0, 63, noseZ - 6, 9.5, 7.5, 8.5), 8);                      // pointe
    d = smin_(d, E(ax, y, z, 10, 59, noseZ - 17, 7.5, 6.5, 10), 12);                    // ailes (fondues)
    d = smax_(d, -E(ax, y, z, 5.5, 56, noseZ - 9, 2.6, 2.6, 4), 2.5);                     // narines
    d = smin_(d, E(ax, y, z, 26, 117, 88, 23, 6.5, 8), 12);                             // arcades sourcilières (crête large et douce)
    d = smax_(d, -E(ax, y, z, 32, 104, 99, 15, 10, 9), 9);                              // orbites (creux doux)
    d = smin_(d, E(ax, y, z, 31, 103.5, 86, 10.5, 6.5, 8.5), 6);                        // globe + paupières fondus
    d = smax_(d, -E(ax, y, z, 31, 103.6, 97.5, 8.5, 1.1, 5), 1.0);                      // fente palpébrale
    // oreilles (légèrement inclinées vers l'arrière), conque, mastoïde
    const ez = z + .28 * (y - YY(88)); d = smin_(d, sdEll_(ax, y, ez, X(67), YY(88), Z(3), 3.6 * Wf, 25 * K, 13 * Lf), 6); d = smax_(d, -sdEll_(ax, y, z + .28 * (y - YY(86)), X(69), YY(86), Z(5), 4.5 * Wf, 9 * K, 6 * Lf), 2.5);
    d = smin_(d, CP(ax, y, z, [0, 22, -34], [0, 76, -62], 22, 26), 18);                   // nuque : raccord cou → occiput
    // plagiocéphalie : aplatissement occipital + bosse frontale ipsilatérale + bosse occipitale controlatérale
    if (pl) {
      const s = pl > 0 ? 1 : -1, f = Math.abs(pl), dr = (deg) => [Math.sin(deg * Math.PI / 180), Math.cos(deg * Math.PI / 180)];
      const [dx, dz] = dr(s > 0 ? 148 : 212), px = x * dx + (z - Z(-4)) * dz, rr = Lh * .9 - f;   // plan de coupe
      const ps = (px - rr) * .9; if (y > YY(70)) d = smax_(d, ps, 10);
      const [fx, fz] = dr(s > 0 ? 32 : 328); d = smin_(d, sdEll_(x, y, z, fx * X(52), YY(150), Z(60) * 1 + 0 * fz, X(30), 28 * K, 30 * Lf), 12 - 0 * f);
    }
    return d;
  };
  const bc = new Map(), yb0 = -5.6, hg = 2.8;
  const field = (x, y, z) => {
    const zb = z + 14 * smooth((y - yS - 15) / 70), rho = Math.hypot(x, zb), yk = Math.round((y - yb0) / hg); let B = bc.get(yk);
    if (B === undefined) { const tr = torso(yk * hg + yb0); B = Math.max(tr.a, tr.bA, tr.bP, aN * 1.05) + 14; bc.set(yk, B); }
    let d = rho > B + 36 ? (rho - B) * .8 : (rho - radBody(y, Math.atan2(x, zb))) * .8;
    d = Math.max(d, -y, y - (yMen + 70 * K));
    if (Math.abs(x) < X(110) && y > yMen - 55 * K && z > -Z(130) && z < Z(135)) { const db = bnd(x, y, z); if (db > 16) return Math.min(d, db * .6 + 8); const ki = Math.hypot(x / X(54), (y - YY(135)) / (68 * K), (z + Z(4)) / Z(70)); if (ki < .8) return -3 - (1 - ki) * 40; d = smin_(d, headD(x, y, z), 13); }
    return d;
  };
  const XS = axisNU_(-A - 6, A + 6, 2.1, 4, [[-X(80), X(80)]], 14), YS = axisNU_(yb0, yV + 8, 2.1, 4, [[yMen - 8, yMen + 138 * K]], 14), ZS = axisNU_(-Math.max(D / 2 + 12, Z(100)) - 18, Math.max(Z(135), D / 2 + 35), 2.1, 4, [[-Z(28), Z(125)]], 14);
  const sn = surfaceNetsNU_(field, XS, YS, ZS);
  let mesh = new Mesh(sn.v, sn.f).touch(); if (mesh.volume() < 0) { const f2 = sn.f.slice(); for (let q = 0; q < f2.length; q += 3) { const t = f2[q + 1]; f2[q + 1] = f2[q + 2]; f2[q + 2] = t; } mesh = new Mesh(sn.v, f2).touch(); }
  // sections déduites (lancer de rayons radial) : repères, hauteurs et bandes de couverture
  const NAH = 128, ys = []; for (let y = 0; y < yV - 6; y += 3.5) ys.push(y); ys.push(yV - 1.5);
  const sec = new Sec(ys, NAH);
  for (let i = 0; i < ys.length; i++) for (let j = 0; j < NAH; j++) {
    const th = j / NAH * Math.PI * 2, sx = Math.sin(th), cz = Math.cos(th), y = ys[i]; let rho = 2, r = 0;
    for (let it = 0; it < 80; it++) { const dd = field(sx * rho, y, cz * rho); if (dd > 0) { let lo = Math.max(rho - 3, 0), hi = rho; for (let q = 0; q < 8; q++) { const mid = (lo + hi) / 2; if (field(sx * mid, y, cz * mid) > 0) hi = mid; else lo = mid; } r = (lo + hi) / 2; break; } rho += Math.max(-dd * .7, 1.2); if (rho > 330) { r = 330; break; } }
    sec.r[i * NAH + j] = Math.max(r, .4);
  }
  const res = { mesh, sec, field }; HEAD_CACHE.key = key; HEAD_CACHE.val = res; return res;
}
function buildSecHead(m) { return headModel(m).sec; }
/* interpolation de lignes {y, a, bA, bP} (tableau [y, a, bA, bP]) */
function orthRows0(tab) { const T = tab.slice().sort((p, q) => p[0] - q[0]); return y => ({ a: crTab(T, y, 1), bA: crTab(T, y, 2), bP: crTab(T, y, 3) }); }
/* ---------- mesures, types, zones ---------- */
ORTH_FIELDS.ocep = [
  { k: 'lenNeck', label: 'Hauteur du cou : fourchette sternale → menton (verticale)', unit: 'mm', min: 40, max: 180, step: 1 },
  { k: 'hHead', label: 'Hauteur de la tête : menton → vertex', unit: 'mm', min: 130, max: 290, step: 1 },
  { k: 'headL', label: 'Longueur du crâne : glabelle → opisthocrânion', unit: 'mm', min: 120, max: 230, step: 1 },
  { k: 'headW', label: 'Largeur du crâne (eurion – eurion)', unit: 'mm', min: 95, max: 180, step: 1 },
  { k: 'cHead', label: 'Périmètre crânien (glabelle – inion)', unit: 'mm', min: 330, max: 640, step: 1 },
  { k: 'cNeck', label: 'Circonférence du cou (sous le larynx)', unit: 'mm', min: 160, max: 520, step: 1 },
  { k: 'shoulderW', label: 'Largeur bi-acromiale (épaules)', unit: 'mm', min: 180, max: 520, step: 1 },
  { k: 'chestAP', label: 'Épaisseur antéro-postérieure du haut du thorax', unit: 'mm', min: 100, max: 300, step: 1 },
  { k: 'chinProj', label: 'Projection du menton', unit: 'mm', min: 5, max: 50, step: 1 },
  { k: 'noseProj', label: 'Projection du nez', unit: 'mm', min: 5, max: 40, step: 1 },
  { k: 'plagio', label: 'Plagiocéphalie : asymétrie occipitale (+ droite / − gauche)', unit: 'mm', min: -20, max: 20, step: 1 }
];
ORTH_TYPES.ocep = {
  collier_mou: { label: 'Collier cervical mou (mousse)', desc: 'Collier en mousse : cou entier, fermeture postérieure, appui mentonnier.' },
  philadelphia: { label: 'Collier cervical rigide bivalve (type Philadelphia)', desc: 'Valve antérieure (sternum → menton) et valve postérieure (thorax → occiput), côtés ouverts.' },
  minerve: { label: 'Minerve cervico-thoracique (Minerva)', desc: 'Plastron sternal, appui mentonnier, plaque dorsale jusqu\'à l\'occiput et bandeau frontal.' },
  somi: { label: 'Orthèse SOMI (sterno-occipito-mandibulaire)', desc: 'Plastron sternal, pièce mandibulaire et pièce occipitale reliés par des montants.' },
  casque_remodelage: { label: 'Casque de remodelage crânien (plagiocéphalie)', desc: 'Casque du crâne, oreilles et visage libres ; zones de décharge pour la croissance.' },
  casque_protection: { label: 'Casque de protection', desc: 'Casque enveloppant le crâne (front, tempes, occiput), épaisseur renforcée.' },
  masque_facial: { label: 'Masque facial (compression / protection)', desc: 'Masque du visage avec fenêtres yeux, nez et bouche.' },
  libre: { label: 'Dessin libre', desc: 'Zones peintes à la main.' }
};
ORTH_ZONES.ocep = [
  { id: 'r_menton', lm: 'menton', label: 'Décharge menton', kind: 'relief', mm: 3, r: [24, 20, 22] },
  { id: 'r_c7', lm: 'c7', label: 'Décharge vertèbre C7', kind: 'relief', mm: 3, r: [24, 26, 22] },
  { id: 'r_inion', lm: 'inion', label: 'Décharge inion (protubérance occipitale)', kind: 'relief', mm: 3, r: [24, 22, 20] },
  { id: 'r_mast_d', lm: 'mastoide_d', label: 'Décharge mastoïde droite', kind: 'relief', mm: 3, r: [18, 20, 18] },
  { id: 'r_mast_g', lm: 'mastoide_g', label: 'Décharge mastoïde gauche', kind: 'relief', mm: 3, r: [18, 20, 18] },
  { id: 'r_angle_d', lm: 'angle_mand_d', label: 'Décharge angle mandibulaire droit', kind: 'relief', mm: 2.5, r: [18, 20, 18] },
  { id: 'r_angle_g', lm: 'angle_mand_g', label: 'Décharge angle mandibulaire gauche', kind: 'relief', mm: 2.5, r: [18, 20, 18] },
  { id: 'r_acro_d', lm: 'acromion_d', label: 'Décharge acromion droit', kind: 'relief', mm: 2.5, r: [26, 22, 26] },
  { id: 'r_acro_g', lm: 'acromion_g', label: 'Décharge acromion gauche', kind: 'relief', mm: 2.5, r: [26, 22, 26] },
  { id: 'r_occ_d', lm: 'occiput_d', label: 'Espace de croissance : occiput droit (zone aplatie)', kind: 'relief', mm: 6, r: [42, 40, 40] },
  { id: 'r_occ_g', lm: 'occiput_g', label: 'Espace de croissance : occiput gauche (zone aplatie)', kind: 'relief', mm: 6, r: [42, 40, 40] },
  { id: 'r_fr_d', lm: 'frontal_d', label: 'Espace de croissance : front droit', kind: 'relief', mm: 5, r: [36, 34, 34] },
  { id: 'r_fr_g', lm: 'frontal_g', label: 'Espace de croissance : front gauche', kind: 'relief', mm: 5, r: [36, 34, 34] },
  { id: 'l_occ_d', lm: 'occiput_d', label: 'Contact : bosse occipitale droite', kind: 'load', mm: 3, r: [40, 38, 38] },
  { id: 'l_occ_g', lm: 'occiput_g', label: 'Contact : bosse occipitale gauche', kind: 'load', mm: 3, r: [40, 38, 38] },
  { id: 'l_fr_d', lm: 'frontal_d', label: 'Contact : bosse frontale droite', kind: 'load', mm: 3, r: [34, 32, 34] },
  { id: 'l_fr_g', lm: 'frontal_g', label: 'Contact : bosse frontale gauche', kind: 'load', mm: 3, r: [34, 32, 34] },
  { id: 'l_menton', lm: 'menton', label: 'Charge : appui mentonnier', kind: 'load', mm: 2, r: [26, 18, 24] },
  { id: 'l_sternum', lm: 'fourchette', label: 'Charge : appui sternal', kind: 'load', mm: 2, r: [40, 30, 24] }
];
/* ---------- zone de couverture prédéfinie ---------- */
function headPreset(m, dev, th, y, x, z, ny, Y) {
  const type = dev.type, hT = dev.hTop || 0, hL = dev.hLo || 0, wr = dev.wrap || 0, K = Y.K, aTh = th > 180 ? 360 - th : th, h = (y - Y.yMen) / K;
  const tab = (T, a) => { for (let k = 0; k < T.length - 1; k++) if (a <= T[k + 1][0]) { const u = (a - T[k][0]) / (T[k + 1][0] - T[k][0]); return lerp(T[k][1], T[k + 1][1], u * u * (3 - 2 * u)); } return T[T.length - 1][1]; };
  const nk = Math.hypot(x, z) < 1.4 * Y.rN + wr * .3;
  if (type === 'collier_mou') return nk && y >= Y.yS - 12 - hL && y <= Y.yMen + tab([[0, -6], [150, 34], [180, 34]], aTh) * K + hT && aTh < 172;
  if (type === 'philadelphia') return (aTh <= 68 + wr && y >= Y.yS - 38 - hL && y <= Y.yMen + 10 * K + hT) || (aTh >= 112 - wr && y >= Y.yS - 45 - hL && y <= Y.yMen + 78 * K + hT);
  if (type === 'minerve') return (aTh <= 62 + wr && y >= 4 - hL && y <= Y.yMen + 10 * K + hT) || (aTh >= 118 - wr && y >= 4 - hL && y <= Y.yIn + 8 * K + hT) || (aTh <= 62 && y >= Y.yBr - 24 * K && y <= Y.yBr + 12 * K);
  if (type === 'somi') return (aTh <= 50 + wr && y >= 4 - hL && y <= Y.yS + 10) || (aTh <= 40 + wr * .5 && y >= Y.yMen - 3 * K - hL && y <= Y.yMen + 10 * K + hT) || (aTh >= 145 - wr && y >= Y.yIn - 30 * K - hL && y <= Y.yIn + 10 * K + hT);
  if (type === 'casque_remodelage') { const lo = tab([[0, 112], [55, 114], [75, 126], [105, 126], [130, 92], [180, 68]], aTh) * K + Y.yMen; return y >= lo - hL && y > Y.yMen + 60 * K; }
  if (type === 'casque_protection') { const lo = tab([[0, 106], [60, 108], [80, 74], [120, 62], [150, 48], [180, 42]], aTh) * K + Y.yMen; return y >= lo - hL && y > Y.yMen + 38 * K; }
  if (type === 'masque_facial') {
    if (!(aTh <= 74 + wr && y >= Y.yMen - 2 * K - hL && y <= Y.yHair + hT)) return false;
    if (h >= 93 && h <= 116 && aTh >= 6 && aTh <= 34) return false;   // yeux
    if (h >= 54 && h <= 76 && aTh <= 12) return false;               // narines
    if (h >= 26 && h <= 50 && aTh <= 22) return false;               // bouche
    return true;
  }
  return false;
}
ENGINES.ocep = { id: 'ocep', orth: true, label: 'Orthèse de la tête et du cou', short: 'OT', limb: false, unitNote: 'Y = axe vertical (vertex en haut), Z = antérieur (visage), X = latéral. Saisissez les mesures du patient : la tête et le cou en 3D se mettent à sa taille (nourrisson, enfant ou adulte).',
  fields: ORTH_FIELDS.ocep, clinical: ORTH_CLIN, defaults: () => orthDefaults('ocep'), landmarkDefs: OHEAD_LM, types: ORTH_TYPES.ocep,
  warnings(m) { const w = []; if (m.cHead < Math.PI * (m.headL + m.headW) / 2 * .85) w.push('Périmètre crânien inférieur à celui calculé d\'après la longueur et la largeur : vérifiez les mesures.'); if (m.cNeck < 150 + m.hHead * .3) w.push('Circonférence du cou faible par rapport à la tête : vérifiez.'); if (m.shoulderW < m.headW * 1.6) w.push('Largeur des épaules faible par rapport à la tête : vérifiez.'); return w; }, buildSec: buildSecHead };

/* ---------- visage personnalisé : photo de face projetée en couleurs de sommets (aucune donnée n'est envoyée) ---------- */
const FACEPIX = { src: null, w: 0, h: 0, d: null, busy: false };
function faceTexReady(ft) { return !!(ft && ft.img && FACEPIX.src === ft.img && FACEPIX.d); }
function faceTexLoad(ft, cb) {
  if (!ft || !ft.img || FACEPIX.busy || FACEPIX.src === ft.img || typeof Image === 'undefined') return; FACEPIX.busy = true;
  const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); FACEPIX.d = g.getImageData(0, 0, c.width, c.height).data; FACEPIX.w = c.width; FACEPIX.h = c.height; FACEPIX.src = ft.img; FACEPIX.busy = false; if (cb) cb(); };
  im.onerror = () => { FACEPIX.busy = false; }; im.src = ft.img;
}
function facePix(u, v, o) {
  const W = FACEPIX.w, H = FACEPIX.h, D = FACEPIX.d; u = Math.max(0, Math.min(W - 1.001, u)); v = Math.max(0, Math.min(H - 1.001, v));
  const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
  for (let c = 0; c < 3; c++) { const a = D[(j * W + i) * 4 + c], b = D[(j * W + i + 1) * 4 + c], d = D[((j + 1) * W + i) * 4 + c], e = D[((j + 1) * W + i + 1) * 4 + c]; o[c] = ((a * (1 - fu) + b * fu) * (1 - fv) + (d * (1 - fu) + e * fu) * fv) / 255; }
  return o;
}
function faceColors(mesh, m, ft) {
  const Y = ORTH_YN.ocep(m), K = Y.K, Wf = m.headW / 150, V = mesh.v, N = mesh.normals(), n = V.length / 3, C = new Float32Array(V.length);
  const [eL, eR, mo] = ft.pts, ipd = Math.hypot(eR[0] - eL[0], eR[1] - eL[1]), ex = [(eR[0] - eL[0]) / ipd, (eR[1] - eL[1]) / ipd], ey = [-ex[1], ex[0]], em = [(eL[0] + eR[0]) / 2, (eL[1] + eR[1]) / 2];
  const dm = (mo[0] - em[0]) * ey[0] + (mo[1] - em[1]) * ey[1], sx = ipd / (62 * Wf), sy = dm / ((103.5 - 40) * K), yE = Y.yMen + 103.5 * K;
  const tmp = [0, 0, 0], tone = [0, 0, 0]; let tn = 0;
  for (const sg of [-1, 1]) for (const dy of [.3, .5, .7]) for (const dd of [-.06, 0, .06]) { const px = em[0] + ex[0] * sg * (.6 * ipd + dd * ipd) + ey[0] * dy * dm, py = em[1] + ex[1] * sg * (.6 * ipd + dd * ipd) + ey[1] * dy * dm; facePix(px, py, tmp); tone[0] += tmp[0]; tone[1] += tmp[1]; tone[2] += tmp[2]; tn++; }
  tone[0] /= tn; tone[1] /= tn; tone[2] /= tn;
  const sm = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }, yMen = Y.yMen;
  for (let q = 0; q < n; q++) {
    const x = V[q * 3], y = V[q * 3 + 1], z = V[q * 3 + 2], nl = Math.hypot(N[q * 3], N[q * 3 + 1], N[q * 3 + 2]) || 1, nz = N[q * 3 + 2] / nl;
    let w = sm((nz - .3) / .4) * sm((z - 20) / 30) * sm((y - (yMen - 4 * K)) / (14 * K)) * (1 - sm((Math.hypot(x / (68 * Wf), Math.max(0, y - yE) / (32 * K)) - .8) / .35));
    let r = tone[0], g = tone[1], b = tone[2];
    if (w > .001) { const dx = x * sx, dy = (yE - y) * sy; facePix(em[0] + ex[0] * dx + ey[0] * dy, em[1] + ex[1] * dx + ey[1] * dy, tmp); r += (tmp[0] - r) * w; g += (tmp[1] - g) * w; b += (tmp[2] - b) * w; }
    C[q * 3] = r; C[q * 3 + 1] = g; C[q * 3 + 2] = b;
  }
  return C;
}
