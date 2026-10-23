import { useEffect, useState, useCallback, useRef } from 'react'
import { devicesApi } from '../../api/ocrClient'
import { useToast } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'

interface Device {
  id: number
  device_id: string
  device_name: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at?: string
  approved_at?: string | null
  rejected_at?: string | null
}

function truncateId(id: string): string {
  if (id.length <= 16) return id
  return `${id.slice(0, 8)}...${id.slice(-4)}`
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function EditableName({
  value,
  onSave,
}: {
  value: string
  onSave: (newValue: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const handleSave = async () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== value) {
      await onSave(trimmed)
    }
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') { setEditValue(value); setEditing(false) }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={editValue}
        onChange={e => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full bg-white border border-indigo-500/50 rounded px-2 py-1 text-sm text-gray-900 outline-none"
      />
    )
  }

  return (
    <button
      onClick={() => { setEditValue(value); setEditing(true) }}
      className="text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100/60 rounded px-2 py-1 -ml-2 transition-colors text-left w-full"
      title="Cliquer pour modifier"
    >
      {value || '✏️ Sans nom'}
    </button>
  )
}

export default function DevicesPage() {
  const { showError, showSuccess } = useToast()
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const refreshRef = useRef<ReturnType<typeof setInterval>>()
  const isEditingRef = useRef(false)

  const fetchDevices = useCallback(async () => {
    try {
      const data = await devicesApi.getAll()
      setDevices(Array.isArray(data) ? data : data.devices || data.results || data.data || [])
      setError(null)
    } catch {
      setError('Erreur lors du chargement des appareils')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDevices()
    refreshRef.current = setInterval(() => {
      if (!isEditingRef.current) fetchDevices()
    }, 10000)
    return () => { if (refreshRef.current) clearInterval(refreshRef.current) }
  }, [fetchDevices])

  const handleAction = async (deviceId: number, action: () => Promise<unknown>, successMsg: string) => {
    setActionLoading(deviceId)
    try {
      await action()
      showSuccess(successMsg)
      fetchDevices()
    } catch {
      showError('Erreur', `Échec de l'opération`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRename = async (deviceId: number, deviceName: string) => {
    try {
      await devicesApi.rename(deviceId, deviceName)
      showSuccess('Nom mis à jour')
    } catch {
      showError('Erreur', 'Impossible de renommer')
    }
  }

  const pending = devices.filter(d => d.status === 'pending')
  const approved = devices.filter(d => d.status === 'approved')
  const rejected = devices.filter(d => d.status === 'rejected')

  const renderDeviceTable = (items: Device[], type: 'pending' | 'approved' | 'rejected') => {
    if (items.length === 0) return <p className="text-sm text-gray-600 text-center py-8">Aucun appareil</p>
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[550px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">Device ID</th>
              <th className="text-left px-4 py-3 font-medium">Nom</th>
              <th className="text-left px-4 py-3 font-medium">Créé le</th>
              <th className="text-left px-4 py-3 font-medium">Mis à jour</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(d => (
              <tr key={d.id} className="border-b border-gray-200/50 hover:bg-gray-100/60 transition-colors">
                <td className="px-4 py-3 text-gray-500 font-mono text-xs" title={d.device_id}>
                  {truncateId(d.device_id)}
                </td>
                <td className="px-4 py-3">
                  <EditableName
                    value={d.device_name || ''}
                    onSave={async (name) => {
                      isEditingRef.current = true
                      await handleRename(d.id, name)
                      isEditingRef.current = false
                    }}
                  />
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(d.created_at)}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(d.updated_at)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {type === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleAction(d.id, () => devicesApi.approve(d.id), 'Appareil approuvé')}
                          loading={actionLoading === d.id}
                        >
                          ✅ Approuver
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleAction(d.id, () => devicesApi.reject(d.id), 'Appareil rejeté')}
                          loading={actionLoading === d.id}
                        >
                          ❌ Rejeter
                        </Button>
                      </>
                    )}
                    {type === 'approved' && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleAction(d.id, () => devicesApi.reject(d.id), 'Appareil révoqué')}
                        loading={actionLoading === d.id}
                      >
                        🔒 Révoquer
                      </Button>
                    )}
                    {type === 'rejected' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleAction(d.id, () => devicesApi.approve(d.id), 'Appareil ré-autorisé')}
                        loading={actionLoading === d.id}
                      >
                        🔄 Ré-autoriser
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map(s => (
            <div key={s} className="bg-gray-100 border border-gray-200 rounded-xl p-4 animate-pulse space-y-3">
              <div className="h-5 bg-gray-200 rounded w-32" />
              <div className="h-12 bg-gray-200 rounded" />
              <div className="h-12 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-red-700 text-sm mb-4">{error}</p>
        <Button size="sm" onClick={fetchDevices}>🔄 Réessayer</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">📱 Appareils</h1>
          <p className="text-xs text-gray-600 mt-0.5">{devices.length} appareil{devices.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchDevices}>🔄</Button>
        </div>
      </div>

      <div className="bg-gray-100 border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-amber-500/5">
          <span className="text-sm">🆕</span>
          <h2 className="text-sm font-semibold text-gray-900">Nouvelles connexions</h2>
          <span className="text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">{pending.length}</span>
        </div>
        {renderDeviceTable(pending, 'pending')}
      </div>

      <div className="bg-gray-100 border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-emerald-500/5">
          <span className="text-sm">✅</span>
          <h2 className="text-sm font-semibold text-gray-900">Appareils autorisés</h2>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium">{approved.length}</span>
        </div>
        {renderDeviceTable(approved, 'approved')}
      </div>

      <div className="bg-gray-100 border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-red-500/5">
          <span className="text-sm">⛔</span>
          <h2 className="text-sm font-semibold text-gray-900">Appareils rejetés</h2>
          <span className="text-[10px] bg-red-500/10 text-red-700 px-1.5 py-0.5 rounded-full font-medium">{rejected.length}</span>
        </div>
        {renderDeviceTable(rejected, 'rejected')}
      </div>
    </div>
  )
}
