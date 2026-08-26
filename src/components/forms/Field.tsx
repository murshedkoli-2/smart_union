'use client'

/**
 * Labelled input and select.
 *
 * Every field on the citizen form repeated the same six lines of wrapper,
 * label and class names; only the label, the binding and the placeholder ever
 * differed. These two components carry that shape once.
 */

export const inputClass =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

export const selectClass = `${inputClass} bg-white`

function Label({ label, required }: { label: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
  )
}

export function TextField({
  label,
  name,
  value,
  onChange,
  required,
  placeholder,
  type = 'text',
  autoComplete = 'off',
  min,
  step,
}: {
  label: React.ReactNode
  name: string
  value: string | number
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
  type?: 'text' | 'tel' | 'date' | 'number' | 'email' | 'password'
  autoComplete?: string
  min?: string
  step?: string
}) {
  return (
    <div>
      <Label label={label} required={required} />
      <input
        type={type}
        name={name}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        placeholder={placeholder}
        required={required}
        min={min}
        step={step}
      />
    </div>
  )
}

export function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  required,
  /** Omitted for a required select, which has no empty state. */
  placeholder = 'নির্বাচন করুন / Select',
  autoComplete = 'off',
}: {
  label: React.ReactNode
  name: string
  value: string
  onChange: (value: string) => void
  options: ReadonlyArray<{ value: string; label: string }>
  required?: boolean
  placeholder?: string | null
  autoComplete?: string
}) {
  return (
    <div>
      <Label label={label} required={required} />
      <select
        name={name}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
        required={required}
      >
        {placeholder !== null && !required && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
