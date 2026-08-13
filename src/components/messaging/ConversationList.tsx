import { useEffect, useState } from 'react'
import { X, Search } from 'lucide-react'
import { useMessaging } from '../../contexts/MessagingContext'
import { messagesClient, type Contact } from '../../api/messagesClient'

interface ConversationListProps {
  onSelect: (userId: number, name: string) => void
  onClose: () => void
}

function initials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
}

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.floor(hours / 24)
  return `${days} j`
}

export function ConversationList({ onSelect, onClose }: ConversationListProps) {
  const { conversations, refreshConversations } = useMessaging()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    refreshConversations()
    messagesClient.getContacts().then(setContacts).catch(() => {})
  }, [refreshConversations])

  const query = search.trim().toLowerCase()
  const isSearching = query.length > 0

  // En recherche : tous les contacts correspondants, avec les infos de
  // conversation (dernier message, non-lus) fusionnées quand elles existent.
  const searchResults = isSearching
    ? contacts
        .filter((c) => `${c.first_name} ${c.last_name}`.toLowerCase().includes(query))
        .map((c) => {
          const conv = conversations.find((conv) => conv.user_id === c.id)
          return { contact: c, conversation: conv ?? null }
        })
    : []

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 flex items-center gap-2 px-4 border-b border-gray-200 shrink-0">
        <span className="font-semibold text-sm text-gray-900 flex-1">Messagerie</span>
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-gray-900 transition-colors"
          aria-label="Fermer la messagerie"
        >
          <X size={18} />
        </button>
      </div>

      <div className="px-4 py-2 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5">
          <Search size={14} className="text-gray-600 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un collègue..."
            className="bg-transparent text-sm outline-none flex-1 min-w-0"
          />
        </div>
      </div>

      {isSearching ? (
        <div className="flex-1 overflow-y-auto py-1">
          {searchResults.map(({ contact: c, conversation: conv }) => (
            <button
              key={c.id}
              onClick={() => { onSelect(c.id, `${c.first_name} ${c.last_name}`); setSearch('') }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 transition-colors text-left"
            >
              <span className="w-9 h-9 rounded-full bg-indigo-600/10 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0">
                {initials(c.first_name, c.last_name)}
              </span>
              <div className="min-w-0 flex-1">
                <span className={`text-sm truncate block ${conv && conv.unread_count > 0 ? 'font-semibold text-gray-900' : 'text-gray-900'}`}>
                  {c.first_name} {c.last_name}
                </span>
                {conv && (
                  <p className={`text-xs truncate ${conv.unread_count > 0 ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                    {conv.last_message}
                  </p>
                )}
              </div>
              {conv && conv.unread_count > 0 && (
                <span className="shrink-0 bg-indigo-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {conv.unread_count > 99 ? '99+' : conv.unread_count}
                </span>
              )}
            </button>
          ))}
          {searchResults.length === 0 && (
            <p className="text-xs text-gray-600 text-center py-8">Aucun résultat</p>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto py-1">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-6">
              <p className="text-sm text-gray-900 font-medium">Aucune discussion</p>
              <p className="text-xs text-gray-600">Recherchez un collègue ci-dessus pour démarrer une discussion.</p>
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.user_id}
                onClick={() => onSelect(c.user_id, `${c.first_name} ${c.last_name}`)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 transition-colors text-left"
              >
                <span className="w-9 h-9 rounded-full bg-indigo-600/10 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0">
                  {initials(c.first_name, c.last_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm truncate ${c.unread_count > 0 ? 'font-semibold text-gray-900' : 'text-gray-900'}`}>
                      {c.first_name} {c.last_name}
                    </span>
                    <span className="text-[10px] text-gray-600 shrink-0">{relativeTime(c.last_message_at)}</span>
                  </div>
                  <p className={`text-xs truncate ${c.unread_count > 0 ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                    {c.last_message}
                  </p>
                </div>
                {c.unread_count > 0 && (
                  <span className="shrink-0 bg-indigo-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {c.unread_count > 99 ? '99+' : c.unread_count}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
