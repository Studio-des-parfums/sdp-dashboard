import { MessageCircle } from 'lucide-react'
import { useMessaging } from '../../contexts/MessagingContext'

export function MessagingButton() {
  const { unreadCount, openPanel, panelOpen, closePanel } = useMessaging()

  return (
    <button
      onClick={() => (panelOpen ? closePanel() : openPanel())}
      className={`relative text-gray-600 hover:text-gray-900 transition-colors ${panelOpen ? 'text-indigo-600' : ''}`}
      title="Messagerie"
      aria-label="Messagerie"
    >
      <MessageCircle size={16} />
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}
