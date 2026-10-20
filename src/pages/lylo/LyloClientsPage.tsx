import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/lylo/Button'
import { Input } from '../../components/ui/lylo/Input'
import { Label } from '../../components/ui/lylo/Label'
import { Modal } from '../../components/ui/lylo/Modal'
import { lyloApi } from '../../api/lyloClient'
import type { LyloClient } from '../../types/lylo'

function emptyCreateForm() {
  return { first_name: '', last_name: '', email: '', phone: '', sessions_available: '0', days_available: '0' }
}

export default function LyloClientsPage() {
  const [clients, setClients] = useState<LyloClient[]>([])
  const [search, setSearch] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreateForm())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [editSessionsAvailable, setEditSessionsAvailable] = useState('0')
  const [editDaysAvailable, setEditDaysAvailable] = useState('0')

  async function refresh() {
    setError(null)
    setIsBusy(true)
    try {
      setClients(await lyloApi.getCustomers())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(c => `${c.first_name} ${c.last_name} ${c.email} ${c.phone}`.toLowerCase().includes(q))
  }, [clients, search])

  const selectedClient = useMemo(() => {
    if (!selectedId) return null
    return clients.find(c => String(c.id) === String(selectedId)) ?? null
  }, [clients, selectedId])

  function openCreate() {
    setCreateForm(emptyCreateForm())
    setIsCreateOpen(true)
  }

  async function submitCreate() {
    const first_name = createForm.first_name.trim()
    const last_name = createForm.last_name.trim()
    const email = createForm.email.trim()
    if (!first_name || !last_name || !email) return
    setError(null)
    setIsBusy(true)
    try {
      await lyloApi.createCustomer({
        first_name, last_name, email,
        phone: createForm.phone.trim(),
        days_available: Math.max(0, parseInt(createForm.days_available) || 0),
        sessions_available: Math.max(0, parseInt(createForm.sessions_available) || 0),
      })
      setIsCreateOpen(false)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  function openDetail(client: LyloClient) {
    setSelectedId(String(client.id))
    setEditSessionsAvailable(String(client.sessions_available))
    setEditDaysAvailable(String(client.days_available))
    setIsDetailOpen(true)
  }

  async function saveDetail() {
    if (!selectedClient) return
    setError(null)
    setIsBusy(true)
    try {
      await lyloApi.updateCustomer(selectedClient.id, {
        sessions_available: Math.max(0, parseInt(editSessionsAvailable) || 0),
        days_available: Math.max(0, parseInt(editDaysAvailable) || 0),
      })
      setIsDetailOpen(false)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  async function deleteSelected() {
    if (!selectedClient) return
    if (!window.confirm(`Supprimer le client ${selectedClient.first_name} ${selectedClient.last_name} ?`)) return
    setError(null)
    setIsBusy(true)
    try {
      await lyloApi.deleteCustomer(selectedClient.id)
      setIsDetailOpen(false)
      setSelectedId(null)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-gray-100 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Clients</h2>
            <p className="mt-1 text-sm text-gray-500">
              Consulte la liste, ajoute un client, puis clique sur une ligne pour modifier les autorisations ou supprimer.
            </p>
          </div>
          <div className="flex w-full md:w-auto">
            <Button variant="primary" type="button" onClick={openCreate} className="w-full md:w-auto">
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              Ajouter un client
            </Button>
          </div>
        </div>
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50/30 p-3 text-sm text-red-700">{error}</div>
        )}
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
        <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50/20 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-semibold text-gray-900">
            Liste des clients <span className="text-gray-600">({filteredClients.length})</span>
          </div>
          <div className="w-full md:w-96">
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher (nom, email, téléphone)" aria-label="Rechercher un client" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/40">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Nom / Prénom</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Téléphone</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Sessions</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Jours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredClients.map(c => (
                <tr key={String(c.id)} className="cursor-pointer transition-colors hover:bg-gray-100/60" onClick={() => openDetail(c)}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.last_name} {c.first_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{c.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{c.phone || '—'}</td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">{c.sessions_available}</td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">{c.days_available}</td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td className="px-6 py-10 text-center text-sm text-gray-600" colSpan={5}>
                    {isBusy ? 'Chargement...' : "Aucun client ne correspond à ta recherche."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Modal open={isCreateOpen} title="Ajouter un nouveau client" onClose={() => setIsCreateOpen(false)} maxWidthClassName="max-w-xl"
        footer={
          <>
            <Button type="button" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
            <Button variant="primary" type="button" onClick={submitCreate} disabled={isBusy || !createForm.first_name.trim() || !createForm.last_name.trim() || !createForm.email.trim()}>Ajouter</Button>
          </>
        }>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cl_first_name">Prénom</Label>
            <Input id="cl_first_name" value={createForm.first_name} onChange={e => setCreateForm(s => ({ ...s, first_name: e.target.value }))} placeholder="Prénom" autoComplete="given-name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cl_last_name">Nom</Label>
            <Input id="cl_last_name" value={createForm.last_name} onChange={e => setCreateForm(s => ({ ...s, last_name: e.target.value }))} placeholder="Nom" autoComplete="family-name" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cl_email">Email</Label>
            <Input id="cl_email" type="email" value={createForm.email} onChange={e => setCreateForm(s => ({ ...s, email: e.target.value }))} placeholder="email@exemple.com" autoComplete="email" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cl_phone">Téléphone</Label>
            <Input id="cl_phone" value={createForm.phone} onChange={e => setCreateForm(s => ({ ...s, phone: e.target.value }))} placeholder="06 00 00 00 00" autoComplete="tel" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cl_sessions">Sessions disponibles</Label>
            <Input id="cl_sessions" inputMode="numeric" value={createForm.sessions_available} onChange={e => setCreateForm(s => ({ ...s, sessions_available: e.target.value }))} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cl_days">Jours disponibles</Label>
            <Input id="cl_days" inputMode="numeric" value={createForm.days_available} onChange={e => setCreateForm(s => ({ ...s, days_available: e.target.value }))} placeholder="0" />
          </div>
        </div>
      </Modal>
      <Modal open={isDetailOpen && !!selectedClient} title={selectedClient ? `Client — ${selectedClient.first_name} ${selectedClient.last_name}` : 'Client'} onClose={() => setIsDetailOpen(false)} maxWidthClassName="max-w-xl"
        footer={selectedClient ? (
          <>
            <Button variant="danger" type="button" onClick={deleteSelected}>Supprimer</Button>
            <div className="flex-1" />
            <Button type="button" onClick={() => setIsDetailOpen(false)}>Fermer</Button>
            <Button variant="primary" type="button" onClick={saveDetail}>Enregistrer</Button>
          </>
        ) : undefined}>
        {selectedClient && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Nom</Label><Input value={selectedClient.last_name} disabled /></div>
              <div className="space-y-2"><Label>Prénom</Label><Input value={selectedClient.first_name} disabled /></div>
              <div className="space-y-2 md:col-span-2"><Label>Email</Label><Input value={selectedClient.email} disabled /></div>
              <div className="space-y-2 md:col-span-2"><Label>Téléphone</Label><Input value={selectedClient.phone || ''} disabled /></div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50/40 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Autorisations</h3>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit_sessions">Nombre de sessions autorisées</Label>
                  <Input id="edit_sessions" inputMode="numeric" value={editSessionsAvailable} onChange={e => setEditSessionsAvailable(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_days">Nombre de jours autorisés</Label>
                  <Input id="edit_days" inputMode="numeric" value={editDaysAvailable} onChange={e => setEditDaysAvailable(e.target.value)} placeholder="0" />
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
