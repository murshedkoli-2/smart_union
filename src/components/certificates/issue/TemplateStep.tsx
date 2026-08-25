'use client'

import type {
  CertificateTemplate,
  CitizenForCert,
  DynamicField,
} from '@/types/certificate.types'

const FIELD_CLASS =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

/** Who the certificate is for, shown while picking a template. */
function CitizenChip({ citizen, language }: { citizen: CitizenForCert; language: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
        {(citizen.name_bn || citizen.name_en || 'C')[0]}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">{citizen.name_bn}</p>
        <p className="text-xs text-gray-500">
          {citizen.name_en} • {language === 'bn' ? 'বাংলা সনদ' : 'English Certificate'}
        </p>
      </div>
    </div>
  )
}

function TemplateOption({
  template,
  selected,
  onSelect,
}: {
  template: CertificateTemplate
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-lg border-2 p-3 text-left transition-all ${
        selected ? 'border-green-700 bg-green-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${selected ? 'text-green-800' : 'text-gray-800'}`}>
            {template.name}
          </p>
          <p className="mt-0.5 text-xs capitalize text-gray-400">
            {template.certificate_category?.replace(/_/g, ' ')}
          </p>
        </div>
        <div className="ml-3 flex-shrink-0 text-right">
          <span className={`text-sm font-bold ${selected ? 'text-green-700' : 'text-gray-600'}`}>
            ৳{template.fee}
          </span>
          {selected && <p className="text-xs text-green-600">✓</p>}
        </div>
      </div>
    </button>
  )
}

/** One template-defined extra field: a select, or a text/date/number input. */
function DynamicFieldInput({
  field,
  value,
  onChange,
}: {
  field: DynamicField
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">
        {field.field_label}
        {field.required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {field.field_type === 'select' ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${FIELD_CLASS} bg-white`}
        >
          <option value="">Select...</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      ) : (
        <input
          type={field.field_type === 'date' ? 'date' : field.field_type === 'number' ? 'number' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={FIELD_CLASS}
        />
      )}
    </div>
  )
}

export default function TemplateStep({
  citizen,
  language,
  templates,
  loading,
  selectedTemplate,
  dynamicData,
  onSelectTemplate,
  onDynamicChange,
  onBack,
  onContinue,
}: {
  citizen: CitizenForCert
  language: string
  templates: CertificateTemplate[]
  loading: boolean
  selectedTemplate: CertificateTemplate | null
  dynamicData: Record<string, string>
  onSelectTemplate: (template: CertificateTemplate) => void
  onDynamicChange: (key: string, value: string) => void
  onBack: () => void
  onContinue: () => void
}) {
  return (
    <div className="space-y-4">
      <CitizenChip citizen={citizen} language={language} />

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Available Templates
        </p>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-14 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            No active templates found for {language === 'bn' ? 'Bengali' : 'English'}. Please
            configure templates in the admin panel.
          </div>
        ) : (
          <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
            {templates.map((template) => (
              <TemplateOption
                key={template._id}
                template={template}
                selected={selectedTemplate?._id === template._id}
                onSelect={() => onSelectTemplate(template)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedTemplate && selectedTemplate.dynamic_fields?.length > 0 && (
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Additional Details
          </p>
          <div className="grid grid-cols-2 gap-3">
            {selectedTemplate.dynamic_fields.map((field) => (
              <DynamicFieldInput
                key={field.field_key}
                field={field}
                value={dynamicData[field.field_key] || ''}
                onChange={(value) => onDynamicChange(field.field_key, value)}
              />
            ))}
          </div>
        </div>
      )}

      {selectedTemplate && (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <span className="text-sm font-medium text-green-800">Certificate Fee</span>
          <span className="text-xl font-bold text-green-700">৳ {selectedTemplate.fee}</span>
        </div>
      )}

      <div className="flex justify-between border-t border-gray-100 pt-2">
        <button
          onClick={onBack}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          ← Back
        </button>
        <button
          onClick={onContinue}
          disabled={!selectedTemplate}
          className="rounded-lg bg-green-700 px-5 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Preview →
        </button>
      </div>
    </div>
  )
}
