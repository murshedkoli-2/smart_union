/**
 * Migration: strip citizen info + layout HTML from all certificate templates.
 * Templates now hold ONLY the certificate-specific paragraph text.
 * Run: npx tsx scripts/update-templates.ts
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const MONGODB_URI = process.env.MONGODB_URI || ''
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set in .env.local')
  process.exit(1)
}

const CertificateTemplateSchema = new mongoose.Schema({
  name: String,
  template_type: String,
  certificate_category: String,
  language: String,
  body_template: String,
  dynamic_fields: [
    {
      field_key: String,
      field_label: String,
      field_type: String,
      options: [String],
      required: Boolean,
      default_value: String,
    },
  ],
  fee: Number,
  is_active: Boolean,
  created_by: mongoose.Schema.Types.ObjectId,
}, { timestamps: true })

const CertificateTemplate =
  mongoose.models.CertificateTemplate ||
  mongoose.model('CertificateTemplate', CertificateTemplateSchema)

// ── New clean body_templates keyed by template name ───────────────────────────
// Only certificate-specific text. No citizen info, no header, no footer, no border.
// Dynamic field placeholders like {{purpose}}, {{occupation}} are kept.

const NEW_BODIES: Record<string, { body: string; removeFields?: string[] }> = {

  // ── Bengali ────────────────────────────────────────────────────────────────

  'নাগরিকত্ব সনদ': {
    body: `<p>আমার জানামতে তিনি একজন সৎ, চরিত্রবান ও আইনের প্রতি শ্রদ্ধাশীল নাগরিক। তাঁহার বিরুদ্ধে কোনো ফৌজদারি মামলা নাই এবং তিনি কোনো সন্ত্রাসী বা জঙ্গি সংগঠনের সহিত জড়িত নহেন।</p>
<p style="margin-top:12px;">আমি তাঁহার সর্বাঙ্গীণ উন্নতি ও মঙ্গল কামনা করি।</p>`,
    removeFields: ['issue_date'],
  },

  'চারিত্রিক সনদ': {
    body: `<p>আমার জানামতে তিনি একজন সৎ, চরিত্রবান ও নৈতিক চরিত্রের অধিকারী ব্যক্তি। তাঁহার বিরুদ্ধে কোনো ফৌজদারি বা দেওয়ানি মামলা নাই। তিনি কোনো অসামাজিক কার্যকলাপ বা সন্ত্রাসী কর্মকান্ডের সাথে জড়িত নহেন।</p>
<p style="margin-top:12px;"><strong>সনদ প্রদানের উদ্দেশ্য:</strong> {{purpose}}</p>
<p style="margin-top:12px;">আমি তাঁহার সর্বাঙ্গীণ উন্নতি ও মঙ্গল কামনা করি।</p>`,
    removeFields: ['issue_date'],
  },

  'আয়ের সনদ': {
    body: `<p>স্থানীয় অনুসন্ধান ও তথ্যানুযায়ী জানা যায় যে, তাঁহার পেশা <strong>{{occupation}}</strong> এবং সকল উৎস হইতে তাঁহার পরিবারের <strong>বার্ষিক আয় প্রায় {{annual_income}} ({{income_in_words}}) টাকা মাত্র</strong>।</p>
<p style="margin-top:12px;"><strong>সনদ প্রদানের উদ্দেশ্য:</strong> {{purpose}}</p>
<p style="margin-top:12px;">আমি তাঁহার সর্বাঙ্গীণ উন্নতি ও মঙ্গল কামনা করি।</p>`,
    removeFields: ['issue_date'],
  },

  'বাসিন্দা সনদ': {
    body: `<p>তিনি গত <strong>{{residence_years}}</strong> বৎসর যাবৎ উক্ত ঠিকানায় বসবাস করিতেছেন।</p>
<p style="margin-top:12px;">আমার জানামতে তিনি একজন সৎ ও আইন মান্যকারী নাগরিক।</p>
<p style="margin-top:12px;"><strong>সনদ প্রদানের উদ্দেশ্য:</strong> {{purpose}}</p>`,
    removeFields: ['issue_date'],
  },

  'অবিবাহিত সনদ': {
    body: `<p>স্থানীয় অনুসন্ধান ও তথ্যানুযায়ী জানা যায় যে, তিনি অদ্যাবধি <strong>অবিবাহিত</strong> আছেন এবং তাঁহার কোনো বিবাহ সম্পন্ন হয় নাই।</p>
<p style="margin-top:12px;"><strong>সনদ প্রদানের উদ্দেশ্য:</strong> {{purpose}}</p>
<p style="margin-top:12px;">আমি তাঁহার সর্বাঙ্গীণ উন্নতি ও মঙ্গল কামনা করি।</p>`,
    removeFields: ['issue_date'],
  },

  'জাতীয়তা সনদ': {
    body: `<p>তিনি জন্মসূত্রে <strong>বাংলাদেশের নাগরিক</strong> এবং <strong>{{religion}}</strong> ধর্মাবলম্বী।</p>
<p style="margin-top:12px;">আমার জানামতে তিনি অন্য কোনো দেশের নাগরিকত্ব গ্রহণ করেন নাই।</p>
<p style="margin-top:12px;"><strong>সনদ প্রদানের উদ্দেশ্য:</strong> {{purpose}}</p>`,
    removeFields: ['issue_date'],
  },

  'ওয়ারিশ সনদ': {
    body: `<p>এই মর্মে প্রত্যয়ন করা যাইতেছে যে, মৃত <strong>{{deceased_name}}</strong>, পিতা: {{deceased_father_name}}, <strong>{{death_date}}</strong> তারিখে মৃত্যুবরণ করেন।</p>
<p style="margin-top:12px;">মৃত্যুকালে তিনি নিম্নলিখিত ওয়ারিশগণ রাখিয়া যান:</p>
<table style="width:100%; border-collapse:collapse; margin:12px 0; font-size:14px;">
  <thead>
    <tr style="background:#f5f5f5;">
      <th style="border:1px solid #888; padding:6px 10px;">ক্রমিক</th>
      <th style="border:1px solid #888; padding:6px 10px;">ওয়ারিশের নাম</th>
      <th style="border:1px solid #888; padding:6px 10px;">সম্পর্ক</th>
      <th style="border:1px solid #888; padding:6px 10px;">বয়স</th>
    </tr>
  </thead>
  <tbody>{{heirs_table}}</tbody>
</table>
<p style="margin-top:12px;">আমার জানামতে উপরোক্ত ব্যক্তিগণই মৃতের একমাত্র ওয়ারিশ এবং তাঁহারা ব্যতীত অন্য কেহই মৃতের সম্পত্তিতে ওয়ারিশ সাব্যস্ত হইবার অধিকারী নহেন।</p>`,
    removeFields: ['issue_date'],
  },

  'ভূমিহীন সনদ': {
    body: `<p>স্থানীয় অনুসন্ধান ও তথ্যানুযায়ী জানা যায় যে, তিনি এবং তাঁহার পরিবার <strong>ভূমিহীন</strong>। তাঁহাদের নিজস্ব কোনো বসতভিটা বা কৃষিজমি নাই। তাঁহারা অন্যের জমিতে বসবাস করেন এবং দিনমজুরি/{{occupation}} করিয়া জীবিকা নির্বাহ করেন।</p>
<p style="margin-top:12px;">তাঁহার পরিবারের সদস্য সংখ্যা: <strong>{{family_members}}</strong> জন।</p>
<p style="margin-top:12px;"><strong>সনদ প্রদানের উদ্দেশ্য:</strong> {{purpose}}</p>`,
    removeFields: ['issue_date'],
  },

  // ── English ────────────────────────────────────────────────────────────────

  'Citizenship Certificate': {
    body: `<p>To the best of my knowledge, he/she is an honest, law-abiding citizen with good moral character. There are no criminal cases pending against him/her and he/she is not associated with any terrorist or militant organizations.</p>
<p style="margin-top:12px;">I wish him/her all success in future endeavors.</p>`,
    removeFields: ['issue_date'],
  },

  'Character Certificate': {
    body: `<p>To the best of my knowledge, he/she is an honest person with good moral character. There are no criminal or civil cases pending against him/her. He/she is not involved in any antisocial or terrorist activities.</p>
<p style="margin-top:12px;"><strong>Purpose of Certificate:</strong> {{purpose}}</p>
<p style="margin-top:12px;">I wish him/her all success in future endeavors.</p>`,
    removeFields: ['issue_date'],
  },

  'Income Certificate': {
    body: `<p>As per local inquiry and information, his/her occupation is <strong>{{occupation}}</strong> and the <strong>annual family income from all sources is approximately BDT {{annual_income}} ({{income_in_words}} Taka only)</strong>.</p>
<p style="margin-top:12px;"><strong>Purpose of Certificate:</strong> {{purpose}}</p>
<p style="margin-top:12px;">I wish him/her all success in future endeavors.</p>`,
    removeFields: ['issue_date'],
  },

  'Residence Certificate': {
    body: `<p>He/she has been residing at the above address for the past <strong>{{residence_years}}</strong> years.</p>
<p style="margin-top:12px;">To the best of my knowledge, he/she is an honest and law-abiding citizen.</p>
<p style="margin-top:12px;"><strong>Purpose of Certificate:</strong> {{purpose}}</p>`,
    removeFields: ['issue_date'],
  },

  'Unmarried Certificate': {
    body: `<p>As per local inquiry and information, he/she is still <strong>unmarried</strong> and has not entered into any marriage to date.</p>
<p style="margin-top:12px;"><strong>Purpose of Certificate:</strong> {{purpose}}</p>
<p style="margin-top:12px;">I wish him/her all success in future endeavors.</p>`,
    removeFields: ['issue_date'],
  },

  'Nationality Certificate': {
    body: `<p>He/she is a <strong>citizen of Bangladesh by birth</strong> and belongs to the <strong>{{religion}}</strong> religion.</p>
<p style="margin-top:12px;">To the best of my knowledge, he/she has not acquired citizenship of any other country.</p>
<p style="margin-top:12px;"><strong>Purpose of Certificate:</strong> {{purpose}}</p>`,
    removeFields: ['issue_date'],
  },

  'Inheritance Certificate (Warish)': {
    body: `<p>This is to certify that the late <strong>{{deceased_name}}</strong>, Father: {{deceased_father_name}}, passed away on <strong>{{death_date}}</strong>.</p>
<p style="margin-top:12px;">At the time of death, the following legal heirs survived:</p>
<table style="width:100%; border-collapse:collapse; margin:12px 0; font-size:14px;">
  <thead>
    <tr style="background:#f5f5f5;">
      <th style="border:1px solid #888; padding:6px 10px;">Sl. No.</th>
      <th style="border:1px solid #888; padding:6px 10px;">Name of Heir</th>
      <th style="border:1px solid #888; padding:6px 10px;">Relationship</th>
      <th style="border:1px solid #888; padding:6px 10px;">Age</th>
    </tr>
  </thead>
  <tbody>{{heirs_table}}</tbody>
</table>
<p style="margin-top:12px;">To the best of my knowledge, the above-mentioned persons are the sole legal heirs of the deceased, and no other person is entitled to inherit the property of the deceased.</p>`,
    removeFields: ['issue_date'],
  },

  // ── Extra templates found in DB ────────────────────────────────────────────

  'নাগরিত্ব সনদ': {
    body: `<p>আমি তাঁহাকে ব্যক্তিগতভাবে চিনি ও জানি। আমি তাঁহার উজ্জ্বল ভবিষ্যৎ কামনা করছি।</p>`,
    removeFields: ['issue_date'],
  },

  'সাধারণ প্রত্যয়ন পত্র': {
    body: `<p>{{attestation_text}}</p>
<p style="margin-top:12px;"><strong>সনদ প্রদানের উদ্দেশ্য:</strong> {{purpose}}</p>
<p style="margin-top:12px;">আমি তাঁহার সর্বাঙ্গীণ উন্নতি ও মঙ্গল কামনা করি।</p>`,
    removeFields: ['issue_date'],
  },

  'General Attestation': {
    body: `<p>{{attestation_text}}</p>
<p style="margin-top:12px;"><strong>Purpose of Certificate:</strong> {{purpose}}</p>
<p style="margin-top:12px;">I wish him/her all success in future endeavors.</p>`,
    removeFields: ['issue_date'],
  },

  'Landless Certificate': {
    body: `<p>As per local inquiry and information, he/she and the family are <strong>landless</strong>. They do not own any homestead or agricultural land. They live on other people's land and earn their livelihood through daily labor / {{occupation}}.</p>
<p style="margin-top:12px;">Number of family members: <strong>{{family_members}}</strong>.</p>
<p style="margin-top:12px;"><strong>Purpose of Certificate:</strong> {{purpose}}</p>`,
    removeFields: ['issue_date'],
  },

  'মৃত্যু সনদ': {
    body: `<p>এই মর্মে প্রত্যয়ন করা যাইতেছে যে, <strong>{{deceased_name}}</strong>, পিতা: {{deceased_father_name}}, মাতা: {{deceased_mother_name}}, <strong>{{death_date}}</strong> তারিখে মৃত্যুবরণ করেন।</p>
<p style="margin-top:12px;"><strong>মৃত্যুর স্থান:</strong> {{death_place}}</p>
<p style="margin-top:4px;"><strong>মৃত্যুর কারণ:</strong> {{death_cause}}</p>
<p style="margin-top:4px;"><strong>মৃত্যুকালীন বয়স:</strong> {{age_at_death}} বছর</p>
<p style="margin-top:12px;">মৃতের পরিচয় নিশ্চিতকরণ: <strong>{{identifier_name}}</strong> ({{identifier_relation}})</p>`,
    removeFields: ['issue_date'],
  },

  'Death Certificate': {
    body: `<p>This is to certify that <strong>{{deceased_name}}</strong>, Father: {{deceased_father_name}}, Mother: {{deceased_mother_name}}, passed away on <strong>{{death_date}}</strong>.</p>
<p style="margin-top:12px;"><strong>Place of Death:</strong> {{death_place}}</p>
<p style="margin-top:4px;"><strong>Cause of Death:</strong> {{death_cause}}</p>
<p style="margin-top:4px;"><strong>Age at Death:</strong> {{age_at_death}} years</p>
<p style="margin-top:12px;">Identity confirmed by: <strong>{{identifier_name}}</strong> ({{identifier_relation}})</p>`,
    removeFields: ['issue_date'],
  },

  'বিবাহিত সনদ': {
    body: `<p>স্থানীয় অনুসন্ধান ও তথ্যানুযায়ী জানা যায় যে, তিনি <strong>{{spouse_name}}</strong> এর সহিত <strong>{{marriage_date}}</strong> তারিখে বিবাহ বন্ধনে আবদ্ধ হন।</p>
<p style="margin-top:12px;"><strong>বিবাহ নিবন্ধন নং:</strong> {{marriage_reg_no}}</p>
<p style="margin-top:12px;"><strong>সনদ প্রদানের উদ্দেশ্য:</strong> {{purpose}}</p>
<p style="margin-top:12px;">আমি তাঁহার সর্বাঙ্গীণ উন্নতি ও মঙ্গল কামনা করি।</p>`,
    removeFields: ['issue_date'],
  },

  'Married Certificate': {
    body: `<p>As per local inquiry and information, he/she is married to <strong>{{spouse_name}}</strong> on <strong>{{marriage_date}}</strong>.</p>
<p style="margin-top:12px;"><strong>Marriage Registration No:</strong> {{marriage_reg_no}}</p>
<p style="margin-top:12px;"><strong>Purpose of Certificate:</strong> {{purpose}}</p>
<p style="margin-top:12px;">I wish him/her all success in future endeavors.</p>`,
    removeFields: ['issue_date'],
  },

  'পুনর্বিবাহ না করার সনদ': {
    body: `<p>তাঁহার স্বামী/স্ত্রী <strong>{{deceased_spouse_name}}</strong>, <strong>{{spouse_death_date}}</strong> তারিখে মৃত্যুবরণ করেন। স্থানীয় অনুসন্ধান ও তথ্যানুযায়ী জানা যায় যে, তিনি উক্ত মৃত্যুর পর হইতে অদ্যাবধি পুনর্বিবাহ করেন নাই।</p>
<p style="margin-top:12px;"><strong>সনদ প্রদানের উদ্দেশ্য:</strong> {{purpose}}</p>
<p style="margin-top:12px;">আমি তাঁহার সর্বাঙ্গীণ উন্নতি ও মঙ্গল কামনা করি।</p>`,
    removeFields: ['issue_date'],
  },

  'Non-Remarriage Certificate': {
    body: `<p>His/her spouse <strong>{{deceased_spouse_name}}</strong> passed away on <strong>{{spouse_death_date}}</strong>. As per local inquiry and information, he/she has not remarried since the death of the spouse.</p>
<p style="margin-top:12px;"><strong>Purpose of Certificate:</strong> {{purpose}}</p>
<p style="margin-top:12px;">I wish him/her all success in future endeavors.</p>`,
    removeFields: ['issue_date'],
  },

  'বেকারত্ব সনদ': {
    body: `<p>তাঁহার শিক্ষাগত যোগ্যতা: <strong>{{education}}</strong></p>
<p style="margin-top:12px;">স্থানীয় অনুসন্ধান ও তথ্যানুযায়ী জানা যায় যে, তিনি বর্তমানে <strong>বেকার</strong> আছেন এবং তাঁহার কোনো সরকারি বা বেসরকারি চাকরি বা নিয়মিত আয়ের উৎস নাই।</p>
<p style="margin-top:12px;"><strong>সনদ প্রদানের উদ্দেশ্য:</strong> {{purpose}}</p>
<p style="margin-top:12px;">আমি তাঁহার সর্বাঙ্গীণ উন্নতি ও মঙ্গল কামনা করি।</p>`,
    removeFields: ['issue_date'],
  },

  'Unemployment Certificate': {
    body: `<p><strong>Educational Qualification:</strong> {{education}}</p>
<p style="margin-top:12px;">As per local inquiry and information, he/she is currently <strong>unemployed</strong> and does not have any government or private employment or regular source of income.</p>
<p style="margin-top:12px;"><strong>Purpose of Certificate:</strong> {{purpose}}</p>
<p style="margin-top:12px;">I wish him/her all success in future endeavors.</p>`,
    removeFields: ['issue_date'],
  },

  'সম্পত্তি সনদ': {
    body: `<p>স্থানীয় অনুসন্ধান ও তথ্যানুযায়ী তাঁহার নিম্নলিখিত সম্পত্তি রহিয়াছে:</p>
<p style="margin-top:8px;"><strong>বসতভিটার পরিমাণ:</strong> {{homestead_land}} শতাংশ</p>
<p style="margin-top:4px;"><strong>কৃষি জমির পরিমাণ:</strong> {{agricultural_land}} শতাংশ</p>
<p style="margin-top:4px;"><strong>অন্যান্য সম্পত্তি:</strong> {{other_assets}}</p>
<p style="margin-top:12px;"><strong>সনদ প্রদানের উদ্দেশ্য:</strong> {{purpose}}</p>`,
    removeFields: ['issue_date'],
  },

  'Property Certificate': {
    body: `<p>As per local inquiry and information, the following properties are owned by him/her:</p>
<p style="margin-top:8px;"><strong>Homestead Land:</strong> {{homestead_land}} decimal</p>
<p style="margin-top:4px;"><strong>Agricultural Land:</strong> {{agricultural_land}} decimal</p>
<p style="margin-top:4px;"><strong>Other Assets:</strong> {{other_assets}}</p>
<p style="margin-top:12px;"><strong>Purpose of Certificate:</strong> {{purpose}}</p>`,
    removeFields: ['issue_date'],
  },
}

async function run() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')

  let updated = 0
  let skipped = 0
  let notFound = 0

  for (const [name, { body, removeFields = [] }] of Object.entries(NEW_BODIES)) {
    const template = await CertificateTemplate.findOne({ name })

    if (!template) {
      console.log(`  ⚠ Not found in DB: "${name}"`)
      notFound++
      continue
    }

    template.body_template = body

    if (removeFields.length) {
      template.dynamic_fields = (template.dynamic_fields as Array<{ field_key: string }>)
        .filter((f) => !removeFields.includes(f.field_key))
    }

    await template.save()
    console.log(`  ✓ Updated: "${name}"`)
    updated++
  }

  // Catch-all: update any remaining templates that still have the old-style HTML
  // by stripping everything outside the main text paragraphs (best-effort).
  const remaining = await CertificateTemplate.find({
    name: { $nin: Object.keys(NEW_BODIES) },
  })

  for (const t of remaining) {
    const body = t.body_template as string
    // If the template contains old layout markers, do a simple strip.
    if (body.includes('<div style="border:') || body.includes('border: 3px double')) {
      console.log(`  ~ Skipping unknown template with old layout: "${t.name}" — update manually`)
      skipped++
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped (manual): ${skipped}, Not in DB: ${notFound}`)
  await mongoose.disconnect()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
