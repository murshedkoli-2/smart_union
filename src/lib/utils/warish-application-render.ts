
interface WarishData {
  deceased_name_bn: string
  deceased_name_en: string
  deceased_father_name_bn: string
  deceased_father_name_en?: string
  deceased_mother_name_bn?: string
  deceased_mother_name_en?: string
  deceased_nid?: string
  date_of_death: string
  applicant: {
    name_bn: string
    name_en: string
    mobile: string
    nid_no?: string
  }
  heirs: Array<{
    name_bn: string
    relation: string
    birth_date: string
    nid_no: string
  }>
  systemSettings: {
    union_name_bn: string
    union_name_en?: string
    address_bn: string
    chairman_name_bn: string
    union_logo?: string | null
  }
  applicationId?: string
  submittedAt?: string
  status?: string
}

export function generateWarishApplicationHtml(data: WarishData): string {
  const { systemSettings, heirs, applicant } = data

  const formatDateBN = (d: string | Date) => {
    try {
      return new Intl.DateTimeFormat('bn-BD', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(d))
    } catch {
      return String(d)
    }
  }

  const printDate = new Intl.DateTimeFormat('bn-BD', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  const banglaSerial = (n: number) => {
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']
    return String(n).split('').map(d => bengaliDigits[parseInt(d)] ?? d).join('')
  }

  const heirsTableRows = heirs.map((h, i) => `
    <tr>
      <td class="td-center">${banglaSerial(i + 1)}</td>
      <td class="td-left">${h.name_bn}</td>
      <td class="td-center">${h.relation}</td>
      <td class="td-center">${formatDateBN(h.birth_date)}</td>
      <td class="td-center">${h.nid_no || '—'}</td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ওয়ারিশান কায়েম সনদের আবেদনপত্র</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @page {
      size: A4 portrait;
      margin: 15mm 15mm 15mm 15mm;
    }

    html, body {
      width: 210mm;
      min-height: 297mm;
      background: #fff;
      color: #1a1a1a;
      font-family: 'Hind Siliguri', 'Kalpurush', 'SolaimanLipi', Arial, sans-serif;
      font-size: 13px;
      line-height: 1.7;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      width: 180mm;
      margin: 0 auto;
      padding: 8mm 0;
      position: relative;
    }

    /* ── HEADER ─────────────────────────────── */
    .header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding-bottom: 10px;
      border-bottom: 3px double #1a365d;
      margin-bottom: 6px;
    }

    .logo-wrap {
      flex-shrink: 0;
    }

    .logo-wrap img {
      width: 72px;
      height: 72px;
      object-fit: contain;
      border-radius: 50%;
      border: 2px solid #1a365d;
    }

    .logo-placeholder {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      border: 2px solid #1a365d;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
    }

    .header-text {
      text-align: center;
    }

    .govt-label {
      font-size: 11px;
      font-weight: 500;
      color: #444;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }

    .union-name-bn {
      font-size: 22px;
      font-weight: 700;
      color: #1a365d;
      line-height: 1.2;
    }

    .union-name-en {
      font-size: 13px;
      font-weight: 500;
      color: #2d5282;
    }

    .union-address {
      font-size: 11px;
      color: #555;
      margin-top: 2px;
    }

    /* ── DOCUMENT TITLE ─────────────────────── */
    .doc-title-wrap {
      text-align: center;
      margin: 14px 0 4px;
    }

    .doc-title {
      display: inline-block;
      font-size: 16px;
      font-weight: 700;
      color: #1a365d;
      padding: 6px 28px;
      border-top: 2px solid #1a365d;
      border-bottom: 2px solid #1a365d;
      letter-spacing: 1px;
    }

    .doc-subtitle {
      font-size: 11px;
      color: #666;
      margin-top: 4px;
    }

    /* ── META ROW ───────────────────────────── */
    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #555;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 5px 12px;
      margin: 10px 0 16px;
      background: #f8fafc;
    }

    .meta-row span { font-weight: 600; color: #1a365d; }

    /* ── SECTION ────────────────────────────── */
    .section {
      margin-bottom: 14px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #1a365d;
      color: #fff;
      padding: 5px 12px;
      border-radius: 3px 3px 0 0;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 0;
    }

    .section-header .section-num {
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .section-body {
      border: 1px solid #c8d0dc;
      border-top: none;
      border-radius: 0 0 3px 3px;
      padding: 12px 14px;
      background: #fff;
    }

    /* ── FIELD GRID ─────────────────────────── */
    .field-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 20px;
    }

    .field-row {
      display: flex;
      align-items: baseline;
      gap: 6px;
      padding: 3px 0;
      border-bottom: 1px dotted #dde;
    }

    .field-row:last-child { border-bottom: none; }

    .field-label {
      font-size: 11.5px;
      color: #4a5568;
      font-weight: 600;
      white-space: nowrap;
      min-width: 120px;
      flex-shrink: 0;
    }

    .field-colon {
      color: #4a5568;
      font-weight: 600;
    }

    .field-value {
      font-size: 12.5px;
      color: #1a1a1a;
      font-weight: 500;
      flex: 1;
      border-bottom: 1px solid #bbb;
      padding-bottom: 1px;
      min-width: 0;
    }

    /* ── HEIRS TABLE ────────────────────────── */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    thead tr {
      background: #edf2f7;
    }

    th {
      font-weight: 700;
      color: #1a365d;
      padding: 7px 8px;
      border: 1px solid #a0aec0;
      text-align: center;
    }

    td { border: 1px solid #c8d0dc; padding: 6px 8px; }
    .td-center { text-align: center; }
    .td-left { text-align: left; }

    tbody tr:nth-child(even) { background: #f7fafc; }

    /* ── DECLARATION BOX ────────────────────── */
    .declaration {
      border: 1px solid #c8d0dc;
      border-radius: 4px;
      padding: 10px 14px;
      margin: 14px 0;
      background: #fffbeb;
      font-size: 12px;
      line-height: 1.8;
      color: #3d3d00;
    }

    .declaration strong {
      color: #1a365d;
    }

    /* ── SIGNATURES ─────────────────────────── */
    .sigs-wrap {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-top: 36px;
      margin-bottom: 20px;
    }

    .sig-box {
      flex: 1;
      text-align: center;
    }

    .sig-space {
      height: 54px;
      border-bottom: 1px solid #333;
      margin-bottom: 6px;
    }

    .sig-title {
      font-size: 11.5px;
      font-weight: 600;
      color: #1a365d;
    }

    .sig-subtitle {
      font-size: 10.5px;
      color: #555;
    }

    /* ── FOOTER ─────────────────────────────── */
    .doc-footer {
      border-top: 1.5px solid #c8d0dc;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #777;
    }

    /* ── PRINT OVERRIDES ────────────────────── */
    @media print {
      html, body { background: none; }
      .page { padding: 0; width: 100%; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- ── HEADER ─────────────────────────────── -->
  <div class="header">
    <div class="logo-wrap">
      ${systemSettings.union_logo
        ? `<img src="${systemSettings.union_logo}" alt="লোগো">`
        : `<div class="logo-placeholder">🏛️</div>`}
    </div>
    <div class="header-text">
      <div class="govt-label">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার · স্থানীয় সরকার বিভাগ</div>
      <div class="union-name-bn">${systemSettings.union_name_bn}</div>
      ${systemSettings.union_name_en ? `<div class="union-name-en">${systemSettings.union_name_en}</div>` : ''}
      <div class="union-address">${systemSettings.address_bn}</div>
    </div>
  </div>

  <!-- ── DOCUMENT TITLE ─────────────────────── -->
  <div class="doc-title-wrap">
    <div class="doc-title">ওয়ারিশান কায়েম সনদের আবেদনপত্র</div>
    <div class="doc-subtitle">Application for Warish (Legal Heir) Certificate</div>
  </div>

  <!-- ── META ROW ───────────────────────────── -->
  <div class="meta-row">
    <div>আবেদন তারিখ / Application Date: <span>${printDate}</span></div>
    ${data.applicationId ? `<div>আবেদন আইডি / App ID: <span>${data.applicationId}</span></div>` : ''}
    <div></div>
  </div>

  <!-- ── SECTION 1: DECEASED ─────────────────── -->
  <div class="section">
    <div class="section-header">
      <span class="section-num">১</span>
      মৃত ব্যক্তির তথ্য &nbsp;/&nbsp; Information of the Deceased
    </div>
    <div class="section-body">
      <div class="field-grid">
        <div class="field-row">
          <span class="field-label">নাম (বাংলা)</span>
          <span class="field-colon">:</span>
          <span class="field-value">${data.deceased_name_bn}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Name (English)</span>
          <span class="field-colon">:</span>
          <span class="field-value">${data.deceased_name_en}</span>
        </div>
        <div class="field-row">
          <span class="field-label">পিতার নাম</span>
          <span class="field-colon">:</span>
          <span class="field-value">${data.deceased_father_name_bn}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Father's Name</span>
          <span class="field-colon">:</span>
          <span class="field-value">${data.deceased_father_name_en || '—'}</span>
        </div>
        <div class="field-row">
          <span class="field-label">মাতার নাম</span>
          <span class="field-colon">:</span>
          <span class="field-value">${data.deceased_mother_name_bn || '—'}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Mother's Name</span>
          <span class="field-colon">:</span>
          <span class="field-value">${data.deceased_mother_name_en || '—'}</span>
        </div>
        <div class="field-row">
          <span class="field-label">জাতীয় পরিচয়পত্র নং</span>
          <span class="field-colon">:</span>
          <span class="field-value">${data.deceased_nid || '—'}</span>
        </div>
        <div class="field-row">
          <span class="field-label">মৃত্যুর তারিখ</span>
          <span class="field-colon">:</span>
          <span class="field-value">${formatDateBN(data.date_of_death)}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ── SECTION 2: APPLICANT ────────────────── -->
  <div class="section">
    <div class="section-header">
      <span class="section-num">২</span>
      আবেদনকারীর তথ্য &nbsp;/&nbsp; Applicant Information
    </div>
    <div class="section-body">
      <div class="field-grid">
        <div class="field-row">
          <span class="field-label">নাম (বাংলা)</span>
          <span class="field-colon">:</span>
          <span class="field-value">${applicant.name_bn}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Name (English)</span>
          <span class="field-colon">:</span>
          <span class="field-value">${applicant.name_en}</span>
        </div>
        <div class="field-row">
          <span class="field-label">মোবাইল নং</span>
          <span class="field-colon">:</span>
          <span class="field-value">${applicant.mobile}</span>
        </div>
        <div class="field-row">
          <span class="field-label">জাতীয় পরিচয়পত্র নং</span>
          <span class="field-colon">:</span>
          <span class="field-value">${applicant.nid_no || '—'}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ── SECTION 3: HEIRS TABLE ──────────────── -->
  <div class="section">
    <div class="section-header">
      <span class="section-num">৩</span>
      ওয়ারিশানদের তালিকা &nbsp;/&nbsp; List of Legal Heirs
    </div>
    <div class="section-body" style="padding: 0;">
      <table>
        <thead>
          <tr>
            <th style="width: 36px;">ক্রমিক</th>
            <th>ওয়ারিশের নাম / Name</th>
            <th style="width: 90px;">সম্পর্ক / Relation</th>
            <th style="width: 110px;">জন্ম তারিখ / DOB</th>
            <th style="width: 120px;">এনআইডি / জন্মনিবন্ধন</th>
          </tr>
        </thead>
        <tbody>
          ${heirsTableRows}
          ${heirs.length < 6 ? Array.from({ length: 6 - heirs.length }, () => `
            <tr>
              <td class="td-center" style="color:#ccc;">—</td>
              <td></td><td></td><td></td><td></td>
            </tr>`).join('') : ''}
        </tbody>
      </table>
    </div>
  </div>

  <!-- ── DECLARATION ─────────────────────────── -->
  <div class="declaration">
    <strong>ঘোষণাপত্র:</strong> আমি নিম্নস্বাক্ষরকারী এই মর্মে ঘোষণা করছি যে, উপরে উল্লিখিত তথ্যাবলি সম্পূর্ণ সত্য ও নির্ভুল। 
    উল্লিখিত মৃত ব্যক্তির ওয়ারিশান হিসেবে আমরা ব্যতীত আর কোনো উত্তরাধিকারী নেই। কোনো তথ্য মিথ্যা প্রমাণিত হলে আইনানুগ ব্যবস্থা 
    গ্রহণে আমি সম্মত আছি।
  </div>

  <!-- ── SIGNATURES ─────────────────────────── -->
  <div class="sigs-wrap">
    <div class="sig-box">
      <div class="sig-space"></div>
      <div class="sig-title">আবেদনকারীর স্বাক্ষর</div>
      <div class="sig-subtitle">Applicant's Signature</div>
    </div>
    <div class="sig-box">
      <div class="sig-space"></div>
      <div class="sig-title">সংশ্লিষ্ট ওয়ার্ড মেম্বারের স্বাক্ষর</div>
      <div class="sig-subtitle">Ward Member's Signature & Seal</div>
    </div>
    <div class="sig-box">
      <div class="sig-space"></div>
      <div class="sig-title">${systemSettings.chairman_name_bn || 'চেয়ারম্যান'}</div>
      <div class="sig-subtitle">চেয়ারম্যান / Chairman — ${systemSettings.union_name_bn}</div>
    </div>
  </div>

  <!-- ── FOOTER ─────────────────────────────── -->
  <div class="doc-footer">
    <div>গণপ্রজাতন্ত্রী বাংলাদেশ সরকার · স্থানীয় সরকার বিভাগ</div>
    <div>মুদ্রণ তারিখ: ${printDate}</div>
  </div>

</div>
</body>
</html>
  `.trim()
}
