import type { ReactNode } from 'react'

export function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-gray-100 border border-gray-200 rounded-xl p-4">
      <span className="block text-xs text-gray-600 mb-1">{label}</span>
      <strong className="text-xl font-bold text-gray-900">{value}</strong>
    </div>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-700">{label}</span>
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
      {children}
    </label>
  )
}

export const inputClass = 'bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500/50'
