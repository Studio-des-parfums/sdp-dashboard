import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'
import { messagesClient, type CallAccess, type Conversation, type ConversationTarget, type Message, type MessageGroup } from '../api/messagesClient'

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '')

/** Événement window émis à chaque notification temps réel du serveur sdp-dashboard. */
export const SDP_NOTIFICATION_EVENT = 'sdp:notification'
/** Événement window émis quand un message est supprimé (detail : { id, sender_id, group_id }). */
export const MESSAGE_DELETED_EVENT = 'sdp:message-deleted'
/** Un participant a modifié, accepté ou refusé une tâche de réunion (detail : { message_id }). */
export const MEETING_TASKS_UPDATED_EVENT = 'sdp:meeting-tasks-updated'
/** Génération du résumé d'un appel (detail : { callUrl } ; ready : { callUrl, message } ; failed : { callUrl, error }). */
export const SUMMARY_PENDING_EVENT = 'sdp:summary-pending'
export const SUMMARY_READY_EVENT = 'sdp:summary-ready'
export const SUMMARY_FAILED_EVENT = 'sdp:summary-failed'

/** Clé stable d'une conversation (handlers, comparaisons). */
export function targetKey(target: ConversationTarget): string {
  return `${target.kind}:${target.id}`
}

/** Conversation à laquelle appartient un message reçu : son groupe, sinon son expéditeur. */
export function messageTarget(message: Message): ConversationTarget {
  return message.group_id ? { kind: 'group', id: message.group_id } : { kind: 'user', id: message.sender_id }
}

interface IncomingToast {
  id: number
  message: Message
}

interface MessagingContextType {
  conversations: Conversation[]
  groups: MessageGroup[]
  unreadCount: number
  panelOpen: boolean
  activeTarget: ConversationTarget | null
  toasts: IncomingToast[]
  openPanel: () => void
  closePanel: () => void
  openConversation: (target: ConversationTarget) => void
  closeConversation: () => void
  /** Messages de cette conversation traités (toast fermé, réponse, conversation ouverte) : marqués lus, toasts retirés. */
  acknowledge: (target: ConversationTarget) => void
  refreshConversations: () => void
  registerMessageHandler: (target: ConversationTarget, handler: (msg: Message) => void) => () => void
  /** Appel visio en cours (fenêtre Daily ouverte par-dessus SDP). */
  activeCall: CallAccess | null
  openCall: (call: CallAccess) => void
  closeCall: () => void
}

const MessagingContext = createContext<MessagingContextType | null>(null)

export const useMessaging = () => {
  const ctx = useContext(MessagingContext)
  if (!ctx) throw new Error('useMessaging must be used inside MessagingProvider')
  return ctx
}

export const MessagingProvider = ({ children }: { children: ReactNode }) => {
  const { sdpUser, isAuthenticated } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [groups, setGroups] = useState<MessageGroup[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [panelOpen, setPanelOpen] = useState(false)
  const [activeTarget, setActiveTarget] = useState<ConversationTarget | null>(null)
  const [toasts, setToasts] = useState<IncomingToast[]>([])
  const [activeCall, setActiveCall] = useState<CallAccess | null>(null)
  const openCall = useCallback((call: CallAccess) => setActiveCall(call), [])
  const closeCall = useCallback(() => setActiveCall(null), [])
  const socketRef = useRef<Socket | null>(null)
  const activeKeyRef = useRef<string | null>(null)
  const handlersRef = useRef<Map<string, Set<(msg: Message) => void>>>(new Map())

  useEffect(() => {
    activeKeyRef.current = activeTarget ? targetKey(activeTarget) : null
  }, [activeTarget])

  const refreshConversations = useCallback(() => {
    messagesClient.getConversations().then(setConversations).catch(() => {})
    messagesClient.getGroups().then(setGroups).catch(() => {})
    messagesClient.getUnreadCount().then(({ count }) => setUnreadCount(count)).catch(() => {})
  }, [])

  const removeToasts = useCallback((target: ConversationTarget) => {
    const key = targetKey(target)
    setToasts((prev) => prev.filter((t) => targetKey(messageTarget(t.message)) !== key))
  }, [])

  const openPanel = useCallback(() => setPanelOpen(true), [])
  const closePanel = useCallback(() => {
    setPanelOpen(false)
    setActiveTarget(null)
  }, [])
  const openConversation = useCallback((target: ConversationTarget) => {
    setPanelOpen(true)
    setActiveTarget(target)
    // La conversation ouverte marque ses messages comme lus (ConversationThread) : ses toasts n'ont plus lieu d'être.
    removeToasts(target)
  }, [removeToasts])
  const closeConversation = useCallback(() => setActiveTarget(null), [])
  const acknowledge = useCallback((target: ConversationTarget) => {
    removeToasts(target)
    messagesClient.markAsRead(target).then(refreshConversations).catch(() => {})
  }, [removeToasts, refreshConversations])

  const registerMessageHandler = useCallback((target: ConversationTarget, handler: (msg: Message) => void) => {
    const key = targetKey(target)
    if (!handlersRef.current.has(key)) handlersRef.current.set(key, new Set())
    handlersRef.current.get(key)!.add(handler)
    return () => {
      handlersRef.current.get(key)?.delete(handler)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !sdpUser?.email) {
      socketRef.current?.disconnect()
      socketRef.current = null
      return
    }

    refreshConversations()

    const socket = io(SOCKET_URL, {
      auth: { email: sdpUser.email },
    })
    socketRef.current = socket

    // Notifications de la cloche (tickets) : relayées à NotificationsButton. Les messages n'y
    // passent pas — seule la pastille de la messagerie les signale.
    socket.on('notification', () => window.dispatchEvent(new Event(SDP_NOTIFICATION_EVENT)))

    socket.on('message_deleted', (payload: { id: number; sender_id: number; group_id: number | null }) => {
      refreshConversations()
      setToasts((prev) => prev.filter((t) => t.message.id !== payload.id))
      window.dispatchEvent(new CustomEvent(MESSAGE_DELETED_EVENT, { detail: payload }))
    })

    socket.on('meeting_tasks_updated', (payload: { message_id: number }) =>
      window.dispatchEvent(new CustomEvent(MEETING_TASKS_UPDATED_EVENT, { detail: payload })))

    // Groupe créé, participant ajouté, propriétaire changé : on recharge la liste.
    socket.on('group_updated', () => refreshConversations())
    socket.on('group_deleted', ({ group_id }: { group_id: number }) => {
      refreshConversations()
      const target: ConversationTarget = { kind: 'group', id: group_id }
      removeToasts(target)
      setActiveTarget((current) => (current && targetKey(current) === targetKey(target) ? null : current))
    })

    socket.on('new_message', (message: Message) => {
      refreshConversations()

      const key = targetKey(messageTarget(message))
      handlersRef.current.get(key)?.forEach((h) => h(message))

      // N'affiche le toast flottant que si la discussion correspondante n'est pas déjà ouverte à l'écran.
      if (activeKeyRef.current !== key) {
        setToasts((prev) => [...prev, { id: Date.now(), message }])
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [isAuthenticated, sdpUser?.email, refreshConversations, removeToasts])

  return (
    <MessagingContext.Provider
      value={{
        conversations,
        groups,
        unreadCount,
        panelOpen,
        activeTarget,
        toasts,
        openPanel,
        closePanel,
        openConversation,
        closeConversation,
        acknowledge,
        refreshConversations,
        registerMessageHandler,
        activeCall,
        openCall,
        closeCall,
      }}
    >
      {children}
    </MessagingContext.Provider>
  )
}
