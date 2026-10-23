import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/lylo/Button'
import { Input } from '../../components/ui/lylo/Input'
import { Label } from '../../components/ui/lylo/Label'
import { Modal } from '../../components/ui/lylo/Modal'
import { lyloApi } from '../../api/lyloClient'
import type { LyloTeamMember } from '../../types/lylo'

function emptyForm() {
  return { first_name: '', last_name: '', email: '', phone: '' }
}

export default function LyloTeamPage() {
  const [members, setMembers] = useState<LyloTeamMember[]>([])
  const [search, setSearch] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyForm())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editForm, setEditForm] = useState(emptyForm())

  async function refresh() {
    setError(null)
    setIsBusy(true)
    try {
      setMembers(await lyloApi.getTeam())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return members
    return members.filter(m => `${m.first_name} ${m.last_name} ${m.email} ${m.phone}`.toLowerCase().includes(q))
  }, [members, search])

  const selectedMember = useMemo(() => {
    if (!selectedId) return null
    return members.find(m => String(m.id) === String(selectedId)) ?? null
  }, [members, selectedId])

  function openCreate() {
    setCreateForm(emptyForm())
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
      await lyloApi.createTeamMember({ first_name, last_name, email, phone: createForm.phone.trim() })
      setIsCreateOpen(false)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  function openEdit(member: LyloTeamMember) {
    setSelectedId(String(member.id))
    setEditForm({ first_name: member.first_name, last_name: member.last_name, email: member.email, phone: member.phone })
    setIsEditOpen(true)
  }

  async function submitEdit() {
    if (!selectedMember) return
    setError(null)
    setIsBusy(true)
    try {
      const patch: Record<string, string> = {}
      if (editForm.first_name !== selectedMember.first_name) patch.first_name = editForm.first_name
      if (editForm.last_name !== selectedMember.last_name) patch.last_name = editForm.last_name
      if (editForm.email !== selectedMember.email) patch.email = editForm.email
      if (editForm.phone !== selectedMember.phone) patch.phone = editForm.phone
      if (Object.keys(patch).length > 0) await lyloApi.updateTeamMember(selectedMember.id, patch)
      setIsEditOpen(false)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  async function deleteSelected() {
    if (!selectedMember) return
    if (!window.confirm(`Supprimer ${selectedMember.first_name} ${selectedMember.last_name} ?`)) return
    setError(null)
    setIsBusy(true)
    try {
      await lyloApi.deleteTeamMember(selectedMember.id)
      setIsEditOpen(false)
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
            <h2 className="text-xl font-semibold text-gray-900">Équipe</h2>
            <p className="mt-1 text-sm text-gray-500">Gère les membres de ton équipe.</p>
          </div>
          <div className="flex w-full md:w-auto">
            <Button variant="primary" type="button" onClick={openCreate} className="w-full md:w-auto">
              <span className="material-symbols-outlined text-[18px]">group_add</span>
              Ajouter un membre
            </Button>
          </div>
        </div>
        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50/30 p-3 text-sm text-red-700">{error}</div>}
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
        <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50/20 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-semibold text-gray-900">
            Membres <span className="text-gray-600">({filtered.length})</span>
          </div>
          <div className="w-full md:w-96">
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher (nom, email, téléphone)" aria-label="Rechercher" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/40">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Prénom</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Téléphone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map(m => (
                <tr key={String(m.id)} className="cursor-pointer transition-colors hover:bg-gray-100/60" onClick={() => openEdit(m)}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{m.last_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{m.first_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{m.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{m.phone || '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td className="px-6 py-10 text-center text-sm text-gray-600" colSpan={4}>
                    {isBusy ? 'Chargement...' : "Aucun membre trouvé."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Modal open={isCreateOpen} title="Ajouter un membre" onClose={() => setIsCreateOpen(false)} maxWidthClassName="max-w-xl"
        footer={
          <>
            <Button type="button" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
            <Button variant="primary" type="button" onClick={submitCreate} disabled={isBusy || !createForm.first_name.trim() || !createForm.last_name.trim() || !createForm.email.trim()}>Ajouter</Button>
          </>
        }>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label>Prénom</Label><Input value={createForm.first_name} onChange={e => setCreateForm(s => ({ ...s, first_name: e.target.value }))} placeholder="Prénom" /></div>
          <div className="space-y-2"><Label>Nom</Label><Input value={createForm.last_name} onChange={e => setCreateForm(s => ({ ...s, last_name: e.target.value }))} placeholder="Nom" /></div>
          <div className="space-y-2 md:col-span-2"><Label>Email</Label><Input type="email" value={createForm.email} onChange={e => setCreateForm(s => ({ ...s, email: e.target.value }))} placeholder="email@exemple.com" /></div>
          <div className="space-y-2 md:col-span-2"><Label>Téléphone</Label><Input value={createForm.phone} onChange={e => setCreateForm(s => ({ ...s, phone: e.target.value }))} placeholder="06 00 00 00 00" /></div>
        </div>
      </Modal>
      <Modal open={isEditOpen && !!selectedMember} title={selectedMember ? `Modifier — ${selectedMember.first_name} ${selectedMember.last_name}` : ''} onClose={() => setIsEditOpen(false)} maxWidthClassName="max-w-xl"
        footer={
          <>
            <Button variant="danger" type="button" onClick={deleteSelected}>Supprimer</Button>
            <div className="flex-1" />
            <Button type="button" onClick={() => setIsEditOpen(false)}>Annuler</Button>
            <Button variant="primary" type="button" onClick={submitEdit}>Enregistrer</Button>
          </>
        }>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label>Prénom</Label><Input value={editForm.first_name} onChange={e => setEditForm(s => ({ ...s, first_name: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Nom</Label><Input value={editForm.last_name} onChange={e => setEditForm(s => ({ ...s, last_name: e.target.value }))} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Email</Label><Input type="email" value={editForm.email} onChange={e => setEditForm(s => ({ ...s, email: e.target.value }))} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Téléphone</Label><Input value={editForm.phone} onChange={e => setEditForm(s => ({ ...s, phone: e.target.value }))} /></div>
        </div>
      </Modal>
    </div>
  )
}
