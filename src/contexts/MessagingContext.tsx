import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'
import { messagesClient, type Conversation, type Message } from '../api/messagesClient'

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '')

/** Événement window émis à chaque notification temps réel du serveur sdp-dashboard. */
export const SDP_NOTIFICATION_EVENT = 'sdp:notification'

interface IncomingToast {
  id: number
  message: Message
}

interface MessagingContextType {
  conversations: Conversation[]
  unreadCount: number
  panelOpen: boolean
  activeConversationUserId: number | null
  toasts: IncomingToast[]
  openPanel: () => void
  closePanel: () => void
  openConversation: (userId: number) => void
  closeConversation: () => void
  /** Messages de cet expéditeur traités (toast fermé, réponse, conversation ouverte) : marqués lus, toasts retirés. */
  acknowledgeSender: (senderId: number) => void
  refreshConversations: () => void
  registerMessageHandler: (userId: number, handler: (msg: Message) => void) => () => void
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
  const [unreadCount, setUnreadCount] = useState(0)
  const [panelOpen, setPanelOpen] = useState(false)
  const [activeConversationUserId, setActiveConversationUserId] = useState<number | null>(null)
  const [toasts, setToasts] = useState<IncomingToast[]>([])
  const socketRef = useRef<Socket | null>(null)
  const handlersRef = useRef<Map<number, Set<(msg: Message) => void>>>(new Map())

  const refreshConversations = useCallback(() => {
    messagesClient.getConversations().then(setConversations).catch(() => {})
    messagesClient.getUnreadCount().then(({ count }) => setUnreadCount(count)).catch(() => {})
  }, [])

  const openPanel = useCallback(() => setPanelOpen(true), [])
  const closePanel = useCallback(() => {
    setPanelOpen(false)
    setActiveConversationUserId(null)
  }, [])
  const openConversation = useCallback((userId: number) => {
    setPanelOpen(true)
    setActiveConversationUserId(userId)
    // La conversation ouverte marque ses messages comme lus (ConversationThread) : ses toasts n'ont plus lieu d'être.
    setToasts((prev) => prev.filter((t) => t.message.sender_id !== userId))
  }, [])
  const closeConversation = useCallback(() => setActiveConversationUserId(null), [])
  const acknowledgeSender = useCallback((senderId: number) => {
    setToasts((prev) => prev.filter((t) => t.message.sender_id !== senderId))
    messagesClient.markAsRead(senderId).then(refreshConversations).catch(() => {})
  }, [refreshConversations])

  const registerMessageHandler = useCallback((userId: number, handler: (msg: Message) => void) => {
    if (!handlersRef.current.has(userId)) handlersRef.current.set(userId, new Set())
    handlersRef.current.get(userId)!.add(handler)
    return () => {
      handlersRef.current.get(userId)?.delete(handler)
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

    socket.on('new_message', (message: Message) => {
      refreshConversations()

      const otherId = message.sender_id
      const specificHandlers = handlersRef.current.get(otherId)
      if (specificHandlers) {
        specificHandlers.forEach((h) => h(message))
      }

      // N'affiche le toast flottant que si la discussion correspondante
      // n'est pas déjà ouverte à l'écran.
      setActiveConversationUserId((current) => {
        if (current !== otherId) {
          setToasts((prev) => [...prev, { id: Date.now(), message }])
        }
        return current
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [isAuthenticated, sdpUser?.email, refreshConversations])

  return (
    <MessagingContext.Provider
      value={{
        conversations,
        unreadCount,
        panelOpen,
        activeConversationUserId,
        toasts,
        openPanel,
        closePanel,
        openConversation,
        closeConversation,
        acknowledgeSender,
        refreshConversations,
        registerMessageHandler,
      }}
    >
      {children}
    </MessagingContext.Provider>
  )
}
