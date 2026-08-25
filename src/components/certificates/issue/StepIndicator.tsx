'use client'

import { STEPS, STEP_LABELS, type Step } from './useIssueCertificate'

/** The numbered language → template → preview strip across the dialog top. */
export default function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.indexOf(current)

  return (
    <div className="mb-6 flex items-center">
      {STEPS.map((step, index) => {
        const done = index < currentIndex
        const active = index === currentIndex

        return (
          <div key={step} className="flex flex-1 items-center">
            <div className="flex flex-shrink-0 items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                  done
                    ? 'border-green-700 bg-green-700 text-white'
                    : active
                      ? 'border-green-700 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-white text-gray-400'
                }`}
              >
                {done ? '✓' : index + 1}
              </div>
              <span
                className={`text-xs font-semibold ${
                  active ? 'text-green-700' : done ? 'text-green-600' : 'text-gray-400'
                }`}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`mx-3 h-0.5 flex-1 ${done ? 'bg-green-700' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
