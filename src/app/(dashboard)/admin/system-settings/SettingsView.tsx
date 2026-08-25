'use client'

/** Read-only view of the union's settings. */
import Image from 'next/image'
import type { UnionSettings } from './settings-model'

export function LogoBox({ src, label }: { src?: string | null; label: string }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <div className="flex h-44 items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50">
        {src ? (
          <Image
            src={src}
            alt="Union logo"
            width={180}
            height={180}
            className="h-auto max-h-full w-auto max-w-full object-contain"
            // The logo is often a pasted data: URL, which the optimizer cannot fetch.
            unoptimized
          />
        ) : (
          <span className="text-xs text-gray-400">No logo uploaded</span>
        )}
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm text-gray-800">{value || 'Not set'}</p>
    </div>
  )
}

export default function SettingsView({ settings }: { settings: UnionSettings }) {
  return (
    <div className="space-y-5 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="grid gap-5 md:grid-cols-[220px_1fr]">
        <LogoBox src={settings.union_logo} label="Union Logo" />

        <div className="grid gap-4 md:grid-cols-2">
          <DetailRow label="Union Name (Bangla)" value={settings.union_name_bn} />
          <DetailRow label="Union Name (English)" value={settings.union_name_en} />
          <DetailRow label="Chairman Name (Bangla)" value={settings.chairman_name_bn} />
          <DetailRow label="Chairman Name (English)" value={settings.chairman_name_en} />
          <DetailRow label="Address (Bangla)" value={settings.address_bn} />
          <DetailRow label="Address (English)" value={settings.address_en} />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Union Members</h2>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
            {settings.members.length} member{settings.members.length === 1 ? '' : 's'}
          </span>
        </div>

        {settings.members.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
            No union members added yet.
          </div>
        ) : (
          <div className="space-y-3">
            {settings.members.map((member, index) => (
              <div
                key={`${index}-${member.name_en}`}
                className="grid gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4 md:grid-cols-2"
              >
                <DetailRow label="Name (Bangla)" value={member.name_bn} />
                <DetailRow label="Name (English)" value={member.name_en} />
                <DetailRow label="Designation (Bangla)" value={member.designation_bn} />
                <DetailRow label="Designation (English)" value={member.designation_en} />
                <DetailRow label="Mobile" value={member.mobile || ''} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
