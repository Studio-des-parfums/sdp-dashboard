import { useState } from 'react'
import { X, Send, MessageCircle } from 'lucide-react'
import { useMessaging, messageTarget } from '../../contexts/MessagingContext'
import { messagesClient, type ConversationTarget } from '../../api/messagesClient'

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return parts.map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

function ToastItem({ target, title, content }: { target: ConversationTarget; title: string; content: string }) {
  const { acknowledge, openConversation } = useMessaging()
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  const sendReply = async () => {
    const text = reply.trim()
    if (!text || sending) return
    setSending(true)
    try {
      await messagesClient.sendMessage(target, text)
      acknowledge(target)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="w-80 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
      <div className="flex items-start gap-2.5 px-3 pt-3 pb-2">
        <span className="w-9 h-9 rounded-full bg-indigo-600/10 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0">
          {initials(title)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
          <p className="text-xs text-gray-600 line-clamp-2">{content}</p>
        </div>
        <button
          onClick={() => acknowledge(target)}
          className="text-gray-600 hover:text-gray-900 transition-colors shrink-0"
          aria-label="Fermer la notification"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex items-center gap-2 px-3 pb-3">
        <input
          autoFocus
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') sendReply() }}
          placeholder="Répondre..."
          className="flex-1 bg-gray-100 border border-gray-200 rounded-full px-3 py-1.5 text-xs outline-none focus:border-indigo-400 min-w-0"
        />
        <button
          onClick={sendReply}
          disabled={!reply.trim() || sending}
          className="w-7 h-7 shrink-0 flex items-center justify-center rounded-full bg-indigo-600 text-white disabled:opacity-40 hover:bg-indigo-500 transition-colors"
          aria-label="Envoyer la réponse"
        >
          <Send size={12} />
        </button>
        <button
          onClick={() => openConversation(target)}
          className="w-7 h-7 shrink-0 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
          aria-label="Ouvrir la discussion"
          title="Ouvrir la discussion"
        >
          <MessageCircle size={13} />
        </button>
      </div>
    </div>
  )
}

export function MessageToastStack() {
  const { toasts, groups } = useMessaging()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col-reverse gap-2">
      {toasts.map((t) => {
        const sender = `${t.message.sender_first_name ?? ''} ${t.message.sender_last_name ?? ''}`.trim() || 'Nouveau message'
        const group = t.message.group_id ? groups.find((g) => g.id === t.message.group_id) : null
        return (
          <ToastItem
            key={t.id}
            target={messageTarget(t.message)}
            title={group ? `${group.name} · ${t.message.sender_first_name ?? sender}` : sender}
            content={t.message.content}
          />
        )
      })}
    </div>
  )
}
