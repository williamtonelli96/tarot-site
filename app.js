(() => {
  const D = window.TAROT, TR = D.tracks;
  // Figma salva i tempi in mezzi-microsecondi: data.js è già in secondi "dimezzati".
  // Se nel prototipo Figma la durata ti sembra la metà/il doppio, cambia TIME_SCALE (0.5 = più lento, 2 = più veloce).
  const TIME_SCALE = 1;
  const PERSPECTIVE = 1000;   // px: prospettiva della rotazione 3D della carta
  const ROT_SIGN = -1;        // -1 = antiorario (convenzione Figma), 1 = orario
  const CARTA_ZOOM = 3;     // ingrandimento finale della carta rispetto a Figma (1 = originale)
  const CARTA_GAP = 0.1;     // distanza carta-paragrafo, in frazione dell'altezza dello schermo

  const $ = id => document.getElementById(id);
  const el = (cls, parent, css) => { const d = document.createElement('div'); d.className = cls; if (css) Object.assign(d.style, css); parent && parent.appendChild(d); return d; };

  // --- immagine di una faccia, ritagliata come il "fill" di Figma (transform STRETCH) ---
  function face(parent, src, x, w, h, crop) {
    const f = el('face', parent, { left: x + 'px', top: 0, width: w + 'px', height: h + 'px' });
    const [sx, tx, sy, ty] = crop, im = new Image();
    im.src = src; im.alt = ''; im.draggable = false;
    Object.assign(im.style, { width: w / sx + 'px', height: h / sy + 'px', left: -tx / sx * w + 'px', top: -ty / sy * h + 'px' });
    f.appendChild(im); return f;
  }
  const BACK = 'assets/card-back.webp', FACE = 'assets/card-face.webp';

  // --- anello di 22 carte (ripetizione radiale) ---
  const ring = $('ring'), R = D.ring, [cx, cy, cw, ch] = R.card, ringCards = [];
  for (let i = 0; i < R.count; i++) {
    const c = el('ring-card', ring, { left: cx + 'px', top: cy + 'px', width: cw + 'px', height: ch + 'px',
      transformOrigin: (R.box[2] / 2 - cx) + 'px ' + (R.box[2] / 2 - cy) + 'px', transform: `rotate(${360 / R.count * i}deg)` });
    face(c, BACK, R.top[0], R.top[1], ch, D.crop.back);
    ringCards.push(c);
  }

  // --- carta scelta: prende il posto della prima carta dell'anello (ringCards[0]) ---
  const fan = $('fan'), F = D.fan;
  const carta = el('carta', fan, { left: D.carta.at[0] + 'px', top: D.carta.at[1] + 'px' });
  const body = el('carta-body', carta, { borderRadius: D.radius + 'px' });
  face(body, FACE, 0, F.size[0], F.size[1], D.crop.face);
  const back = face(body, BACK, F.top[0], F.top[1], F.size[1], D.crop.back);

  // --- easing (cubic-bezier) e campionamento dei keyframe ---
  function bezier([x1, y1, x2, y2], x) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    let t = x;
    for (let i = 0; i < 8; i++) { const e = ((ax * t + bx) * t + cx) * t - x, d = (3 * ax * t + 2 * bx) * t + cx; if (Math.abs(e) < 1e-6 || !d) break; t -= e / d; }
    t = Math.min(1, Math.max(0, t));
    return ((ay * t + by) * t + cy) * t;
  }
  const mix = (a, b, p) => Array.isArray(a) ? a.map((v, i) => v + (b[i] - v) * p) : a + (b - a) * p;
  // L'easing di un keyframe regola la transizione che ARRIVA a quel keyframe.
  function sample(k, t, def) {
    if (!k) return def;
    if (t <= k[0][0]) return k[0][1];
    for (let i = k.length - 1; i >= 0; i--) if (k[i][0] <= t) {
      const a = k[i], b = k[i + 1];
      if (!b || b[0] === a[0]) return a[1];
      return mix(a[1], b[1], bezier(b[2], (t - a[0]) / (b[0] - a[0])));
    }
  }
  const g = (id, t, def) => sample(TR[id], t, def);

  const SMAX = TR['carta.s'][TR['carta.s'].length - 1][1][0];   // scala finale in Figma
  const wheel = $('wheel');
  let fy = 1, fr = 1, cs = 1, cTarget = 0, cExit = 0, lastT = 0;
  function render(t) {
    lastT = t;
    for (const [node, p, f] of [[wheel, 'wheel', fy], [ring, 'ring', fr]]) {
      const s = g(p + '.s', t, [1, 1]), tr = g(p + '.t', t, [0, 0]), r = g(p + '.r', t, 0);
      node.style.transform = `translate(${tr[0]}px,${tr[1] * f}px) rotate(${ROT_SIGN * r}rad) scale(${s[0]},${s[1]})`;
    }
    // le altre 21 carte restano nell'anello e cadono con la ruota; solo la prima si "stacca"
    ringCards[0].style.opacity = g('ring.o', t, 100) / 100;
    const tr = g('carta.t', t, [0, 0]), s = g('carta.s', t, [1, 1]), ry = g('carta.ry', t, 0);
    // posizione verticale rimappata: partenza (come Figma) -> posizione finale calcolata -> uscita sotto lo schermo
    const kt = TR['carta.t'], y0 = kt[0][1][1], y1 = kt[1][1][1], y3 = kt[3][1][1], y4 = kt[4][1][1];
    const ty = t < kt[3][0] ? y0 + (tr[1] - y0) / (y1 - y0) * (cTarget - y0) : cTarget + (tr[1] - y3) / (y4 - y3) * (cExit - cTarget);
    carta.style.transform = `translate(${tr[0]}px,${ty}px)`;
    carta.style.opacity = g('carta.o', t, 100) / 100;
    body.style.transform = `perspective(${PERSPECTIVE}px) rotateY(${ry}rad) scale(${1 + (s[0] - 1) * (cs - 1) / (SMAX - 1)})`;
    back.style.opacity = g('carta.bo', t, 100) / 100;
    const c = g('carta.sc', t, [0, 0, 0, 0]);
    body.style.boxShadow = `0 ${D.carta.shadowOffsetY}px ${g('carta.sr', t, 0)}px rgba(${c.slice(0, 3).map(v => Math.round(v * 255))},${c[3]})`;
  }

  // --- riproduzione: parte al click sulla ruota o sul ventaglio, una volta ---
  let playing = false;
  function play() {
    if (playing) return;
    playing = true;
    const t0 = performance.now();
    (function loop(now) {
      const t = (now - t0) / 1000 * TIME_SCALE;
      if (t >= D.duration) { render(D.duration); playing = false; return; }
      render(t); requestAnimationFrame(loop);
    })(t0);
  }
  wheel.addEventListener('click', play);
  $('hit').addEventListener('click', play);

  // --- responsive: testi scalati sul frame 393×852; ruota intera, sempre visibile, ancorata in basso ---
  const text = $('text'), asm = $('asm'), fade = $('fade');
  function fit() {
    const vw = innerWidth, vh = innerHeight;
    const st = Math.min(vw / D.frame[0], vh / D.frame[1]);
    text.style.transform = `translateX(-50%) scale(${st})`;
    text.style.top = 105 * st + 'px';
    // sfumatura sul bordo inferiore: ruota ferma sopra, tutto ciò che cade ci svanisce dentro
    const m = Math.min(Math.max(vh * 0.1, 48), 120);
    fade.style.height = m + 'px';
    const dia = Math.min(vw * 0.94, vh * 0.46), a = dia / D.wheel.size, cy = vh - m - dia / 2;
    asm.style.transform = `translate(${vw / 2}px,${cy}px) scale(${a})`;
    fy = Math.max(1, (D.wheel.size + m / a + 30) / 419.8);
    fr = Math.max(1, (640 + m / a + 20) / 424.55);
    // carta: più grande e più lontana dal paragrafo
    cs = Math.min(SMAX * CARTA_ZOOM, 0.6 * vw / (F.size[0] * a), 0.55 * vh / (F.size[1] * a));
    const half = F.size[1] / 2 * cs * a, rel = F.at[1] + D.carta.at[1] + F.size[1] / 2 - (D.wheel.at[1] + D.wheel.size / 2);
    const yc = (105 + 66 + 17) * st + CARTA_GAP * vh + half;
    cTarget = (yc - cy) / a - rel;
    cExit = (vh + half + 40 - cy) / a - rel;
    render(lastT);
  }
  addEventListener('resize', fit); fit();
})();
