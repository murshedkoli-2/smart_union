'use client'

import { useState, ReactNode } from 'react'

interface FormSectionProps {
  titleBn: string
  titleEn: string
  optional?: boolean
  defaultCollapsed?: boolean
  children: ReactNode
}

export default function FormSection({
  titleBn,
  titleEn,
  optional = false,
  defaultCollapsed = false,
  children,
}: FormSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50/50">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-100/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-800">{titleBn}</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-600">{titleEn}</span>
          {optional && (
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
              ঐচ্ছিক / Optional
            </span>
          )}
        </div>
        <span className="text-gray-400 text-sm">{collapsed ? '▼' : '▲'}</span>
      </button>
      {!collapsed && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-200">{children}</div>
      )}
    </div>
  )
}
