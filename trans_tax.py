import re
import os

file_path = "src/app/(dashboard)/tax/page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

if "const { t } = useLanguage()" in content:
    content = content.replace("const { t } = useLanguage()", "const { t, lang } = useLanguage()")
elif "useLanguage" not in content:
    content = content.replace("import { useUser", "import { useLanguage } from '@/contexts/LanguageContext'\nimport { useUser")
    content = content.replace("const currentUser = useUser()", "const currentUser = useUser()\n  const { t, lang } = useLanguage()")

replacements = {
    "title=\"Holding Tax Assessment\"": "title={lang === 'bn' ? 'হোল্ডিং ট্যাক্স অ্যাসেসমেন্ট' : 'Holding Tax Assessment'}",
    "subtitle=\"Manage yearly tax assessments and collections\"": "subtitle={lang === 'bn' ? 'বার্ষিক ট্যাক্স অ্যাসেসমেন্ট এবং সংগ্রহ পরিচালনা করুন' : 'Manage yearly tax assessments and collections'}",
    "Assess Tax": "{lang === 'bn' ? 'ট্যাক্স নির্ধারণ করুন' : 'Assess Tax'}",
    ">Total Demand<": ">{lang === 'bn' ? 'মোট দাবি' : 'Total Demand'}<",
    ">Collected<": ">{lang === 'bn' ? 'সংগৃহীত' : 'Collected'}<",
    ">Pending<": ">{lang === 'bn' ? 'অপেক্ষমাণ' : 'Pending'}<",
    ">All Fiscal Years<": ">{lang === 'bn' ? 'সব অর্থবছর' : 'All Fiscal Years'}<",
    ">All Status<": ">{lang === 'bn' ? 'সব অবস্থা' : 'All Status'}<",
    ">Unpaid<": ">{lang === 'bn' ? 'পরিশোধিত নয়' : 'Unpaid'}<",
    ">Paid<": ">{lang === 'bn' ? 'পরিশোধিত' : 'Paid'}<",
    "Loading tax records...": "{lang === 'bn' ? 'ট্যাক্স রেকর্ড লোড হচ্ছে...' : 'Loading tax records...'}",
    "No tax assessments found": "{lang === 'bn' ? 'কোনো ট্যাক্স অ্যাসেসমেন্ট পাওয়া যায়নি' : 'No tax assessments found'}",
    "Name (BN)": "{lang === 'bn' ? 'নাম (বাংলা)' : 'Name (BN)'}",
    "Name (EN)": "{lang === 'bn' ? 'নাম (ইংরেজি)' : 'Name (EN)'}",
    "Search citizens by name, NID...": "{lang === 'bn' ? 'নাম বা এনআইডি দ্বারা খুঁজুন...' : 'Search citizens by name, NID...'}",
    "selected": "{lang === 'bn' ? 'নির্বাচিত' : 'selected'}",
    "Fiscal Year *": "{lang === 'bn' ? 'অর্থবছর *' : 'Fiscal Year *'}",
    "Amount (৳) *": "{lang === 'bn' ? 'পরিমাণ (৳) *' : 'Amount (৳) *'}",
    "Save Assessment": "{lang === 'bn' ? 'অ্যাসেসমেন্ট সংরক্ষণ করুন' : 'Save Assessment'}",
    "Cancel": "{lang === 'bn' ? 'বাতিল' : 'Cancel'}",
    "Collect Payment": "{lang === 'bn' ? 'পেমেন্ট সংগ্রহ করুন' : 'Collect Payment'}",
    "Confirm Payment": "{lang === 'bn' ? 'পেমেন্ট নিশ্চিত করুন' : 'Confirm Payment'}",
}

for k, v in replacements.items():
    if k in content:
        content = content.replace(k, v)
    else:
        print(f"Warning: String not found '{k}'")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done styling tax.")
