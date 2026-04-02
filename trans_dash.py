import re
import os

file_path = "src/app/(dashboard)/dashboard/page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Make sure lang is available
if "const { t } = useLanguage()" in content:
    content = content.replace("const { t } = useLanguage()", "const { t, lang } = useLanguage()")
elif "const { t, lang } = useLanguage()" not in content:
        print("Failed to find useLanguage hook.")

replacements = {
    # Dashboard texts
    "Welcome to Smart Union, {user.name ?? 'Citizen'}!": "{lang === 'bn' ? `স্মার্ট ইউনিয়নে স্বাগতম, ${user.name ?? 'নাগরিক'}!` : `Welcome to Smart Union, ${user.name ?? 'Citizen'}!`}",
    "Experience seamless union services at your fingertips. From certificates to holding taxes, manage your civic responsibilities and applications effortlessly online.": "{lang === 'bn' ? 'আপনার হাতের মুঠোয় নির্বিঘ্ন ইউনিয়ন সেবা। সার্টিফিকেট থেকে শুরু করে হোল্ডিং ট্যাক্স, অনলাইনে সহজেই আপনার নাগরিক দায়িত্ব এবং আবেদন পরিচালনা করুন।' : 'Experience seamless union services at your fingertips. From certificates to holding taxes, manage your civic responsibilities and applications effortlessly online.'}",
    ">Apply Certificate<": ">{lang === 'bn' ? 'সার্টিফিকেটের আবেদন' : 'Apply Certificate'}<",
    ">Pay Your Tax<": ">{lang === 'bn' ? 'ট্যাক্স পরিশোধ করুন' : 'Pay Your Tax'}<",
    ">Complete Your Setup<": ">{lang === 'bn' ? 'প্রোফাইল সেটআপ সম্পন্ন করুন' : 'Complete Your Setup'}<",
    "You need to complete your profile structure to unlock all union services natively. Ensure your address and NID info is verified to proceed.": "{lang === 'bn' ? 'সমস্ত ইউনিয়ন পরিষেবা আনলক করতে আপনাকে আপনার প্রোফাইল সম্পূর্ণ করতে হবে। নিশ্চিত করুন আপনার ঠিকানা এবং এনআইডি তথ্য যাচাইকৃত।' : 'You need to complete your profile structure to unlock all union services natively. Ensure your address and NID info is verified to proceed.'}",
    "Setup Profile &rarr;": "{lang === 'bn' ? 'প্রোফাইল সেটআপ করুন \\u2192' : 'Setup Profile \\u2192'}",
    ">Profile Under Review<": ">{lang === 'bn' ? 'প্রোফাইল পর্যালোচনার অধীনে আছে' : 'Profile Under Review'}<",
    "Your submitted profile is waiting for union approval. You can start applying right after your verification is complete.": "{lang === 'bn' ? 'আপনার জমাকৃত প্রোফাইল ইউনিয়ন অনুমোদনের অপেক্ষায় রয়েছে। আপনার যাচাইকরণ সম্পন্ন হওয়ার সাথে সাথে আপনি আবেদন শুরু করতে পারবেন।' : 'Your submitted profile is waiting for union approval. You can start applying right after your verification is complete.'}",
    ">My Certificates<": ">{lang === 'bn' ? 'আমার সার্টিফিকেটসমূহ' : 'My Certificates'}<",
    "> pending<": ">{lang === 'bn' ? ' অপেক্ষমাণ' : ' pending'}<",
    ">Approved & Ready<": ">{lang === 'bn' ? 'অনুমোদিত ও প্রস্তুত' : 'Approved & Ready'}<",
    "Verified Documents": "{lang === 'bn' ? 'যাচাইকৃত নথিপত্র' : 'Verified Documents'}",
    ">Taxes Settled<": ">{lang === 'bn' ? 'পরিশোধিত ট্যাক্স' : 'Taxes Settled'}<",
    "Current Fiscal Year": "{lang === 'bn' ? 'চলতি অর্থবছর' : 'Current Fiscal Year'}",
    ">Taxes Unpaid<": ">{lang === 'bn' ? 'বকেয়া ট্যাক্স' : 'Taxes Unpaid'}<",
    "Pay Now ": "{lang === 'bn' ? 'পরিশোধ করুন ' : 'Pay Now '}",
    "All Clear": "{lang === 'bn' ? 'সব ক্লিয়ার' : 'All Clear'}",
    ">Your Quick Services<": ">{lang === 'bn' ? 'আপনার দ্রুত সেবাসমূহ' : 'Your Quick Services'}<",
    ">Digital Certificates<": ">{lang === 'bn' ? 'ডিজিটাল সার্টিফিকেটসমূহ' : 'Digital Certificates'}<",
    "Apply for citizenship, character, or trade license certificates securely through your union portal.": "{lang === 'bn' ? 'ইউনিয়ন পোর্টালের মাধ্যমে নিরাপদে নাগরিকত্ব, চারিত্রিক বা ট্রেড লাইসেন্স সার্টিফিকেটের জন্য আবেদন করুন।' : 'Apply for citizenship, character, or trade license certificates securely through your union portal.'}",
    "Apply Now &rarr;": "{lang === 'bn' ? 'আবেদন করুন \\u2192' : 'Apply Now \\u2192'}",
    ">Warish & Family<": ">{lang === 'bn' ? 'ওয়ারিশ ও পরিবার' : 'Warish & Family'}<",
    "Request structured verified inheritance (Warish) or family certificates easily online.": "{lang === 'bn' ? 'অনলাইনে সহজেই ওয়ারিশ বা পারিবারিক সনদের জন্য আবেদন করুন।' : 'Request structured verified inheritance (Warish) or family certificates easily online.'}",
    "Request &rarr;": "{lang === 'bn' ? 'আবেদন করুন \\u2192' : 'Request \\u2192'}",
    ">Holding Taxes<": ">{lang === 'bn' ? 'হোল্ডিং ট্যাক্স' : 'Holding Taxes'}<",
    "Track and fulfill your holding assessments with automated transparent payment records.": "{lang === 'bn' ? 'স্বয়ংক্রিয় এবং স্বচ্ছ পেমেন্ট রেকর্ডের মাধ্যমে আপনার হোল্ডিং অ্যাসেসমেন্ট ট্র্যাক এবং পূরণ করুন।' : 'Track and fulfill your holding assessments with automated transparent payment records.'}",
    "View Taxes &rarr;": "{lang === 'bn' ? 'ট্যাক্স দেখুন \\u2192' : 'View Taxes \\u2192'}",
}

for k, v in replacements.items():
    if k in content:
        content = content.replace(k, v)
    else:
        print(f"Warning: String not found '{k}'")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done styling dashboard.")
