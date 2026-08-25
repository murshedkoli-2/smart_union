import { escapeHtml } from './html'

export interface FamilyCertificateData {
  certificateNo?: string
  issueDate?: string
  isDraft?: boolean
  qr_code_url?: string
  applicant_name_bn: string
  applicant_name_en: string
  father_name_bn?: string
  father_name_en?: string
  mother_name_bn?: string
  mother_name_en?: string
  nid_no?: string
  present_address_bn?: string
  present_address_en?: string
  family_members: Array<{
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

const esc = escapeHtml

const bnDigits = (value: number) =>
  String(value).replace(/\d/g, (digit) => '0123456789'.includes(digit) ? '০১২৩৪৫৬৭৮৯'[Number(digit)] : digit)

function formatDate(date: string | Date, locale: 'bn-BD' | 'en-GB') {
  try {
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date))
  } catch {
    return String(date)
  }
}

const BASE_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4 portrait; margin: 12mm; }
  html, body { width: 210mm; min-height: 297mm; background: #fff; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  body { color: #1f2937; }
  .page { width: 180mm; min-height: 273mm; margin: 0 auto; padding: 6mm 0; position: relative; }
  .frame { position: absolute; inset: 0; border: 3px solid #1d4ed8; pointer-events: none; }
  .frame-inner { position: absolute; inset: 6px; border: 1px solid #93c5fd; pointer-events: none; }
  .watermark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0.09; font-size: 88px; font-weight: 800; color: #dc2626; transform: rotate(-28deg); pointer-events: none; }
  .content { position: relative; z-index: 1; padding: 12mm 14mm 10mm; }

  /* ── HEADER (centered) ── */
  .header { text-align: center; border-bottom: 3px double #1d4ed8; padding-bottom: 10px; margin-bottom: 0; }
  .logo-wrap { margin-bottom: 6px; }
  .logo { width: 72px; height: 72px; border-radius: 999px; border: 2px solid #1d4ed8; object-fit: contain; background: #fff; }
  .logo-fallback { display: inline-flex; align-items: center; justify-content: center; width: 72px; height: 72px; border-radius: 999px; border: 2px solid #1d4ed8; font-size: 28px; }
  .eyebrow { font-size: 10px; font-weight: 700; color: #475569; letter-spacing: 0.4px; }
  .union { font-size: 22px; font-weight: 800; color: #1d4ed8; margin-top: 2px; }
  .address { font-size: 11px; color: #475569; margin-top: 2px; }

  /* ── META ROW (date left, cert no right) ── */
  .meta { display: flex; justify-content: space-between; align-items: center; padding: 6px 4px; font-size: 11px; color: #333; border-bottom: 1px solid #bfdbfe; margin-bottom: 0; }
  .meta strong { color: #1d4ed8; }

  /* ── TITLE ── */
  .title-wrap { text-align: center; padding: 10px 0 8px; }
  .title { display: inline-block; border-top: 2px solid #1d4ed8; border-bottom: 2px solid #1d4ed8; padding: 5px 24px; font-size: 18px; font-weight: 800; letter-spacing: 1px; color: #1e3a8a; }
  .subtitle { margin-top: 4px; font-size: 11px; color: #64748b; }

  /* ── SECTIONS ── */
  .section-title { background: #1d4ed8; color: #fff; padding: 6px 12px; border-radius: 4px 4px 0 0; font-size: 12px; font-weight: 700; margin-top: 10px; }
  .section-body { border: 1px solid #bfdbfe; border-top: none; border-radius: 0 0 4px 4px; padding: 10px 12px; background: #fff; }
  .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 18px; }
  .field { display: flex; gap: 6px; border-bottom: 1px dotted #cbd5e1; padding: 3px 0; font-size: 12px; }
  .field-label { width: 118px; color: #475569; font-weight: 700; flex-shrink: 0; }
  .field-value { flex: 1; color: #111827; font-weight: 500; }

  /* ── TABLE ── */
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  th { background: #dbeafe; color: #1e3a8a; border: 1px solid #93c5fd; padding: 7px 6px; }
  td { border: 1px solid #bfdbfe; padding: 6px; }
  tbody tr:nth-child(even) { background: #f8fbff; }
  .center { text-align: center; }

  /* ── DECLARATION ── */
  .declaration { margin-top: 10px; border: 1px solid #fde68a; background: #fffbeb; border-radius: 6px; padding: 10px 12px; font-size: 11.5px; line-height: 1.8; }

  /* ── SIGNATURES (2 cols only — no applicant) ── */
  .signatures { display: flex; gap: 16px; justify-content: space-between; align-items: flex-end; margin-top: 28px; }
  .signature { flex: 1; text-align: center; }
  .signature-space { height: 48px; border-bottom: 1px solid #334155; margin-bottom: 6px; }
  .signature-title { font-size: 11.5px; font-weight: 700; color: #1e3a8a; }
  .signature-subtitle { font-size: 10px; color: #64748b; }
  .qr-block { text-align: center; }
  .qr-block img { width: 72px; height: 72px; padding: 3px; border: 1px solid #1d4ed8; background: #fff; display: inline-block; }
  .qr-block p { font-size: 9px; color: #64748b; margin-top: 3px; }

  /* ── FOOTER ── */
  .footer { display: flex; justify-content: space-between; gap: 12px; border-top: 1px solid #cbd5e1; margin-top: 18px; padding-top: 8px; font-size: 10px; color: #64748b; }
`

export function generateFamilyCertificateBnHtml(data: FamilyCertificateData): string {
  const isDraft = data.isDraft !== false
  const issueDate = data.issueDate || formatDate(new Date(), 'bn-BD')
  const rows = data.family_members
    .map((member, index) => `
      <tr>
        <td class="center">${bnDigits(index + 1)}</td>
        <td>${esc(member.name_bn)}</td>
        <td class="center">${esc(member.relation)}</td>
        <td class="center">${formatDate(member.birth_date, 'bn-BD')}</td>
        <td class="center">${esc(member.nid_no || '—')}</td>
      </tr>
    `)
    .join('')

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <title>পারিবারিক সনদ</title>
  <style>${BASE_CSS} body { font-family: 'Hind Siliguri', 'Kalpurush', sans-serif; }</style>
</head>
<body>
  <div class="page">
    <div class="frame"></div>
    <div class="frame-inner"></div>
    ${isDraft ? '<div class="watermark">খসড়া</div>' : ''}
    <div class="content">

      <!-- HEADER: centered government identity -->
      <div class="header">
        <div class="logo-wrap">
          ${data.union_logo ? `<img class="logo" src="${esc(data.union_logo)}" alt="Logo" />` : '<div class="logo-fallback">🏛</div>'}
        </div>
        <div class="eyebrow">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার &nbsp;·&nbsp; স্থানীয় সরকার বিভাগ</div>
        <div class="union">${esc(data.union_name_bn)}</div>
        <div class="address">${esc(data.union_address_bn || '')}</div>
      </div>

      <!-- META: date left, cert no right -->
      <div class="meta">
        <div>তারিখ: <strong>${esc(issueDate)}</strong></div>
        <div>সনদ নং: <strong>${isDraft ? 'প্রক্রিয়াধীন' : esc(data.certificateNo || '—')}</strong></div>
      </div>

      <!-- TITLE -->
      <div class="title-wrap">
        <div class="title">পারিবারিক সনদ</div>
        <div class="subtitle">Family Certificate</div>
      </div>

      <!-- APPLICANT INFO -->
      <div class="section-title">পরিবার প্রধান / আবেদনকারীর তথ্য</div>
      <div class="section-body">
        <div class="field-grid">
          <div class="field"><span class="field-label">নাম (বাংলা)</span><span>:</span><span class="field-value">${esc(data.applicant_name_bn)}</span></div>
          <div class="field"><span class="field-label">নাম (ইংরেজি)</span><span>:</span><span class="field-value">${esc(data.applicant_name_en)}</span></div>
          <div class="field"><span class="field-label">পিতার নাম</span><span>:</span><span class="field-value">${esc(data.father_name_bn || '—')}</span></div>
          <div class="field"><span class="field-label">মাতার নাম</span><span>:</span><span class="field-value">${esc(data.mother_name_bn || '—')}</span></div>
          <div class="field"><span class="field-label">এনআইডি</span><span>:</span><span class="field-value">${esc(data.nid_no || '—')}</span></div>
          <div class="field"><span class="field-label">বর্তমান ঠিকানা</span><span>:</span><span class="field-value">${esc(data.present_address_bn || '—')}</span></div>
        </div>
      </div>

      <!-- FAMILY MEMBERS TABLE -->
      <div class="section-title">পরিবারের সদস্যদের তালিকা</div>
      <div class="section-body" style="padding:0">
        <table>
          <thead>
            <tr>
              <th style="width:40px">ক্রমিক</th>
              <th>সদস্যের নাম</th>
              <th style="width:100px">সম্পর্ক</th>
              <th style="width:120px">জন্ম তারিখ</th>
              <th style="width:120px">এনআইডি</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <!-- DECLARATION -->
      <div class="declaration">
        এই মর্মে প্রত্যয়ন করা যাচ্ছে যে <strong>${esc(data.applicant_name_bn)}</strong> এর পরিবারের সদস্যবৃন্দ উপরে বর্ণিত ব্যক্তিগণ।
        স্থানীয় অনুসন্ধান ও প্রাপ্ত তথ্য অনুযায়ী তারা একই পরিবারের অন্তর্ভুক্ত এবং ${esc(data.present_address_bn || 'উক্ত ঠিকানায়')} বসবাসকারী।
      </div>

      <!-- SIGNATURES: ward member + chairman (no applicant) -->
      <div class="signatures">
        <div class="signature">
          <div class="signature-space"></div>
          <div class="signature-title">ওয়ার্ড সদস্যের স্বাক্ষর ও সীল</div>
          <div class="signature-subtitle">${esc(data.union_name_bn)}</div>
        </div>
        ${data.qr_code_url ? `
        <div class="qr-block">
          <img src="${esc(data.qr_code_url)}" alt="QR" />
          <p>স্ক্যান করে যাচাই করুন</p>
        </div>` : ''}
        <div class="signature">
          <div class="signature-space"></div>
          <div class="signature-title">${esc(data.chairman_name_bn || 'চেয়ারম্যান')}</div>
          <div class="signature-subtitle">চেয়ারম্যান, ${esc(data.union_name_bn)}</div>
        </div>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div>গণপ্রজাতন্ত্রী বাংলাদেশ সরকার &nbsp;·&nbsp; স্থানীয় সরকার বিভাগ</div>
        <div>মুদ্রণ তারিখ: ${esc(issueDate)}</div>
      </div>

    </div>
  </div>
</body>
</html>`
}

export function generateFamilyCertificateEnHtml(data: FamilyCertificateData): string {
  const isDraft = data.isDraft !== false
  const issueDate = data.issueDate || formatDate(new Date(), 'en-GB')
  const rows = data.family_members
    .map((member, index) => `
      <tr>
        <td class="center">${index + 1}</td>
        <td>${esc(member.name_en || member.name_bn)}</td>
        <td class="center">${esc(member.relation)}</td>
        <td class="center">${formatDate(member.birth_date, 'en-GB')}</td>
        <td class="center">${esc(member.nid_no || '—')}</td>
      </tr>
    `)
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Family Certificate</title>
  <style>${BASE_CSS} body { font-family: Georgia, 'Times New Roman', serif; }</style>
</head>
<body>
  <div class="page">
    <div class="frame"></div>
    <div class="frame-inner"></div>
    ${isDraft ? '<div class="watermark">DRAFT</div>' : ''}
    <div class="content">

      <!-- HEADER: centered government identity -->
      <div class="header">
        <div class="logo-wrap">
          ${data.union_logo ? `<img class="logo" src="${esc(data.union_logo)}" alt="Logo" />` : '<div class="logo-fallback">🏛</div>'}
        </div>
        <div class="eyebrow">Government of the People&apos;s Republic of Bangladesh &nbsp;·&nbsp; Local Government Division</div>
        <div class="union">${esc(data.union_name_en || data.union_name_bn)}</div>
        <div class="address">${esc(data.union_address_en || '')}</div>
      </div>

      <!-- META: date left, cert no right -->
      <div class="meta">
        <div>Date: <strong>${esc(issueDate)}</strong></div>
        <div>Certificate No: <strong>${isDraft ? 'Processing' : esc(data.certificateNo || '—')}</strong></div>
      </div>

      <!-- TITLE -->
      <div class="title-wrap">
        <div class="title">FAMILY CERTIFICATE</div>
        <div class="subtitle">Household Membership Certificate</div>
      </div>

      <!-- APPLICANT INFO -->
      <div class="section-title">Applicant Information</div>
      <div class="section-body">
        <div class="field-grid">
          <div class="field"><span class="field-label">Name</span><span>:</span><span class="field-value">${esc(data.applicant_name_en)}</span></div>
          <div class="field"><span class="field-label">Name (Bengali)</span><span>:</span><span class="field-value">${esc(data.applicant_name_bn)}</span></div>
          <div class="field"><span class="field-label">Father&apos;s Name</span><span>:</span><span class="field-value">${esc(data.father_name_en || data.father_name_bn || '—')}</span></div>
          <div class="field"><span class="field-label">Mother&apos;s Name</span><span>:</span><span class="field-value">${esc(data.mother_name_en || data.mother_name_bn || '—')}</span></div>
          <div class="field"><span class="field-label">National ID</span><span>:</span><span class="field-value">${esc(data.nid_no || '—')}</span></div>
          <div class="field"><span class="field-label">Present Address</span><span>:</span><span class="field-value">${esc(data.present_address_en || '—')}</span></div>
        </div>
      </div>

      <!-- FAMILY MEMBERS TABLE -->
      <div class="section-title">Family Member List</div>
      <div class="section-body" style="padding:0">
        <table>
          <thead>
            <tr>
              <th style="width:40px">SL</th>
              <th>Name</th>
              <th style="width:100px">Relation</th>
              <th style="width:120px">Date of Birth</th>
              <th style="width:120px">National ID</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <!-- DECLARATION -->
      <div class="declaration">
        This is to certify that the persons listed above are members of the family of <strong>${esc(data.applicant_name_en)}</strong>.
        Based on local inquiry and available records, they belong to the same household and reside at ${esc(data.present_address_en || 'the stated address')}.
      </div>

      <!-- SIGNATURES: ward member + chairman (no applicant) -->
      <div class="signatures">
        <div class="signature">
          <div class="signature-space"></div>
          <div class="signature-title">Ward Member&apos;s Signature &amp; Seal</div>
          <div class="signature-subtitle">${esc(data.union_name_en || data.union_name_bn)}</div>
        </div>
        ${data.qr_code_url ? `
        <div class="qr-block">
          <img src="${esc(data.qr_code_url)}" alt="QR" />
          <p>Scan to verify</p>
        </div>` : ''}
        <div class="signature">
          <div class="signature-space"></div>
          <div class="signature-title">${esc(data.chairman_name_en || data.chairman_name_bn || 'Chairman')}</div>
          <div class="signature-subtitle">Chairman, ${esc(data.union_name_en || data.union_name_bn)}</div>
        </div>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div>Government of the People&apos;s Republic of Bangladesh &nbsp;·&nbsp; Local Government Division</div>
        <div>Printed: ${esc(issueDate)}</div>
      </div>

    </div>
  </div>
</body>
</html>`
}
