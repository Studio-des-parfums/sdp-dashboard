import { useEffect, useState } from 'react'
import { groupsApi } from '../../api/ocrClient'
import { useToast } from '../../components/ui/Toast'
import { ConfirmModal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'

interface Group {
  id: number
  name: string
  description: string
  member_count: number
}

export default function GroupsPage({ onOpenGroups }: { onOpenGroups: (groupIds: number[]) => void }) {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { showSuccess, showError } = useToast()

  const fetchGroups = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await groupsApi.getAll()
      setGroups(Array.isArray(data) ? data : data.groups ?? [])
    } catch {
      setError('Failed to load groups')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchGroups() }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      await groupsApi.create({ name: newName.trim(), description: newDesc.trim() })
      showSuccess('Group created')
      setShowCreate(false)
      setNewName('')
      setNewDesc('')
      fetchGroups()
    } catch {
      showError('Failed to create group')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await groupsApi.delete(deleteTarget.id)
      showSuccess('Group deleted')
      setDeleteTarget(null)
      fetchGroups()
    } catch {
      showError('Failed to delete group')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Groups</h1>
          <p className="text-xs text-gray-600 mt-0.5">{groups.length} group{groups.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>➕ New Group</Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-100 border border-gray-200 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-40 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-64" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-600">
          <span className="text-3xl mb-2">📂</span>
          <p className="text-sm">No groups yet</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowCreate(true)}>Create your first group</Button>
        </div>
      ) : (
        <div className="bg-gray-100 border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Description</th>
                <th className="text-center px-4 py-3 font-medium">Members</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(g => (
                <tr
                  key={g.id}
                  className="border-b border-gray-200/50 hover:bg-gray-100/60 cursor-pointer transition-colors"
                  onClick={() => onOpenGroups([g.id])}
                >
                  <td className="px-4 py-3 text-gray-900 font-medium">{g.name}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{g.description || '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{g.member_count ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => { e.stopPropagation(); setDeleteTarget(g) }}
                    >
                      🗑️
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="bg-gray-100 border border-gray-200 rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Create Group</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-600 hover:text-gray-900 transition-colors text-lg">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Name</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none placeholder-gray-400 focus:border-indigo-500 transition-colors"
                  placeholder="Group name"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Description</label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none placeholder-gray-400 focus:border-indigo-500 transition-colors resize-none"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button onClick={handleCreate} loading={creating} disabled={!newName.trim()}>Create</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Group"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        danger
        isLoading={deleting}
      />
    </div>
  )
}
