/* JophyOrtho 3D — 16c : étapes de l'orthèse de membre (mesures, zones couvertes, orthèse, export). */
'use strict';
const orthFam = () => Store.P.family;
const ORTH_ISORTH = () => !!(Store.P && ENGINES[Store.P.family].orth);
STEP.mesuresO = {
  label: 'Mesures', layers: { anat: 1, lms: 1 },
  render(b) {
    const P = Store.P, eng = ENGINES[P.family];
    b.append(h('h2', null, 'Mesures — ' + eng.label), h('p', { class: 'sub' }, eng.unitNote));
    b.append(note(P.acq.mode === 'measures' ? 'Le membre en 3D est reconstruit à partir de ces mesures (voir les fiches de prise de mesures). Il se met à la taille du patient à chaque modification.' : 'Avec un scan, ces mesures servent au contrôle et au positionnement des zones prédéfinies ; la géométrie reste celle du scan.', P.acq.mode === 'measures' ? 'info' : 'warn'));
    b.append(h('h3', null, 'Longueurs, circonférences et largeurs'));
    eng.fields.forEach(f => b.append(ctl(f.label, 'm.' + f.k, { type: 'range', min: f.min, max: f.max, step: f.step, unit: f.unit, after: p => { p.measuresTouched = true; } })));
    b.append(h('h3', null, 'Données cliniques'));
    eng.clinical.forEach(f => b.append(f.type === 'select' ? ctl(f.label, 'm.' + f.k, { opts: f.opts }) : f.type === 'range' ? ctl(f.label, 'm.' + f.k, { type: 'range', min: f.min, max: f.max, step: f.step }) : ctl(f.label, 'm.' + f.k, { type: 'text' })));
    b.append(btn('Rétablir les valeurs par défaut', () => Store.apply('Mesures par défaut', p => { p.measures[p.family] = ENGINES[p.family].defaults(); }, { kind: 'rerender' }), 'sm'));
    const w = h('div', { id: 'mWarn' }); b.append(h('h3', null, 'Contrôles de cohérence'), w);
    STEP.mesuresO.onBuilt = out => { w.innerHTML = ''; (out.warnings.length ? out.warnings : ['Aucune incohérence détectée automatiquement.']).forEach(t => w.append(note(t, out.warnings.length ? 'warn' : 'info'))); };
    if (A_.out) STEP.mesuresO.onBuilt(A_.out);
  }
};
/* ---------- zones couvertes : choix du type + peinture ---------- */
function coverApplyPreset() {
  const out = A_.out; if (!out || !out.original) return; const P = Store.P, fam = P.family, anat = out.original;
  const mask = orthPreset(Object.assign({}, P, { measures: Object.assign({}, P.measures, { [fam]: Object.assign({}, P.measures[fam], { elbowFlex: 0, wristFlex: 0, kneeFlex: 0 }) }) }), out.nomAnat || anat, out.nomSec || out.sec); Store.apply('Zone couverte : ' + ENGINES[fam].types[P.dev[fam].type].label, p => { p.dev[fam].cover = { nt: anat.nt, rle: rleEnc(mask) }; p.dev[fam].presetApplied = p.dev[fam].type; }, { kind: 'rerender' });
}
function coverCommit() {
  const fam = Store.P.family, mask = new Uint8Array(SEL.mask), nt = SEL.nt; Store.apply('Zone couverte modifiée', p => { p.dev[fam].cover = { nt, rle: rleEnc(mask) }; p.dev[fam].presetApplied = 'manuel'; }, { kind: 'change' });
}
function trunkCoverPreset(quiet) {
  const out = A_.out; if (!out || !out.original || !out.trimType) return; const P = Store.P, anat = out.original, mask = coverPresetMask(anat, out.sec, out.trimType);
  Store.apply('Zone couverte : ' + ENGINES.trunk.types[P.dev.trunk.type].label, p => { p.dev.trunk.cover = { nt: anat.nt, rle: rleEnc(mask) }; p.dev.trunk.presetApplied = p.dev.trunk.type; }, { kind: 'rerender' });
}
function trunkCoverUI(b, P, eng, dev) {
  b.append(h('h2', null, 'Zone couverte par le corset'), h('p', { class: 'sub' }, 'Choisissez un type de corset (zone de départ), puis dessinez : peignez sur le tronc 3D les zones à COUVRIR, effacez celles à laisser libres (fenêtres, découpes, bords). La coque se construit sur la zone peinte. Le cou et les bras sont représentés pour le repérage : ils ne sont pas couverts.'));
  b.append(h('div', { class: 'f' }, h('label', null, 'Type de corset'), h('select', { onchange: e => { const id = e.target.value; Store.apply('Type de corset', p => { const d = p.dev.trunk, t = eng.types[id]; d.type = id; d.redPct = t.red; d.trim = Object.assign({}, t.trim, { smooth: d.trim.smooth, flare: t.flare, fillet: d.trim.fillet }); if (t.trimB) d.trimB = Object.assign({ ant: 0, post: 0, D: 0, G: 0 }, t.trimB); d.zones = d.zones.filter(z => !z.suggested); d.openings = d.openings.filter(o => !o.auto); Object.keys(t.open || {}).forEach(k => d.openings.push({ kind: k, th: k === 'post' ? 180 : 0, w: 40, yFrom: 0, auto: true, on: true })); d.cover = null; d.presetApplied = ''; }, { kind: 'rerender' }); } }, Object.keys(eng.types).map(k => h('option', { value: k, selected: dev.type === k ? true : null }, eng.types[k].label)))));
  b.append(note(eng.types[dev.type].desc, 'info'), h('p', { class: 'sub' }, dev.cover ? 'Zone dessinée à la main.' : 'Zone standard du type : bords définis par l\'étape « Ligne de coupe ».'));
  b.append(h('div', { class: 'btns' }, btn('Dessiner à partir de la zone du type', () => trunkCoverPreset(), 'sm p'), btn('Revenir au profil du type', () => Store.apply('Zone couverte effacée', p => { p.dev.trunk.cover = null; p.dev.trunk.presetApplied = ''; }, { kind: 'rerender' }), 'sm')));
  const v = A_.viewer; selMask(); selHandlers(); v.onPaint = ((orig) => (e, ph) => { orig(e, ph); if (ph === 'up') coverCommit(); })(v.onPaint);
  const tool = (id, label) => h('button', { class: 'btn sm' + (SEL.tool === id ? ' p' : ''), 'data-seltool': id, onclick: () => selSetTool(id) }, label);
  b.append(h('h3', null, 'Dessiner la zone'), btn('⛶ Peindre en plein écran 3D', () => { setMax(true); }, 'sm p mobbtn'), h('div', { class: 'btns' }, tool('paint', '🖌 Couvrir'), tool('erase', '⌫ Libérer'), tool('nav', '✋ Naviguer')));
  b.append(h('div', { class: 'f' }, h('label', null, 'Taille du pinceau (px)'), h('div', { class: 'rg' }, h('input', { type: 'range', min: 8, max: 160, step: 1, value: SEL.brush, oninput: e => { SEL.brush = +e.target.value; selCursor(false); } }))));
  b.append(h('div', { class: 'info', id: 'selInfo' }, ''));
  b.append(h('div', { class: 'btns' }, btn('Inverser', () => { selPush(); for (let i = 0; i < SEL.mask.length; i++) SEL.mask[i] ^= 1; selOverlay(true); coverCommit(); }, 'sm'), btn('↶ Annuler le dernier trait', () => { const m = SEL.hist.pop(); if (m) { SEL.mask.set(m); selOverlay(true); coverCommit(); } else toast('Rien à annuler.'); }, 'sm')));
  b.append(note('Le contour est lissé automatiquement. Les bords haut et bas suivent la zone peinte ; les parties effacées à l\'intérieur deviennent des fenêtres. L\'ouverture avant du type reste réglable dans « Ligne de coupe ». Tournez le modèle (✋) pour peindre le dos et les côtés.', 'info'));
  selSetTool(SEL.tool); selInfo(); setTimeout(() => selOverlay(true), 0);
}
STEP.cover = {
  label: 'Zones couvertes', layers: { anat: 1, shell: 1, liner: 1, comps: 1 }, layerAlpha: { anat: .55, shell: .55 },
  leave() { const v = A_.viewer; setMax(false); const dk = document.getElementById('dock'); if (dk) dk.hidden = true; v.paintMode = false; v.onHover = null; v.onPaint = null; hint(''); selCursor(false); A_.curStepId = null; SEL.target = 'scan'; putMesh('selhl', 'anat', null); v.dirty = true; },
  render(b) {
    const P = Store.P, fam = P.family, eng = ENGINES[fam], dev = P.dev[fam]; A_.curStepId = 'cover'; SEL.target = 'cover'; SEL.src = null;
    if (fam === 'trunk') { trunkCoverUI(b, P, eng, dev); return; }
    b.append(h('h2', null, 'Zones couvertes par l\'orthèse'), h('p', { class: 'sub' }, 'Choisissez un type d\'orthèse (zone de départ), puis dessinez : peignez sur le membre 3D les zones à COUVRIR, effacez celles à laisser libres. La coque se construit sur la zone peinte et épouse la forme du membre.'));
    b.append(h('div', { class: 'f' }, h('label', null, 'Type d\'orthèse'), h('select', { onchange: e => { const t = e.target.value; Store.apply('Type d\'orthèse', p => { const d = p.dev[p.family]; d.type = t; if (t === 'afo_art') { d.hinge.on = true; d.hinge.joint = 'cheville'; } if (t === 'genou_art') { d.hinge.on = true; d.hinge.joint = 'genou'; } }, { kind: 'rerender' }); coverApplyPreset(); } }, Object.keys(eng.types).map(k => h('option', { value: k, selected: dev.type === k ? true : null }, eng.types[k].label)))));
    b.append(note(eng.types[dev.type].desc + (dev.presetApplied && dev.presetApplied !== dev.type ? ' (zone modifiée à la main)' : ''), 'info'));
    if (fam === 'ocep') b.append(faceBlock());
    if (fam === 'oinf') {
      const setFoot = (key, v) => { Store.apply('Pied : ' + key, p => { p.dev[p.family][key] = v; }, { kind: 'rerender' }); if (Store.P.dev[Store.P.family].presetApplied !== 'manuel') coverApplyPreset(); };
      b.append(h('div', { class: 'f' }, h('label', null, 'Étendue de la semelle (pied)'), h('select', { onchange: e => setFoot('footExt', e.target.value) }, [['heel', 'Talon seul (coque talonnière)'], ['mid', 'Jusqu\'au médio-pied'], ['mt', 'Jusqu\'aux têtes métatarsiennes (orteils libres)'], ['toes', 'Orteils inclus']].map(x => h('option', { value: x[0], selected: orthFootExt(dev) === x[0] ? true : null }, x[1])))),
        h('div', { class: 'f' }, h('label', null, 'Hauteur des rebords du pied : ' + (dev.wall == null ? 22 : dev.wall) + ' mm'), h('input', { type: 'range', min: 0, max: 60, step: 1, value: dev.wall == null ? 22 : dev.wall, onchange: e => setFoot('wall', +e.target.value) })));
    }
    // réglages de hauteur et d'enveloppement des orthèses prédéfinies (appliqués à la zone du type)
    { const T = dev.type, m = P.measures[fam], Yv = ORTH_Y[fam === 'osup' ? 'sup' : fam === 'ocep' ? 'ocep' : 'inf'](m);
      const topT = fam === 'ocep' ? ['collier_mou', 'philadelphia', 'minerve', 'somi', 'masque_facial'] : fam === 'osup' ? ['attelle_poignet', 'repos_main', 'avant_bras', 'coude'] : ['afo_post', 'afo_coque', 'afo_art', 'genou', 'genou_art', 'jambiere', 'stirrup', 'botte'];
      const loT = fam === 'ocep' ? ['collier_mou', 'philadelphia', 'minerve', 'somi', 'casque_remodelage', 'casque_protection', 'masque_facial'] : fam === 'osup' ? ['attelle_poignet', 'avant_bras', 'coude'] : ['genou', 'genou_art', 'jambiere'];
      const wrT = fam === 'ocep' ? ['philadelphia', 'minerve', 'somi', 'masque_facial'] : fam === 'osup' ? ['attelle_poignet', 'repos_main', 'avant_bras', 'coude'] : ['afo_post', 'afo_coque', 'afo_art', 'genou', 'genou_art', 'jambiere', 'stirrup', 'botte'];
      const setPar = (key, v) => { Store.apply('Réglage : ' + key, p => { p.dev[p.family][key] = v; }, { kind: 'rerender' }); if (Store.P.dev[Store.P.family].presetApplied !== 'manuel') coverApplyPreset(); };
      const sl = (label, key, min, max) => { const val = dev[key] || 0; return h('div', { class: 'f' }, h('label', null, label + ' : ' + (val > 0 ? '+' : '') + val + (key === 'wrap' ? ' °' : ' mm')), h('input', { type: 'range', min, max, step: key === 'wrap' ? 1 : 5, value: val, onchange: e => setPar(key, +e.target.value) })); };
      const defTop = { afo_post: Yv.yK - 55, afo_coque: Yv.yK - 55, afo_art: Yv.yK - 55, genou: Yv.yK + 110, genou_art: Yv.yK + 110, jambiere: Yv.yK - 35, stirrup: Yv.yA + 120, botte: Yv.yK - 55 };
      const defTopS = { attelle_poignet: Yv.yW + m.lenFore * .55, repos_main: Yv.yE - 60, avant_bras: Yv.yE - 28, coude: Yv.yE + 120 };
      if (topT.includes(T) || wrT.includes(T)) b.append(h('h3', null, 'Hauteur et enveloppement'));
      if (topT.includes(T)) { sl_top(); }
      function sl_top() {
        b.append(sl('Prolongement du bord supérieur', 'hTop', -150, 200));
        if (fam === 'ocep') return;
        const top = fam === 'osup' ? defTopS[T] + (dev.hTop || 0) : defTop[T] + (dev.hTop || 0);
        if (fam === 'oinf') b.append(h('div', { class: 'sub', style: 'margin:-4px 0 8px' }, 'Bord supérieur à ' + Math.round(top) + ' mm du sol'));
        else { const d = Math.round(Yv.yE - top); b.append(h('div', { class: 'sub', style: 'margin:-4px 0 8px' }, d >= 0 ? 'Bord supérieur à ' + d + ' mm sous l\'olécrâne' : 'Bord supérieur à ' + (-d) + ' mm au-dessus de l\'olécrâne')); }
      }
      if (loT.includes(T)) b.append(sl('Prolongement du bord inférieur', 'hLo', -100, 150));
      if (wrT.includes(T)) b.append(sl('Enveloppement latéral', 'wrap', -40, 60));
      if (topT.includes(T) || wrT.includes(T)) b.append(note('0 = hauteur et enveloppement standards du type. Positif : l\'orthèse monte plus haut, descend plus bas ou enveloppe davantage le membre. Pour retoucher à la main, peignez ensuite sur le membre.', 'info'));
    }
    b.append(h('div', { class: 'btns' }, btn('Appliquer la zone du type choisi', coverApplyPreset, 'sm p'), btn('Tout effacer', () => { Store.apply('Zone couverte effacée', p => { p.dev[p.family].cover = null; p.dev[p.family].presetApplied = ''; }, { kind: 'rerender' }); }, 'sm')));
    const out = A_.out; selMask(); const v = A_.viewer; selHandlers(); v.onPaint = ((orig) => (e, ph) => { orig(e, ph); if (ph === 'up') coverCommit(); })(v.onPaint);
    const tool = (id, label) => h('button', { class: 'btn sm' + (SEL.tool === id ? ' p' : ''), 'data-seltool': id, onclick: () => selSetTool(id) }, label);
    b.append(h('h3', null, 'Dessiner la zone'), btn('⛶ Peindre en plein écran 3D', () => { setMax(true); }, 'sm p mobbtn'), h('div', { class: 'btns' }, tool('paint', '🖌 Couvrir'), tool('erase', '⌫ Libérer'), tool('nav', '✋ Naviguer')));
    b.append(h('div', { class: 'f' }, h('label', null, 'Taille du pinceau (px)'), h('div', { class: 'rg' }, h('input', { type: 'range', min: 8, max: 160, step: 1, value: SEL.brush, oninput: e => { SEL.brush = +e.target.value; selCursor(false); } }))));
    b.append(h('div', { class: 'info', id: 'selInfo' }, ''));
    b.append(h('div', { class: 'btns' }, btn('Inverser', () => { selPush(); for (let i = 0; i < SEL.mask.length; i++) SEL.mask[i] ^= 1; selOverlay(true); coverCommit(); }, 'sm'), btn('↶ Annuler le dernier trait', () => { const m = SEL.hist.pop(); if (m) { SEL.mask.set(m); selOverlay(true); coverCommit(); } else toast('Rien à annuler.'); }, 'sm')));
    b.append(note('Astuce : tournez le modèle (outil Naviguer, ou Ctrl/Alt + glisser) pour peindre les faces cachées. Les contours sont lissés automatiquement à la construction.', 'info'));
    selSetTool(SEL.tool); selInfo(); setTimeout(() => selOverlay(true), 0);
  }
};
/* ---------- charges / décharges ---------- */
function loadCommit() {
  const fam = Store.P.family, mask = new Uint8Array(SEL.mask), nt = SEL.nt, i = SEL.loadIdx;
  Store.apply('Zone libre modifiée', p => { const z = p.dev[fam].loads[i]; if (z) { z.rle = rleEnc(mask); z.nt = nt; } }, { kind: 'change' });
}
function loadZoneMask(z, W, lmList) {
  const m = new Uint8Array(W.nt); if (z.src === 'lm') {
    const lm = lmList.find(l => l.id === z.lm); if (!lm) return m; const R = z.r.map(x => x * (z.scale || 1));
    for (let t = 0; t < W.nt; t++) { const a = W.f[t * 3] * 3, b = W.f[t * 3 + 1] * 3, c = W.f[t * 3 + 2] * 3, dx = ((W.v[a] + W.v[b] + W.v[c]) / 3 - lm.pos[0]) / R[0], dy = ((W.v[a + 1] + W.v[b + 1] + W.v[c + 1]) / 3 - lm.pos[1]) / R[1], dz = ((W.v[a + 2] + W.v[b + 2] + W.v[c + 2]) / 3 - lm.pos[2]) / R[2]; if (dx * dx + dy * dy + dz * dz < .55) m[t] = 1; }
  } else if (z.rle && z.nt === W.nt) return rleDec(z.rle, W.nt);
  return m;
}
function maskOverlayMesh(W, masks) {
  let n = 0; masks.forEach(m => { for (let i = 0; i < m.length; i++) n += m[i]; }); if (!n) return null;
  const pos = new Float32Array(n * 18), idx = new Uint32Array(n * 6); let j = 0;
  masks.forEach(m => { for (let i = 0; i < m.length; i++) if (m[i]) {
    const a = W.f[i * 3] * 3, b = W.f[i * 3 + 1] * 3, c = W.f[i * 3 + 2] * 3, ux = W.v[b] - W.v[a], uy = W.v[b + 1] - W.v[a + 1], uz = W.v[b + 2] - W.v[a + 2], wx = W.v[c] - W.v[a], wy = W.v[c + 1] - W.v[a + 1], wz = W.v[c + 2] - W.v[a + 2];
    let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx; const l = Math.hypot(nx, ny, nz) || 1; nx *= .5 / l; ny *= .5 / l; nz *= .5 / l;
    [1, -1].forEach((sg, s2) => [a, b, c].forEach((q, k) => { const o = (j * 2 + s2) * 9 + k * 3; pos[o] = W.v[q] + sg * nx; pos[o + 1] = W.v[q + 1] + sg * ny; pos[o + 2] = W.v[q + 2] + sg * nz; idx[(j * 2 + s2) * 3 + k] = (j * 2 + s2) * 3 + k; })); j++;
  } });
  return new Mesh(pos, idx);
}
function loadsOverlay() {
  const out = A_.out, v = A_.viewer; if (!out || !out.original || A_.curStepId !== 'charges') return; const W = out.original, loads = Store.P.dev[Store.P.family].loads || [], R = [], C = [];
  loads.forEach((z, i) => { if (z.off || (SEL.target === 'load' && i === SEL.loadIdx && z.src === 'paint')) return; (z.kind === 'load' ? C : R).push(loadZoneMask(z, W, out.landmarkList || [])); });
  putMesh('loadR', 'anat', maskOverlayMesh(W, R), [1, .45, .25], { noClip: true, noPick: true, baseAlpha: .7 }); putMesh('loadC', 'anat', maskOverlayMesh(W, C), [.3, .6, 1], { noClip: true, noPick: true, baseAlpha: .7 }); applyLayers(); v.dirty = true;
}
STEP.charges = {
  label: 'Charges / décharges', layers: { anat: 1, shell: 1, liner: 1, comps: 1 }, layerAlpha: { anat: .6, shell: .45 },
  leave() { const v = A_.viewer; setMax(false); const dk = document.getElementById('dock'); if (dk) dk.hidden = true; v.paintMode = false; v.onHover = null; v.onPaint = null; hint(''); selCursor(false); A_.curStepId = null; SEL.target = 'scan'; putMesh('selhl', 'anat', null); putMesh('loadR', 'anat', null); putMesh('loadC', 'anat', null); v.dirty = true; },
  render(b) {
    const P = Store.P, fam = P.family, dev = P.dev[fam], cat = ORTH_ZONES[fam], lmIds = new Set(((A_.out && A_.out.landmarkList) || []).map(l => l.id)); A_.curStepId = 'charges'; SEL.target = 'load'; SEL.src = null; dev.loads = dev.loads || [];
    if (SEL.loadIdx == null || !dev.loads[SEL.loadIdx]) SEL.loadIdx = Math.max(0, dev.loads.findIndex(z => z.src === 'paint')); if (!dev.loads[SEL.loadIdx]) SEL.loadIdx = null;
    b.append(h('h2', null, 'Charges et décharges'), h('p', { class: 'sub' }, 'Décharge (rouge) : la coque s\'écarte de la peau et forme une poche sur les zones sensibles (saillies osseuses, nerfs, cicatrices, plaies). Charge (bleu) : la coque s\'appuie davantage (pelote, soutien de voûte, appuis à 3 points). Les zones n\'agissent que sur la partie couverte par la coque.'));
    b.append(h('h3', null, 'Zones anatomiques prédéfinies'));
    const has = c => dev.loads.some(z => z.cid === c.id);
    const toggle = c => Store.apply((has(c) ? 'Zone retirée : ' : 'Zone ajoutée : ') + c.label, p => { const d = p.dev[p.family]; d.loads = d.loads || []; const i = d.loads.findIndex(z => z.cid === c.id); if (i >= 0) d.loads.splice(i, 1); else d.loads.push({ id: 'z' + Date.now().toString(36) + Math.floor(Math.random() * 99), cid: c.id, src: 'lm', lm: c.lm, label: c.label, kind: c.kind, mm: c.mm, r: c.r.slice(), scale: 1, off: false }); }, { kind: 'rerender' });
    ['relief', 'load'].forEach(k => { b.append(h('div', { class: 'sub', style: 'margin:8px 0 4px' }, k === 'relief' ? 'Décharges' : 'Charges'), h('div', { class: 'chips' }, cat.filter(c => c.kind === k).map(c => { const ok = lmIds.has(c.lm); return h('button', { class: 'chip' + (has(c) ? ' on' : ''), disabled: !ok || null, title: ok ? c.label : 'Repère absent (scan : placez-le ou utilisez les mesures)', onclick: () => toggle(c) }, h('span', { class: 'dot', style: 'background:' + (k === 'relief' ? '#ff7340' : '#4d99ff') }), c.label.replace(/^(Décharge|Charge) ?:? ?/, '')); }))); });
    b.append(h('h3', null, 'Zones actives (' + dev.loads.length + ')'));
    if (!dev.loads.length) b.append(note('Aucune zone : choisissez des zones ci-dessus ou créez une zone libre à peindre.', 'info'));
    dev.loads.forEach((z, i) => {
      const act = SEL.loadIdx === i && z.src === 'paint';
      b.append(h('div', { class: 'card2' + (act ? ' sel' : '') }, h('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' }, h('span', { class: 'dot', style: 'background:' + (z.kind === 'load' ? '#4d99ff' : '#ff7340') }), h('b', { style: 'flex:1;min-width:120px' }, z.label), h('span', { class: 'tag' }, z.src === 'lm' ? 'anatomique' : 'dessinée'),
        btn(z.off ? 'Activer' : 'Désactiver', () => Store.apply('Zone ' + (z.off ? 'activée' : 'désactivée'), p => { p.dev[p.family].loads[i].off = !z.off; }, { kind: 'rerender' }), 'sm'), btn('✕', () => { if (SEL.loadIdx === i) SEL.loadIdx = null; Store.apply('Zone supprimée : ' + z.label, p => { p.dev[p.family].loads.splice(i, 1); }, { kind: 'rerender' }); }, 'sm d')),
        ctl('Type', 'dev.loads.' + i + '.kind', { opts: [['relief', 'Décharge (la coque s\'écarte)'], ['load', 'Charge (la coque appuie)']], rerender: true }),
        ctl('Intensité', 'dev.loads.' + i + '.mm', { type: 'range', min: .5, max: 10, step: .5, unit: 'mm' }),
        z.src === 'lm' ? ctl('Taille de la zone (×)', 'dev.loads.' + i + '.scale', { type: 'range', min: .5, max: 2.5, step: .1 }) : h('div', { class: 'btns' }, btn(act ? '🖌 Zone en cours de dessin' : '🖌 Dessiner cette zone', () => { SEL.loadIdx = i; SEL.mask = null; renderPanel(true); }, act ? 'sm p' : 'sm'), btn('Effacer le tracé', () => { Store.apply('Tracé effacé', p => { const q = p.dev[p.family].loads[i]; q.rle = null; q.nt = 0; }, { kind: 'rerender' }); SEL.mask = null; }, 'sm'))));
    });
    b.append(h('div', { class: 'btns' }, btn('+ Zone libre : décharge', () => addFree('relief'), 'sm'), btn('+ Zone libre : charge', () => addFree('load'), 'sm')));
    function addFree(kind) { Store.apply('Zone libre ajoutée', p => { const d = p.dev[p.family]; d.loads = d.loads || []; d.loads.push({ id: 'z' + Date.now().toString(36), src: 'paint', label: 'Zone libre ' + (d.loads.length + 1), kind, mm: 3, rle: null, nt: 0, off: false }); SEL.loadIdx = d.loads.length - 1; SEL.mask = null; }, { kind: 'rerender' }); }
    const z = dev.loads[SEL.loadIdx];
    if (z && z.src === 'paint') {
      selMask(); const v = A_.viewer; selHandlers(); v.onPaint = ((orig) => (e, ph) => { orig(e, ph); if (ph === 'up') loadCommit(); })(v.onPaint);
      const tool = (id, label) => h('button', { class: 'btn sm' + (SEL.tool === id ? ' p' : ''), 'data-seltool': id, onclick: () => selSetTool(id) }, label);
      b.append(h('h3', null, 'Dessiner : ' + z.label), btn('⛶ Peindre en plein écran 3D', () => { setMax(true); }, 'sm p mobbtn'), h('div', { class: 'btns' }, tool('paint', '🖌 Peindre'), tool('erase', '⌫ Gomme'), tool('nav', '✋ Naviguer')),
        h('div', { class: 'f' }, h('label', null, 'Taille du pinceau (px)'), h('div', { class: 'rg' }, h('input', { type: 'range', min: 8, max: 160, step: 1, value: SEL.brush, oninput: e => { SEL.brush = +e.target.value; selCursor(false); } }))), h('div', { class: 'info', id: 'selInfo' }, ''),
        h('div', { class: 'btns' }, btn('↶ Annuler le dernier trait', selUndo, 'sm')));
      selSetTool(SEL.tool); selInfo(); setTimeout(() => selOverlay(true), 0);
    } else { A_.viewer.paintMode = false; putMesh('selhl', 'anat', null); }
    setTimeout(loadsOverlay, 0);
    STEP.charges.onBuilt = out => { loadsOverlay(); };
  }
};
/* ---------- paramètres de l'orthèse ---------- */
STEP.orthese = {
  label: 'Orthèse', layers: { anat: 1, shell: 1, liner: 1, comps: 1 }, layerAlpha: { anat: .35 },
  render(b) {
    const P = Store.P, fam = P.family, dev = P.dev[fam], m = P.measures[fam];
    b.append(h('h2', null, 'Paramètres de l\'orthèse'), h('p', { class: 'sub' }, 'Épaisseurs, jeu, doublure, aération et sangles. La coque suit la zone peinte à l\'étape précédente.'));
    b.append(h('h3', null, 'Coque'), ctl('Matériau (documentaire)', 'dev.material', { opts: [['PETG / polypropylène', 'PETG / polypropylène'], ['Polypropylène thermoformé', 'Polypropylène thermoformé'], ['Composite carbone', 'Composite carbone'], ['Résine / nylon (impression 3D)', 'Résine / nylon (impression 3D)']] }));
    b.append(ctl('Épaisseur de coque', 'dev.thick', { type: 'range', min: 1.5, max: 8, step: 0.5, unit: 'mm' }), ctl('Jeu fonctionnel peau → doublure', 'dev.gap', { type: 'range', min: 0, max: 6, step: 0.5, unit: 'mm' }), ctl('Doublure / mousse de confort (0 = aucune)', 'dev.pad', { type: 'range', min: 0, max: 8, step: 0.5, unit: 'mm' }));
    b.append(ctl('Épaisseur au bord (fraction, bord aminci)', 'dev.taper', { type: 'range', min: .3, max: 1, step: .05 }), ctl('Lissage du contour (passes)', 'dev.rim', { type: 'range', min: 0, max: 10, step: 1 }), ctl('Nettoyage de la zone peinte (passes)', 'dev.clean', { type: 'range', min: 0, max: 4, step: 1 }));
    b.append(h('h3', null, 'Aération'), ctl('Perforations d\'aération', 'dev.vent.on', { type: 'check', rerender: true }));
    if (dev.vent.on) b.append(ctl('Rayon des trous', 'dev.vent.r', { type: 'range', min: 2, max: 12, step: 0.5, unit: 'mm' }), ctl('Pas entre trous', 'dev.vent.s', { type: 'range', min: 8, max: 40, step: 1, unit: 'mm' }), ctl('Marge au bord', 'dev.vent.margin', { type: 'range', min: 4, max: 30, step: 1, unit: 'mm' }));
    b.append(h('h3', null, 'Sangles'), ctl('Afficher / exporter les sangles', 'dev.strapOn', { type: 'check', rerender: true }));
    if (dev.strapOn) {
      dev.straps.forEach((s, i) => b.append(h('div', { class: 'card2' }, h('b', null, 'Sangle ' + (i + 1)), ctl('Position (0 = bas de la coque, 1 = haut)', 'dev.straps.' + i + '.pos', { type: 'range', min: 0, max: 1, step: 0.01 }), ctl('Largeur', 'dev.straps.' + i + '.w', { type: 'range', min: 10, max: 60, step: 1, unit: 'mm' }), btn('Supprimer', () => Store.apply('Sangle supprimée', p => { p.dev[p.family].straps.splice(i, 1); }, { kind: 'rerender' }), 'sm d'))));
      b.append(btn('+ Ajouter une sangle', () => Store.apply('Sangle ajoutée', p => { p.dev[p.family].straps.push({ pos: .5, w: 25 }); }, { kind: 'rerender' }), 'sm'), ctl('Épaisseur des sangles', 'dev.strapT', { type: 'range', min: 1, max: 5, step: 0.5, unit: 'mm' }));
    }
    b.append(h('h3', null, 'Articulation mécanique (charnières)'), ctl('Ajouter des charnières (disque d\'axe + montants)', 'dev.hinge.on', { type: 'check', rerender: true }));
    if (dev.hinge.on) { const J = ORTH_JOINTS[fam], jj = J[dev.hinge.joint] || J[Object.keys(J)[0]];
      b.append(ctl('Articulation', 'dev.hinge.joint', { opts: Object.keys(J).map(k => [k, J[k].label]), rerender: true }), ctl('Côtés', 'dev.hinge.side', { opts: [['both', 'Latéral et médial'], ['lat', 'Latéral seul'], ['med', 'Médial seul']] }),
        ctl('Diamètre du disque d\'axe', 'dev.hinge.d', { type: 'range', min: 10, max: 30, step: 1, unit: 'mm' }), ctl('Diamètre des montants', 'dev.hinge.bar', { type: 'range', min: 4, max: 12, step: .5, unit: 'mm' }),
        ctl('Longueur du montant proximal', 'dev.hinge.up', { type: 'range', min: 30, max: 250, step: 5, unit: 'mm' }), ctl('Longueur du montant distal', 'dev.hinge.dn', { type: 'range', min: 20, max: 200, step: 5, unit: 'mm' }),
        ctl(jj.a, 'dev.hinge.stopA', { type: 'range', min: 0, max: 90, step: 1, unit: '°' }), ctl(jj.b, 'dev.hinge.stopB', { type: 'range', min: 0, max: 90, step: 1, unit: '°' }), note('Les butées sont consignées dans le rapport ; seul l\'axe et les montants sont modélisés.', 'info')); }
    const w = h('div', { id: 'oWarn' }); b.append(h('h3', null, 'Contrôles'), w);
    STEP.orthese.onBuilt = out => { w.innerHTML = ''; w.append(h('dl', { class: 'kv' }, h('dt', null, 'Triangles couverts'), h('dd', null, String(out.coverCount || 0)), h('dt', null, 'Volume de la coque'), h('dd', null, out.stats.volShell + ' cm³'), h('dt', null, 'Coque fermée'), h('dd', null, out.shellClosed.closed ? 'oui' : 'non'))); out.warnings.forEach(t => w.append(note(t, 'warn'))); };
    if (A_.out) STEP.orthese.onBuilt(A_.out);
  }
};
/* ---------- export ---------- */
function buildOrthReport(P, out, shot) {
  const eng = ENGINES[P.family], dev = P.dev[P.family], m = P.measures[P.family], mt = P.meta, t = eng.types[dev.type], esc_ = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])), row = (k, v) => `<tr><th>${esc_(k)}</th><td>${esc_(v)}</td></tr>`;
  const fields = eng.fields.map(f => row(f.label, m[f.k] + ' ' + f.unit)).join(''), clin = eng.clinical.map(f => row(f.label, f.type === 'select' ? ((f.opts.find(o => o[0] === m[f.k]) || [])[1] || m[f.k]) : m[f.k])).join('');
  return `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Rapport ${esc_(eng.label)}</title><style>body{font:14px/1.5 system-ui,Arial;margin:24px auto;max-width:900px;color:#111;padding:0 16px}h2{border-bottom:2px solid #123;padding-bottom:3px;margin-top:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:3px 6px;text-align:left;font-size:13px}th{background:#eef;width:45%}img{max-width:100%;border:1px solid #888}@media print{.np{display:none}}</style><body><button class="np" onclick="print()">Imprimer / PDF</button>
<h1>JophyOrtho 3D — Rapport d'orthèse</h1><p>${esc_(new Date().toLocaleString(LOC()))} · <b>${esc_(eng.label)}</b> · ${esc_(t.label)} · ${esc_(PROVENANCE[out.prov])}</p>${shot ? `<img alt="Vue 3D" src="${shot}">` : ''}
<h2>Dossier</h2><table>${row('Identifiant', mt.id)}${row('Patient', mt.anon ? '(anonymisé)' : mt.name)}${row('Date', mt.date)}${row('Côté', mt.side === 'D' ? 'Droit' : 'Gauche')}${row('Prescription', mt.prescription)}${row('Observations', mt.obs)}</table>
<h2>Mesures</h2><table>${fields}</table><h2>Données cliniques</h2><table>${clin}</table>
<h2>Orthèse</h2><table>${row('Type', t.label)}${row('Matériau', dev.material)}${row('Épaisseur de coque', dev.thick + ' mm')}${row('Jeu', dev.gap + ' mm')}${row('Doublure', dev.pad + ' mm')}${row('Aération', dev.vent.on ? `trous Ø${dev.vent.r * 2} mm, pas ${dev.vent.s} mm` : 'non')}${row('Sangles', dev.strapOn ? dev.straps.map(s => `${Math.round(s.pos * 100)} % (${s.w} mm)`).join(' · ') : 'non')}${row('Triangles couverts', out.coverCount)}${row('Volume de coque', out.stats.volShell + ' cm³')}</table>
<h2>Charges et décharges</h2>${(dev.loads || []).length ? '<table>' + dev.loads.map(z => row(z.label + (z.off ? ' (désactivée)' : ''), (z.kind === 'load' ? 'Charge ' : 'Décharge ') + z.mm + ' mm' + (z.src === 'lm' ? ' · taille ×' + (z.scale || 1) : ' · zone dessinée'))).join('') + '</table>' : '<p>Aucune zone.</p>'}${dev.hinge && dev.hinge.on ? '<h2>Articulation</h2><table>' + row('Articulation', (ORTH_JOINTS[P.family][dev.hinge.joint] || {}).label) + row('Côtés', dev.hinge.side) + row('Disque / montants', dev.hinge.d + ' mm / Ø' + dev.hinge.bar + ' mm') + row((ORTH_JOINTS[P.family][dev.hinge.joint] || {}).a, dev.hinge.stopA + '°') + row((ORTH_JOINTS[P.family][dev.hinge.joint] || {}).b, dev.hinge.stopB + '°') + '</table>' : ''}<h2>Avertissements</h2><ul>${out.warnings.map(w => '<li>' + esc_(w) + '</li>').join('') || '<li>Aucun</li>'}</ul><h2>Historique (${P.log.length})</h2><ol style="font-size:12px">${P.log.slice(-50).map(l => `<li>${esc_(l.t.slice(0, 19))} — ${esc_(l.op)}</li>`).join('')}</ol>${creditHTML()}</body></html>`;
}
STEP.exportO = {
  label: 'Export et rapport', layers: { anat: 0, shell: 1, liner: 1, comps: 1 },
  render(b) {
    const ex = (t, kind) => btn(t, () => { const r = exportSTL(Store.P, A_.out, kind); toast(r.msg, 7000); }, '');
    b.append(h('h2', null, 'Export, sauvegarde et rapport'), h('h3', null, 'Orientation des fichiers exportés'), ctl('Orientation', 'meta.exportUp', { opts: [['Z', 'Debout : Z vers le haut (CAD, impression 3D, Meshmixer…) — recommandé'], ['Y', 'Repère de l\'application : Y vers le haut']] }));
    b.append(h('h3', null, 'Lissage de la surface'), ctl('Lissage avant export STL', 'meta.exportSmooth', { opts: [['0', 'Aucun (maillage tel que calculé)'], ['1', 'Léger (atténue les facettes)'], ['2', 'Moyen (surfaces lisses pour l\'impression 3D)'], ['3', 'Fort (très lisse ; peut arrondir légèrement les détails)']] }), h('p', { class: 'sub' }, 'Le lissage s\'applique à la coque, à la doublure et à l\'anatomie exportées, pas aux sangles, connecteurs et autres composants. Les bords (rebord, découpes) restent inchangés.'));
    b.append(h('h3', null, 'STL'), h('div', { class: 'btns' }, ex('Orthèse complète (coque + sangles)', 'orth'), ex('Coque seule', 'orthshell'), ex('Doublure', 'orthliner'), ex('Anatomie du membre', 'anat')));
    b.append(h('h3', null, 'Projet'), h('div', { class: 'btns' }, btn('Exporter le dossier complet (JSON)', () => { exportProject(Store.P, Store.ctx.scan && Store.ctx.scan.original, false); toast('Dossier exporté.'); }, 'p'), btn('Enregistrer dans ce navigateur', async () => { try { await DB.saveProject(Store.P); toast('Dossier enregistré dans ce navigateur.'); } catch (e) { toast('Enregistrement impossible : ' + e.message, 6000); } }, '')));
    b.append(h('h3', null, 'Rapport'), h('div', { class: 'btns' }, btn('Ouvrir le rapport (imprimable / PDF)', () => openReport(false), 'p'), btn('Télécharger le rapport HTML', () => openReport(true), '')));
  }
};

/* ---------- visage personnalisé (photo de face) ---------- */
function faceBlock() {
  const ft = Store.P.faceTex, box = h('div', { class: 'f' });
  box.append(h('h3', null, 'Visage (photo)'), note('Importez une photo de face : elle est posée en couleur sur le visage 3D (œil, bouche, teint). La forme reste celle des mesures de la tête. La photo reste sur cet appareil.', 'info'));
  const inp = h('input', { type: 'file', accept: 'image/*', style: 'display:none', onchange: e => { const f = e.target.files[0]; if (f) facePlace(f); e.target.value = ''; } });
  box.append(inp, btn(ft ? 'Changer la photo du visage' : 'Importer ma photo de visage', () => inp.click()));
  if (ft) box.append(btn('Refaire le placement', () => facePlace(null)), btn('Retirer la photo', () => Store.apply('Photo du visage retirée', p => { delete p.faceTex; }, { kind: 'rerender' })));
  return box;
}
function facePlace(file) {
  const go = src => {
    const im = new Image(); im.onload = () => {
      const sc = Math.min(1, 720 / Math.max(im.width, im.height)), W = Math.round(im.width * sc), H = Math.round(im.height * sc), c0 = document.createElement('canvas'); c0.width = W; c0.height = H; c0.getContext('2d').drawImage(im, 0, 0, W, H);
      const data = c0.toDataURL('image/jpeg', .88), pts = [], steps = ['1/3 : touchez le CENTRE de l\'œil gauche de la photo', '2/3 : touchez le CENTRE de l\'œil droit de la photo', '3/3 : touchez le CENTRE de la bouche (fente des lèvres)'];
      const cv = h('canvas', { width: W, height: H, style: 'max-width:100%;height:auto;touch-action:none;border-radius:8px;cursor:crosshair' }), g = cv.getContext('2d'), msg = h('div', { class: 'info' }, steps[0]);
      const draw = () => { g.drawImage(c0, 0, 0); pts.forEach((p, i) => { g.strokeStyle = ['#4cf', '#4cf', '#f84'][i]; g.lineWidth = Math.max(2, W / 200); g.beginPath(); g.arc(p[0], p[1], W / 40, 0, 7); g.moveTo(p[0] - W / 28, p[1]); g.lineTo(p[0] + W / 28, p[1]); g.moveTo(p[0], p[1] - W / 28); g.lineTo(p[0], p[1] + W / 28); g.stroke(); }); };
      const ok = btn('Valider', () => { if (pts.length < 3) return; Store.apply('Photo du visage', p => { p.faceTex = { img: data, pts: pts.map(q => q.slice()) }; }, { kind: 'rerender' }); closeModal(); }); ok.disabled = true;
      cv.onpointerdown = e => { if (pts.length >= 3) return; const r = cv.getBoundingClientRect(); pts.push([(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]); draw(); msg.textContent = pts.length < 3 ? steps[pts.length] : 'Placement terminé : validez, ou recommencez.'; ok.disabled = pts.length < 3; };
      draw(); modal([h('h3', null, 'Placer la photo sur le visage'), msg, cv, h('div', { class: 'row' }, btn('Recommencer', () => { pts.length = 0; draw(); msg.textContent = steps[0]; ok.disabled = true; }), ok, btn('Annuler', closeModal))]);
    }; im.src = src;
  };
  if (file) { const r = new FileReader(); r.onload = () => go(r.result); r.readAsDataURL(file); } else if (Store.P.faceTex) go(Store.P.faceTex.img);
}
