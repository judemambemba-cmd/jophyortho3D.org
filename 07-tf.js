/* JophyOrtho 3D — 07 : MOTEUR TRANSFÉMORAL (mesures complètes, indépendant du moteur transtibial) */
'use strict';
ENGINES.tf = {
  id: 'tf', label: 'Prothèse transfémorale', short: 'TF', limb: true, unitNote: 'Y = axe du fémur (proximal +), Z = antérieur, X = latéral. Les mesures se prennent à 0 %, 25 %, 50 %, 75 % et 100 % de la longueur du membre résiduel (périnée → extrémité), depuis l\'extrémité distale ; le niveau « périnée » (100 %) utilise les diamètres AP ischio-Scarpa et ML adducteurs ↔ trochanter.',
  trimDirs: ['ant', 'post', 'med', 'lat'],
  rowLabel(r, m) { if (r.pct != null) return r.pct + ' %' + (r.pct === 0 ? ' · extrémité distale' : r.pct === 100 ? ' · périnée' : '') + ' (' + Math.round(r.pct / 100 * m.lenPer) + ' mm)'; const d = r.y - m.lenPer; return r.y + ' mm' + (Math.abs(d) <= 8 ? ' · périnée' : d > 8 ? ' · périnée +' + Math.round(d) : ' · périnée ' + Math.round(d)); },
  defaults() {
    const L = 280, old = [[0, 66, 64], [.2, 76, 76], [.4, 88, 88], [.6, 100, 100], [.8, 110, 114], [1, 118, 128]];
    const at = (y, i) => { const f = clamp(y / L, 0, 1); let k = 0; while (k < 4 && f > old[k + 1][0]) k++; const t = (f - old[k][0]) / (old[k + 1][0] - old[k][0]); return lerp(old[k][i], old[k + 1][i], t); };
    const rows = [0, 25, 50, 75, 100].map(p => mkRowPct(p, L, Math.round(at(p / 100 * L, 1)), Math.round(at(p / 100 * L, 2))));
    return {
      lenPer: 280, lenTroch: 310, lenContra: 800, kneeFloor: 430, footStack: 520, pelvW: 170, pelvAP: 230, pelvH: 200, crotchGap: 20, cContra: 0, subIsch: 0, apIsch: 0, mlAdd: 0, adductH: 14, gluteH: 30, flex: 0, add: 0, femurRot: 0, softProx: 'normal', softDist: 22, rows,
      distalShape: 'arrondie', firmness: 3, volVar: 3, skin: 'intacte', scars: '', adhesions: 'non', pain: 0, distalTol: 'moyenne'
    };
  },
  fields: [
    { k: 'lenPer', label: 'Longueur périnée → extrémité du membre résiduel', unit: 'mm', min: 120, max: 520, step: 1 },
    { k: 'lenTroch', label: 'Longueur grand trochanter → extrémité', unit: 'mm', min: 130, max: 560, step: 1 },
    { k: 'apIsch', label: 'Diamètre AP ischio-Scarpa (0 = valeur du niveau 100 %)', unit: 'mm', min: 0, max: 170, step: 1 },
    { k: 'mlAdd', label: 'Diamètre ML adducteurs ↔ trochanter (0 = valeur du niveau 100 %)', unit: 'mm', min: 0, max: 170, step: 1 },
    { k: 'subIsch', label: 'Périmètre sous-ischial (0 = non mesuré)', unit: 'mm', min: 0, max: 700, step: 1 },
    { k: 'adductH', label: 'Tendon des adducteurs : distance sous le périnée', unit: 'mm', min: 0, max: 80, step: 1 },
    { k: 'gluteH', label: 'Pli fessier : distance sous le périnée', unit: 'mm', min: 0, max: 100, step: 1 },
    { k: 'flex', label: 'Angle de flexion de hanche', unit: '°', min: 0, max: 50, step: 1 },
    { k: 'add', label: 'Adduction du fémur', unit: '°', min: -10, max: 30, step: 1 },
    { k: 'femurRot', label: 'Orientation du fémur (rotation)', unit: '°', min: -30, max: 30, step: 1 },
    { k: 'pelvW', label: 'Bassin : demi-largeur (plan médian → grand trochanter)', unit: 'mm', min: 120, max: 260, step: 1 },
    { k: 'pelvAP', label: 'Bassin : profondeur AP (fesse → pubis)', unit: 'mm', min: 150, max: 340, step: 1 },
    { k: 'pelvH', label: 'Bassin : hauteur périnée → crête iliaque', unit: 'mm', min: 120, max: 320, step: 1 },
    { k: 'crotchGap', label: 'Entre-jambe : écart entre les deux faces médiales des cuisses (au périnée)', unit: 'mm', min: 0, max: 120, step: 1 },
    { k: 'cContra', label: 'Cuisse saine : circonférence proximale (0 = identique au côté amputé)', unit: 'mm', min: 0, max: 900, step: 1 },
    { k: 'softDist', label: 'Épaisseur du capiton distal', unit: 'mm', min: 5, max: 50, step: 1 },
    { k: 'lenContra', label: 'Hauteur périnée → sol, côté sain', unit: 'mm', min: 500, max: 1100, step: 1 },
    { k: 'kneeFloor', label: 'Axe du genou prothétique → sol (= plateau tibial médial → sol, côté sain)', unit: 'mm', min: 300, max: 600, step: 1 },
    { k: 'footStack', label: 'Hauteur genou prothétique + pied + adaptateurs', unit: 'mm', min: 250, max: 700, step: 1 }
  ],
  clinical: [
    { k: 'softProx', label: 'Tissus proximaux', type: 'select', opts: [['normal', 'Normaux'], ['abondant', 'Abondants / roulé adducteur marqué'], ['fibreux', 'Fibreux / peu compliants']] },
    { k: 'distalShape', label: 'Forme distale', type: 'select', opts: [['arrondie', 'Arrondie'], ['conique', 'Conique'], ['plate', 'Plate / tronquée'], ['bulbeuse', 'Bulbeuse']] },
    { k: 'firmness', label: 'Fermeté des tissus (1 mou – 5 ferme)', type: 'range', min: 1, max: 5, step: 1 },
    { k: 'volVar', label: 'Variation de volume observée (%)', type: 'range', min: 0, max: 15, step: 1 },
    { k: 'skin', label: 'État cutané', type: 'select', opts: [['intacte', 'Intacte'], ['fragile', 'Fragile'], ['lesion', 'Lésion / plaie'], ['irritee', 'Irritée / rougeur']] },
    { k: 'adhesions', label: 'Adhérences', type: 'select', opts: [['non', 'Non'], ['oui', 'Oui']] },
    { k: 'pain', label: 'Douleur (0–10)', type: 'range', min: 0, max: 10, step: 1 },
    { k: 'distalTol', label: 'Tolérance distale', type: 'select', opts: [['bonne', 'Bonne'], ['moyenne', 'Moyenne'], ['faible', 'Faible / nulle']] },
    { k: 'scars', label: 'Cicatrices (localisation)', type: 'text' }
  ],
  buildSec(m) {
    m = normRows(m, m.lenPer); const L = m.lenPer, top = L + 70, N = 96, ys = []; for (let i = 0; i < N; i++) ys.push(top * i / (N - 1));
    const rows = m.rows.map(r => Object.assign({}, r)).sort((a, b) => a.y - b.y), capH = clamp(m.softDist + 8, 16, 60), last = rows[rows.length - 1];
    if (last.y < L - 1) { const pm = m.mlAdd > 0 ? m.mlAdd : last.ml * 1.1, pa = m.apIsch > 0 ? m.apIsch : last.ap * 1.15; rows.push(Object.assign({}, last, { y: L, pct: 100, ml: pm, ap: pa, circ: Math.round(ellipsePerimeter(pm, pa)) })); }   // niveau périnée (100 %) : ML adducteurs-trochanter et AP ischio-Scarpa
    else { const l2 = rows[rows.length - 1]; if (m.mlAdd > 0) { l2.ml = m.mlAdd; l2.circ = Math.round(ellipsePerimeter(l2.ml, l2.ap)); } if (m.apIsch > 0) { l2.ap = m.apIsch; l2.circ = Math.round(ellipsePerimeter(l2.ml, l2.ap)); } }
    const tf = Math.tan(rad(m.flex)), ta = Math.tan(rad(m.add)), rowAt = (y, key) => rowInterp(rows, y, key);
    const pad = m.softProx === 'abondant' ? 1.4 : m.softProx === 'fibreux' ? 0.6 : 1;
    return buildSecFrom(ys, y => [rowAt(y, 'dML') - Math.max(L - y, 0) * ta, rowAt(y, 'dAP') + Math.max(L - y, 0) * tf], (y, th) => {
      const fl = smooth((y - L) / 70), ml = rowAt(y, 'ml') * (1 + .22 * fl), ap = rowAt(y, 'ap') * (1 + .26 * fl), rot = rowAt(y, 'rot') + m.femurRot, circ = rowAt(y, 'circ') * (1 + .24 * fl);   // au-dessus du périnée : la cuisse s'évase vers la hanche et la fesse
      const sc = clamp(circ / ellipsePerimeter(ml, ap), 0.8, 1.25);
      let r = superR(ml / 2, ap / 2, th - rad(rot), 2.3) * sc;
      r *= 1 + 0.10 * pad * gAng(th, 270, 30) * maskY(y, 0.55 * L, L + 25, 10);
      r *= 1 + 0.06 * gAng(th, 180, 40) * maskY(y, 0.8 * L, L + 30, 10);
      r *= 1 + 0.05 * gAng(th, 90, 28) * maskY(y, 0.8 * L, L + 30, 8);
      r *= 1 - 0.04 * gAng(th, 335, 20) * maskY(y, 0.85 * L, L + 12, 8);
      return r * capFactor(y, capH, m.distalShape);
    });
  },
  landmarkDefs: [
    { id: 'ischion', label: 'Ischion', y: (L, m) => L - 5, th: 215 },
    { id: 'branche', label: 'Branche ischio-pubienne', y: (L, m) => L - 5, th: 300 },
    { id: 'trochanter', label: 'Grand trochanter', y: (L, m) => m.lenTroch ? Math.min(m.lenTroch, L + 25) : L * 0.93, th: 90 },
    { id: 'scarpa', label: 'Triangle de Scarpa', y: (L, m) => L - 5, th: 335 },
    { id: 'adduct_tendon', label: 'Tendon des adducteurs', y: (L, m) => L - (m.adductH || 14), th: 285 },
    { id: 'canal_add', label: 'Canal des adducteurs', y: (L, m) => L * 0.4, th: 280 },
    { id: 'pli_fessier', label: 'Pli fessier', y: (L, m) => L - (m.gluteH || 30), th: 180 },
    { id: 'perinee', label: 'Périnée', y: (L, m) => L, th: 270, rf: .95 },
    { id: 'femur_end', label: 'Extrémité fémorale', y: (L, m) => 14, th: 0, rf: 0 },
    { id: 'extremite', label: 'Extrémité distale', y: (L, m) => 1, th: 0, rf: 0 }
  ],
  trimRef(m) { return m.lenPer; },
  types: {
    quad: { label: 'Quadrilatérale', desc: 'Entrée proximale quadrangulaire : ML ≥ AP, paroi antérieure haute qui repousse le fémur sur le siège ischiatique horizontal postérieur, canal du long adducteur et bombé de Scarpa dégagés, quatre parois fonctionnelles.', red: 3.0, trim: { ant: 45, post: -3, med: 8, lat: 35 }, flare: 3, susp: ['Valve + bandage de succion', 'Ceinture pelvienne'],
      /* principes de la quadrilatérale (Radcliffe) : section proximale rectangulaire, paroi antérieure qui repousse le fémur sur le siège ischiatique (AP comprimé, ML plus large), canal du long adducteur et bombé de Scarpa dégagés, siège ischiatique horizontal en arrière */
      shape() { return (y, th, L) => { const mk = maskY(y, 0.45 * L, L + 8, 0.25 * L), pr = maskY(y, L - 40, L + 30, 10); return mk * (-3.2 * Math.sin(th) ** 2 + 3 * Math.sin(2 * th) ** 2) - 6 * gAng(th, 0, 32) * pr + 3.5 * gAng(th, 335, 22) * pr + 2.5 * gAng(th, 285, 18) * pr - 3 * gAng(th, 90, 38) * pr - 5 * gAng(th, 215, 24) * maskY(y, L - 30, L + 4, 6); }; } },
    ic: { label: 'Contention ischiatique', desc: 'Containment ischio-ramal : paroi médiale plus haute, ML étroit, stabilisation pelvienne, adduction du fémur représentée (préréglage d\'adduction proposé).', red: 3.5, trim: { ant: 28, post: 30, med: 42, lat: 55 }, flare: 2, addPreset: 8, susp: ['Succion / manchon + verrou'],
      shape() { return (y, th, L) => { const mk = maskY(y, 0.4 * L, L + 8, 0.25 * L); return mk * (-9 * Math.sin(th) ** 2 + 4 * Math.cos(th) ** 2) + 3 * gAng(th, 300, 20) * maskY(y, L - 20, L + 5, 5) - 4 * gAng(th, 215, 25) * maskY(y, L - 25, L + 6, 6); }; } },
    mas: { label: 'MAS', desc: 'Contour proximal réduit et anatomique, hauteur/containment adaptés, forme postéro-médiale spécifique.', red: 3.0, trim: { ant: 15, post: 12, med: 18, lat: 28 }, flare: 2, susp: ['Succion / manchon + verrou'],
      shape() { return (y, th, L) => -2.5 * maskY(y, 0.75 * L, L + 8, 0.15 * L) - 5 * gAng(th, 225, 35) * maskY(y, 0.8 * L, L + 5, 8); } },
    subisch: { label: 'Sous-ischiale', desc: 'Bord proximal sous l\'ischion, amplitude de hanche plus libre ; dépend d\'une suspension adaptée.', red: 4.0, trim: { ant: -8, post: -22, med: -28, lat: -10 }, flare: 4, susp: ['Manchon silicone + verrou', 'Succion / vide (indispensable)'],
      shape() { return (y, th, L) => 3 * (gAng(th, 90, 40) + gAng(th, 270, 40)) * maskY(y, 0.8 * L, L + 8, 8); } },
    hifi: { label: 'HiFi', desc: 'Contention longitudinale : alternance de zones de compression et de dégagement (struts/aires de contrôle).', red: 3.5, trim: { ant: 15, post: 3, med: 22, lat: 22 }, flare: 3, susp: ['Succion / manchon + verrou'],
      shape() { return (y, th, L) => 3.2 * Math.cos(6 * th) * maskY(y, 0.25 * L, 0.95 * L, 0.1 * L); } }
  },
  suggest(type, m, lm, dev) {
    const z = (t, id, r, v, c) => lm[id] ? mkZone(t, lm[id], r, v, { landmark: id, comment: c, suggested: true }) : null, out = [];
    const dt = m.distalTol === 'faible' ? 5 : m.distalTol === 'moyenne' ? 3 : 1.5;
    if (type === 'quad') out.push(z('charge', 'ischion', 38, 5, 'Siège ischiatique (appui)'), z('decharge', 'scarpa', 32, 3, 'Dégagement vasculaire (Scarpa)'), z('decharge', 'adduct_tendon', 28, 4, 'Dégagement tendon des adducteurs'), z('stabilisation', 'trochanter', 34, 3, 'Paroi latérale'), z('charge', 'pli_fessier', 34, 3, 'Appui fessier postérieur'));
    else if (type === 'ic') out.push(z('stabilisation', 'ischion', 36, 4, 'Containment ischiatique'), z('stabilisation', 'branche', 30, 4, 'Containment ischio-ramal'), z('stabilisation', 'trochanter', 36, 4, 'Stabilisation pelvienne latérale'), z('decharge', 'scarpa', 30, 3, 'Dégagement vasculaire (Scarpa)'), z('decharge', 'adduct_tendon', 26, 4, 'Dégagement tendon des adducteurs'), z('protection', 'perinee', 28, 3, 'Protection périnéale'));
    else if (type === 'mas') out.push(z('stabilisation', 'ischion', 32, 3, 'Containment postéro-médial'), z('stabilisation', 'trochanter', 32, 3, 'Stabilisation latérale'), z('decharge', 'scarpa', 28, 3, 'Dégagement vasculaire (Scarpa)'), z('decharge', 'adduct_tendon', 26, 3, 'Dégagement tendon des adducteurs'));
    else if (type === 'subisch') out.push(z('decharge', 'ischion', 34, 4, 'Dégagement : bord sous l\'ischion'), z('stabilisation', 'trochanter', 34, 3, 'Stabilisation latérale'), z('stabilisation', 'adduct_tendon', 28, 3, 'Contention médiale'), z('decharge', 'scarpa', 26, 3, 'Dégagement vasculaire (Scarpa)'));
    else if (type === 'hifi') out.push(z('stabilisation', 'ischion', 32, 3, 'Contention longitudinale postéro-médiale'), z('stabilisation', 'trochanter', 32, 3, 'Contention longitudinale latérale'), z('decharge', 'scarpa', 28, 3, 'Dégagement vasculaire (Scarpa)'));
    out.push(z('decharge', 'extremite', 34, dt, 'Tolérance distale : ' + m.distalTol));
    return out.filter(Boolean);
  },
  warnings(m) {
    const w = [];
    m.rows.forEach((r, i) => { const s = circScale(r); if (Math.abs(s - 1) > 0.08) w.push(`Niveau « ${ENGINES.tf.rowLabel(r, m)} » : circonférence ${r.circ} mm incohérente avec ML×AP (écart ${Math.round((s - 1) * 100)} %).`); });
    if (m.subIsch > 0) { const pe = ellipsePerimeter(m.rows[m.rows.length - 1].ml, m.rows[m.rows.length - 1].ap); if (Math.abs(m.subIsch / pe - 1) > 0.1) w.push(`Périmètre sous-ischial saisi (${m.subIsch} mm) différent du périmètre ML×AP du niveau proximal (${Math.round(pe)} mm).`); }
    if (m.flex > 25) w.push('Flexion de hanche > 25° : contracture à documenter ; l\'effet sur la forme est approximatif (cisaillement des sections).');
    if (m.lenTroch && m.lenTroch < m.lenPer) w.push('Longueur trochanter → extrémité inférieure à la longueur périnée → extrémité : incohérent.');
    if (m.crotchGap != null && m.crotchGap < 8) w.push('Entre-jambe très étroit (' + m.crotchGap + ' mm) : la paroi médiale de l\'emboîture (doublure + coque ≈ 8 à 12 mm) risque de toucher la cuisse saine ; abaisser/affiner la paroi médiale ou vérifier la mesure.');
    if (m.pelvW && m.mlAdd && m.pelvW < m.mlAdd * .5 + 40) w.push('Demi-largeur du bassin faible par rapport au diamètre ML adducteurs ↔ trochanter : vérifier les deux mesures.');
    if (m.lenPer < 180) w.push('Membre résiduel court : choix du type d\'emboîture à confirmer cliniquement.');
    if (m.skin === 'lesion') w.push('Lésion cutanée signalée : aucun essayage sans avis du professionnel responsable.');
    if (m.pain >= 6) w.push('Douleur élevée signalée : vérifier les zones de charge avant tout essayage.');
    if (m.adhesions === 'oui' || m.scars) w.push('Cicatrice/adhérence signalée : envisager une zone « Protection ».');
    if (m.volVar >= 8) w.push('Variation de volume importante : prévoir des essayages multiples.');
    return w;
  }
};

/* ---------- Bassin, entre-jambe et cuisse saine (contexte anatomique, côté amputé = +X) ----------
   Champ de distance signé (négatif à l'intérieur) : moignon (sections) + cuisse saine (miroir au plan médian) + hémi-bassin, unis par fusion douce. */
const _supN = (dx, dz, a, b, p) => { if (a < 1 || b < 1) return 1e3; const g = Math.pow(Math.pow(Math.abs(dx) / a, p) + Math.pow(Math.abs(dz) / b, p), 1 / p); return (g - 1) * Math.min(a, b); };
function tfBody_(m, sec) {
  const L = m.lenPer || 300, yP = sec.y0 + L, A = sec.A, cP = sec.cAt(yP), wP = sec.widthAt(yP), xm = sec.pointAt(yP, A * .75)[0];
  const gap = m.crotchGap != null ? m.crotchGap : 20, xmid = xm - gap / 2, pW = m.pelvW || 170, pAP = m.pelvAP || 230, pH = m.pelvH || 200, lenC = m.lenContra || 800;
  const per = sec.perimeterAt(yP) || 1, sS = m.cContra > 0 ? m.cContra / per : 1, hK = .46 * lenC, yKnee = yP - hK, cxS = 2 * xmid - cP[0], yTop = yP + pH;
  const sm = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const sound = (x, y, z) => {   // cuisse saine : section du moignon au périnée (miroir), mise à l'échelle, affinée vers le genou
    const tp = lerp(1, .62, sm((yP - y) / hK)) * (y > yP ? 1 + .04 * sm((y - yP) / 60) : 1), a = wP.ml / 2 * sS * tp, b = wP.ap / 2 * sS * tp;
    let cap = 1; const ch = 30; if (y < yKnee + ch) cap = Math.sqrt(Math.max(0, 1 - Math.pow((yKnee + ch - y) / ch, 2)));
    const d = _supN(x - cxS, z - cP[1], a * cap, b * cap, 2.3); return Math.max(d, y - (yP + pH * .65), yKnee - y);
  };
  const res = (x, y, z) => { const yy = Math.min(y, sec.y1), dx = x - sec.cAt(yy)[0], dz = z - sec.cAt(yy)[1]; let an = Math.atan2(dx, dz); if (an < 0) an += 2 * Math.PI; const jf = an / (2 * Math.PI) * A, j0 = Math.floor(jf), r = lerp(sec.rAt(yy, j0), sec.rAt(yy, j0 + 1), jf - j0); return Math.max(Math.hypot(dx, dz) - r, y - (yP + pH * .65)); };
  const pelv = (x, y, z) => {
    const t = y - yP, u = sm((t + 15) / 110), w = Math.pow(u, .8), a = pW * w * (1 - .14 * sm((t - 80) / Math.max(40, pH - 80))), b = pAP / 2 * (.62 + .38 * sm((t + 15) / 120)) * (1 - .06 * sm((t - 100) / Math.max(40, pH - 100)));
    let cap = 1; const ch = 40; if (y > yTop - ch) cap = Math.sqrt(Math.max(0, 1 - Math.pow((y - (yTop - ch)) / ch, 2)));
    return Math.max(_supN(x - xmid, z - (cP[1] - 6 + 10 * sm(t / 120)), a * cap, b * cap, 2.6), -15 - t);
  };
  const ab = y => { const t = y - yP, u = sm((t + 15) / 110); return { a: pW * Math.pow(u, .8) * (1 - .14 * sm((t - 80) / Math.max(40, pH - 80))), b: pAP / 2 * (.62 + .38 * sm((t + 15) / 120)) * (1 - .06 * sm((t - 100) / Math.max(40, pH - 100))), zc: cP[1] - 6 + 10 * sm(t / 120) }; };
  return { yP, xmid, xm, yTop, yKnee, sound, res, pelv, ab, all: (x, y, z) => smin_(smin_(res(x, y, z), sound(x, y, z), 6), pelv(x, y, z), 16) };
}
function tfPelvisMesh_(m, sec) {
  const B = tfBody_(m, sec), h = 4.5, pW = m.pelvW || 170, x0 = Math.min(B.xmid - pW, B.xmid - 120) - 34, x1 = Math.max(B.xmid + pW, B.xm + 220) + 34, y0 = B.yKnee - 10, y1 = B.yTop + 12, cz = sec.cAt(B.yP)[1], z0 = cz - 190, z1 = cz + 190;
  const nx = Math.ceil((x1 - x0) / h), ny = Math.ceil((y1 - y0) / h), nz = Math.ceil((z1 - z0) / h);
  const sn = surfaceNets_((x, y, z) => B.all(x, y, z), x0, y0, z0, nx, ny, nz, h);
  let mesh = new Mesh(sn.v, sn.f).touch(); if (mesh.volume() < 0) { const f2 = sn.f.slice(); for (let q = 0; q < f2.length; q += 3) { const t = f2[q + 1]; f2[q + 1] = f2[q + 2]; f2[q + 2] = t; } mesh = new Mesh(sn.v, f2).touch(); }
  // on retire la partie confondue avec le moignon (évite le scintillement avec l'anatomie du membre)
  const V = mesh.v, F = mesh.f, keep = []; for (let t = 0; t < F.length; t += 3) { const a = F[t] * 3, b = F[t + 1] * 3, c = F[t + 2] * 3, x = (V[a] + V[b] + V[c]) / 3, y = (V[a + 1] + V[b + 1] + V[c + 1]) / 3, z = (V[a + 2] + V[b + 2] + V[c + 2]) / 3;
    if (y < sec.y1 - 4 && Math.abs(B.res(x, y, z)) < 3 && B.sound(x, y, z) > 4) continue; keep.push(F[t], F[t + 1], F[t + 2]); }
  return new Mesh(V, Uint32Array.from(keep)).touch();
}
/* écart minimal entre la paroi extérieure de l'emboîture et la cuisse saine (sous le périnée) */
function tfCrotchClearance_(m, sec, outerR) {
  const B = tfBody_(m, sec); let best = 1e9;
  outerR.forEach(ring => ring.forEach(p => { if (p[1] > B.yP + 4 || p[1] < B.yP - 140) return; const d = B.sound(p[0], p[1], p[2]); if (d < best) best = d; }));
  return best;
}


/* ---------- Contrôle des principes de fabrication (TF) ----------
   Valeurs de référence indicatives de la pratique orthoprothétique (quadrilatérale de Radcliffe, contention ischiatique/CAT-CAM, MAS, sous-ischiale, HiFi) :
   hauteurs de parois relatives au niveau du périnée (≈ siège ischiatique), rapport ML/AP, épaisseurs, flexion initiale, égalité des longueurs. À confirmer cliniquement. */
const TF_REF = {
  quad: { ant: [35, 55], lat: [25, 45], med: [-5, 15], post: [-15, 5], mlap: [.95, 1.35], dir: 'ML ≥ AP (section rectangulaire)' },
  ic: { ant: [15, 40], lat: [40, 65], med: [25, 50], post: [20, 45], mlap: [.6, .9], dir: 'ML étroit (≈ 70–85 % de l\'AP)' },
  mas: { ant: [5, 30], lat: [15, 40], med: [10, 30], post: [5, 25], mlap: [.7, 1.1], dir: 'ML plutôt étroit' },
  subisch: { ant: [-25, 5], lat: [-25, 5], med: [-45, -10], post: [-40, -5], mlap: [.7, 1.3], dir: 'bord sous l\'ischion' },
  hifi: { ant: [0, 35], lat: [10, 40], med: [10, 35], post: [0, 25], mlap: [.7, 1.2], dir: 'contention longitudinale' }
};
function tfRules_(P, out) {
  const m = out.m, dev = P.dev.tf, sec = out.sec, ref = TF_REF[dev.type]; if (!ref || !sec) return [];
  const yP = sec.y0 + m.lenPer, tp = out.trim.top, A = sec.A, at = d => tp[Math.round(d / 360 * A) % A] - yP, res = [];
  const chk = (ok, lvl, txt, fix) => res.push({ ok, level: ok ? 'ok' : lvl, text: txt, fix });
  const fr = d => tp.free ? tp.free[Math.round(d / 360 * A) % A] - yP : at(d);
  const rng = (nm, d, r, lab) => { const v = at(d), f = fr(d), lim = f > v + 2; if (lim && v < r[0] - 2) chk(true, 'info', `${lab} : ${Math.round(v)} mm — limitée par le corps (bassin / entre-jambe : le bord ne peut pas entrer dans le volume corporel ; réglage demandé ${Math.round(f)} mm, référence ${r[0]} à ${r[1]} mm).`); else chk(v >= r[0] - 2 && v <= r[1] + 2, 'warn', `${lab} : ${Math.round(v)} mm au-dessus du périnée (référence ${r[0]} à ${r[1]} mm).`); };
  rng('ant', 0, ref.ant, 'Paroi antérieure'); rng('lat', 90, ref.lat, 'Paroi latérale'); rng('med', 270, ref.med, 'Paroi médiale'); rng('post', 180, ref.post, 'Paroi postérieure');
  const w = out.rs.widthAt(yP), r = w.ml / w.ap; chk(r >= ref.mlap[0] && r <= ref.mlap[1], 'warn', `Rapport ML/AP au périnée : ${r.toFixed(2)} (référence ${ref.mlap[0]} à ${ref.mlap[1]} — ${ref.dir}). ML ${Math.round(w.ml)} mm, AP ${Math.round(w.ap)} mm : vérifier les diamètres ML adducteurs/trochanter et AP ischio-Scarpa.`);
  if (dev.type === 'ic' || dev.type === 'quad') { const tro = (m.lenTroch || m.lenPer + 25) - m.lenPer; chk(at(90) >= tro + (dev.type === 'ic' ? 10 : -10), 'warn', dev.type === 'ic' ? 'Paroi latérale : doit dépasser le grand trochanter d\'au moins ~10 mm (stabilisation latérale).' : 'Paroi latérale : doit atteindre au moins le niveau du grand trochanter (−10 mm).'); }
  if (dev.type === 'ic') chk(at(215) >= 20 || fr(215) > at(215) + 2, 'warn', 'Contention ischiatique : le bord postéro-médial doit envelopper la tubérosité ischiatique (≥ +20 mm au-dessus du périnée).');
  if (dev.type === 'quad') chk(at(215) <= 8, 'warn', 'Siège ischiatique : le bord postérieur ne doit pas dépasser le niveau de la tubérosité (siège horizontal).');
  const L = dev.liner, S = dev.shell, rp = dev.redPct;
  chk(rp >= 2.5 && rp <= 6.5, 'warn', `Réduction volumétrique globale : ${rp} % (usuel 3 à 6 %).`);
  chk(S.tGen >= 3.5 && S.tGen <= 8, 'warn', `Épaisseur de coque : ${S.tGen} mm (composite usuel 4 à 6 mm ; thermoformé 5 à 8 mm).`);
  if (L.on) chk(L.tGen >= 3 && L.tGen <= 9, 'warn', `Épaisseur de doublure : ${L.tGen} mm (silicone/gel usuel 3 à 6 mm).`);
  chk((dev.trim.fillet || 0) >= 2 && (dev.trim.flare || 0) >= 2, 'warn', 'Bord proximal : arrondi (≥ 2) et évasement (≥ 2 mm) nécessaires pour le confort des tissus mous.');
  const fx = (dev.align.flex || 0) + (dev.asm && dev.asm.on && dev.asm.auto !== false ? (m.flex || 0) : 0), hf = m.flex || 0; chk(fx >= hf, 'warn', `Flexion initiale de l\'emboîture (${fx}°) inférieure à la flexion de hanche (${hf}°) : prévoir au moins ${hf}° + 3 à 5° (contracture / engagement des extenseurs).`);
  if (dev.type === 'ic' && (m.add || 0) < 4) chk(false, 'info', 'Contention ischiatique : une adduction du fémur de 5 à 10° est habituellement représentée (voir préréglage d\'adduction).');
  if (dev.type === 'subisch') chk(/vide|succion|silicone/i.test(dev.suspension || ''), 'warn', 'Sous-ischiale : suspension par vide/succion (manchon silicone + verrou) indispensable.');
  const tot = m.lenPer + (m.footStack || 0), ctr = m.lenContra || 0; if (ctr) chk(Math.abs(tot - ctr) <= 15, 'warn', `Égalité des longueurs : périnée → extrémité (${m.lenPer}) + genou/pied/adaptateurs (${m.footStack}) = ${tot} mm contre ${ctr} mm côté sain (écart ${Math.round(tot - ctr)} mm ; tolérance ±15 mm, ajuster à l\'alignement).`);
  { const B = tfBody_(m, sec); let w = 1e9; out.shellRings.outerR.forEach(r => r.forEach(q => { const d = Math.min(B.sound(q[0], q[1], q[2]), B.pelv(q[0], q[1], q[2])); if (d < w) w = d; })); out.bodyPen = Math.round(w * 10) / 10;
    chk(w >= -1.5, 'warn', `L\'emboîture pénètre dans le corps (bassin / cuisse saine) de ${Math.abs(Math.round(w * 10) / 10)} mm : abaisser le bord ou augmenter l\'écart entre-jambe.`); }
  const as = out.asm; if (as) {
    chk(as.A >= 22, 'warn', `Systèmes d\'alignement : A = ${as.A} mm (minimum 22 mm entre le bord distal de l\'emboîture et la face haute du genou) — moignon trop long pour cette hauteur de genou (réduire la mesure genou-sol ou changer le montage).`);
    chk(as.tubeIns >= 90 && as.tubeIns <= 100, 'warn', `Tube d\'acier introduit de ${as.tubeIns} mm dans le cylindre concave (guide : 9 à 10 cm).`);
    chk(Math.abs(as.plumbZ) <= 5 && Math.abs(as.plumbX) <= 8, 'warn', `Fil à plomb : écart au grand trochanter ${as.plumbZ} mm (AP) et au centre proximal ${as.plumbX} mm (ML) — activer l\'alignement théorique du guide.`);
    chk(as.plumbOff >= 5 && as.plumbOff <= 15, 'warn', `Fil à plomb à ${as.plumbOff} mm en avant de l\'axe du genou (guide : ± 1 cm pour la sécurité du genou à la marche).`);
    chk(as.heel <= 20 && as.footRot >= 3 && as.footRot <= 7, 'warn', `Pied : talon ${as.heel} mm (0 à 20 ; 10 optimal) et rotation externe ${as.footRot}° (guide : 5°).`);
    chk(as.cutFromAxis >= 0, 'warn', 'Genou plus bas que le cylindre concave : raccourcir le cylindre / vérifier genou-sol.');
    if (as.coneLen < 1) chk(true, 'info', 'Moignon long : le gobelet conique est très court (respecter les dimensions minimales A et B).'); }
  chk(m.distalTol !== 'faible', 'info', 'Tolérance distale faible : contact distal total à éviter ; prévoir un capiton distal et un appui ischiatique/proximal.');
  chk(out.crotchClear == null || out.crotchClear >= 5, 'warn', 'Entre-jambe : dégagement insuffisant entre la paroi médiale et la cuisse saine.');
  return res;
}
/* applique les valeurs de référence du type : hauteurs de parois (milieu des plages), réduction, évasement, flexion initiale */
function tfApplyRef_(d, type, m) {
  const r = TF_REF[type], t = ENGINES.tf.types[type]; if (!r) return;
  const mid = a => Math.round((a[0] + a[1]) / 2);
  d.trim = Object.assign({}, d.trim, { ant: mid(r.ant), lat: mid(r.lat), med: mid(r.med), post: mid(r.post), flare: Math.max(3, t.flare || 3), fillet: Math.max(2, d.trim.fillet || 2) });
  d.redPct = clamp(t.red, 3, 5); d.shell.tGen = clamp(d.shell.tGen, 4, 6); if (d.liner.on) d.liner.tGen = clamp(d.liner.tGen, 3, 6);
  d.align.flex = Math.max(d.align.flex || 0, (m.flex || 0) + (m.flex ? 3 : 0));
}

/* Le bord proximal ne doit jamais entrer dans le corps (bassin, entre-jambe, cuisse saine) : on abaisse chaque point du bord jusqu'à ce que la paroi extérieure soit à l'extérieur du volume corporel */
function tfClampTopToBody_(m, dev, sec, top, smoothN) {
  const B = tfBody_(m, sec), A = sec.A, th0 = (dev.liner && dev.liner.on ? dev.liner.tProx : 0) + dev.shell.gap + dev.shell.tProx, yMin = sec.y0 + (m.lenPer || 300) - 70;
  const outside = (y, j) => { const p = sec.pointAt(y, j), c = sec.cAt(y), dx = p[0] - c[0], dz = p[2] - c[1], r = Math.hypot(dx, dz) || 1, q = [p[0] + dx / r * th0, y, p[2] + dz / r * th0]; return Math.min(B.sound(q[0], q[1], q[2]), B.pelv(q[0], q[1], q[2])) >= 1; };
  const clampAll = () => { for (let j = 0; j < A; j++) { let y = top[j], n = 0; while (y > yMin && n++ < 80 && !outside(y, j)) y -= 2; top[j] = Math.min(top[j], y); } };
  top.free = Float32Array.from(top); clampAll(); for (let k = 0; k < 2; k++) { smoothCirc(top, Math.max(1, Math.min(smoothN || 1, 3))); clampAll(); }
}
