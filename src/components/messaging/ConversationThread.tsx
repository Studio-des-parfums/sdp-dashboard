import { useEffect, useRef, useState, useCallback } from 'react'
import { ArrowLeft, Send } from 'lucide-react'
import { messagesClient, type Message } from '../../api/messagesClient'
import { useMessaging } from '../../contexts/MessagingContext'
import { useAuth } from '../../contexts/AuthContext'

interface ConversationThreadProps {
  userId: number
  name: string
  onBack: () => void
  initialContent?: string
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function ConversationThread({ userId, name, onBack, initialContent }: ConversationThreadProps) {
  const { sdpUser } = useAuth()
  const { registerMessageHandler, refreshConversations } = useMessaging()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState(initialContent ?? '')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setLoading(true)
    messagesClient.getHistory(userId)
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoading(false))
    messagesClient.markAsRead(userId).then(refreshConversations).catch(() => {})
  }, [userId, refreshConversations])

  useEffect(() => {
    const unregister = registerMessageHandler(userId, (msg) => {
      setMessages((prev) => [...prev, msg])
      messagesClient.markAsRead(userId).then(refreshConversations).catch(() => {})
    })
    return unregister
  }, [userId, registerMessageHandler, refreshConversations])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useCallback(async () => {
    const content = draft.trim()
    if (!content || sending) return
    setSending(true)
    setDraft('')
    try {
      const message = await messagesClient.sendMessage(userId, content)
      setMessages((prev) => [...prev, message])
      refreshConversations()
    } catch {
      setDraft(content)
    } finally {
      setSending(false)
    }
  }, [draft, sending, userId, refreshConversations])

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 flex items-center gap-3 px-4 border-b border-gray-200 shrink-0">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900 transition-colors"
          aria-label="Retour aux discussions"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="font-semibold text-sm text-gray-900 truncate">{name}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-gray-200 rounded-lg animate-pulse w-2/3" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-8">Aucun message pour l'instant. Dites bonjour !</p>
        ) : (
          messages.map((m) => {
            const isMine = m.sender_id === sdpUser?.id
            return (
              <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${isMine ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-900'}`}>
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? 'text-indigo-100' : 'text-gray-600'}`}>{formatTime(m.created_at)}</p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-gray-200 shrink-0 flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Écrire un message..."
          className="flex-1 bg-gray-100 border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-indigo-400"
        />
        <button
          onClick={send}
          disabled={!draft.trim() || sending}
          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-indigo-600 text-white disabled:opacity-40 hover:bg-indigo-500 transition-colors"
          aria-label="Envoyer"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}
