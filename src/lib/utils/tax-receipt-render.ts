import { escapeHtml as esc } from './html'
import type { IPayment } from '@/models/Payment'

interface TaxReceiptData {
  payment: IPayment & {
    paid_by_citizen: {
      name_bn: string
      name_en: string
      mobile?: string
      nid_no?: string
    }
    collected_by: {
      name: string
    }
  }
  tax: {
    _id: string
    holding_no: string
    fiscal_year: string
    amount: number
    citizen_id: {
      address: {
        village_bn: string
        ward_no: number
      }
    }
  }
  systemSettings: {
    union_name_bn: string
    union_name_en: string
    chairman_name_bn: string
    chairman_name_en: string
    address_bn: string
    address_en: string
    union_logo?: string | null
  }
}

export function generateTaxReceiptHtml(data: TaxReceiptData): string {
  const { payment, tax, systemSettings } = data
  const paymentDate = new Date(payment.createdAt).toLocaleDateString('bn-BD', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const paymentTime = new Date(payment.createdAt).toLocaleTimeString('bn-BD', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>হোল্ডিং ট্যাক্স রসিদ - ${esc(payment.receipt_no)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', 'SolaimanLipi', 'Kalpurush', Arial, sans-serif;
      background: #f8fafc;
      padding: 24px;
      width: 794px;
      margin: 0 auto;
      color: #1e293b;
      line-height: 1.6;
    }

    .receipt-container {
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }

    .receipt-header {
      background: linear-gradient(135deg, #0f766e 0%, #059669 100%);
      color: white;
      padding: 32px;
      text-align: center;
      position: relative;
    }

    .header-content {
      position: relative;
      z-index: 1;
    }

    .logo {
      width: 80px;
      height: 80px;
      margin: 0 auto 16px;
      border-radius: 50%;
      border: 3px solid rgba(255, 255, 255, 0.3);
      background: rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: 700;
    }

    .union-name {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .union-address {
      font-size: 16px;
      opacity: 0.9;
      margin-bottom: 20px;
      font-weight: 300;
    }

    .receipt-title {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 16px 24px;
      margin: 0 auto;
      display: inline-block;
    }

    .receipt-title h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .receipt-title p {
      font-size: 14px;
      opacity: 0.8;
    }

    .receipt-meta {
      background: #f1f5f9;
      padding: 24px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .meta-label {
      font-size: 12px;
      font-weight: 500;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .meta-value {
      font-size: 18px;
      font-weight: 600;
      color: #0f172a;
    }

    .receipt-body {
      padding: 32px;
    }

    .section {
      margin-bottom: 32px;
    }

    .section:last-child {
      margin-bottom: 0;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e2e8f0;
    }

    .section-icon {
      width: 24px;
      height: 24px;
      background: #059669;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .section-title h3 {
      font-size: 18px;
      font-weight: 600;
      color: #0f172a;
      margin: 0;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .info-item {
      background: #f8fafc;
      padding: 16px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      transition: all 0.2s ease;
    }

    .info-item:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }

    .info-label {
      font-size: 12px;
      font-weight: 500;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .info-value {
      font-size: 15px;
      font-weight: 500;
      color: #0f172a;
      line-height: 1.4;
    }

    .amount-highlight {
      background: linear-gradient(135deg, #059669 0%, #0d9488 100%);
      color: white;
      padding: 32px;
      border-radius: 16px;
      text-align: center;
      margin: 32px 0;
      position: relative;
      overflow: hidden;
    }

    .amount-highlight::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
      animation: shimmer 3s ease-in-out infinite;
    }

    @keyframes shimmer {
      0%, 100% { transform: scale(0.8) rotate(0deg); opacity: 0; }
      50% { transform: scale(1.2) rotate(180deg); opacity: 1; }
    }

    .amount-content {
      position: relative;
      z-index: 1;
    }

    .amount-label {
      font-size: 16px;
      font-weight: 500;
      opacity: 0.9;
      margin-bottom: 12px;
    }

    .amount-value {
      font-size: 36px;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 48px;
      padding-top: 32px;
      border-top: 1px solid #e2e8f0;
    }

    .signature-box {
      text-align: center;
    }

    .signature-line {
      height: 80px;
      border-bottom: 2px solid #cbd5e1;
      margin-bottom: 12px;
      position: relative;
    }

    .signature-line::after {
      content: 'স্বাক্ষর / Signature';
      position: absolute;
      bottom: -8px;
      right: 0;
      font-size: 10px;
      color: #64748b;
      background: white;
      padding: 0 8px;
    }

    .signature-label {
      font-size: 14px;
      font-weight: 500;
      color: #475569;
    }

    .receipt-footer {
      background: #f8fafc;
      padding: 24px 32px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
    }

    .footer-note {
      background: #fef3cd;
      border: 1px solid #fbbf24;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .footer-note-icon {
      display: inline-block;
      width: 20px;
      height: 20px;
      background: #f59e0b;
      border-radius: 50%;
      margin-right: 8px;
      vertical-align: middle;
    }

    .footer-note-text {
      font-size: 13px;
      color: #92400e;
      font-weight: 500;
      vertical-align: middle;
    }

    .footer-info {
      font-size: 12px;
      color: #64748b;
      margin-top: 16px;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }

      .receipt-container {
        box-shadow: none;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <!-- Header -->
    <div class="receipt-header">
      <div class="header-content">
        ${systemSettings.union_logo ? `
          <img src="${esc(systemSettings.union_logo)}" alt="Logo" class="logo" />
        ` : `
          <div class="logo">🏛️</div>
        `}
        <div class="union-name">${esc(systemSettings.union_name_bn)}</div>
        <div class="union-address">${esc(systemSettings.address_bn)}</div>
        <div class="receipt-title">
          <h1>হোল্ডিং ট্যাক্স রসিদ</h1>
          <p>Holding Tax Receipt</p>
        </div>
      </div>
    </div>

    <!-- Receipt Meta Info -->
    <div class="receipt-meta">
      <div class="meta-item">
        <div class="meta-label">রসিদ নং / Receipt No</div>
        <div class="meta-value">${esc(payment.receipt_no)}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">তারিখ / Date</div>
        <div class="meta-value">${esc(paymentDate)}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">সময় / Time</div>
        <div class="meta-value">${esc(paymentTime)}</div>
      </div>
    </div>

    <!-- Receipt Body -->
    <div class="receipt-body">
      <!-- Payer Information -->
      <div class="section">
        <div class="section-title">
          <div class="section-icon">👤</div>
          <h3>প্রদানকারীর তথ্য / Payer Information</h3>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">নাম / Name</div>
            <div class="info-value">${esc(payment.paid_by_citizen.name_bn)}<br><small>${esc(payment.paid_by_citizen.name_en)}</small></div>
          </div>
          ${payment.paid_by_citizen.nid_no ? `
            <div class="info-item">
              <div class="info-label">জাতীয় পরিচয়পত্র / NID</div>
              <div class="info-value">${esc(payment.paid_by_citizen.nid_no)}</div>
            </div>
          ` : ''}
          ${payment.paid_by_citizen.mobile ? `
            <div class="info-item">
              <div class="info-label">মোবাইল / Mobile</div>
              <div class="info-value">${esc(payment.paid_by_citizen.mobile)}</div>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Tax Information -->
      <div class="section">
        <div class="section-title">
          <div class="section-icon">🏠</div>
          <h3>ট্যাক্স তথ্য / Tax Information</h3>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">হোল্ডিং নং / Holding No</div>
            <div class="info-value">${esc(tax.holding_no)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">ওয়ার্ড নং / Ward No</div>
            <div class="info-value">${esc(tax.citizen_id?.address?.ward_no ?? '—')}</div>
          </div>
          <div class="info-item">
            <div class="info-label">অর্থবছর / Fiscal Year</div>
            <div class="info-value">${esc(tax.fiscal_year)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">ঠিকানা / Address</div>
            <div class="info-value">${esc(tax.citizen_id?.address?.village_bn ?? '—')}</div>
          </div>
        </div>
      </div>

      <!-- Amount Highlight -->
      <div class="amount-highlight">
        <div class="amount-content">
          <div class="amount-label">প্রদত্ত পরিমাণ / Amount Paid</div>
          <div class="amount-value">৳ ${esc(tax.amount.toLocaleString('bn-BD'))}</div>
        </div>
      </div>

      <!-- Payment Details -->
      <div class="section">
        <div class="section-title">
          <div class="section-icon">💳</div>
          <h3>পেমেন্ট বিবরণ / Payment Details</h3>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">পেমেন্ট পদ্ধতি / Payment Method</div>
            <div class="info-value">নগদ / Cash</div>
          </div>
          <div class="info-item">
            <div class="info-label">গ্রহণকারী / Collected By</div>
            <div class="info-value">${esc(payment.collected_by.name)}</div>
          </div>
          ${payment.note ? `
            <div class="info-item" style="grid-column: span 2;">
              <div class="info-label">নোট / Note</div>
              <div class="info-value">${esc(payment.note)}</div>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Signatures -->
      <div class="signatures">
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">প্রদানকারী / Payer</div>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">গ্রহণকারী / Collector</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="receipt-footer">
      <div class="footer-note">
        <span class="footer-note-icon"></span>
        <span class="footer-note-text">
          <strong>দ্রষ্টব্য:</strong> এই রসিদটি সংরক্ষণ করুন। ভবিষ্যতে প্রয়োজন হতে পারে। / Please keep this receipt for future reference.
        </span>
      </div>
      <div class="footer-info">
        Generated on ${new Date().toLocaleDateString('en-BD')} • ${esc(systemSettings.union_name_en)}
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()
}
