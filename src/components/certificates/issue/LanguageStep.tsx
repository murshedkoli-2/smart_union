'use client'

const LANGUAGES = [
  { value: 'bn', title: 'বাংলা', subtitle: 'Bengali' },
  { value: 'en', title: 'English', subtitle: 'ইংরেজি' },
]

export default function LanguageStep({
  language,
  onChange,
  onCancel,
  onContinue,
}: {
  language: string
  onChange: (language: string) => void
  onCancel: () => void
  onContinue: () => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-4 text-sm text-gray-600">
          Select the language for the certificate / সনদের ভাষা নির্বাচন করুন
        </p>
        <div className="grid grid-cols-2 gap-4">
          {LANGUAGES.map(({ value, title, subtitle }) => {
            const selected = language === value
            return (
              <button
                key={value}
                onClick={() => onChange(value)}
                className={`rounded-xl border-2 p-5 text-left transition-all ${
                  selected
                    ? 'border-green-700 bg-green-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <p className={`mb-1 text-2xl font-bold ${selected ? 'text-green-700' : 'text-gray-800'}`}>
                  {title}
                </p>
                <p className="text-xs text-gray-500">{subtitle}</p>
                {selected && <p className="mt-2 text-xs font-medium text-green-600">✓ Selected</p>}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-gray-100 pt-2">
        <button
          onClick={onCancel}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={onContinue}
          className="rounded-lg bg-green-700 px-5 py-2 text-sm font-medium text-white hover:bg-green-800"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
