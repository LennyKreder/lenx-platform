/**
 * Convert a hex color string to oklch() CSS format.
 * The existing CSS variables use oklch, so we need this conversion
 * to inject site-specific colors.
 */
export function hexToOklch(hex: string): string {
  // Parse hex to RGB
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;

  // Linearize sRGB
  const linearize = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const rl = linearize(r);
  const gl = linearize(g);
  const bl = linearize(b);

  // Linear sRGB to OKLab (using the matrix from Bjorn Ottosson)
  const l_ = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  const m_ = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  const s_ = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;

  const l_cbrt = Math.cbrt(l_);
  const m_cbrt = Math.cbrt(m_);
  const s_cbrt = Math.cbrt(s_);

  const L = 0.2104542553 * l_cbrt + 0.7936177850 * m_cbrt - 0.0040720468 * s_cbrt;
  const a = 1.9779984951 * l_cbrt - 2.4285922050 * m_cbrt + 0.4505937099 * s_cbrt;
  const bOk = 0.0259040371 * l_cbrt + 0.7827717662 * m_cbrt - 0.8086757660 * s_cbrt;

  // OKLab to OKLCH
  const C = Math.sqrt(a * a + bOk * bOk);
  let H = Math.atan2(bOk, a) * (180 / Math.PI);
  if (H < 0) H += 360;

  // Round for readability
  const Lr = Math.round(L * 1000) / 1000;
  const Cr = Math.round(C * 1000) / 1000;
  const Hr = Math.round(H * 10) / 10;

  return `${Lr} ${Cr} ${Hr}`;
}
