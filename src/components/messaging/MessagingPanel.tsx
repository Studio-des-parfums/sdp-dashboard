import { useState } from 'react'
import { useMessaging } from '../../contexts/MessagingContext'
import { ConversationList } from './ConversationList'
import { ConversationThread } from './ConversationThread'

export function MessagingPanel() {
  const { panelOpen, activeConversationUserId, closePanel, openConversation, closeConversation, conversations } = useMessaging()
  const [pendingName, setPendingName] = useState<string | null>(null)

  if (!panelOpen) return null

  const activeConversation = conversations.find((c) => c.user_id === activeConversationUserId)
  const activeName = pendingName ?? (activeConversation ? `${activeConversation.first_name} ${activeConversation.last_name}` : '')

  const handleSelect = (userId: number, name: string) => {
    setPendingName(name)
    openConversation(userId)
  }

  const handleBack = () => {
    setPendingName(null)
    closeConversation()
  }

  const handleClosePanel = () => {
    setPendingName(null)
    closePanel()
  }

  return (
    <>
      {/* Overlay léger pour capter le clic à l'extérieur et tout refermer */}
      <div className="fixed inset-0 z-40" onClick={handleClosePanel} />
      <div
        className={`fixed top-0 right-0 h-full z-50 flex bg-white border-l border-gray-200 shadow-2xl transition-all duration-200 ${
          activeConversationUserId ? 'w-[640px]' : 'w-[340px]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-[340px] shrink-0 border-r border-gray-200 h-full">
          <ConversationList onSelect={handleSelect} onClose={handleClosePanel} />
        </div>
        {activeConversationUserId && (
          <div className="flex-1 h-full min-w-0">
            <ConversationThread
              userId={activeConversationUserId}
              name={activeName || '...'}
              onBack={handleBack}
            />
          </div>
        )}
      </div>
    </>
  )
}
