interface FamilyApplicationData {
  applicant: {
    name_bn: string
    name_en: string
    father_name_bn?: string
    father_name_en?: string
    mother_name_bn?: string
    mother_name_en?: string
    mobile: string
    nid_no?: string
    address_bn?: string
  }
  family_members: Array<{
    name_bn: string
    name_en: string
    relation: string
    birth_date: string
    nid_no?: string
  }>
  systemSettings: {
    union_name_bn: string
    union_name_en?: string
    address_bn: string
    chairman_name_bn: string
    union_logo?: string | null
  }
  applicationId?: string
}

const esc = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const toBnDigits = (value: number) =>
  String(value).replace(/\d/g, (digit) => '0123456789'.includes(digit) ? '০১২৩৪৫৬৭৮৯'[Number(digit)] : digit)

function formatDate(date: string | Date) {
  try {
    return new Intl.DateTimeFormat('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date))
  } catch {
    return String(date)
  }
}

export function generateFamilyApplicationHtml(data: FamilyApplicationData): string {
  const rows = data.family_members
    .map((member, index) => `
      <tr>
        <td class="center">${toBnDigits(index + 1)}</td>
        <td>${esc(member.name_bn)}</td>
        <td class="center">${esc(member.relation)}</td>
        <td class="center">${formatDate(member.birth_date)}</td>
        <td class="center">${esc(member.nid_no || '—')}</td>
      </tr>
    `)
    .join('')

  const today = formatDate(new Date())

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <title>পারিবারিক সনদের আবেদনপত্র</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    html, body { width: 210mm; min-height: 297mm; margin: 0; background: #fff; }
    body { font-family: 'Hind Siliguri', 'Kalpurush', sans-serif; color: #1f2937; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .page { width: 180mm; margin: 0 auto; }
    .header { display: flex; align-items: center; justify-content: center; gap: 16px; border-bottom: 3px double #1d4ed8; padding-bottom: 10px; }
    .logo, .logo-fallback { width: 72px; height: 72px; border-radius: 999px; border: 2px solid #1d4ed8; object-fit: contain; }
    .logo-fallback { display: flex; align-items: center; justify-content: center; font-size: 28px; }
    .header-copy { text-align: center; }
    .eyebrow { font-size: 11px; font-weight: 600; color: #475569; }
    .union { font-size: 22px; font-weight: 800; color: #1d4ed8; }
    .sub { font-size: 12px; color: #64748b; }
    .title { text-align: center; margin: 16px 0 8px; }
    .title-box { display: inline-block; padding: 6px 26px; border-top: 2px solid #1d4ed8; border-bottom: 2px solid #1d4ed8; font-size: 17px; font-weight: 800; color: #1e3a8a; }
    .meta { display: flex; justify-content: space-between; margin: 10px 0 14px; border: 1px solid #bfdbfe; border-radius: 6px; background: #eff6ff; padding: 6px 12px; font-size: 11px; }
    .section-title { background: #1d4ed8; color: #fff; padding: 6px 12px; border-radius: 4px 4px 0 0; font-size: 12px; font-weight: 700; }
    .section-body { border: 1px solid #bfdbfe; border-top: none; border-radius: 0 0 4px 4px; padding: 10px 12px; margin-bottom: 12px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 18px; }
    .row { display: flex; gap: 6px; font-size: 12px; border-bottom: 1px dotted #cbd5e1; padding: 3px 0; }
    .label { width: 118px; flex-shrink: 0; color: #475569; font-weight: 700; }
    .value { flex: 1; color: #111827; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
    th { background: #dbeafe; color: #1e3a8a; border: 1px solid #93c5fd; padding: 7px 6px; }
    td { border: 1px solid #bfdbfe; padding: 6px; }
    .center { text-align: center; }
    .declaration { margin-top: 10px; border: 1px solid #fde68a; border-radius: 6px; background: #fffbeb; padding: 10px 12px; font-size: 11.5px; line-height: 1.8; }
    .signatures { display: flex; justify-content: space-between; gap: 12px; margin-top: 28px; }
    .signature { flex: 1; text-align: center; }
    .line { height: 48px; border-bottom: 1px solid #334155; margin-bottom: 6px; }
    .foot { display: flex; justify-content: space-between; margin-top: 18px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 10px; color: #64748b; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      ${data.systemSettings.union_logo ? `<img class="logo" src="${esc(data.systemSettings.union_logo)}" alt="Logo" />` : '<div class="logo-fallback">🏛</div>'}
      <div class="header-copy">
        <div class="eyebrow">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার · স্থানীয় সরকার বিভাগ</div>
        <div class="union">${esc(data.systemSettings.union_name_bn)}</div>
        <div class="sub">${esc(data.systemSettings.union_name_en || '')}</div>
        <div class="sub">${esc(data.systemSettings.address_bn)}</div>
      </div>
    </div>

    <div class="title">
      <div class="title-box">পারিবারিক সনদের আবেদনপত্র</div>
      <div class="sub">Application for Family Certificate</div>
    </div>

    <div class="meta">
      <div>আবেদন তারিখ: <strong>${esc(today)}</strong></div>
      <div>${data.applicationId ? `আবেদন আইডি: <strong>${esc(data.applicationId)}</strong>` : ''}</div>
    </div>

    <div class="section-title">আবেদনকারীর তথ্য</div>
    <div class="section-body">
      <div class="grid">
        <div class="row"><span class="label">নাম (বাংলা)</span><span>:</span><span class="value">${esc(data.applicant.name_bn)}</span></div>
        <div class="row"><span class="label">নাম (ইংরেজি)</span><span>:</span><span class="value">${esc(data.applicant.name_en)}</span></div>
        <div class="row"><span class="label">পিতার নাম</span><span>:</span><span class="value">${esc(data.applicant.father_name_bn || '—')}</span></div>
        <div class="row"><span class="label">মাতার নাম</span><span>:</span><span class="value">${esc(data.applicant.mother_name_bn || '—')}</span></div>
        <div class="row"><span class="label">মোবাইল</span><span>:</span><span class="value">${esc(data.applicant.mobile)}</span></div>
        <div class="row"><span class="label">এনআইডি</span><span>:</span><span class="value">${esc(data.applicant.nid_no || '—')}</span></div>
        <div class="row"><span class="label">ঠিকানা</span><span>:</span><span class="value">${esc(data.applicant.address_bn || '—')}</span></div>
      </div>
    </div>

    <div class="section-title">পরিবারের সদস্যদের তালিকা</div>
    <div class="section-body" style="padding:0">
      <table>
        <thead>
          <tr>
            <th style="width:40px">ক্রমিক</th>
            <th>নাম</th>
            <th style="width:110px">সম্পর্ক</th>
            <th style="width:120px">জন্ম তারিখ</th>
            <th style="width:120px">এনআইডি</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div class="declaration">
      আমি এই মর্মে ঘোষণা করছি যে উপরে উল্লিখিত ব্যক্তিরা আমার পরিবারের সদস্য। প্রদত্ত তথ্য আমার জানা মতে সঠিক ও সত্য।
      কোনো তথ্য ভুল প্রমাণিত হলে প্রশাসনিক বা আইনানুগ ব্যবস্থা গ্রহণে আমি সম্মত থাকব।
    </div>

    <div class="signatures">
      <div class="signature">
        <div class="line"></div>
        <div>আবেদনকারীর স্বাক্ষর</div>
      </div>
      <div class="signature">
        <div class="line"></div>
        <div>ওয়ার্ড সদস্যের স্বাক্ষর ও সীল</div>
      </div>
      <div class="signature">
        <div class="line"></div>
        <div>${esc(data.systemSettings.chairman_name_bn)}</div>
        <div style="font-size:10px;color:#64748b;">চেয়ারম্যান, ${esc(data.systemSettings.union_name_bn)}</div>
      </div>
    </div>

    <div class="foot">
      <div>গণপ্রজাতন্ত্রী বাংলাদেশ সরকার · স্থানীয় সরকার বিভাগ</div>
      <div>মুদ্রণ তারিখ: ${esc(today)}</div>
    </div>
  </div>
</body>
</html>`
}
