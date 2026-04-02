/**
 * Custom Warish Certificate Renderer
 * Generates government-style HTML for both Bangla and English Warish certificates.
 */

export interface WarishCertificateData {
  certificateNo?: string          // blank for draft
  issueDate?: string              // formatted string
  isDraft?: boolean
  qr_code_url?: string            // optional QR code data URL

  deceased_name_bn: string
  deceased_name_en: string
  deceased_father_name_bn: string
  deceased_father_name_en: string
  deceased_mother_name_bn?: string
  deceased_mother_name_en?: string
  deceased_nid?: string
  date_of_death: string           // ISO or any parseable date

  applicant_name_bn?: string
  applicant_name_en?: string

  heirs: Array<{
    name_bn: string
    name_en: string
    relation: string
    birth_date: string
    nid_no?: string
  }>

  union_name_bn: string
  union_name_en?: string
  union_address_bn?: string
  union_address_en?: string
  chairman_name_bn?: string
  chairman_name_en?: string
  union_logo?: string | null
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtBn(d: string | Date): string {
  try {
    return new Intl.DateTimeFormat('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d))
  } catch { return String(d) }
}

function fmtEn(d: string | Date): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d))
  } catch { return String(d) }
}

function toBnDigits(n: number): string {
  return String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[+d])
}

const esc = (s: unknown) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

// ─── shared CSS ───────────────────────────────────────────────────────────────

const BASE_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4 portrait; margin: 12mm; }
  html, body {
    width: 210mm; min-height: 297mm;
    background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .page {
    width: 180mm; margin: 0 auto; padding: 6mm 0;
    position: relative; min-height: 273mm;
  }
  .outer-border {
    position: absolute; inset: 0;
    border: 3px solid #1a365d;
    border-radius: 4px;
    pointer-events: none;
  }
  .inner-border {
    position: absolute; inset: 5px;
    border: 1px solid #90afc5;
    border-radius: 2px;
    pointer-events: none;
  }
  .watermark {
    position: fixed; inset: 0;
    display: flex; align-items: center; justify-content: center;
    pointer-events: none; z-index: 0;
  }
  .watermark-text {
    font-size: 100px; font-weight: 900; letter-spacing: 14px;
    color: #dc2626; opacity: 0.12; transform: rotate(-30deg);
    white-space: nowrap;
    border: 12px solid #dc2626; padding: 16px 36px; border-radius: 16px;
    text-transform: uppercase;
  }
  .content {
    position: relative; z-index: 1;
    padding: 12mm 14mm 10mm;
  }

  /* ── HEADER (centered) ── */
  .cert-header {
    text-align: center;
    padding-bottom: 10px;
    border-bottom: 2.5px double #1a365d;
    margin-bottom: 0;
  }
  .logo-wrap { margin-bottom: 6px; }
  .logo-wrap img { width: 72px; height: 72px; border-radius: 50%; border: 2px solid #1a365d; object-fit: contain; }
  .logo-ph { display: inline-flex; align-items: center; justify-content: center; width: 72px; height: 72px; border-radius: 50%; border: 2px solid #1a365d; font-size: 28px; }
  .govt { font-size: 10.5px; font-weight: 600; color: #444; letter-spacing: 0.4px; }
  .union-name { font-size: 22px; font-weight: 800; color: #1a365d; line-height: 1.2; margin-top: 2px; }
  .union-addr { font-size: 11px; color: #555; margin-top: 2px; }

  /* ── META ROW (date left, cert no right) ── */
  .meta-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 6px 4px;
    font-size: 11.5px; color: #333;
    border-bottom: 1px solid #c8d5e0;
    margin-bottom: 0;
  }
  .meta-row b { color: #1a365d; }

  /* ── TITLE ── */
  .cert-title-wrap { text-align: center; padding: 10px 0 8px; }
  .cert-title {
    display: inline-block; font-size: 18px; font-weight: 800; color: #1a365d;
    padding: 6px 30px;
    border-top: 2px solid #1a365d; border-bottom: 2px solid #1a365d;
    letter-spacing: 2px;
  }
  .cert-subtitle { font-size: 11px; color: #555; margin-top: 3px; }

  /* ── SECTIONS ── */
  .sec-hd {
    background: #1a365d; color: #fff;
    font-size: 12.5px; font-weight: 700;
    padding: 5px 12px; border-radius: 3px 3px 0 0;
    margin-top: 10px;
  }
  .sec-body {
    border: 1px solid #c0ccd8; border-top: none;
    border-radius: 0 0 3px 3px;
    padding: 10px 12px;
    background: #fff;
  }
  .fg { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 18px; }
  .fr { display: flex; align-items: baseline; gap: 5px; padding: 3px 0; border-bottom: 1px dotted #dde; }
  .fr:last-child { border-bottom: none; }
  .fl { font-size: 11px; color: #4a5568; font-weight: 700; white-space: nowrap; min-width: 118px; flex-shrink: 0; }
  .fc { color: #4a5568; font-weight: 700; }
  .fv { font-size: 12px; color: #111; font-weight: 500; flex: 1; border-bottom: 1px solid #bbb; padding-bottom: 1px; min-width: 0; }

  /* ── TABLE ── */
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  thead tr { background: #e8eef4; }
  th { font-weight: 700; color: #1a365d; padding: 7px 7px; border: 1px solid #a0aec0; text-align: center; }
  td { border: 1px solid #c0ccd8; padding: 5px 7px; }
  .tc { text-align: center; } .tl { text-align: left; }
  tbody tr:nth-child(even) { background: #f7fafc; }

  /* ── DECLARATION ── */
  .declaration {
    border: 1px solid #c0ccd8; border-radius: 4px;
    padding: 9px 12px; margin: 10px 0 0;
    background: #fffbeb; font-size: 11.5px; line-height: 1.9; color: #444;
  }

  /* ── SIGNATURES (2 cols only — no applicant) ── */
  .sigs {
    display: flex; justify-content: space-between; align-items: flex-end;
    gap: 16px; margin-top: 32px;
  }
  .sig { flex: 1; text-align: center; }
  .sig-sp { height: 50px; border-bottom: 1px solid #333; margin-bottom: 6px; }
  .sig-t { font-size: 11.5px; font-weight: 700; color: #1a365d; line-height: 1.4; }
  .sig-s { font-size: 10.5px; color: #555; }
  .qr-block { text-align: center; }
  .qr-block img { width: 72px; height: 72px; padding: 2px; border: 1px solid #1a365d; background: #fff; display: inline-block; }
  .qr-block p { font-size: 9px; color: #666; margin-top: 3px; }

  /* ── FOOTER ── */
  .cert-footer {
    border-top: 1px solid #c0ccd8; padding-top: 7px; margin-top: 16px;
    display: flex; justify-content: space-between; font-size: 10px; color: #777;
  }
  @media print { html,body { background: none; } .page { padding: 0; width: 100%; } }
`

// ═══════════════════════════════════════════════════════════════════════════════
// BANGLA CERTIFICATE
// ═══════════════════════════════════════════════════════════════════════════════

export function generateWarishCertificateBnHtml(d: WarishCertificateData): string {
  const today = fmtBn(new Date())
  const deathDate = fmtBn(d.date_of_death)
  const isDraft = d.isDraft !== false

  const heirsRows = d.heirs.map((h, i) => `
    <tr>
      <td class="tc">${toBnDigits(i + 1)}</td>
      <td class="tl">${esc(h.name_bn)}</td>
      <td class="tc">${esc(h.relation)}</td>
      <td class="tc">${fmtBn(h.birth_date)}</td>
      <td class="tc">${esc(h.nid_no || '—')}</td>
    </tr>`).join('')

  const emptyRows = d.heirs.length < 5 ? Array.from({ length: 5 - d.heirs.length }, () =>
    `<tr><td class="tc" style="color:#ccc">—</td><td></td><td></td><td></td><td></td></tr>`
  ).join('') : ''

  return `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8">
<title>ওয়ারিশ সনদ</title>
<style>
  ${BASE_CSS}
  body { font-family: 'Hind Siliguri', 'Kalpurush', 'SolaimanLipi', Arial, sans-serif; }
</style>
</head>
<body>
<div class="page">
  <div class="outer-border"></div>
  <div class="inner-border"></div>
  ${isDraft ? `<div class="watermark"><div class="watermark-text">খসড়া / DRAFT</div></div>` : ''}

  <div class="content">

    <!-- HEADER: centered government identity -->
    <div class="cert-header">
      <div class="logo-wrap">
        ${d.union_logo ? `<img src="${esc(d.union_logo)}" alt="লোগো">` : `<div class="logo-ph">🏛️</div>`}
      </div>
      <div class="govt">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার &nbsp;·&nbsp; স্থানীয় সরকার বিভাগ</div>
      <div class="union-name">${esc(d.union_name_bn)}</div>
      ${d.union_address_bn ? `<div class="union-addr">${esc(d.union_address_bn)}</div>` : ''}
    </div>

    <!-- META: date left, cert no right -->
    <div class="meta-row">
      <div>তারিখ: <b>${today}</b></div>
      <div>সনদ নং: <b>${isDraft ? 'প্রক্রিয়াধীন' : esc(d.certificateNo || '—')}</b></div>
    </div>

    <!-- TITLE -->
    <div class="cert-title-wrap">
      <div class="cert-title">ওয়ারিশান কায়েম সনদ</div>
      <div class="cert-subtitle">Warish (Legal Heir) Certificate</div>
    </div>

    <!-- DECEASED -->
    <div class="sec-hd">মৃত ব্যক্তির তথ্য</div>
    <div class="sec-body">
      <div class="fg">
        <div class="fr"><span class="fl">নাম (বাংলা)</span><span class="fc">:</span><span class="fv">${esc(d.deceased_name_bn)}</span></div>
        <div class="fr"><span class="fl">নাম (ইংরেজি)</span><span class="fc">:</span><span class="fv">${esc(d.deceased_name_en)}</span></div>
        <div class="fr"><span class="fl">পিতার নাম</span><span class="fc">:</span><span class="fv">${esc(d.deceased_father_name_bn)}</span></div>
        <div class="fr"><span class="fl">মাতার নাম</span><span class="fc">:</span><span class="fv">${esc(d.deceased_mother_name_bn || '—')}</span></div>
        <div class="fr"><span class="fl">জাতীয় পরিচয়পত্র নং</span><span class="fc">:</span><span class="fv">${esc(d.deceased_nid || '—')}</span></div>
        <div class="fr"><span class="fl">মৃত্যুর তারিখ</span><span class="fc">:</span><span class="fv">${deathDate}</span></div>
      </div>
    </div>

    <!-- HEIRS TABLE -->
    <div class="sec-hd">উত্তরাধিকারীদের তালিকা</div>
    <div class="sec-body" style="padding:0">
      <table>
        <thead>
          <tr>
            <th style="width:32px">ক্রমিক</th>
            <th>উত্তরাধিকারীর নাম</th>
            <th style="width:80px">সম্পর্ক</th>
            <th style="width:100px">জন্ম তারিখ</th>
            <th style="width:110px">এনআইডি / জন্মনিবন্ধন</th>
          </tr>
        </thead>
        <tbody>${heirsRows}${emptyRows}</tbody>
      </table>
    </div>

    <!-- DECLARATION -->
    <div class="declaration">
      এই মর্মে প্রত্যয়ন করা যাচ্ছে যে, <b>${esc(d.deceased_name_bn)}</b>, পিতা: ${esc(d.deceased_father_name_bn)}, মৃত্যুর তারিখ: ${deathDate} — ইন্তেকাল করিয়াছেন।
      তাঁহার মৃত্যুর পর উপরে বর্ণিত ব্যক্তিগণ তাঁহার একমাত্র ওয়ারিশান/উত্তরাধিকারী।
      উপরোক্ত তথ্য আমার জ্ঞান ও বিশ্বাস মতে সম্পূর্ণ সত্য ও নির্ভুল।
    </div>

    <!-- SIGNATURES: ward member + chairman (no applicant) -->
    <div class="sigs">
      <div class="sig">
        <div class="sig-sp"></div>
        <div class="sig-t">ওয়ার্ড মেম্বারের স্বাক্ষর ও সীল</div>
        <div class="sig-s">${esc(d.union_name_bn)}</div>
      </div>
      ${d.qr_code_url ? `
      <div class="qr-block">
        <img src="${esc(d.qr_code_url)}" alt="QR Code">
        <p>স্ক্যান করে যাচাই করুন</p>
      </div>` : ''}
      <div class="sig">
        <div class="sig-sp"></div>
        <div class="sig-t">${esc(d.chairman_name_bn || 'চেয়ারম্যান')}</div>
        <div class="sig-s">চেয়ারম্যান, ${esc(d.union_name_bn)}</div>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="cert-footer">
      <div>গণপ্রজাতন্ত্রী বাংলাদেশ সরকার &nbsp;·&nbsp; স্থানীয় সরকার বিভাগ</div>
      <div>মুদ্রণ তারিখ: ${today}</div>
    </div>

  </div>
</div>
</body>
</html>`
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENGLISH CERTIFICATE
// ═══════════════════════════════════════════════════════════════════════════════

export function generateWarishCertificateEnHtml(d: WarishCertificateData): string {
  const today = fmtEn(new Date())
  const deathDate = fmtEn(d.date_of_death)
  const isDraft = d.isDraft !== false

  const heirsRows = d.heirs.map((h, i) => `
    <tr>
      <td class="tc">${i + 1}</td>
      <td class="tl">${esc(h.name_en || h.name_bn)}</td>
      <td class="tc">${esc(h.relation)}</td>
      <td class="tc">${fmtEn(h.birth_date)}</td>
      <td class="tc">${esc(h.nid_no || '—')}</td>
    </tr>`).join('')

  const emptyRows = d.heirs.length < 5 ? Array.from({ length: 5 - d.heirs.length }, () =>
    `<tr><td class="tc" style="color:#ccc">—</td><td></td><td></td><td></td><td></td></tr>`
  ).join('') : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Warish Certificate</title>
<style>
  ${BASE_CSS}
  body { font-family: Georgia, 'Times New Roman', serif; }
  .cert-title { letter-spacing: 3px; }
  .sec-hd { font-family: Georgia, serif; }
  .fl { font-family: Georgia, serif; }
</style>
</head>
<body>
<div class="page">
  <div class="outer-border"></div>
  <div class="inner-border"></div>
  ${isDraft ? `<div class="watermark"><div class="watermark-text">DRAFT</div></div>` : ''}

  <div class="content">

    <!-- HEADER: centered government identity -->
    <div class="cert-header">
      <div class="logo-wrap">
        ${d.union_logo ? `<img src="${esc(d.union_logo)}" alt="Logo">` : `<div class="logo-ph">🏛️</div>`}
      </div>
      <div class="govt">Government of the People&apos;s Republic of Bangladesh &nbsp;·&nbsp; Local Government Division</div>
      <div class="union-name">${esc(d.union_name_en || d.union_name_bn)}</div>
      ${d.union_address_en ? `<div class="union-addr">${esc(d.union_address_en)}</div>` : ''}
    </div>

    <!-- META: date left, cert no right -->
    <div class="meta-row">
      <div>Date: <b>${today}</b></div>
      <div>Certificate No: <b>${isDraft ? 'Processing' : esc(d.certificateNo || '—')}</b></div>
    </div>

    <!-- TITLE -->
    <div class="cert-title-wrap">
      <div class="cert-title">WARISH CERTIFICATE</div>
      <div class="cert-subtitle">Certificate of Legal Heirship / উত্তরাধিকার সনদ</div>
    </div>

    <!-- DECEASED -->
    <div class="sec-hd">Deceased Person Information</div>
    <div class="sec-body">
      <div class="fg">
        <div class="fr"><span class="fl">Full Name</span><span class="fc">:</span><span class="fv">${esc(d.deceased_name_en)}</span></div>
        <div class="fr"><span class="fl">Name (Bengali)</span><span class="fc">:</span><span class="fv">${esc(d.deceased_name_bn)}</span></div>
        <div class="fr"><span class="fl">Father&apos;s Name</span><span class="fc">:</span><span class="fv">${esc(d.deceased_father_name_en || d.deceased_father_name_bn)}</span></div>
        <div class="fr"><span class="fl">Mother&apos;s Name</span><span class="fc">:</span><span class="fv">${esc(d.deceased_mother_name_en || d.deceased_mother_name_bn || '—')}</span></div>
        <div class="fr"><span class="fl">National ID No</span><span class="fc">:</span><span class="fv">${esc(d.deceased_nid || '—')}</span></div>
        <div class="fr"><span class="fl">Date of Death</span><span class="fc">:</span><span class="fv">${deathDate}</span></div>
      </div>
    </div>

    <!-- HEIRS TABLE -->
    <div class="sec-hd">List of Legal Heirs</div>
    <div class="sec-body" style="padding:0">
      <table>
        <thead>
          <tr>
            <th style="width:32px">SL</th>
            <th>Name of Heir</th>
            <th style="width:90px">Relation</th>
            <th style="width:110px">Date of Birth</th>
            <th style="width:110px">NID / Birth Reg. No.</th>
          </tr>
        </thead>
        <tbody>${heirsRows}${emptyRows}</tbody>
      </table>
    </div>

    <!-- DECLARATION -->
    <div class="declaration">
      This is to certify that <b>${esc(d.deceased_name_en)}</b>, son/daughter of ${esc(d.deceased_father_name_en || d.deceased_father_name_bn)},
      passed away on <b>${deathDate}</b>. The persons listed above are the sole legal heirs of the deceased.
      The information provided herein is true and correct to the best of my knowledge and belief.
    </div>

    <!-- SIGNATURES: ward member + chairman (no applicant) -->
    <div class="sigs">
      <div class="sig">
        <div class="sig-sp"></div>
        <div class="sig-t">Ward Member&apos;s Signature &amp; Seal</div>
        <div class="sig-s">${esc(d.union_name_en || d.union_name_bn)}</div>
      </div>
      ${d.qr_code_url ? `
      <div class="qr-block">
        <img src="${esc(d.qr_code_url)}" alt="QR Code">
        <p>Scan to verify</p>
      </div>` : ''}
      <div class="sig">
        <div class="sig-sp"></div>
        <div class="sig-t">${esc(d.chairman_name_en || d.chairman_name_bn || 'Chairman')}</div>
        <div class="sig-s">Chairman, ${esc(d.union_name_en || d.union_name_bn)}</div>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="cert-footer">
      <div>Government of the People&apos;s Republic of Bangladesh &nbsp;·&nbsp; Local Government Division</div>
      <div>Printed: ${today}</div>
    </div>

  </div>
</div>
</body>
</html>`
}
