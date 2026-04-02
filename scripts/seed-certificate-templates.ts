/**
 * Seed script to add common Union Parishad certificate templates
 * Run with: npx ts-node scripts/seed-certificate-templates.ts
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const MONGODB_URI = process.env.MONGODB_URI || ''

// Certificate Template Schema (matching the existing model)
const CertificateTemplateSchema = new mongoose.Schema({
  union_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Union' },
  name: { type: String, required: true },
  template_type: { type: String, enum: ['standard', 'custom', 'warish'], default: 'standard' },
  certificate_category: { type: String, required: true },
  language: { type: String, enum: ['bn', 'en'], default: 'bn' },
  header_template: String,
  body_template: { type: String, required: true },
  footer_template: String,
  dynamic_fields: [{
    field_key: String,
    field_label: String,
    field_type: { type: String, enum: ['text', 'date', 'number', 'select'] },
    options: [String],
    required: Boolean,
    default_value: String,
  }],
  fee: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

const CertificateTemplate = mongoose.models.CertificateTemplate || mongoose.model('CertificateTemplate', CertificateTemplateSchema)

const templates = [
  // 1. নাগরিকত্ব সনদ (Citizenship Certificate) - Bengali
  {
    name: 'নাগরিকত্ব সনদ',
    template_type: 'standard',
    certificate_category: 'citizenship',
    language: 'bn',
    body_template: `
<div style="text-align: center; font-family: 'SutonnyMJ', 'Kalpurush', sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</h2>
      <h3 style="margin: 5px 0;">ইউনিয়ন পরিষদ কার্যালয়</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">নাগরিকত্ব সনদ</h1>
      <p style="margin: 10px 0;">সনদ নং: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        এই মর্মে প্রত্যয়ন করা যাইতেছে যে, <strong>{{citizen_name_bn}}</strong>,
        পিতা/স্বামী: <strong>{{father_name_bn}}</strong>,
        মাতা: <strong>{{mother_name_bn}}</strong>,
        গ্রাম: {{village_bn}}, ডাকঘর: {{post_office_bn}},
        ওয়ার্ড নং: {{ward_no}},
        ইউনিয়ন: {{union_name}}, উপজেলা: {{upazila_name}}, জেলা: {{district_name}}
        এর একজন স্থায়ী বাসিন্দা এবং বাংলাদেশের নাগরিক।
      </p>

      <p style="margin-top: 15px;">
        তাঁহার জাতীয় পরিচয়পত্র নং: <strong>{{nid_no}}</strong>
      </p>

      <p style="margin-top: 15px;">
        আমার জানামতে তিনি একজন সৎ, চরিত্রবান ও আইনের প্রতি শ্রদ্ধাশীল নাগরিক।
        তাঁহার বিরুদ্ধে কোনো ফৌজদারি মামলা নাই এবং তিনি কোনো সন্ত্রাসী বা জঙ্গি সংগঠনের সহিত জড়িত নহেন।
      </p>

      <p style="margin-top: 15px;">
        আমি তাঁহার সর্বাঙ্গীণ উন্নতি ও মঙ্গল কামনা করি।
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>তারিখ: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">চেয়ারম্যান</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} ইউনিয়ন পরিষদ</p>
        </div>
      </div>
    </div>

    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px dashed #ccc;">
      <p style="font-size: 11px; color: #666;">
        এই সনদটি {{union_name}} ইউনিয়ন পরিষদ কর্তৃক ইস্যুকৃত।<br/>
        যাচাইকরণ: {{verification_url}}
      </p>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'issue_date', field_label: 'ইস্যুর তারিখ', field_type: 'date', required: true, options: [] },
    ],
    fee: 50,
    is_active: true,
  },

  // 2. চারিত্রিক সনদ (Character Certificate) - Bengali
  {
    name: 'চারিত্রিক সনদ',
    template_type: 'standard',
    certificate_category: 'character',
    language: 'bn',
    body_template: `
<div style="text-align: center; font-family: 'SutonnyMJ', 'Kalpurush', sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</h2>
      <h3 style="margin: 5px 0;">ইউনিয়ন পরিষদ কার্যালয়</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">চারিত্রিক সনদপত্র</h1>
      <p style="margin: 10px 0;">সনদ নং: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        এই মর্মে প্রত্যয়ন করা যাইতেছে যে, <strong>{{citizen_name_bn}}</strong>,
        পিতা: <strong>{{father_name_bn}}</strong>,
        মাতা: <strong>{{mother_name_bn}}</strong>,
        গ্রাম: {{village_bn}}, ওয়ার্ড নং: {{ward_no}},
        ইউনিয়ন: {{union_name}}, উপজেলা: {{upazila_name}}, জেলা: {{district_name}}
        এর একজন স্থায়ী বাসিন্দা।
      </p>

      <p style="margin-top: 15px;">
        আমার জানামতে তিনি একজন সৎ, চরিত্রবান ও নৈতিক চরিত্রের অধিকারী ব্যক্তি।
        তাঁহার বিরুদ্ধে কোনো ফৌজদারি বা দেওয়ানি মামলা নাই।
        তিনি কোনো অসামাজিক কার্যকলাপ বা সন্ত্রাসী কর্মকান্ডের সাথে জড়িত নহেন।
      </p>

      <p style="margin-top: 15px;">
        <strong>সনদ প্রদানের উদ্দেশ্য:</strong> {{purpose}}
      </p>

      <p style="margin-top: 15px;">
        আমি তাঁহার সর্বাঙ্গীণ উন্নতি ও মঙ্গল কামনা করি।
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>তারিখ: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">চেয়ারম্যান</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} ইউনিয়ন পরিষদ</p>
        </div>
      </div>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'purpose', field_label: 'সনদের উদ্দেশ্য', field_type: 'text', required: true, options: [] },
      { field_key: 'issue_date', field_label: 'ইস্যুর তারিখ', field_type: 'date', required: true, options: [] },
    ],
    fee: 50,
    is_active: true,
  },

  // 3. আয় সনদ (Income Certificate) - Bengali
  {
    name: 'আয়ের সনদ',
    template_type: 'standard',
    certificate_category: 'income',
    language: 'bn',
    body_template: `
<div style="text-align: center; font-family: 'SutonnyMJ', 'Kalpurush', sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</h2>
      <h3 style="margin: 5px 0;">ইউনিয়ন পরিষদ কার্যালয়</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">আয়ের সনদপত্র</h1>
      <p style="margin: 10px 0;">সনদ নং: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        এই মর্মে প্রত্যয়ন করা যাইতেছে যে, <strong>{{citizen_name_bn}}</strong>,
        পিতা/স্বামী: <strong>{{father_name_bn}}</strong>,
        মাতা: <strong>{{mother_name_bn}}</strong>,
        গ্রাম: {{village_bn}}, ওয়ার্ড নং: {{ward_no}},
        ইউনিয়ন: {{union_name}}, উপজেলা: {{upazila_name}}, জেলা: {{district_name}}
        এর একজন স্থায়ী বাসিন্দা।
      </p>

      <p style="margin-top: 15px;">
        স্থানীয় অনুসন্ধান ও তথ্যানুযায়ী জানা যায় যে, তাঁহার পেশা <strong>{{occupation}}</strong>
        এবং সকল উৎস হইতে তাঁহার পরিবারের <strong>বার্ষিক আয় প্রায় {{annual_income}} ({{income_in_words}}) টাকা মাত্র</strong>।
      </p>

      <p style="margin-top: 15px;">
        <strong>সনদ প্রদানের উদ্দেশ্য:</strong> {{purpose}}
      </p>

      <p style="margin-top: 15px;">
        আমি তাঁহার সর্বাঙ্গীণ উন্নতি ও মঙ্গল কামনা করি।
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>তারিখ: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">চেয়ারম্যান</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} ইউনিয়ন পরিষদ</p>
        </div>
      </div>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'occupation', field_label: 'পেশা', field_type: 'text', required: true, options: [] },
      { field_key: 'annual_income', field_label: 'বার্ষিক আয় (টাকা)', field_type: 'number', required: true, options: [] },
      { field_key: 'income_in_words', field_label: 'আয় (কথায়)', field_type: 'text', required: true, options: [] },
      { field_key: 'purpose', field_label: 'সনদের উদ্দেশ্য', field_type: 'text', required: true, options: [] },
      { field_key: 'issue_date', field_label: 'ইস্যুর তারিখ', field_type: 'date', required: true, options: [] },
    ],
    fee: 50,
    is_active: true,
  },

  // 4. বাসিন্দা/বসবাস সনদ (Residence Certificate) - Bengali
  {
    name: 'বাসিন্দা সনদ',
    template_type: 'standard',
    certificate_category: 'residence',
    language: 'bn',
    body_template: `
<div style="text-align: center; font-family: 'SutonnyMJ', 'Kalpurush', sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</h2>
      <h3 style="margin: 5px 0;">ইউনিয়ন পরিষদ কার্যালয়</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">বাসিন্দা সনদপত্র</h1>
      <p style="margin: 10px 0;">সনদ নং: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        এই মর্মে প্রত্যয়ন করা যাইতেছে যে, <strong>{{citizen_name_bn}}</strong>,
        পিতা/স্বামী: <strong>{{father_name_bn}}</strong>,
        মাতা: <strong>{{mother_name_bn}}</strong>,
        জাতীয় পরিচয়পত্র নং: {{nid_no}},
        গ্রাম: {{village_bn}}, ডাকঘর: {{post_office_bn}},
        ওয়ার্ড নং: {{ward_no}},
        ইউনিয়ন: {{union_name}}, উপজেলা: {{upazila_name}}, জেলা: {{district_name}}
        এর একজন <strong>স্থায়ী বাসিন্দা</strong>।
      </p>

      <p style="margin-top: 15px;">
        তিনি গত <strong>{{residence_years}}</strong> বৎসর যাবৎ উক্ত ঠিকানায় বসবাস করিতেছেন।
      </p>

      <p style="margin-top: 15px;">
        আমার জানামতে তিনি একজন সৎ ও আইন মান্যকারী নাগরিক।
      </p>

      <p style="margin-top: 15px;">
        <strong>সনদ প্রদানের উদ্দেশ্য:</strong> {{purpose}}
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>তারিখ: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">চেয়ারম্যান</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} ইউনিয়ন পরিষদ</p>
        </div>
      </div>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'residence_years', field_label: 'বসবাসের সময়কাল (বছর)', field_type: 'text', required: true, options: [] },
      { field_key: 'purpose', field_label: 'সনদের উদ্দেশ্য', field_type: 'text', required: true, options: [] },
      { field_key: 'issue_date', field_label: 'ইস্যুর তারিখ', field_type: 'date', required: true, options: [] },
    ],
    fee: 50,
    is_active: true,
  },

  // 5. অবিবাহিত সনদ (Unmarried Certificate) - Bengali
  {
    name: 'অবিবাহিত সনদ',
    template_type: 'standard',
    certificate_category: 'unmarried',
    language: 'bn',
    body_template: `
<div style="text-align: center; font-family: 'SutonnyMJ', 'Kalpurush', sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</h2>
      <h3 style="margin: 5px 0;">ইউনিয়ন পরিষদ কার্যালয়</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">অবিবাহিত সনদপত্র</h1>
      <p style="margin: 10px 0;">সনদ নং: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        এই মর্মে প্রত্যয়ন করা যাইতেছে যে, <strong>{{citizen_name_bn}}</strong>,
        পিতা: <strong>{{father_name_bn}}</strong>,
        মাতা: <strong>{{mother_name_bn}}</strong>,
        জন্ম তারিখ: {{date_of_birth}},
        গ্রাম: {{village_bn}}, ওয়ার্ড নং: {{ward_no}},
        ইউনিয়ন: {{union_name}}, উপজেলা: {{upazila_name}}, জেলা: {{district_name}}
        এর একজন স্থায়ী বাসিন্দা।
      </p>

      <p style="margin-top: 15px;">
        স্থানীয় অনুসন্ধান ও তথ্যানুযায়ী জানা যায় যে, তিনি অদ্যাবধি <strong>অবিবাহিত</strong> আছেন
        এবং তাঁহার কোনো বিবাহ সম্পন্ন হয় নাই।
      </p>

      <p style="margin-top: 15px;">
        <strong>সনদ প্রদানের উদ্দেশ্য:</strong> {{purpose}}
      </p>

      <p style="margin-top: 15px;">
        আমি তাঁহার সর্বাঙ্গীণ উন্নতি ও মঙ্গল কামনা করি।
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>তারিখ: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">চেয়ারম্যান</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} ইউনিয়ন পরিষদ</p>
        </div>
      </div>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'purpose', field_label: 'সনদের উদ্দেশ্য', field_type: 'text', required: true, options: [] },
      { field_key: 'issue_date', field_label: 'ইস্যুর তারিখ', field_type: 'date', required: true, options: [] },
    ],
    fee: 50,
    is_active: true,
  },

  // 6. জাতীয়তা সনদ (Nationality Certificate) - Bengali
  {
    name: 'জাতীয়তা সনদ',
    template_type: 'standard',
    certificate_category: 'nationality',
    language: 'bn',
    body_template: `
<div style="text-align: center; font-family: 'SutonnyMJ', 'Kalpurush', sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</h2>
      <h3 style="margin: 5px 0;">ইউনিয়ন পরিষদ কার্যালয়</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">জাতীয়তা সনদপত্র</h1>
      <p style="margin: 10px 0;">সনদ নং: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        এই মর্মে প্রত্যয়ন করা যাইতেছে যে, <strong>{{citizen_name_bn}}</strong>
        (ইংরেজিতে: {{citizen_name_en}}),
        পিতা: <strong>{{father_name_bn}}</strong>,
        মাতা: <strong>{{mother_name_bn}}</strong>,
        জন্ম তারিখ: {{date_of_birth}}, জন্মস্থান: {{birth_place}},
        জাতীয় পরিচয়পত্র নং: {{nid_no}},
        গ্রাম: {{village_bn}}, ওয়ার্ড নং: {{ward_no}},
        ইউনিয়ন: {{union_name}}, উপজেলা: {{upazila_name}}, জেলা: {{district_name}}
        এর একজন স্থায়ী বাসিন্দা।
      </p>

      <p style="margin-top: 15px;">
        তিনি জন্মসূত্রে <strong>বাংলাদেশের নাগরিক</strong> এবং <strong>{{religion}}</strong> ধর্মাবলম্বী।
      </p>

      <p style="margin-top: 15px;">
        আমার জানামতে তিনি অন্য কোনো দেশের নাগরিকত্ব গ্রহণ করেন নাই।
      </p>

      <p style="margin-top: 15px;">
        <strong>সনদ প্রদানের উদ্দেশ্য:</strong> {{purpose}}
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>তারিখ: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">চেয়ারম্যান</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} ইউনিয়ন পরিষদ</p>
        </div>
      </div>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'birth_place', field_label: 'জন্মস্থান', field_type: 'text', required: true, options: [] },
      { field_key: 'religion', field_label: 'ধর্ম', field_type: 'select', required: true, options: ['ইসলাম', 'হিন্দু', 'বৌদ্ধ', 'খ্রিস্টান', 'অন্যান্য'] },
      { field_key: 'purpose', field_label: 'সনদের উদ্দেশ্য', field_type: 'text', required: true, options: [] },
      { field_key: 'issue_date', field_label: 'ইস্যুর তারিখ', field_type: 'date', required: true, options: [] },
    ],
    fee: 100,
    is_active: true,
  },

  // 7. ওয়ারিশ সনদ (Warish/Inheritance Certificate) - Bengali
  {
    name: 'ওয়ারিশ সনদ',
    template_type: 'warish',
    certificate_category: 'warish',
    language: 'bn',
    body_template: `
<div style="text-align: center; font-family: 'SutonnyMJ', 'Kalpurush', sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</h2>
      <h3 style="margin: 5px 0;">ইউনিয়ন পরিষদ কার্যালয়</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">ওয়ারিশ সনদপত্র</h1>
      <p style="margin: 10px 0;">সনদ নং: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        এই মর্মে প্রত্যয়ন করা যাইতেছে যে, মৃত <strong>{{deceased_name}}</strong>,
        পিতা: {{deceased_father_name}},
        গ্রাম: {{village_bn}}, ওয়ার্ড নং: {{ward_no}},
        ইউনিয়ন: {{union_name}}, উপজেলা: {{upazila_name}}, জেলা: {{district_name}}
        এর বাসিন্দা ছিলেন।
      </p>

      <p style="margin-top: 15px;">
        তিনি <strong>{{death_date}}</strong> তারিখে মৃত্যুবরণ করেন।
      </p>

      <p style="margin-top: 15px;">
        মৃত্যুকালে তিনি নিম্নলিখিত ওয়ারিশগণ রাখিয়া যান:
      </p>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background: #f0f0f0;">
            <th style="border: 1px solid #000; padding: 8px;">ক্রমিক</th>
            <th style="border: 1px solid #000; padding: 8px;">ওয়ারিশের নাম</th>
            <th style="border: 1px solid #000; padding: 8px;">সম্পর্ক</th>
            <th style="border: 1px solid #000; padding: 8px;">বয়স</th>
          </tr>
        </thead>
        <tbody>
          {{heirs_table}}
        </tbody>
      </table>

      <p style="margin-top: 15px;">
        আমার জানামতে উপরোক্ত ব্যক্তিগণই মৃতের একমাত্র ওয়ারিশ এবং তাঁহারা ব্যতীত অন্য কেহই মৃতের সম্পত্তিতে ওয়ারিশ সাব্যস্ত হইবার অধিকারী নহেন।
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>তারিখ: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">চেয়ারম্যান</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} ইউনিয়ন পরিষদ</p>
        </div>
      </div>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'deceased_name', field_label: 'মৃত ব্যক্তির নাম', field_type: 'text', required: true, options: [] },
      { field_key: 'deceased_father_name', field_label: 'মৃতের পিতার নাম', field_type: 'text', required: true, options: [] },
      { field_key: 'death_date', field_label: 'মৃত্যুর তারিখ', field_type: 'date', required: true, options: [] },
      { field_key: 'heirs_table', field_label: 'ওয়ারিশগণের তালিকা (HTML)', field_type: 'text', required: true, options: [] },
      { field_key: 'issue_date', field_label: 'ইস্যুর তারিখ', field_type: 'date', required: true, options: [] },
    ],
    fee: 200,
    is_active: true,
  },

  // 8. ভূমিহীন সনদ (Landless Certificate) - Bengali
  {
    name: 'ভূমিহীন সনদ',
    template_type: 'standard',
    certificate_category: 'other',
    language: 'bn',
    body_template: `
<div style="text-align: center; font-family: 'SutonnyMJ', 'Kalpurush', sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</h2>
      <h3 style="margin: 5px 0;">ইউনিয়ন পরিষদ কার্যালয়</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">ভূমিহীন সনদপত্র</h1>
      <p style="margin: 10px 0;">সনদ নং: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        এই মর্মে প্রত্যয়ন করা যাইতেছে যে, <strong>{{citizen_name_bn}}</strong>,
        পিতা/স্বামী: <strong>{{father_name_bn}}</strong>,
        মাতা: <strong>{{mother_name_bn}}</strong>,
        গ্রাম: {{village_bn}}, ওয়ার্ড নং: {{ward_no}},
        ইউনিয়ন: {{union_name}}, উপজেলা: {{upazila_name}}, জেলা: {{district_name}}
        এর একজন স্থায়ী বাসিন্দা।
      </p>

      <p style="margin-top: 15px;">
        স্থানীয় অনুসন্ধান ও তথ্যানুযায়ী জানা যায় যে, তিনি এবং তাঁহার পরিবার <strong>ভূমিহীন</strong>।
        তাঁহাদের নিজস্ব কোনো বসতভিটা বা কৃষিজমি নাই।
        তাঁহারা অন্যের জমিতে বসবাস করেন এবং দিনমজুরি/{{occupation}} করিয়া জীবিকা নির্বাহ করেন।
      </p>

      <p style="margin-top: 15px;">
        তাঁহার পরিবারের সদস্য সংখ্যা: <strong>{{family_members}}</strong> জন।
      </p>

      <p style="margin-top: 15px;">
        <strong>সনদ প্রদানের উদ্দেশ্য:</strong> {{purpose}}
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>তারিখ: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">চেয়ারম্যান</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} ইউনিয়ন পরিষদ</p>
        </div>
      </div>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'occupation', field_label: 'পেশা', field_type: 'text', required: true, options: [] },
      { field_key: 'family_members', field_label: 'পরিবারের সদস্য সংখ্যা', field_type: 'number', required: true, options: [] },
      { field_key: 'purpose', field_label: 'সনদের উদ্দেশ্য', field_type: 'text', required: true, options: [] },
      { field_key: 'issue_date', field_label: 'ইস্যুর তারিখ', field_type: 'date', required: true, options: [] },
    ],
    fee: 50,
    is_active: true,
  },

  // 9. Citizenship Certificate - English
  {
    name: 'Citizenship Certificate',
    template_type: 'standard',
    certificate_category: 'citizenship',
    language: 'en',
    body_template: `
<div style="text-align: center; font-family: Arial, sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">GOVERNMENT OF THE PEOPLE'S REPUBLIC OF BANGLADESH</h2>
      <h3 style="margin: 5px 0;">UNION PARISHAD OFFICE</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">CITIZENSHIP CERTIFICATE</h1>
      <p style="margin: 10px 0;">Certificate No: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        This is to certify that <strong>{{citizen_name_en}}</strong>,
        Father/Husband: <strong>{{father_name_en}}</strong>,
        Mother: <strong>{{mother_name_en}}</strong>,
        Village: {{village_en}}, Post Office: {{post_office_en}},
        Ward No: {{ward_no}},
        Union: {{union_name}}, Upazila: {{upazila_name}}, District: {{district_name}}
        is a permanent resident of this area and a citizen of Bangladesh.
      </p>

      <p style="margin-top: 15px;">
        National ID No: <strong>{{nid_no}}</strong>
      </p>

      <p style="margin-top: 15px;">
        To the best of my knowledge, he/she is an honest, law-abiding citizen with good moral character.
        There are no criminal cases pending against him/her and he/she is not associated with any terrorist or militant organizations.
      </p>

      <p style="margin-top: 15px;">
        I wish him/her all success in future endeavors.
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>Date: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">Chairman</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} Union Parishad</p>
        </div>
      </div>
    </div>

    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px dashed #ccc;">
      <p style="font-size: 11px; color: #666;">
        This certificate is issued by {{union_name}} Union Parishad.<br/>
        Verification: {{verification_url}}
      </p>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'issue_date', field_label: 'Issue Date', field_type: 'date', required: true, options: [] },
    ],
    fee: 50,
    is_active: true,
  },

  // 10. Character Certificate - English
  {
    name: 'Character Certificate',
    template_type: 'standard',
    certificate_category: 'character',
    language: 'en',
    body_template: `
<div style="text-align: center; font-family: Arial, sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">GOVERNMENT OF THE PEOPLE'S REPUBLIC OF BANGLADESH</h2>
      <h3 style="margin: 5px 0;">UNION PARISHAD OFFICE</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">CHARACTER CERTIFICATE</h1>
      <p style="margin: 10px 0;">Certificate No: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        This is to certify that <strong>{{citizen_name_en}}</strong>,
        Father: <strong>{{father_name_en}}</strong>,
        Mother: <strong>{{mother_name_en}}</strong>,
        Village: {{village_en}}, Ward No: {{ward_no}},
        Union: {{union_name}}, Upazila: {{upazila_name}}, District: {{district_name}}
        is a permanent resident of this area.
      </p>

      <p style="margin-top: 15px;">
        To the best of my knowledge, he/she is an honest person with good moral character.
        There are no criminal or civil cases pending against him/her.
        He/she is not involved in any antisocial or terrorist activities.
      </p>

      <p style="margin-top: 15px;">
        <strong>Purpose of Certificate:</strong> {{purpose}}
      </p>

      <p style="margin-top: 15px;">
        I wish him/her all success in future endeavors.
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>Date: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">Chairman</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} Union Parishad</p>
        </div>
      </div>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'purpose', field_label: 'Purpose of Certificate', field_type: 'text', required: true, options: [] },
      { field_key: 'issue_date', field_label: 'Issue Date', field_type: 'date', required: true, options: [] },
    ],
    fee: 50,
    is_active: true,
  },

  // 11. Income Certificate - English
  {
    name: 'Income Certificate',
    template_type: 'standard',
    certificate_category: 'income',
    language: 'en',
    body_template: `
<div style="text-align: center; font-family: Arial, sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">GOVERNMENT OF THE PEOPLE'S REPUBLIC OF BANGLADESH</h2>
      <h3 style="margin: 5px 0;">UNION PARISHAD OFFICE</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">INCOME CERTIFICATE</h1>
      <p style="margin: 10px 0;">Certificate No: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        This is to certify that <strong>{{citizen_name_en}}</strong>,
        Father/Husband: <strong>{{father_name_en}}</strong>,
        Mother: <strong>{{mother_name_en}}</strong>,
        Village: {{village_en}}, Ward No: {{ward_no}},
        Union: {{union_name}}, Upazila: {{upazila_name}}, District: {{district_name}}
        is a permanent resident of this area.
      </p>

      <p style="margin-top: 15px;">
        As per local inquiry and information, his/her occupation is <strong>{{occupation}}</strong>
        and the <strong>annual family income from all sources is approximately BDT {{annual_income}} ({{income_in_words}} Taka only)</strong>.
      </p>

      <p style="margin-top: 15px;">
        <strong>Purpose of Certificate:</strong> {{purpose}}
      </p>

      <p style="margin-top: 15px;">
        I wish him/her all success in future endeavors.
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>Date: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">Chairman</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} Union Parishad</p>
        </div>
      </div>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'occupation', field_label: 'Occupation', field_type: 'text', required: true, options: [] },
      { field_key: 'annual_income', field_label: 'Annual Income (BDT)', field_type: 'number', required: true, options: [] },
      { field_key: 'income_in_words', field_label: 'Income (In Words)', field_type: 'text', required: true, options: [] },
      { field_key: 'purpose', field_label: 'Purpose of Certificate', field_type: 'text', required: true, options: [] },
      { field_key: 'issue_date', field_label: 'Issue Date', field_type: 'date', required: true, options: [] },
    ],
    fee: 50,
    is_active: true,
  },

  // 12. Residence Certificate - English
  {
    name: 'Residence Certificate',
    template_type: 'standard',
    certificate_category: 'residence',
    language: 'en',
    body_template: `
<div style="text-align: center; font-family: Arial, sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">GOVERNMENT OF THE PEOPLE'S REPUBLIC OF BANGLADESH</h2>
      <h3 style="margin: 5px 0;">UNION PARISHAD OFFICE</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">RESIDENCE CERTIFICATE</h1>
      <p style="margin: 10px 0;">Certificate No: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        This is to certify that <strong>{{citizen_name_en}}</strong>,
        Father/Husband: <strong>{{father_name_en}}</strong>,
        Mother: <strong>{{mother_name_en}}</strong>,
        National ID No: {{nid_no}},
        Village: {{village_en}}, Post Office: {{post_office_en}},
        Ward No: {{ward_no}},
        Union: {{union_name}}, Upazila: {{upazila_name}}, District: {{district_name}}
        is a <strong>permanent resident</strong> of this area.
      </p>

      <p style="margin-top: 15px;">
        He/she has been residing at the above address for the past <strong>{{residence_years}}</strong> years.
      </p>

      <p style="margin-top: 15px;">
        To the best of my knowledge, he/she is an honest and law-abiding citizen.
      </p>

      <p style="margin-top: 15px;">
        <strong>Purpose of Certificate:</strong> {{purpose}}
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>Date: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">Chairman</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} Union Parishad</p>
        </div>
      </div>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'residence_years', field_label: 'Years of Residence', field_type: 'text', required: true, options: [] },
      { field_key: 'purpose', field_label: 'Purpose of Certificate', field_type: 'text', required: true, options: [] },
      { field_key: 'issue_date', field_label: 'Issue Date', field_type: 'date', required: true, options: [] },
    ],
    fee: 50,
    is_active: true,
  },

  // 13. Unmarried Certificate - English
  {
    name: 'Unmarried Certificate',
    template_type: 'standard',
    certificate_category: 'unmarried',
    language: 'en',
    body_template: `
<div style="text-align: center; font-family: Arial, sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">GOVERNMENT OF THE PEOPLE'S REPUBLIC OF BANGLADESH</h2>
      <h3 style="margin: 5px 0;">UNION PARISHAD OFFICE</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">UNMARRIED CERTIFICATE</h1>
      <p style="margin: 10px 0;">Certificate No: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        This is to certify that <strong>{{citizen_name_en}}</strong>,
        Father: <strong>{{father_name_en}}</strong>,
        Mother: <strong>{{mother_name_en}}</strong>,
        Date of Birth: {{date_of_birth}},
        Village: {{village_en}}, Ward No: {{ward_no}},
        Union: {{union_name}}, Upazila: {{upazila_name}}, District: {{district_name}}
        is a permanent resident of this area.
      </p>

      <p style="margin-top: 15px;">
        As per local inquiry and information, he/she is still <strong>unmarried</strong>
        and has not entered into any marriage to date.
      </p>

      <p style="margin-top: 15px;">
        <strong>Purpose of Certificate:</strong> {{purpose}}
      </p>

      <p style="margin-top: 15px;">
        I wish him/her all success in future endeavors.
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>Date: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">Chairman</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} Union Parishad</p>
        </div>
      </div>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'purpose', field_label: 'Purpose of Certificate', field_type: 'text', required: true, options: [] },
      { field_key: 'issue_date', field_label: 'Issue Date', field_type: 'date', required: true, options: [] },
    ],
    fee: 50,
    is_active: true,
  },

  // 14. Nationality Certificate - English
  {
    name: 'Nationality Certificate',
    template_type: 'standard',
    certificate_category: 'nationality',
    language: 'en',
    body_template: `
<div style="text-align: center; font-family: Arial, sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">GOVERNMENT OF THE PEOPLE'S REPUBLIC OF BANGLADESH</h2>
      <h3 style="margin: 5px 0;">UNION PARISHAD OFFICE</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">NATIONALITY CERTIFICATE</h1>
      <p style="margin: 10px 0;">Certificate No: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        This is to certify that <strong>{{citizen_name_en}}</strong>
        (In Bangla: {{citizen_name_bn}}),
        Father: <strong>{{father_name_en}}</strong>,
        Mother: <strong>{{mother_name_en}}</strong>,
        Date of Birth: {{date_of_birth}}, Place of Birth: {{birth_place}},
        National ID No: {{nid_no}},
        Village: {{village_en}}, Ward No: {{ward_no}},
        Union: {{union_name}}, Upazila: {{upazila_name}}, District: {{district_name}}
        is a permanent resident of this area.
      </p>

      <p style="margin-top: 15px;">
        He/she is a <strong>citizen of Bangladesh by birth</strong> and belongs to the <strong>{{religion}}</strong> religion.
      </p>

      <p style="margin-top: 15px;">
        To the best of my knowledge, he/she has not acquired citizenship of any other country.
      </p>

      <p style="margin-top: 15px;">
        <strong>Purpose of Certificate:</strong> {{purpose}}
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>Date: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">Chairman</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} Union Parishad</p>
        </div>
      </div>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'birth_place', field_label: 'Place of Birth', field_type: 'text', required: true, options: [] },
      { field_key: 'religion', field_label: 'Religion', field_type: 'select', required: true, options: ['Islam', 'Hinduism', 'Buddhism', 'Christianity', 'Other'] },
      { field_key: 'purpose', field_label: 'Purpose of Certificate', field_type: 'text', required: true, options: [] },
      { field_key: 'issue_date', field_label: 'Issue Date', field_type: 'date', required: true, options: [] },
    ],
    fee: 100,
    is_active: true,
  },

  // 15. Warish/Inheritance Certificate - English
  {
    name: 'Inheritance Certificate (Warish)',
    template_type: 'warish',
    certificate_category: 'warish',
    language: 'en',
    body_template: `
<div style="text-align: center; font-family: Arial, sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">GOVERNMENT OF THE PEOPLE'S REPUBLIC OF BANGLADESH</h2>
      <h3 style="margin: 5px 0;">UNION PARISHAD OFFICE</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">INHERITANCE CERTIFICATE (WARISH)</h1>
      <p style="margin: 10px 0;">Certificate No: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        This is to certify that the late <strong>{{deceased_name}}</strong>,
        Father: {{deceased_father_name}},
        Village: {{village_en}}, Ward No: {{ward_no}},
        Union: {{union_name}}, Upazila: {{upazila_name}}, District: {{district_name}}
        was a resident of this area.
      </p>

      <p style="margin-top: 15px;">
        He/she passed away on <strong>{{death_date}}</strong>.
      </p>

      <p style="margin-top: 15px;">
        At the time of death, the following legal heirs survived:
      </p>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background: #f0f0f0;">
            <th style="border: 1px solid #000; padding: 8px;">Sl. No.</th>
            <th style="border: 1px solid #000; padding: 8px;">Name of Heir</th>
            <th style="border: 1px solid #000; padding: 8px;">Relationship</th>
            <th style="border: 1px solid #000; padding: 8px;">Age</th>
          </tr>
        </thead>
        <tbody>
          {{heirs_table}}
        </tbody>
      </table>

      <p style="margin-top: 15px;">
        To the best of my knowledge, the above-mentioned persons are the only legal heirs of the deceased and no other person is entitled to inherit the deceased's property.
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>Date: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">Chairman</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} Union Parishad</p>
        </div>
      </div>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'deceased_name', field_label: 'Name of Deceased', field_type: 'text', required: true, options: [] },
      { field_key: 'deceased_father_name', field_label: 'Father Name of Deceased', field_type: 'text', required: true, options: [] },
      { field_key: 'death_date', field_label: 'Date of Death', field_type: 'date', required: true, options: [] },
      { field_key: 'heirs_table', field_label: 'Heirs List (HTML)', field_type: 'text', required: true, options: [] },
      { field_key: 'issue_date', field_label: 'Issue Date', field_type: 'date', required: true, options: [] },
    ],
    fee: 200,
    is_active: true,
  },

  // 16. Landless Certificate - English
  {
    name: 'Landless Certificate',
    template_type: 'standard',
    certificate_category: 'other',
    language: 'en',
    body_template: `
<div style="text-align: center; font-family: Arial, sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">GOVERNMENT OF THE PEOPLE'S REPUBLIC OF BANGLADESH</h2>
      <h3 style="margin: 5px 0;">UNION PARISHAD OFFICE</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">LANDLESS CERTIFICATE</h1>
      <p style="margin: 10px 0;">Certificate No: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        This is to certify that <strong>{{citizen_name_en}}</strong>,
        Father/Husband: <strong>{{father_name_en}}</strong>,
        Mother: <strong>{{mother_name_en}}</strong>,
        Village: {{village_en}}, Ward No: {{ward_no}},
        Union: {{union_name}}, Upazila: {{upazila_name}}, District: {{district_name}}
        is a permanent resident of this area.
      </p>

      <p style="margin-top: 15px;">
        As per local inquiry and information, he/she and the family are <strong>landless</strong>.
        They do not own any homestead or agricultural land.
        They live on others' land and earn their livelihood through day labor/{{occupation}}.
      </p>

      <p style="margin-top: 15px;">
        Number of family members: <strong>{{family_members}}</strong>.
      </p>

      <p style="margin-top: 15px;">
        <strong>Purpose of Certificate:</strong> {{purpose}}
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>Date: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">Chairman</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} Union Parishad</p>
        </div>
      </div>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'occupation', field_label: 'Occupation', field_type: 'text', required: true, options: [] },
      { field_key: 'family_members', field_label: 'Number of Family Members', field_type: 'number', required: true, options: [] },
      { field_key: 'purpose', field_label: 'Purpose of Certificate', field_type: 'text', required: true, options: [] },
      { field_key: 'issue_date', field_label: 'Issue Date', field_type: 'date', required: true, options: [] },
    ],
    fee: 50,
    is_active: true,
  },

  // 17. মৃত্যু সনদ (Death Certificate) - Bengali
  {
    name: 'মৃত্যু সনদ',
    template_type: 'standard',
    certificate_category: 'other',
    language: 'bn',
    body_template: `
<div style="text-align: center; font-family: 'SutonnyMJ', 'Kalpurush', sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</h2>
      <h3 style="margin: 5px 0;">ইউনিয়ন পরিষদ কার্যালয়</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">মৃত্যু সনদপত্র</h1>
      <p style="margin: 10px 0;">সনদ নং: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        এই মর্মে প্রত্যয়ন করা যাইতেছে যে, <strong>{{deceased_name}}</strong>,
        পিতা: <strong>{{deceased_father_name}}</strong>,
        মাতা: <strong>{{deceased_mother_name}}</strong>,
        গ্রাম: {{village_bn}}, ওয়ার্ড নং: {{ward_no}},
        ইউনিয়ন: {{union_name}}, উপজেলা: {{upazila_name}}, জেলা: {{district_name}}
        এর বাসিন্দা ছিলেন।
      </p>

      <p style="margin-top: 15px;">
        <strong>মৃত্যুর তারিখ:</strong> {{death_date}}
      </p>

      <p style="margin-top: 15px;">
        <strong>মৃত্যুর স্থান:</strong> {{death_place}}
      </p>

      <p style="margin-top: 15px;">
        <strong>মৃত্যুর কারণ:</strong> {{death_cause}}
      </p>

      <p style="margin-top: 15px;">
        <strong>মৃত্যুকালীন বয়স:</strong> {{age_at_death}} বছর
      </p>

      <p style="margin-top: 15px;">
        মৃতের পরিচয় নিশ্চিতকরণ: {{identifier_name}} ({{identifier_relation}})
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>তারিখ: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">চেয়ারম্যান</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} ইউনিয়ন পরিষদ</p>
        </div>
      </div>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'deceased_name', field_label: 'মৃত ব্যক্তির নাম', field_type: 'text', required: true, options: [] },
      { field_key: 'deceased_father_name', field_label: 'মৃতের পিতার নাম', field_type: 'text', required: true, options: [] },
      { field_key: 'deceased_mother_name', field_label: 'মৃতের মাতার নাম', field_type: 'text', required: true, options: [] },
      { field_key: 'death_date', field_label: 'মৃত্যুর তারিখ', field_type: 'date', required: true, options: [] },
      { field_key: 'death_place', field_label: 'মৃত্যুর স্থান', field_type: 'text', required: true, options: [] },
      { field_key: 'death_cause', field_label: 'মৃত্যুর কারণ', field_type: 'text', required: true, options: [] },
      { field_key: 'age_at_death', field_label: 'মৃত্যুকালীন বয়স', field_type: 'number', required: true, options: [] },
      { field_key: 'identifier_name', field_label: 'পরিচয় প্রদানকারীর নাম', field_type: 'text', required: true, options: [] },
      { field_key: 'identifier_relation', field_label: 'সম্পর্ক', field_type: 'text', required: true, options: [] },
      { field_key: 'issue_date', field_label: 'ইস্যুর তারিখ', field_type: 'date', required: true, options: [] },
    ],
    fee: 50,
    is_active: true,
  },

  // 18. Death Certificate - English
  {
    name: 'Death Certificate',
    template_type: 'standard',
    certificate_category: 'other',
    language: 'en',
    body_template: `
<div style="text-align: center; font-family: Arial, sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">GOVERNMENT OF THE PEOPLE'S REPUBLIC OF BANGLADESH</h2>
      <h3 style="margin: 5px 0;">UNION PARISHAD OFFICE</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">DEATH CERTIFICATE</h1>
      <p style="margin: 10px 0;">Certificate No: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        This is to certify that <strong>{{deceased_name}}</strong>,
        Father: <strong>{{deceased_father_name}}</strong>,
        Mother: <strong>{{deceased_mother_name}}</strong>,
        Village: {{village_en}}, Ward No: {{ward_no}},
        Union: {{union_name}}, Upazila: {{upazila_name}}, District: {{district_name}}
        was a resident of this area.
      </p>

      <p style="margin-top: 15px;">
        <strong>Date of Death:</strong> {{death_date}}
      </p>

      <p style="margin-top: 15px;">
        <strong>Place of Death:</strong> {{death_place}}
      </p>

      <p style="margin-top: 15px;">
        <strong>Cause of Death:</strong> {{death_cause}}
      </p>

      <p style="margin-top: 15px;">
        <strong>Age at Death:</strong> {{age_at_death}} years
      </p>

      <p style="margin-top: 15px;">
        Identity confirmed by: {{identifier_name}} ({{identifier_relation}})
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>Date: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">Chairman</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} Union Parishad</p>
        </div>
      </div>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'deceased_name', field_label: 'Name of Deceased', field_type: 'text', required: true, options: [] },
      { field_key: 'deceased_father_name', field_label: 'Father Name of Deceased', field_type: 'text', required: true, options: [] },
      { field_key: 'deceased_mother_name', field_label: 'Mother Name of Deceased', field_type: 'text', required: true, options: [] },
      { field_key: 'death_date', field_label: 'Date of Death', field_type: 'date', required: true, options: [] },
      { field_key: 'death_place', field_label: 'Place of Death', field_type: 'text', required: true, options: [] },
      { field_key: 'death_cause', field_label: 'Cause of Death', field_type: 'text', required: true, options: [] },
      { field_key: 'age_at_death', field_label: 'Age at Death', field_type: 'number', required: true, options: [] },
      { field_key: 'identifier_name', field_label: 'Name of Identifier', field_type: 'text', required: true, options: [] },
      { field_key: 'identifier_relation', field_label: 'Relationship', field_type: 'text', required: true, options: [] },
      { field_key: 'issue_date', field_label: 'Issue Date', field_type: 'date', required: true, options: [] },
    ],
    fee: 50,
    is_active: true,
  },

  // 19. বিবাহিত সনদ (Married Certificate) - Bengali
  {
    name: 'বিবাহিত সনদ',
    template_type: 'standard',
    certificate_category: 'other',
    language: 'bn',
    body_template: `
<div style="text-align: center; font-family: 'SutonnyMJ', 'Kalpurush', sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</h2>
      <h3 style="margin: 5px 0;">ইউনিয়ন পরিষদ কার্যালয়</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">বিবাহিত সনদপত্র</h1>
      <p style="margin: 10px 0;">সনদ নং: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        এই মর্মে প্রত্যয়ন করা যাইতেছে যে, <strong>{{citizen_name_bn}}</strong>,
        পিতা: <strong>{{father_name_bn}}</strong>,
        মাতা: <strong>{{mother_name_bn}}</strong>,
        গ্রাম: {{village_bn}}, ওয়ার্ড নং: {{ward_no}},
        ইউনিয়ন: {{union_name}}, উপজেলা: {{upazila_name}}, জেলা: {{district_name}}
        এর একজন স্থায়ী বাসিন্দা।
      </p>

      <p style="margin-top: 15px;">
        স্থানীয় অনুসন্ধান ও তথ্যানুযায়ী জানা যায় যে, তিনি <strong>{{spouse_name}}</strong> এর সহিত
        <strong>{{marriage_date}}</strong> তারিখে বিবাহ বন্ধনে আবদ্ধ হন।
      </p>

      <p style="margin-top: 15px;">
        বিবাহ নিবন্ধন নং: {{marriage_reg_no}} (যদি থাকে)
      </p>

      <p style="margin-top: 15px;">
        <strong>সনদ প্রদানের উদ্দেশ্য:</strong> {{purpose}}
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>তারিখ: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">চেয়ারম্যান</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} ইউনিয়ন পরিষদ</p>
        </div>
      </div>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'spouse_name', field_label: 'স্বামী/স্ত্রীর নাম', field_type: 'text', required: true, options: [] },
      { field_key: 'marriage_date', field_label: 'বিবাহের তারিখ', field_type: 'date', required: true, options: [] },
      { field_key: 'marriage_reg_no', field_label: 'বিবাহ নিবন্ধন নং', field_type: 'text', required: false, options: [] },
      { field_key: 'purpose', field_label: 'সনদের উদ্দেশ্য', field_type: 'text', required: true, options: [] },
      { field_key: 'issue_date', field_label: 'ইস্যুর তারিখ', field_type: 'date', required: true, options: [] },
    ],
    fee: 50,
    is_active: true,
  },

  // 20. Married Certificate - English
  {
    name: 'Married Certificate',
    template_type: 'standard',
    certificate_category: 'other',
    language: 'en',
    body_template: `
<div style="text-align: center; font-family: Arial, sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">GOVERNMENT OF THE PEOPLE'S REPUBLIC OF BANGLADESH</h2>
      <h3 style="margin: 5px 0;">UNION PARISHAD OFFICE</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">MARRIED CERTIFICATE</h1>
      <p style="margin: 10px 0;">Certificate No: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        This is to certify that <strong>{{citizen_name_en}}</strong>,
        Father: <strong>{{father_name_en}}</strong>,
        Mother: <strong>{{mother_name_en}}</strong>,
        Village: {{village_en}}, Ward No: {{ward_no}},
        Union: {{union_name}}, Upazila: {{upazila_name}}, District: {{district_name}}
        is a permanent resident of this area.
      </p>

      <p style="margin-top: 15px;">
        As per local inquiry and information, he/she is married to <strong>{{spouse_name}}</strong>
        on <strong>{{marriage_date}}</strong>.
      </p>

      <p style="margin-top: 15px;">
        Marriage Registration No: {{marriage_reg_no}} (if available)
      </p>

      <p style="margin-top: 15px;">
        <strong>Purpose of Certificate:</strong> {{purpose}}
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>Date: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">Chairman</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} Union Parishad</p>
        </div>
      </div>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'spouse_name', field_label: 'Spouse Name', field_type: 'text', required: true, options: [] },
      { field_key: 'marriage_date', field_label: 'Marriage Date', field_type: 'date', required: true, options: [] },
      { field_key: 'marriage_reg_no', field_label: 'Marriage Registration No', field_type: 'text', required: false, options: [] },
      { field_key: 'purpose', field_label: 'Purpose of Certificate', field_type: 'text', required: true, options: [] },
      { field_key: 'issue_date', field_label: 'Issue Date', field_type: 'date', required: true, options: [] },
    ],
    fee: 50,
    is_active: true,
  },

  // 21. পুনর্বিবাহ না করার সনদ (Non-Remarriage Certificate) - Bengali
  {
    name: 'পুনর্বিবাহ না করার সনদ',
    template_type: 'standard',
    certificate_category: 'other',
    language: 'bn',
    body_template: `
<div style="text-align: center; font-family: 'SutonnyMJ', 'Kalpurush', sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</h2>
      <h3 style="margin: 5px 0;">ইউনিয়ন পরিষদ কার্যালয়</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">পুনর্বিবাহ না করার সনদপত্র</h1>
      <p style="margin: 10px 0;">সনদ নং: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        এই মর্মে প্রত্যয়ন করা যাইতেছে যে, <strong>{{citizen_name_bn}}</strong>,
        পিতা: <strong>{{father_name_bn}}</strong>,
        মাতা: <strong>{{mother_name_bn}}</strong>,
        গ্রাম: {{village_bn}}, ওয়ার্ড নং: {{ward_no}},
        ইউনিয়ন: {{union_name}}, উপজেলা: {{upazila_name}}, জেলা: {{district_name}}
        এর একজন স্থায়ী বাসিন্দা।
      </p>

      <p style="margin-top: 15px;">
        তাঁহার স্বামী/স্ত্রী <strong>{{deceased_spouse_name}}</strong>
        <strong>{{spouse_death_date}}</strong> তারিখে মৃত্যুবরণ করেন।
      </p>

      <p style="margin-top: 15px;">
        স্থানীয় অনুসন্ধান ও তথ্যানুযায়ী জানা যায় যে, তিনি স্বামী/স্ত্রীর মৃত্যুর পর হইতে
        অদ্যাবধি <strong>পুনর্বিবাহ করেন নাই</strong> এবং একক জীবনযাপন করিতেছেন।
      </p>

      <p style="margin-top: 15px;">
        <strong>সনদ প্রদানের উদ্দেশ্য:</strong> {{purpose}}
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>তারিখ: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">চেয়ারম্যান</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} ইউনিয়ন পরিষদ</p>
        </div>
      </div>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'deceased_spouse_name', field_label: 'মৃত স্বামী/স্ত্রীর নাম', field_type: 'text', required: true, options: [] },
      { field_key: 'spouse_death_date', field_label: 'স্বামী/স্ত্রীর মৃত্যুর তারিখ', field_type: 'date', required: true, options: [] },
      { field_key: 'purpose', field_label: 'সনদের উদ্দেশ্য', field_type: 'text', required: true, options: [] },
      { field_key: 'issue_date', field_label: 'ইস্যুর তারিখ', field_type: 'date', required: true, options: [] },
    ],
    fee: 50,
    is_active: true,
  },

  // 22. Non-Remarriage Certificate - English
  {
    name: 'Non-Remarriage Certificate',
    template_type: 'standard',
    certificate_category: 'other',
    language: 'en',
    body_template: `
<div style="text-align: center; font-family: Arial, sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">GOVERNMENT OF THE PEOPLE'S REPUBLIC OF BANGLADESH</h2>
      <h3 style="margin: 5px 0;">UNION PARISHAD OFFICE</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">NON-REMARRIAGE CERTIFICATE</h1>
      <p style="margin: 10px 0;">Certificate No: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        This is to certify that <strong>{{citizen_name_en}}</strong>,
        Father: <strong>{{father_name_en}}</strong>,
        Mother: <strong>{{mother_name_en}}</strong>,
        Village: {{village_en}}, Ward No: {{ward_no}},
        Union: {{union_name}}, Upazila: {{upazila_name}}, District: {{district_name}}
        is a permanent resident of this area.
      </p>

      <p style="margin-top: 15px;">
        His/her spouse <strong>{{deceased_spouse_name}}</strong>
        passed away on <strong>{{spouse_death_date}}</strong>.
      </p>

      <p style="margin-top: 15px;">
        As per local inquiry and information, he/she has <strong>not remarried</strong>
        since the death of the spouse and is living a single life.
      </p>

      <p style="margin-top: 15px;">
        <strong>Purpose of Certificate:</strong> {{purpose}}
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>Date: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">Chairman</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} Union Parishad</p>
        </div>
      </div>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'deceased_spouse_name', field_label: 'Deceased Spouse Name', field_type: 'text', required: true, options: [] },
      { field_key: 'spouse_death_date', field_label: 'Spouse Death Date', field_type: 'date', required: true, options: [] },
      { field_key: 'purpose', field_label: 'Purpose of Certificate', field_type: 'text', required: true, options: [] },
      { field_key: 'issue_date', field_label: 'Issue Date', field_type: 'date', required: true, options: [] },
    ],
    fee: 50,
    is_active: true,
  },

  // 23. বেকারত্ব সনদ (Unemployment Certificate) - Bengali
  {
    name: 'বেকারত্ব সনদ',
    template_type: 'standard',
    certificate_category: 'other',
    language: 'bn',
    body_template: `
<div style="text-align: center; font-family: 'SutonnyMJ', 'Kalpurush', sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</h2>
      <h3 style="margin: 5px 0;">ইউনিয়ন পরিষদ কার্যালয়</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">বেকারত্ব সনদপত্র</h1>
      <p style="margin: 10px 0;">সনদ নং: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        এই মর্মে প্রত্যয়ন করা যাইতেছে যে, <strong>{{citizen_name_bn}}</strong>,
        পিতা: <strong>{{father_name_bn}}</strong>,
        মাতা: <strong>{{mother_name_bn}}</strong>,
        জন্ম তারিখ: {{date_of_birth}},
        গ্রাম: {{village_bn}}, ওয়ার্ড নং: {{ward_no}},
        ইউনিয়ন: {{union_name}}, উপজেলা: {{upazila_name}}, জেলা: {{district_name}}
        এর একজন স্থায়ী বাসিন্দা।
      </p>

      <p style="margin-top: 15px;">
        তাঁহার শিক্ষাগত যোগ্যতা: <strong>{{education}}</strong>
      </p>

      <p style="margin-top: 15px;">
        স্থানীয় অনুসন্ধান ও তথ্যানুযায়ী জানা যায় যে, তিনি বর্তমানে <strong>বেকার</strong> আছেন
        এবং তাঁহার কোনো সরকারি বা বেসরকারি চাকরি বা আয়মূলক ব্যবসা নাই।
      </p>

      <p style="margin-top: 15px;">
        <strong>সনদ প্রদানের উদ্দেশ্য:</strong> {{purpose}}
      </p>

      <p style="margin-top: 15px;">
        আমি তাঁহার সর্বাঙ্গীণ উন্নতি ও মঙ্গল কামনা করি।
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>তারিখ: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">চেয়ারম্যান</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} ইউনিয়ন পরিষদ</p>
        </div>
      </div>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'education', field_label: 'শিক্ষাগত যোগ্যতা', field_type: 'text', required: true, options: [] },
      { field_key: 'purpose', field_label: 'সনদের উদ্দেশ্য', field_type: 'text', required: true, options: [] },
      { field_key: 'issue_date', field_label: 'ইস্যুর তারিখ', field_type: 'date', required: true, options: [] },
    ],
    fee: 50,
    is_active: true,
  },

  // 24. Unemployment Certificate - English
  {
    name: 'Unemployment Certificate',
    template_type: 'standard',
    certificate_category: 'other',
    language: 'en',
    body_template: `
<div style="text-align: center; font-family: Arial, sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">GOVERNMENT OF THE PEOPLE'S REPUBLIC OF BANGLADESH</h2>
      <h3 style="margin: 5px 0;">UNION PARISHAD OFFICE</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">UNEMPLOYMENT CERTIFICATE</h1>
      <p style="margin: 10px 0;">Certificate No: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        This is to certify that <strong>{{citizen_name_en}}</strong>,
        Father: <strong>{{father_name_en}}</strong>,
        Mother: <strong>{{mother_name_en}}</strong>,
        Date of Birth: {{date_of_birth}},
        Village: {{village_en}}, Ward No: {{ward_no}},
        Union: {{union_name}}, Upazila: {{upazila_name}}, District: {{district_name}}
        is a permanent resident of this area.
      </p>

      <p style="margin-top: 15px;">
        Educational Qualification: <strong>{{education}}</strong>
      </p>

      <p style="margin-top: 15px;">
        As per local inquiry and information, he/she is currently <strong>unemployed</strong>
        and does not have any government or private job or income-generating business.
      </p>

      <p style="margin-top: 15px;">
        <strong>Purpose of Certificate:</strong> {{purpose}}
      </p>

      <p style="margin-top: 15px;">
        I wish him/her all success in future endeavors.
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>Date: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">Chairman</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} Union Parishad</p>
        </div>
      </div>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'education', field_label: 'Educational Qualification', field_type: 'text', required: true, options: [] },
      { field_key: 'purpose', field_label: 'Purpose of Certificate', field_type: 'text', required: true, options: [] },
      { field_key: 'issue_date', field_label: 'Issue Date', field_type: 'date', required: true, options: [] },
    ],
    fee: 50,
    is_active: true,
  },

  // 25. সম্পত্তি সনদ (Property/Asset Certificate) - Bengali
  {
    name: 'সম্পত্তি সনদ',
    template_type: 'standard',
    certificate_category: 'other',
    language: 'bn',
    body_template: `
<div style="text-align: center; font-family: 'SutonnyMJ', 'Kalpurush', sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</h2>
      <h3 style="margin: 5px 0;">ইউনিয়ন পরিষদ কার্যালয়</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">সম্পত্তি সনদপত্র</h1>
      <p style="margin: 10px 0;">সনদ নং: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        এই মর্মে প্রত্যয়ন করা যাইতেছে যে, <strong>{{citizen_name_bn}}</strong>,
        পিতা/স্বামী: <strong>{{father_name_bn}}</strong>,
        মাতা: <strong>{{mother_name_bn}}</strong>,
        গ্রাম: {{village_bn}}, ওয়ার্ড নং: {{ward_no}},
        ইউনিয়ন: {{union_name}}, উপজেলা: {{upazila_name}}, জেলা: {{district_name}}
        এর একজন স্থায়ী বাসিন্দা।
      </p>

      <p style="margin-top: 15px;">
        স্থানীয় অনুসন্ধান ও তথ্যানুযায়ী তাঁহার নিম্নলিখিত সম্পত্তি রহিয়াছে:
      </p>

      <p style="margin-top: 15px;">
        <strong>বসতভিটার পরিমাণ:</strong> {{homestead_land}} শতাংশ
      </p>

      <p style="margin-top: 15px;">
        <strong>কৃষি জমির পরিমাণ:</strong> {{agricultural_land}} শতাংশ
      </p>

      <p style="margin-top: 15px;">
        <strong>অন্যান্য সম্পত্তি:</strong> {{other_assets}}
      </p>

      <p style="margin-top: 15px;">
        <strong>সনদ প্রদানের উদ্দেশ্য:</strong> {{purpose}}
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>তারিখ: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">চেয়ারম্যান</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} ইউনিয়ন পরিষদ</p>
        </div>
      </div>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'homestead_land', field_label: 'বসতভিটা (শতাংশ)', field_type: 'number', required: true, options: [] },
      { field_key: 'agricultural_land', field_label: 'কৃষি জমি (শতাংশ)', field_type: 'number', required: true, options: [] },
      { field_key: 'other_assets', field_label: 'অন্যান্য সম্পত্তি', field_type: 'text', required: false, options: [] },
      { field_key: 'purpose', field_label: 'সনদের উদ্দেশ্য', field_type: 'text', required: true, options: [] },
      { field_key: 'issue_date', field_label: 'ইস্যুর তারিখ', field_type: 'date', required: true, options: [] },
    ],
    fee: 100,
    is_active: true,
  },

  // 26. Property/Asset Certificate - English
  {
    name: 'Property Certificate',
    template_type: 'standard',
    certificate_category: 'other',
    language: 'en',
    body_template: `
<div style="text-align: center; font-family: Arial, sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">GOVERNMENT OF THE PEOPLE'S REPUBLIC OF BANGLADESH</h2>
      <h3 style="margin: 5px 0;">UNION PARISHAD OFFICE</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">PROPERTY CERTIFICATE</h1>
      <p style="margin: 10px 0;">Certificate No: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        This is to certify that <strong>{{citizen_name_en}}</strong>,
        Father/Husband: <strong>{{father_name_en}}</strong>,
        Mother: <strong>{{mother_name_en}}</strong>,
        Village: {{village_en}}, Ward No: {{ward_no}},
        Union: {{union_name}}, Upazila: {{upazila_name}}, District: {{district_name}}
        is a permanent resident of this area.
      </p>

      <p style="margin-top: 15px;">
        As per local inquiry and information, the following properties are owned:
      </p>

      <p style="margin-top: 15px;">
        <strong>Homestead Land:</strong> {{homestead_land}} decimal
      </p>

      <p style="margin-top: 15px;">
        <strong>Agricultural Land:</strong> {{agricultural_land}} decimal
      </p>

      <p style="margin-top: 15px;">
        <strong>Other Assets:</strong> {{other_assets}}
      </p>

      <p style="margin-top: 15px;">
        <strong>Purpose of Certificate:</strong> {{purpose}}
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>Date: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">Chairman</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} Union Parishad</p>
        </div>
      </div>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'homestead_land', field_label: 'Homestead Land (decimal)', field_type: 'number', required: true, options: [] },
      { field_key: 'agricultural_land', field_label: 'Agricultural Land (decimal)', field_type: 'number', required: true, options: [] },
      { field_key: 'other_assets', field_label: 'Other Assets', field_type: 'text', required: false, options: [] },
      { field_key: 'purpose', field_label: 'Purpose of Certificate', field_type: 'text', required: true, options: [] },
      { field_key: 'issue_date', field_label: 'Issue Date', field_type: 'date', required: true, options: [] },
    ],
    fee: 100,
    is_active: true,
  },

  // 27. General Attestation - English
  {
    name: 'General Attestation',
    template_type: 'custom',
    certificate_category: 'other',
    language: 'en',
    body_template: `
<div style="text-align: center; font-family: Arial, sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">GOVERNMENT OF THE PEOPLE'S REPUBLIC OF BANGLADESH</h2>
      <h3 style="margin: 5px 0;">UNION PARISHAD OFFICE</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">ATTESTATION</h1>
      <p style="margin: 10px 0;">Certificate No: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        This is to certify that <strong>{{citizen_name_en}}</strong>,
        Father/Husband: <strong>{{father_name_en}}</strong>,
        Mother: <strong>{{mother_name_en}}</strong>,
        Village: {{village_en}}, Ward No: {{ward_no}},
        Union: {{union_name}}, Upazila: {{upazila_name}}, District: {{district_name}}
        is a permanent resident of this area.
      </p>

      <p style="margin-top: 15px;">
        {{attestation_text}}
      </p>

      <p style="margin-top: 15px;">
        <strong>Purpose of Certificate:</strong> {{purpose}}
      </p>

      <p style="margin-top: 15px;">
        I wish him/her all success in future endeavors.
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>Date: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">Chairman</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} Union Parishad</p>
        </div>
      </div>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'attestation_text', field_label: 'Attestation Details', field_type: 'text', required: true, options: [] },
      { field_key: 'purpose', field_label: 'Purpose of Certificate', field_type: 'text', required: true, options: [] },
      { field_key: 'issue_date', field_label: 'Issue Date', field_type: 'date', required: true, options: [] },
    ],
    fee: 50,
    is_active: true,
  },

  // 28. প্রত্যয়ন পত্র (General Attestation) - Bengali
  {
    name: 'সাধারণ প্রত্যয়ন পত্র',
    template_type: 'custom',
    certificate_category: 'other',
    language: 'bn',
    body_template: `
<div style="text-align: center; font-family: 'SutonnyMJ', 'Kalpurush', sans-serif;">
  <div style="border: 3px double #000; padding: 30px; margin: 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="/images/bd-govt-logo.png" alt="Government Logo" style="width: 80px; height: auto;" />
      <h2 style="margin: 10px 0 5px 0;">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</h2>
      <h3 style="margin: 5px 0;">ইউনিয়ন পরিষদ কার্যালয়</h3>
      <p style="margin: 5px 0;">{{union_name}}, {{upazila_name}}, {{district_name}}</p>
      <h1 style="margin: 20px 0; font-size: 28px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">প্রত্যয়ন পত্র</h1>
      <p style="margin: 10px 0;">সনদ নং: {{certificate_no}}</p>
    </div>

    <div style="text-align: justify; line-height: 2; padding: 0 20px;">
      <p>
        এই মর্মে প্রত্যয়ন করা যাইতেছে যে, <strong>{{citizen_name_bn}}</strong>,
        পিতা/স্বামী: <strong>{{father_name_bn}}</strong>,
        মাতা: <strong>{{mother_name_bn}}</strong>,
        গ্রাম: {{village_bn}}, ওয়ার্ড নং: {{ward_no}},
        ইউনিয়ন: {{union_name}}, উপজেলা: {{upazila_name}}, জেলা: {{district_name}}
        এর একজন স্থায়ী বাসিন্দা।
      </p>

      <p style="margin-top: 15px;">
        {{attestation_text}}
      </p>

      <p style="margin-top: 15px;">
        <strong>সনদ প্রদানের উদ্দেশ্য:</strong> {{purpose}}
      </p>

      <p style="margin-top: 15px;">
        আমি তাঁহার সর্বাঙ্গীণ উন্নতি ও মঙ্গল কামনা করি।
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>তারিখ: {{issue_date}}</p>
      </div>
      <div style="text-align: center;">
        <div style="border-top: 1px solid #000; padding-top: 5px; min-width: 200px;">
          <p style="margin: 0;">চেয়ারম্যান</p>
          <p style="margin: 0; font-size: 12px;">{{union_name}} ইউনিয়ন পরিষদ</p>
        </div>
      </div>
    </div>
  </div>
</div>
`,
    dynamic_fields: [
      { field_key: 'attestation_text', field_label: 'প্রত্যয়নের বিবরণ', field_type: 'text', required: true, options: [] },
      { field_key: 'purpose', field_label: 'সনদের উদ্দেশ্য', field_type: 'text', required: true, options: [] },
      { field_key: 'issue_date', field_label: 'ইস্যুর তারিখ', field_type: 'date', required: true, options: [] },
    ],
    fee: 50,
    is_active: true,
  },
]

// User Schema for finding admin users
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
  status: String,
})
const User = mongoose.models.User || mongoose.model('User', UserSchema)

async function seedTemplates() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')

    // Find a secretary or entrepreneur user to use as created_by
    const adminUser = await User.findOne({
      role: { $in: ['secretary', 'entrepreneur'] },
      status: 'active',
    }).lean()

    if (!adminUser) {
      console.error('ERROR: No active admin user found. Please create an admin user first.')
      console.log('You can register a user and update their role in the database.')
      process.exit(1)
    }

    console.log(`Using admin user: ${adminUser.email} (${adminUser.role})`)
    console.log('Seeding certificate templates...')

    let created = 0
    let skipped = 0

    for (const template of templates) {
      // Check if template already exists
      const existing = await CertificateTemplate.findOne({
        name: template.name,
        language: template.language,
      })

      if (existing) {
        console.log(`  [SKIP] "${template.name}" (${template.language}) already exists`)
        skipped++
        continue
      }

      await CertificateTemplate.create({
        ...template,
        created_by: adminUser._id,
      })
      console.log(`  [NEW] Created: ${template.name} (${template.language})`)
      created++
    }

    console.log('\n========================================')
    console.log(`Seeding completed!`)
    console.log(`  Created: ${created} templates`)
    console.log(`  Skipped: ${skipped} templates (already exist)`)
    console.log(`  Total: ${templates.length} templates`)
    console.log('========================================')
    process.exit(0)
  } catch (error) {
    console.error('Error seeding templates:', error)
    process.exit(1)
  }
}

seedTemplates()
