'use client'

import { filterBangla, filterEnglish } from '@/lib/utils/input-filters'

interface AddressData {
  village_bn: string
  village_en: string
  post_office_bn: string
  post_office_en: string
  thana_bn: string
  thana_en: string
  district_bn: string
  district_en: string
  ward_no: number | string
}

interface AddressFieldsProps {
  value: AddressData
  onChange: (address: AddressData) => void
  disabled?: boolean
  required?: boolean
  prefix?: 'shipping' | 'billing' | ''
  /** Restrict to one language's fields (plus ward, on 'en'). Omit to show both, as before. */
  lang?: 'bn' | 'en'
}

const inputClass =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-500'

const selectClass =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white disabled:bg-gray-100 disabled:text-gray-500'

export default function AddressFields({
  value,
  onChange,
  disabled = false,
  required = false,
  prefix = '',
  lang,
}: AddressFieldsProps) {
  const update = (field: keyof AddressData, val: string | number) => {
    onChange({ ...value, [field]: val })
  }

  const requiredMark = required ? <span className="text-red-500 ml-0.5">*</span> : null
  const autoPrefix = prefix ? `${prefix} ` : ''
  const showBn = lang !== 'en'
  const showEn = lang !== 'bn'
  const gridClass = lang ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'

  return (
    <div className="space-y-4">
      {/* Village */}
      <div className={gridClass}>
        {showBn && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              গ্রাম (বাংলা) {requiredMark}
            </label>
            <input
              type="text"
              name={`${prefix}village_bn`}
              autoComplete={`${autoPrefix}address-line1`}
              value={value.village_bn}
              onChange={(e) => update('village_bn', filterBangla(e.target.value))}
              disabled={disabled}
              required={required}
              className={inputClass}
              placeholder="গ্রামের নাম বাংলায়"
            />
          </div>
        )}
        {showEn && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Village (English) {requiredMark}
            </label>
            <input
              type="text"
              name={`${prefix}village_en`}
              autoComplete={`${autoPrefix}address-line2`}
              value={value.village_en}
              onChange={(e) => update('village_en', filterEnglish(e.target.value))}
              disabled={disabled}
              required={required}
              className={inputClass}
              placeholder="Village name in English"
            />
          </div>
        )}
      </div>

      {/* Post Office */}
      <div className={gridClass}>
        {showBn && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              ডাকঘর (বাংলা) {requiredMark}
            </label>
            <input
              type="text"
              name={`${prefix}post_office_bn`}
              autoComplete={`${autoPrefix}address-level3`}
              value={value.post_office_bn}
              onChange={(e) => update('post_office_bn', filterBangla(e.target.value))}
              disabled={disabled}
              required={required}
              className={inputClass}
              placeholder="ডাকঘরের নাম বাংলায়"
            />
          </div>
        )}
        {showEn && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Post Office (English) {requiredMark}
            </label>
            <input
              type="text"
              name={`${prefix}post_office_en`}
              autoComplete={`${autoPrefix}address-level3`}
              value={value.post_office_en}
              onChange={(e) => update('post_office_en', filterEnglish(e.target.value))}
              disabled={disabled}
              required={required}
              className={inputClass}
              placeholder="Post office in English"
            />
          </div>
        )}
      </div>

      {/* Thana */}
      <div className={gridClass}>
        {showBn && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              থানা (বাংলা) {requiredMark}
            </label>
            <input
              type="text"
              name={`${prefix}thana_bn`}
              autoComplete={`${autoPrefix}address-level2`}
              value={value.thana_bn}
              onChange={(e) => update('thana_bn', filterBangla(e.target.value))}
              disabled={disabled}
              required={required}
              className={inputClass}
              placeholder="থানার নাম বাংলায়"
            />
          </div>
        )}
        {showEn && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Thana (English) {requiredMark}
            </label>
            <input
              type="text"
              name={`${prefix}thana_en`}
              autoComplete={`${autoPrefix}address-level2`}
              value={value.thana_en}
              onChange={(e) => update('thana_en', filterEnglish(e.target.value))}
              disabled={disabled}
              required={required}
              className={inputClass}
              placeholder="Thana in English"
            />
          </div>
        )}
      </div>

      {/* District */}
      <div className={gridClass}>
        {showBn && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              জেলা (বাংলা) {requiredMark}
            </label>
            <input
              type="text"
              name={`${prefix}district_bn`}
              autoComplete={`${autoPrefix}address-level1`}
              value={value.district_bn}
              onChange={(e) => update('district_bn', filterBangla(e.target.value))}
              disabled={disabled}
              required={required}
              className={inputClass}
              placeholder="জেলার নাম বাংলায়"
            />
          </div>
        )}
        {showEn && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              District (English) {requiredMark}
            </label>
            <input
              type="text"
              name={`${prefix}district_en`}
              autoComplete={`${autoPrefix}address-level1`}
              value={value.district_en}
              onChange={(e) => update('district_en', filterEnglish(e.target.value))}
              disabled={disabled}
              required={required}
              className={inputClass}
              placeholder="District in English"
            />
          </div>
        )}
      </div>

      {/* Ward No — not language-specific; shown alongside English, or always when unsplit */}
      {lang !== 'bn' && (
        <div className={gridClass}>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              ওয়ার্ড নং / Ward No {requiredMark}
            </label>
            <select
              name={`${prefix}ward_no`}
              value={value.ward_no}
              onChange={(e) => update('ward_no', e.target.value)}
              disabled={disabled}
              required={required}
              className={selectClass}
            >
              <option value="">ওয়ার্ড নির্বাচন করুন / Select Ward</option>
              {Array.from({ length: 9 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  ওয়ার্ড {w} / Ward {w}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
