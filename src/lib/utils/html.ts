/**
 * HTML escaping for the document renderers.
 *
 * The certificate, application and receipt renderers build a full HTML
 * document out of template strings and hand it to `container.innerHTML`
 * (html-to-pdf) or `dangerouslySetInnerHTML`. Any value interpolated into
 * that string is parsed as markup, so a citizen name containing `</div>` or
 * an `onerror` attribute rewrites the printed document — a forged amount or
 * holding number on a receipt that people treat as a financial record.
 *
 * The nonce CSP blocks script execution, so this is document forgery rather
 * than session takeover, but a money document must not be forgeable.
 *
 * Quotes are escaped too: several call sites interpolate into an attribute
 * (`<img src="${...}">`), where escaping only `& < >` still allows a
 * break-out.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
