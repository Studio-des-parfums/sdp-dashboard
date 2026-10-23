import { useState } from 'react'
import { useMessaging } from '../../contexts/MessagingContext'
import type { ConversationTarget } from '../../api/messagesClient'
import { ConversationList } from './ConversationList'
import { ConversationThread } from './ConversationThread'

export function MessagingPanel() {
  const { panelOpen, activeTarget, closePanel, openConversation, closeConversation, conversations, groups } = useMessaging()
  const [pendingName, setPendingName] = useState<string | null>(null)

  if (!panelOpen) return null

  const activeName = (() => {
    if (!activeTarget) return ''
    if (activeTarget.kind === 'group') return groups.find((g) => g.id === activeTarget.id)?.name ?? pendingName ?? ''
    const conversation = conversations.find((c) => c.user_id === activeTarget.id)
    return pendingName ?? (conversation ? `${conversation.first_name} ${conversation.last_name}` : '')
  })()

  const handleSelect = (target: ConversationTarget, name: string) => {
    setPendingName(name)
    openConversation(target)
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
        className={`fixed top-0 right-0 h-full z-50 flex bg-white border-l border-gray-200 shadow-2xl transition-all duration-200 max-w-full ${
          activeTarget ? 'w-full sm:w-[640px] md:w-[780px] lg:w-[960px]' : 'w-full sm:w-[340px]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${activeTarget ? 'hidden sm:block sm:w-[300px]' : 'w-full sm:w-[340px]'} shrink-0 border-r border-gray-200 h-full`}>
          <ConversationList
            onSelect={(userId, name) => handleSelect({ kind: 'user', id: userId }, name)}
            onSelectGroup={(groupId, name) => handleSelect({ kind: 'group', id: groupId }, name)}
            onClose={handleClosePanel}
          />
        </div>
        {activeTarget && (
          <div className="flex-1 h-full min-w-0 w-full">
            <ConversationThread
              key={`${activeTarget.kind}:${activeTarget.id}`}
              target={activeTarget}
              name={activeName || '...'}
              onBack={handleBack}
            />
          </div>
        )}
      </div>
    </>
  )
}
