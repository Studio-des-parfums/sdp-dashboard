import { useEffect, useState } from 'react'
import { groupsApi, customersApi } from '../../api/ocrClient'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { ConfirmModal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'

interface Group {
  id: number
  name: string
  description: string
  member_count: number
}

interface Customer {
  id: number
  name: string
  email: string
  phone: string
}

interface CustomerOption {
  id: number
  name: string
  email: string
}

export default function GroupDetailsPage({ groupIds, onBack }: { groupIds: number[]; onBack: () => void }) {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [adding, setAdding] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<Customer | null>(null)
  const [removing, setRemoving] = useState(false)

  const groupId = groupIds[0]

  const fetchGroup = async () => {
    setLoading(true)
    setError(null)
    try {
      const [gData, membersData] = await Promise.all([
        groupsApi.getById(groupId),
        groupsApi.getCustomersByGroupIds(groupIds),
      ])
      setGroup(gData)
      setMembers(Array.isArray(membersData) ? membersData : membersData.customers ?? [])
    } catch {
      setError('Failed to load group details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchGroup() }, [groupId])

  const openAddModal = async () => {
    setShowAddModal(true)
    setSelectedIds([])
    try {
      const data = await customersApi.getAllNoPagination()
      setCustomers(Array.isArray(data) ? data : data.customers ?? [])
    } catch {
      setCustomers([])
    }
  }

  const handleAddMembers = async () => {
    if (!selectedIds.length || !user) return
    setAdding(true)
    try {
      await groupsApi.addCustomers(groupId, selectedIds, user.id)
      showSuccess('Members added')
      setShowAddModal(false)
      fetchGroup()
    } catch {
      showError('Failed to add members')
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveMember = async () => {
    if (!removeTarget) return
    setRemoving(true)
    try {
      await groupsApi.removeCustomers(groupId, [removeTarget.id])
      showSuccess('Member removed')
      setRemoveTarget(null)
      fetchGroup()
    } catch {
      showError('Failed to remove member')
    } finally {
      setRemoving(false)
    }
  }

  const toggleCustomer = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const alreadyMembers = new Set(members.map(m => m.id))

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-4 bg-gray-200 rounded w-72" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <button onClick={onBack} className="text-gray-500 hover:text-gray-900 text-sm mb-4 flex items-center gap-1">◀ Back</button>
        <div className="flex items-center justify-center h-64">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!group) return null

  return (
    <div>
      <button onClick={onBack} className="text-gray-500 hover:text-gray-900 text-sm mb-4 flex items-center gap-1">◀ Back to Groups</button>

      <div className="bg-gray-100 border border-gray-200 rounded-xl p-4 sm:p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{group.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{group.description || 'No description'}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>👥</span>
            <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Members</h2>
        <Button size="sm" onClick={openAddModal}>➕ Add Members</Button>
      </div>

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-600 bg-gray-100 border border-gray-200 rounded-xl">
          <span className="text-3xl mb-2">👤</span>
          <p className="text-sm">No members yet</p>
        </div>
      ) : (
        <div className="bg-gray-100 border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Phone</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} className="border-b border-gray-200/50 hover:bg-gray-100/60 transition-colors">
                  <td className="px-4 py-3 text-gray-900 font-medium">{m.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{m.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{m.phone || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setRemoveTarget(m)}>✖</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="bg-gray-100 border border-gray-200 rounded-2xl w-full max-w-lg mx-4 overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Add Members</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-600 hover:text-gray-900 transition-colors text-lg">✕</button>
            </div>
            <div className="p-6 max-h-80 overflow-y-auto space-y-1">
              {customers.filter(c => !alreadyMembers.has(c.id)).length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-8">No available customers to add</p>
              ) : (
                customers
                  .filter(c => !alreadyMembers.has(c.id))
                  .map(c => (
                    <label
                      key={c.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c.id)}
                        onChange={() => toggleCustomer(c.id)}
                        className="accent-indigo-500"
                      />
                      <div>
                        <span className="text-sm text-gray-900">{c.name || 'Unnamed'}</span>
                        <span className="text-xs text-gray-600 ml-2">{c.email}</span>
                      </div>
                    </label>
                  ))
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button onClick={handleAddMembers} loading={adding} disabled={!selectedIds.length}>Add Selected ({selectedIds.length})</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemoveMember}
        title="Remove Member"
        message={`Remove "${removeTarget?.name || removeTarget?.email}" from this group?`}
        confirmText="Remove"
        danger
        isLoading={removing}
      />
    </div>
  )
}
