'use strict';
// KAIA logo inline SVG: waves are updated in the DOM for reliable movement.
window.kaiaLogo = function (sizeClass) {
  const id = sizeClass === 'center-mark' ? 'kaia-core' : 'kaia-small';
  return `<svg class="${sizeClass} kaia-liquid" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="분홍색 물결이 움직이는 KAIA DESK 로고">
    <defs>
      <clipPath id="${id}-clip"><circle cx="100" cy="100" r="96"/></clipPath>
      <linearGradient id="${id}-pink" x1=".1" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="#eaa7b8"/><stop offset="1" stop-color="#c78299"/></linearGradient>
      <linearGradient id="${id}-back" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#f9d2dd"/><stop offset="1" stop-color="#f3b7c6"/></linearGradient>
    </defs>
    <circle cx="100" cy="100" r="97" fill="#fff" opacity=".92"/>
    <g clip-path="url(#${id}-clip)">
      <circle cx="100" cy="100" r="96" fill="#fff8fa"/>
      <path class="kaia-liquid-back" d="M-12 44 H212 V212 H-12Z" fill="url(#${id}-back)"/>
      <path class="kaia-liquid-front" d="M-12 50 H212 V212 H-12Z" fill="url(#${id}-pink)"/>
      <path d="M18 54 Q15 61 13 72" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" opacity=".8"/>
      <circle cx="95" cy="40" r="2.15" fill="#e9a2b3"/><circle cx="119" cy="34" r="1.65" fill="#dc93a6"/><circle cx="139" cy="29" r="2.3" fill="#db8ba1"/>
      <g fill="none" stroke="#fff" stroke-width="1.3" opacity=".7">
        <circle class="kaia-liquid-bubble" cx="107" cy="155" r="2.6"/>
        <circle class="kaia-liquid-bubble" cx="113" cy="161" r="1.7"/>
        <circle class="kaia-liquid-bubble" cx="60" cy="177" r="2"/>
      </g>
      <g fill="#fff">
        <path d="M69.7 124 L99.7 75.4 L108.8 90.4 L89 122.1 Q87.7 124 84.7 124Z"/>
        <path d="M112.9 99.9 Q116.1 94.6 120 100.8 L135.2 124 H107.1 Q104 124 106.1 120.7Z"/>
        <circle cx="116.3" cy="82" r="5.5"/>
      </g>
    </g>
    <circle cx="100" cy="100" r="96" fill="none" stroke="#fff" stroke-width="1.5" opacity=".85"/>
  </svg>`;
};

function kaiaLiquidPath(phase, base, height, offset) {
  let d = '';
  for (let x = -12; x <= 212; x += 4) {
    const y = base + Math.sin(x * .051 + phase + offset) * height + Math.sin(x * .104 - phase * .7 + offset) * 2.2;
    d += (x === -12 ? 'M' : 'L') + x + ' ' + y.toFixed(2) + ' ';
  }
  return d + 'L212 212 L-12 212 Z';
}
let lastUpdate = 0;
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
function animateKaia(timestamp) {
  requestAnimationFrame(animateKaia);
  if (document.hidden || timestamp - lastUpdate < 32) return;
  lastUpdate = timestamp;
  const logos = document.querySelectorAll('svg.kaia-liquid');
  if (!logos.length) return;
  const t = reduceMotion && reduceMotion.matches ? 0 : timestamp * .0022;
  const back = kaiaLiquidPath(t * .7, 45.5, 6.7, 1.7);
  const front = kaiaLiquidPath(t, 50, 7.5, 0);
  logos.forEach(svg => {
    const frontPath = svg.querySelector('.kaia-liquid-front');
    const backPath = svg.querySelector('.kaia-liquid-back');
    if (frontPath) frontPath.setAttribute('d', front);
    if (backPath) backPath.setAttribute('d', back);
    svg.querySelectorAll('.kaia-liquid-bubble').forEach((bubble, i) => {
      const bases = [155, 161, 177];
      bubble.setAttribute('cy', (bases[i] - (reduceMotion && reduceMotion.matches ? 0 : 4 * Math.sin(t * .8 + i * 1.6))).toFixed(2));
    });
  });
}
requestAnimationFrame(animateKaia);
