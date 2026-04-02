function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const LEGACY_SYSTEM_PLACEHOLDER_PATTERN =
  /\{\{\s*(union_name(?:_(?:bn|en))?|chairman_name(?:_(?:bn|en))?|union_address(?:_(?:bn|en))?|union_logo_url|union_members_text(?:_(?:bn|en))?|issue_date|certificate_no|verification_url|verification_qr(?:_html)?)\s*\}\}/gi

const ANY_PLACEHOLDER_PATTERN = /\{\{\s*[^}]+\s*\}\}/g

const LEGACY_SYSTEM_TEXT_PATTERNS = [
  /^certificate\s*no\b/i,
  /^cert\s*no\b/i,
  /^issue\s*date\b/i,
  /^verify\s*link\b/i,
  /^scan\s+to\s+verify\b/i,
  /^government\s+of\s+the\s+people'?s\s+republic\s+of\s+bangladesh\b/i,
  /^local\s+government\s+division\b/i,
  /^chairman\s*:/i,
]

function decodeBasicHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

export function normalizeCertificateTemplateBody(template: string): string {
  const plainText = decodeBasicHtmlEntities(
    String(template ?? '')
      .replace(/\r\n?/g, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|section|article|header|h1|h2|h3|h4|h5|h6|li|tr|table)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<[^>]+>/g, '')
      .replace(LEGACY_SYSTEM_PLACEHOLDER_PATTERN, '')
      .replace(ANY_PLACEHOLDER_PATTERN, '')
  )

  const cleanedLines = plainText
    .split('\n')
    .map((line) => line.trim())
    .filter((line, index, lines) => {
      if (!line) {
        return Boolean(lines[index - 1]) && Boolean(lines[index + 1])
      }

      return !LEGACY_SYSTEM_TEXT_PATTERNS.some((pattern) => pattern.test(line))
    })

  return cleanedLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function plainTextCertificateBodyToHtml(value: string): string {
  if (!value.trim()) return ''

  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 18px; text-align:justify;">${paragraph
          .split('\n')
          .map((line) => escapeHtml(line))
          .join('<br/>')}</p>`,
    )
    .join('')
}

function stripMatchingBlocks(html: string, patterns: string[]): string {
  const blockTags = ['p', 'div', 'section', 'article', 'header', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'center']
  let cleaned = html

  patterns.forEach((pattern) => {
    const blockRegex = new RegExp(
      `<(?:${blockTags.join('|')})[^>]*>[\\s\\S]{0,800}?${pattern}[\\s\\S]{0,800}?<\\/(?:${blockTags.join('|')})>`,
      'gi',
    )
    cleaned = cleaned.replace(blockRegex, '')

    const lineRegex = new RegExp(
      `(^|<br\\s*\\/?>|\\n)\\s*${pattern}[^<\\n]*(?=(<br\\s*\\/?>|\\n|$))`,
      'gi',
    )
    cleaned = cleaned.replace(lineRegex, '$1')
  })

  return cleaned
}

function sanitizeCertificateBodyHtml(
  html: string,
  options: {
    unionName?: string
    unionAddress?: string
    chairmanName?: string
    certificateTitle?: string
    certificateNo?: string
    issueDate?: string
    verificationUrl?: string
  },
): string {
  const valuePatterns = [
    options.unionName ? escapeRegex(options.unionName) : '',
    options.unionAddress ? escapeRegex(options.unionAddress) : '',
    options.chairmanName ? `Chairman\\s*:?\\s*${escapeRegex(options.chairmanName)}` : '',
    options.chairmanName ? escapeRegex(options.chairmanName) : '',
    options.certificateTitle ? escapeRegex(options.certificateTitle) : '',
    options.certificateNo ? `Certificate\\s*No\\s*:?\\s*${escapeRegex(options.certificateNo)}` : '',
    options.issueDate ? `Issue\\s*Date\\s*:?\\s*${escapeRegex(options.issueDate)}` : '',
    options.verificationUrl ? escapeRegex(options.verificationUrl) : '',
  ]
    .filter(Boolean)

  const labelPatterns = [
    'Certificate\\s*No\\s*:?',
    'Cert\\s*No\\s*:?',
    'Issue\\s*Date\\s*:?',
    'Verify\\s*Link\\s*:?',
    'Scan\\s+to\\s+verify',
    'Union\\s+Chairman',
    "Government\\s+of\\s+the\\s+People'?s\\s+Republic\\s+of\\s+Bangladesh",
    'Local\\s+Government\\s+Division',
  ]

  let cleaned = stripMatchingBlocks(html, [...valuePatterns, ...labelPatterns])

  cleaned = cleaned
    .replace(/^\s*(<br\s*\/?>|\s)+/i, '')
    .replace(/(<br\s*\/?>\s*){3,}/gi, '<br/><br/>')
    .replace(/\s{3,}/g, '  ')
    .trim()

  return cleaned
}

interface RenderCertificateTemplateOptions {
  templateHtml: string
  replacements: Record<string, unknown>
  dynamicData?: Record<string, unknown>
  rawReplacements?: Record<string, string>
  certificateNo?: string
  fallbackQrHtml?: string
}

export interface CitizenInfo {
  name: string
  fatherName: string
  motherName: string
  dateOfBirth?: string
  nidNo?: string
  wardNo?: string
  presentAddress?: string
  permanentAddress?: string
  mobile?: string
}

interface OfficialCertificateLayoutOptions {
  contentHtml: string
  citizenInfo?: CitizenInfo
  language?: 'bn' | 'en'
  status?: string
  unionName?: string
  unionAddress?: string
  chairmanName?: string
  unionLogoUrl?: string
  certificateTitle?: string
  certificateNo?: string
  issueDate?: string
  verificationUrl?: string
  qrHtml?: string
}

export function renderCertificateTemplate({
  templateHtml,
  replacements,
  dynamicData = {},
  rawReplacements = {},
  certificateNo,
  fallbackQrHtml,
}: RenderCertificateTemplateOptions): string {
  void rawReplacements
  void certificateNo
  void fallbackQrHtml

  let plainText = normalizeCertificateTemplateBody(templateHtml)

  Object.entries(replacements).forEach(([key, value]) => {
    plainText = plainText.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value ?? ''))
  })

  Object.entries(dynamicData).forEach(([key, value]) => {
    plainText = plainText.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value ?? ''))
  })

  return plainTextCertificateBodyToHtml(plainText)
}

export function renderOfficialCertificateLayout({
  contentHtml,
  citizenInfo,
  language = 'en',
  status,
  unionName,
  unionAddress,
  chairmanName,
  unionLogoUrl,
  certificateTitle,
  certificateNo,
  issueDate,
  verificationUrl,
  qrHtml,
}: OfficialCertificateLayoutOptions): string {
  void verificationUrl
  const safeUnionName = escapeHtml(unionName || 'Union Parishad')
  const safeUnionAddress = escapeHtml(unionAddress || '')
  const safeChairmanName = escapeHtml(chairmanName || '')
  const safeCertificateTitle = escapeHtml(certificateTitle || 'Certificate')
  const safeCertificateNo = escapeHtml(certificateNo || '')
  const safeIssueDate = escapeHtml(issueDate || '')
  const isBn = language === 'bn'
  const normalizedStatus = String(status ?? '').toLowerCase()

  const sanitizedContentHtml = sanitizeCertificateBodyHtml(contentHtml, {
    unionName,
    unionAddress,
    chairmanName,
    certificateTitle,
    certificateNo,
    issueDate,
    verificationUrl,
  })

  const watermarkHtml = unionLogoUrl
    ? `<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; z-index:0;">
        <img src="${escapeHtml(unionLogoUrl)}" alt="" aria-hidden="true" style="width:400px; height:400px; object-fit:contain; opacity:0.06;" />
      </div>`
    : ''

  const draftWatermarkHtml =
    normalizedStatus !== 'approved' && normalizedStatus !== 'locked'
      ? `<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; z-index:0;">
          <div style="transform:rotate(-30deg); font-size:${isBn ? '100px' : '110px'}; font-weight:900; letter-spacing:12px; color:#ef4444; opacity:0.15; text-transform:uppercase; white-space:nowrap; border: 12px solid #ef4444; padding: 18px 36px; border-radius: 16px;">
            ${isBn ? 'খসড়া / DRAFT' : 'DRAFT'}
          </div>
        </div>`
      : ''

  const qrBlock = qrHtml
    ? `<div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
        ${qrHtml}
        <div style="font-size:9px; color:#666; text-align:center;">${isBn ? 'স্ক্যান করে যাচাই করুন' : 'Scan to verify'}</div>
      </div>`
    : `<div style="width:100px;"></div>`

  const chairmanBlock = `
    <div style="text-align:center; min-width:200px;">
      <div style="height:60px;"></div>
      <div style="border-top:1.5px solid #111; width:200px; margin:0 auto;"></div>
      <div style="margin-top:4px; font-size:13px; font-weight:700; color:#111827;">${escapeHtml(safeChairmanName || (isBn ? 'চেয়ারম্যান' : 'Chairman'))}</div>
      <div style="font-size:11px; color:#444; margin-top:2px;">${isBn ? 'চেয়ারম্যান' : 'Chairman'}</div>
      <div style="font-size:11px; color:#444;">${safeUnionName}</div>
    </div>`

  const labels = isBn
    ? {
        name: 'নাম',
        fatherName: 'পিতার নাম',
        motherName: 'মাতার নাম',
        dob: 'জন্ম তারিখ',
        nid: 'জাতীয় পরিচয়পত্র নং',
        ward: 'ওয়ার্ড নং',
        presentAddress: 'ঠিকানা',
        permanentAddress: 'স্থায়ী ঠিকানা',
        mobile: 'মোবাইল নং',
      }
    : {
        name: 'Name',
        fatherName: "Father's Name",
        motherName: "Mother's Name",
        dob: 'Date of Birth',
        nid: 'National ID No',
        ward: 'Ward No',
        presentAddress: 'Address',
        permanentAddress: 'Permanent Address',
        mobile: 'Mobile No',
      }

  // ── Paragraph 1: Citizen Information (tabular like official govt docs) ──
  const citizenRows = citizenInfo
    ? [
        citizenInfo.name ? { label: labels.name, value: citizenInfo.name } : null,
        citizenInfo.fatherName ? { label: labels.fatherName, value: citizenInfo.fatherName } : null,
        citizenInfo.motherName ? { label: labels.motherName, value: citizenInfo.motherName } : null,
        citizenInfo.dateOfBirth ? { label: labels.dob, value: citizenInfo.dateOfBirth } : null,
        citizenInfo.nidNo ? { label: labels.nid, value: citizenInfo.nidNo } : null,
        citizenInfo.wardNo ? { label: labels.ward, value: citizenInfo.wardNo } : null,
        citizenInfo.presentAddress ? { label: labels.presentAddress, value: citizenInfo.presentAddress } : null,
        citizenInfo.permanentAddress ? { label: labels.permanentAddress, value: citizenInfo.permanentAddress } : null,
      ].filter((r): r is { label: string; value: string } => r !== null)
    : []

  const citizenInfoHtml = citizenRows.length
    ? `<table style="width:100%; border-collapse:collapse; margin:0 0 24px; font-size:14px; line-height:1.7; color:#111827;">
        ${citizenRows.map(r =>
          `<tr>
            <td style="padding:3px 12px 3px 0; font-weight:600; white-space:nowrap; vertical-align:top; width:180px;">${escapeHtml(r.label)}</td>
            <td style="padding:3px 8px 3px 0; font-weight:600; vertical-align:top; width:16px;">:</td>
            <td style="padding:3px 0; vertical-align:top;">${escapeHtml(r.value)}</td>
          </tr>`
        ).join('')}
      </table>`
    : ''

  // ── Paragraph 2: Certificate-specific content from template ──
  const bodyHtml = sanitizedContentHtml
    ? `<div style="font-size:14px; line-height:1.9; color:#111827; text-align:justify;">${sanitizedContentHtml}</div>`
    : ''

  return `
    <div style="position:relative; min-height:1123px; background:#ffffff; box-sizing:border-box; font-family:'Hind Siliguri', 'Noto Sans Bengali', sans-serif; color:#111827; overflow:hidden;">

      <!-- Double border like official govt documents -->
      <div style="position:absolute; inset:0; border:3px solid #1a5632; pointer-events:none; z-index:2;"></div>
      <div style="position:absolute; inset:6px; border:1.5px solid #1a5632; pointer-events:none; z-index:2;"></div>

      ${watermarkHtml}
      ${draftWatermarkHtml}

      <div style="position:relative; z-index:1; padding:40px 50px 36px;">

        <!-- Header: Logo + Government info -->
        <div style="display:flex; align-items:center; justify-content:center; gap:16px; margin-bottom:8px;">
          ${unionLogoUrl ? `<img src="${escapeHtml(unionLogoUrl)}" alt="" style="width:64px; height:64px; object-fit:contain;" />` : ''}
          <div style="text-align:center;">
            <div style="font-size:14px; font-weight:700; color:#111827; line-height:1.5;">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</div>
            <div style="font-size:11px; color:#333; line-height:1.4;">${isBn ? 'স্থানীয় সরকার বিভাগ' : "Government of the People's Republic of Bangladesh"}</div>
            <div style="font-size:22px; font-weight:700; color:#1a5632; line-height:1.3; margin-top:2px;">${safeUnionName}</div>
            ${safeUnionAddress ? `<div style="font-size:12px; color:#444; margin-top:1px;">${safeUnionAddress}</div>` : ''}
          </div>
        </div>

        <!-- Decorative divider -->
        <div style="margin:12px 0 10px;">
          <div style="border-top:2.5px solid #1a5632;"></div>
          <div style="border-top:1px solid #1a5632; margin-top:3px;"></div>
        </div>

        <!-- Certificate No & Issue Date row -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; font-size:12px; color:#333;">
          <div>
            ${safeCertificateNo
              ? `<span style="font-weight:600;">${isBn ? 'সনদ নং' : 'Certificate No'}:</span> ${safeCertificateNo}`
              : `<span style="font-weight:600;">${isBn ? 'স্মারক নং' : 'Memo No'}:</span> ........................`}
          </div>
          <div>
            <span style="font-weight:600;">${isBn ? 'তারিখ' : 'Date'}:</span> ${safeIssueDate}
          </div>
        </div>

        <!-- Certificate title -->
        <div style="text-align:center; margin-bottom:28px;">
          <div style="display:inline-block; position:relative; padding:6px 32px;">
            <div style="position:absolute; inset:0; border:2px solid #1a5632;"></div>
            <span style="font-size:20px; font-weight:700; letter-spacing:3px; color:#111827; text-transform:uppercase;">
              ${safeCertificateTitle}
            </span>
          </div>
        </div>

        <!-- Main body content -->
        <div style="position:relative; min-height:280px; padding:0 4px;">
          <div style="position:relative; z-index:1;">
            <!-- Paragraph 1: Citizen Information -->
            ${citizenInfoHtml}

            <!-- Paragraph 2: Certificate-specific content -->
            ${bodyHtml}
          </div>
        </div>

        <!-- Footer: QR (left) | Chairman signature (right) -->
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:50px;">
          ${qrBlock}
          ${chairmanBlock}
        </div>

      </div>
    </div>
  `
}
