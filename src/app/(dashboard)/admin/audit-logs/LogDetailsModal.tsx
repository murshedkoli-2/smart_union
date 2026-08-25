'use client'

/** Everything recorded about one audit entry, including the before/after diff. */
import Modal from '@/components/ui/Modal'
import { actionColor, statusColor, type AuditLogEntry } from './audit-log'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-100 pt-4">
      <p className="text-xs text-gray-500 uppercase mb-2">{title}</p>
      {children}
    </div>
  )
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40 font-mono">
        {JSON.stringify(value, null, 2) || '—'}
      </pre>
    </div>
  )
}

export default function LogDetailsModal({
  log,
  onClose,
}: {
  log: AuditLogEntry | null
  onClose: () => void
}) {
  return (
    <Modal open={!!log} onClose={onClose} title="Audit Log Details" size="md">
      {log && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Action</p>
              <span className={`text-sm px-2 py-1 rounded font-medium ${actionColor(log.action)}`}>
                {log.action}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Status</p>
              <span className={`text-sm px-2 py-1 rounded font-medium ${statusColor(log.status)}`}>
                {log.status}
              </span>
            </div>
          </div>

          <Section title="Target">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-medium text-gray-800">{log.target_model}</p>
              {log.target_id && (
                <p className="text-xs text-gray-500 font-mono mt-1">ID: {log.target_id}</p>
              )}
            </div>
          </Section>

          <Section title="Performed By">
            <div className="bg-gray-50 rounded-lg p-3">
              {log.user_id ? (
                <>
                  <p className="font-medium text-gray-800">{log.user_id.name}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {log.user_role?.replace(/_/g, ' ')}
                  </p>
                </>
              ) : (
                <p className="text-gray-500">System</p>
              )}
            </div>
          </Section>

          <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Timestamp</p>
              <p className="text-sm text-gray-800">
                {new Date(log.createdAt).toLocaleString('en-BD')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">IP Address</p>
              <p className="text-sm text-gray-800 font-mono">{log.ip_address ?? '—'}</p>
            </div>
          </div>

          {log.user_agent && (
            <Section title="User Agent">
              <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded font-mono break-all">
                {log.user_agent}
              </p>
            </Section>
          )}

          {log.error_message && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-red-500 uppercase mb-1">Error Message</p>
              <p className="text-sm text-red-700 bg-red-50 p-3 rounded">{log.error_message}</p>
            </div>
          )}

          {log.changes && (
            <Section title="Changes">
              <div className="grid grid-cols-2 gap-3">
                <JsonBlock label="Before" value={log.changes.before} />
                <JsonBlock label="After" value={log.changes.after} />
              </div>
            </Section>
          )}

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-400">
              Log ID: <span className="font-mono">{log._id}</span>
            </p>
          </div>
        </div>
      )}
    </Modal>
  )
}
