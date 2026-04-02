import re
import os

file_path = "src/app/(dashboard)/certificates/page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

if "const { t } = useLanguage()" in content:
    content = content.replace("const { t } = useLanguage()", "const { t, lang } = useLanguage()")

replacements = {
    "label: 'Lang'": "label: lang === 'bn' ? 'ভাষা' : 'Lang'",
    "label: 'Type'": "label: lang === 'bn' ? 'ধরন' : 'Type'",
    "label: 'Citizen'": "label: lang === 'bn' ? 'নাগরিক' : 'Citizen'",
    "label: 'Status'": "label: lang === 'bn' ? 'অবস্থা' : 'Status'",
    "label: 'Fiscal Year'": "label: lang === 'bn' ? 'অর্থবছর' : 'Fiscal Year'",
    "label: 'Actions'": "label: lang === 'bn' ? 'কার্যক্রম' : 'Actions'",
    ">View<": ">{lang === 'bn' ? 'দেখুন' : 'View'}<",
    ">Submit<": ">{lang === 'bn' ? 'জমা দিন' : 'Submit'}<",
    'title="Certificates"': "title={lang === 'bn' ? 'সার্টিফিকেটসমূহ' : 'Certificates'}",
    ">Manage Templates<": ">{lang === 'bn' ? 'টেমপ্লেট পরিচালনা করুন' : 'Manage Templates'}<",
    ">Apply for Certificate<": ">{lang === 'bn' ? 'সার্টিফিকেটের আবেদন করুন' : 'Apply for Certificate'}<",
    ">Profile must be verified to apply<": ">{lang === 'bn' ? 'আবেদন করার জন্য প্রোফাইল যাচাই করা আবশ্যক' : 'Profile must be verified to apply'}<",
    "To issue a new certificate, go to a citizen&apos;s profile and click <strong>Issue New Certificate</strong>.": "{lang === 'bn' ? <>নতুন সার্টিফিকেট ইস্যু করতে, একজন নাগরিকের প্রোফাইলে যান এবং <strong>নতুন সার্টিফিকেট ইস্যু করুন</strong>-এ ক্লিক করুন।</> : <>To issue a new certificate, go to a citizen&apos;s profile and click <strong>Issue New Certificate</strong>.</>}",
    ">All Languages<": ">{lang === 'bn' ? 'সব ভাষা' : 'All Languages'}<",
    ">All Types<": ">{lang === 'bn' ? 'সব ধরন' : 'All Types'}<"
}

for k, v in replacements.items():
    if k in content:
        content = content.replace(k, v)
    else:
        print(f"Warning: String not found '{k}'")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done styling certificates.")
