import { useEffect, useMemo, useState } from 'react'
import { Crown, Search, Trash2, UserPlus, X } from 'lucide-react'
import { messagesClient, type Contact, type MessageGroup } from '../../api/messagesClient'
import { useMessaging } from '../../contexts/MessagingContext'
import { useAuth } from '../../contexts/AuthContext'

interface GroupSettingsProps {
  group: MessageGroup
  onClose: () => void
  onDeleted: () => void
}

// Gestion d'un groupe : participants, et pour le propriétaire uniquement ajout de participants,
// transfert de la propriété et suppression du groupe.
export function GroupSettings({ group, onClose, onDeleted }: GroupSettingsProps) {
  const { sdpUser } = useAuth()
  const { refreshConversations } = useMessaging()
  const isOwner = group.owner_id === sdpUser?.id
  const [contacts, setContacts] = useState<Contact[]>([])
  const [adding, setAdding] = useState(false)
  const [selected, setSelected] = useState<number[]>([])
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState<{ kind: 'transfer'; userId: number } | { kind: 'delete' } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (adding && contacts.length === 0) messagesClient.getContacts().then(setContacts).catch(() => {})
  }, [adding, contacts.length])

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase()
    return contacts
      .filter((c) => !group.members.some((m) => m.id === c.id))
      .filter((c) => !q || `${c.first_name} ${c.last_name}`.toLowerCase().includes(q))
      .sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`))
  }, [contacts, group.members, search])

  async function run(action: () => Promise<unknown>, after?: () => void) {
    setBusy(true)
    setError(null)
    try {
      await action()
      refreshConversations()
      after?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible')
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  return (
    <div className="max-h-[60%] shrink-0 overflow-y-auto border-b border-gray-200 bg-white px-4 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">Participants ({group.members.length})</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Fermer la gestion du groupe">
          <X size={16} />
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="space-y-1">
        {group.members.map((m) => {
          const memberIsOwner = m.id === group.owner_id
          const confirmingTransfer = confirm?.kind === 'transfer' && confirm.userId === m.id
          return (
            <div key={m.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50">
              <span className="w-7 h-7 shrink-0 rounded-full bg-indigo-600/10 text-indigo-600 text-[10px] font-bold flex items-center justify-center">
                {`${m.first_name[0] ?? ''}${m.last_name[0] ?? ''}`.toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-gray-900">
                {m.id === sdpUser?.id ? 'Moi' : `${m.first_name} ${m.last_name}`}
              </span>
              {memberIsOwner && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  <Crown size={11} /> Propriétaire
                </span>
              )}
              {isOwner && !memberIsOwner && (
                confirmingTransfer ? (
                  <span className="flex items-center gap-1">
                    <button
                      onClick={() => run(() => messagesClient.transferGroupOwnership(group.id, m.id))}
                      disabled={busy}
                      className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                    >
                      Confirmer
                    </button>
                    <button onClick={() => setConfirm(null)} className="text-gray-400 hover:text-gray-700" aria-label="Annuler"><X size={13} /></button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirm({ kind: 'transfer', userId: m.id })}
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium text-gray-500 hover:bg-amber-50 hover:text-amber-700"
                    title="Lui transférer la propriété du groupe"
                  >
                    Passer le lead
                  </button>
                )
              )}
            </div>
          )
        })}
      </div>

      {isOwner && (
        <>
          {adding ? (
            <div className="space-y-2 rounded-lg border border-gray-200 p-2">
              <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-2.5 py-1.5">
                <Search size={13} className="shrink-0 text-gray-500" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un collègue..."
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </div>
              <div className="max-h-40 overflow-y-auto">
                {candidates.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selected.includes(c.id)}
                      onChange={() => setSelected((s) => (s.includes(c.id) ? s.filter((id) => id !== c.id) : [...s, c.id]))}
                    />
                    {c.first_name} {c.last_name}
                  </label>
                ))}
                {candidates.length === 0 && <p className="px-2 py-2 text-xs text-gray-500">Aucun collègue à ajouter</p>}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => { setAdding(false); setSelected([]) }} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-900">Annuler</button>
                <button
                  onClick={() => run(() => messagesClient.addGroupMembers(group.id, selected), () => { setAdding(false); setSelected([]) })}
                  disabled={busy || selected.length === 0}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
                >
                  Ajouter{selected.length > 0 ? ` (${selected.length})` : ''}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500">
              <UserPlus size={15} /> Ajouter des participants
            </button>
          )}

          {confirm?.kind === 'delete' ? (
            <div className="space-y-2 rounded-lg bg-red-50 p-3">
              <p className="text-xs text-red-700">Supprimer « {group.name} » efface définitivement tous ses messages et fichiers, pour tous les participants.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => run(() => messagesClient.deleteGroup(group.id), onDeleted)}
                  disabled={busy}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
                >
                  Supprimer le groupe
                </button>
                <button onClick={() => setConfirm(null)} className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900">Annuler</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirm({ kind: 'delete' })} className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-500">
              <Trash2 size={15} /> Supprimer le groupe
            </button>
          )}
        </>
      )}
    </div>
  )
}
