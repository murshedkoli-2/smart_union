import re
import os

file_path = "src/app/(dashboard)/citizens/page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

if "const { t } = useLanguage()" in content:
    content = content.replace("const { t } = useLanguage()", "const { t, lang } = useLanguage()")
elif "useLanguage" not in content:
    content = content.replace("import { useApi }", "import { useApi }\nimport { useLanguage } from '@/contexts/LanguageContext'")
    content = content.replace("const currentUser = useUser()", "const currentUser = useUser()\n  const { t, lang } = useLanguage()")

replacements = {
    "label: 'Name'": "label: lang === 'bn' ? 'নাম' : 'Name'",
    "label: 'Ward'": "label: lang === 'bn' ? 'ওয়ার্ড' : 'Ward'",
    "label: 'NID / Mobile'": "label: lang === 'bn' ? 'এনআইডি / মোবাইল' : 'NID / Mobile'",
    "label: 'Hold. / Cert.'": "label: lang === 'bn' ? 'হোল্ডিং / জন্মনিবন্ধন' : 'Hold. / Cert.'",
    "label: 'Status'": "label: lang === 'bn' ? 'অবস্থা' : 'Status'",
    "label: 'Actions'": "label: lang === 'bn' ? 'কার্যক্রম' : 'Actions'",
    "Search by name...": "{lang === 'bn' ? 'নাম দ্বারা খুঁজুন...' : 'Search by name...'}",
    ">All Wards<": ">{lang === 'bn' ? 'সব ওয়ার্ড' : 'All Wards'}<",
    ">All Status<": ">{lang === 'bn' ? 'সব অবস্থা' : 'All Status'}<",
    ">Pending<": ">{lang === 'bn' ? 'অপেক্ষমাণ' : 'Pending'}<",
    ">Approved<": ">{lang === 'bn' ? 'অনুমোদিত' : 'Approved'}<",
    ">Rejected<": ">{lang === 'bn' ? 'প্রত্যাখ্যাত' : 'Rejected'}<",
    "No citizens found.": "{lang === 'bn' ? 'কোনো নাগরিক পাওয়া যায়নি।' : 'No citizens found.'}",
    "<PageHeader\n        title=\"Citizens\"": "<PageHeader\n        title={lang === 'bn' ? 'নাগরিকসমূহ' : 'Citizens'}",
    ">View<": ">{lang === 'bn' ? 'দেখুন' : 'View'}<",
}

for k, v in replacements.items():
    if k in content:
        content = content.replace(k, v)
    else:
        print(f"Warning: String not found '{k}'")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done styling citizens.")
