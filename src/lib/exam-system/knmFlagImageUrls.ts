/**
 * Inline SVG data URLs for KNM flag items — avoids Wikimedia hotlink failures
 * (mobile webviews, referrer policies, offline dev) while keeping simple tricolor geometry.
 */
function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const SVG_NL =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 6"><rect fill="#AE1C28" width="9" height="2"/><rect fill="#FFF" width="9" height="2" y="2"/><rect fill="#21468B" width="9" height="2" y="4"/></svg>'
const SVG_DE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 6"><rect fill="#000" width="9" height="2"/><rect fill="#DD0000" width="9" height="2" y="2"/><rect fill="#FFCE00" width="9" height="2" y="4"/></svg>'
const SVG_BE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 6"><rect fill="#000" width="3" height="6"/><rect fill="#FDDA24" width="3" height="6" x="3"/><rect fill="#EF3340" width="3" height="6" x="6"/></svg>'
const SVG_FR =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 6"><rect fill="#002395" width="3" height="6"/><rect fill="#FFF" width="3" height="6" x="3"/><rect fill="#ED2939" width="3" height="6" x="6"/></svg>'

export const KNM_FLAG_IMG_NL = svgDataUrl(SVG_NL)
export const KNM_FLAG_IMG_DE = svgDataUrl(SVG_DE)
export const KNM_FLAG_IMG_BE = svgDataUrl(SVG_BE)
export const KNM_FLAG_IMG_FR = svgDataUrl(SVG_FR)
