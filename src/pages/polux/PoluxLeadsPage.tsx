import { useEffect, useMemo, useState } from 'react'
import { poluxApi } from '../../api/poluxClient'
import type { PoluxLead, PoluxLeadContactType, PoluxLeadStatus, PoluxUserRef } from '../../types/polux'
import { Button } from '../../components/ui/lylo/Button'
import { Input } from '../../components/ui/lylo/Input'
import { LeadDetailModal } from '../../components/polux/LeadDetailModal'
import { LEAD_CONTACT_TYPE_LABEL, LEAD_STATUS_CLASS, LEAD_STATUS_LABEL, formatLeadDate, isLeadFollowUpDue } from '../../components/polux/leadStatus'

interface PoluxLeadsPageProps {
  onCreateLead: () => void
}


type StatusFilter = 'tous' | PoluxLeadStatus
type ContactFilter = 'tous' | PoluxLeadContactType

export default function PoluxLeadsPage({ onCreateLead }: PoluxLeadsPageProps) {
  const [leads, setLeads] = useState<PoluxLead[]>([])
  const [users, setUsers] = useState<PoluxUserRef[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<PoluxLead | null>(null)

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('tous')
  const [contactFilter, setContactFilter] = useState<ContactFilter>('tous')
  const [assigneeFilter, setAssigneeFilter] = useState<number | 'tous'>('tous')
  const [search, setSearch] = useState('')
  const [onlyFollowUpDue, setOnlyFollowUpDue] = useState(false)

  useEffect(() => {
    Promise.all([poluxApi.getLeads(), poluxApi.getUsers()])
      .then(([l, u]) => { setLeads(l); setUsers(u) })
      .finally(() => setLoading(false))
  }, [])

  function handleUpdated(updated: PoluxLead) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
    setSelectedLead(updated)
  }

  function handleDeleted(leadId: number) {
    setLeads((prev) => prev.filter((l) => l.id !== leadId))
    setSelectedLead(null)
  }

  const filteredLeads = useMemo(() => {
    const term = search.trim().toLowerCase()
    return leads
      .filter((l) => statusFilter === 'tous' || l.status === statusFilter)
      .filter((l) => contactFilter === 'tous' || l.contact_type === contactFilter)
      .filter((l) => assigneeFilter === 'tous' || l.assigned_to_id === assigneeFilter)
      .filter((l) => !onlyFollowUpDue || isLeadFollowUpDue(l.next_follow_up_at, l.status))
      .filter((l) => {
        if (!term) return true
        return [l.first_name, l.last_name, l.company, l.phone, l.email, l.project_name]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(term))
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [leads, statusFilter, contactFilter, assigneeFilter, onlyFollowUpDue, search])

  const followUpDueCount = useMemo(() => leads.filter((l) => isLeadFollowUpDue(l.next_follow_up_at, l.status)).length, [leads])

  function userName(id: number | null) {
    if (!id) return 'Non assigné'
    const u = users.find((user) => user.id === id)
    return u ? `${u.first_name} ${u.last_name}` : 'Non assigné'
  }

  if (loading) return <div className="p-6 text-sm text-gray-500">Chargement...</div>

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-xl border border-gray-200 bg-gray-100 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Leads / Prospects</h2>
            <p className="mt-1 text-sm text-gray-500">
              Suivi des appels reçus — {leads.length} leads, {followUpDueCount > 0 && (
                <span className="font-medium text-red-700">{followUpDueCount} à relancer</span>
              )}
              {followUpDueCount === 0 && 'aucune relance en retard'}.
            </p>
          </div>
          <Button variant="primary" type="button" onClick={onCreateLead}>
            Nouveau lead
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-gray-100 p-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (nom, société, téléphone, mail...)"
          className="max-w-xs"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
        >
          <option value="tous">Tous les statuts</option>
          {Object.entries(LEAD_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select
          value={contactFilter}
          onChange={(e) => setContactFilter(e.target.value as ContactFilter)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
        >
          <option value="tous">Tous les types</option>
          {Object.entries(LEAD_CONTACT_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value === 'tous' ? 'tous' : Number(e.target.value))}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
        >
          <option value="tous">Tous les assignés</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={onlyFollowUpDue} onChange={(e) => setOnlyFollowUpDue(e.target.checked)} />
          À relancer uniquement
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/20 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Projet</th>
              <th className="px-4 py-3">Date d'appel</th>
              <th className="px-4 py-3">Relance</th>
              <th className="px-4 py-3">Assigné</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredLeads.map((lead) => {
              const due = isLeadFollowUpDue(lead.next_follow_up_at, lead.status)
              return (
                <tr key={lead.id} onClick={() => setSelectedLead(lead)} className="cursor-pointer hover:bg-gray-200/40">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{lead.first_name} {lead.last_name}</p>
                    <p className="text-xs text-gray-500">{lead.company ?? lead.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{LEAD_CONTACT_TYPE_LABEL[lead.contact_type]}</td>
                  <td className="px-4 py-3 text-gray-700">{lead.project_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{formatLeadDate(lead.call_date)}</td>
                  <td className={`px-4 py-3 ${due ? 'font-medium text-red-700' : 'text-gray-700'}`}>
                    {formatLeadDate(lead.next_follow_up_at)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{userName(lead.assigned_to_id)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${LEAD_STATUS_CLASS[lead.status]}`}>
                      {LEAD_STATUS_LABEL[lead.status]}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filteredLeads.length === 0 && (
          <p className="px-6 py-6 text-center text-sm text-gray-600">Aucun lead ne correspond à ces filtres.</p>
        )}
      </div>

      <LeadDetailModal lead={selectedLead} users={users} onClose={() => setSelectedLead(null)} onUpdated={handleUpdated} onDeleted={handleDeleted} />
    </div>
  )
}
