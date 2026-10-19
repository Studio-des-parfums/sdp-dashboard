import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/lylo/Button'
import { Input } from '../../components/ui/lylo/Input'
import { Label } from '../../components/ui/lylo/Label'
import { poluxApi } from '../../api/poluxClient'
import type { PoluxLead, PoluxUserRef } from '../../types/polux'
import { LEAD_STATUS_LABEL } from '../../components/polux/leadStatus'

interface PoluxLeadFormPageProps {
  onCreated: (lead: PoluxLead) => void
  onCancel: () => void
}

function emptyForm() {
  return {
    contactType: 'particulier' as PoluxLead['contact_type'],
    lastName: '',
    firstName: '',
    phone: '',
    email: '',
    company: '',
    info: '',
    projectName: '',
    projectDate: '',
    firstDepositDate: '',
    secondDepositDate: '',
    status: 'nouveau' as PoluxLead['status'],
    callDate: new Date().toISOString().slice(0, 10),
    nextFollowUpAt: '',
    assignedToId: null as number | null,
  }
}

export default function PoluxLeadFormPage({ onCreated, onCancel }: PoluxLeadFormPageProps) {
  const [users, setUsers] = useState<PoluxUserRef[]>([])
  const [form, setForm] = useState(emptyForm())
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    poluxApi.getUsers().then(setUsers).catch(() => {})
  }, [])

  const isPro = form.contactType === 'professionnel'
  const isValid = form.lastName.trim() && form.firstName.trim() && form.phone.trim() && (!isPro || form.company.trim())

  async function submit() {
    if (!isValid) return
    setIsBusy(true)
    setError(null)
    try {
      const lead = await poluxApi.createLead({
        contact_type: form.contactType,
        last_name: form.lastName.trim(),
        first_name: form.firstName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        company: isPro ? form.company.trim() : null,
        info: form.info.trim(),
        project_name: form.projectName.trim(),
        project_date: form.projectDate ? new Date(form.projectDate).toISOString() : null,
        first_deposit_date: form.firstDepositDate ? new Date(form.firstDepositDate).toISOString() : null,
        second_deposit_date: form.secondDepositDate ? new Date(form.secondDepositDate).toISOString() : null,
        status: form.status,
        call_date: new Date(form.callDate).toISOString(),
        next_follow_up_at: form.nextFollowUpAt ? new Date(form.nextFollowUpAt).toISOString() : null,
        assigned_to_id: form.assignedToId,
      })
      onCreated(lead)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-xl border border-gray-200 bg-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900">Nouveau lead / prospect</h2>
        <p className="mt-1 text-sm text-gray-500">Enregistrer les informations recueillies pendant l'appel.</p>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50/30 p-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-xl border border-gray-200 bg-gray-100 p-6 space-y-5">
        <div className="space-y-2">
          <Label>Type de contact</Label>
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
            {(['particulier', 'professionnel'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm((s) => ({ ...s, contactType: t }))}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${form.contactType === t ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {t === 'particulier' ? 'Particulier' : 'Professionnel'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input value={form.lastName} onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))} placeholder="Nom" />
          </div>
          <div className="space-y-2">
            <Label>Prénom</Label>
            <Input value={form.firstName} onChange={(e) => setForm((s) => ({ ...s, firstName: e.target.value }))} placeholder="Prénom" />
          </div>
          <div className="space-y-2">
            <Label>Numéro</Label>
            <Input value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} placeholder="06 00 00 00 00" />
          </div>
          <div className="space-y-2">
            <Label>Mail</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} placeholder="email@exemple.fr" />
          </div>
          {isPro && (
            <div className="col-span-2 space-y-2">
              <Label>Société</Label>
              <Input value={form.company} onChange={(e) => setForm((s) => ({ ...s, company: e.target.value }))} placeholder="Nom de la société" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Information</Label>
          <textarea
            value={form.info}
            onChange={(e) => setForm((s) => ({ ...s, info: e.target.value }))}
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            placeholder="Notes prises pendant l'appel"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nom du projet</Label>
            <Input value={form.projectName} onChange={(e) => setForm((s) => ({ ...s, projectName: e.target.value }))} placeholder="Ex: Mariage, soirée d'entreprise..." />
          </div>
          <div className="space-y-2">
            <Label>Date du projet</Label>
            <Input type="date" value={form.projectDate} onChange={(e) => setForm((s) => ({ ...s, projectDate: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Date 1er acompte</Label>
            <Input type="date" value={form.firstDepositDate} onChange={(e) => setForm((s) => ({ ...s, firstDepositDate: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Date 2e acompte</Label>
            <Input type="date" value={form.secondDepositDate} onChange={(e) => setForm((s) => ({ ...s, secondDepositDate: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Date de l'appel</Label>
            <Input type="date" value={form.callDate} onChange={(e) => setForm((s) => ({ ...s, callDate: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Prochaine relance</Label>
            <Input type="date" value={form.nextFollowUpAt} onChange={(e) => setForm((s) => ({ ...s, nextFollowUpAt: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Statut</Label>
            <select
              value={form.status}
              onChange={(e) => setForm((s) => ({ ...s, status: e.target.value as PoluxLead['status'] }))}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              {Object.entries(LEAD_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Assigné à</Label>
            <select
              value={form.assignedToId ?? ''}
              onChange={(e) => setForm((s) => ({ ...s, assignedToId: e.target.value ? Number(e.target.value) : null }))}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="">Non assigné</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" onClick={onCancel}>Annuler</Button>
        <Button variant="primary" type="button" onClick={submit} disabled={isBusy || !isValid}>Enregistrer le lead</Button>
      </div>
    </div>
  )
}
