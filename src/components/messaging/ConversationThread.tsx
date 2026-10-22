import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { ArrowLeft, FileText, Mic, Paperclip, Send, Settings, Square, Trash2, X } from 'lucide-react'
import { messagesClient, type ConversationTarget, type Message } from '../../api/messagesClient'
import { useMessaging, MESSAGE_DELETED_EVENT, targetKey } from '../../contexts/MessagingContext'
import { GroupSettings } from './GroupSettings'
import { useAuth } from '../../contexts/AuthContext'
import { useVoiceRecorder, type VoiceRecording } from './useVoiceRecorder'
import { VoiceMessagePlayer, formatDuration } from './VoiceMessagePlayer'
import { AttachmentViewer, type ViewableFile } from '../polux/AttachmentViewer'

interface ConversationThreadProps {
  target: ConversationTarget
  name: string
  onBack: () => void
  initialContent?: string
}

interface VoicePreview extends VoiceRecording {
  url: string
}

interface PendingFile {
  file: File
  /** URL locale de la miniature (images uniquement). */
  previewUrl: string | null
}

const MAX_FILE_SIZE = 20 * 1024 * 1024

function isAllowedFile(file: File) {
  return file.type.startsWith('image/') || file.type === 'application/pdf'
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
}

/** La légende n'est affichée que si l'utilisateur en a saisi une (sinon content = libellé automatique). */
function captionOf(m: Message): string | null {
  if (!m.attachment) return m.content
  const autoLabel = m.attachment.type.startsWith('image/') ? '📷 Image' : `📄 ${m.attachment.name}`
  return m.content === autoLabel ? null : m.content
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function dayLabel(iso: string) {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (date.toDateString() === yesterday.toDateString()) return 'Hier'
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function initials(name: string) {
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

const ROUND_BUTTON = 'w-10 h-10 shrink-0 flex items-center justify-center rounded-full transition-colors'

export function ConversationThread({ target, name, onBack, initialContent }: ConversationThreadProps) {
  const { sdpUser } = useAuth()
  const { registerMessageHandler, refreshConversations, groups, closeConversation } = useMessaging()
  const key = targetKey(target)
  const isGroup = target.kind === 'group'
  const group = isGroup ? groups.find((g) => g.id === target.id) ?? null : null
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState(initialContent ?? '')
  const [sending, setSending] = useState(false)
  const [preview, setPreview] = useState<VoicePreview | null>(null)
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const recorder = useVoiceRecorder()

  // target est recréé à chaque rendu du parent : les effets dépendent de sa clé stable.
  useEffect(() => {
    setLoading(true)
    setSettingsOpen(false)
    messagesClient.getHistory(target)
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoading(false))
    messagesClient.markAsRead(target).then(refreshConversations).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, refreshConversations])

  useEffect(() => {
    const unregister = registerMessageHandler(target, (msg) => {
      setMessages((prev) => [...prev, msg])
      messagesClient.markAsRead(target).then(refreshConversations).catch(() => {})
    })
    return unregister
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, registerMessageHandler, refreshConversations])

  // Un message de cette conversation a été supprimé par son auteur : on le retire de l'affichage.
  useEffect(() => {
    const onDeleted = (e: Event) => {
      const { id, sender_id, group_id } = (e as CustomEvent<{ id: number; sender_id: number; group_id: number | null }>).detail
      const concerned = target.kind === 'group' ? group_id === target.id : !group_id && sender_id === target.id
      if (concerned) setMessages((prev) => prev.filter((m) => m.id !== id))
    }
    window.addEventListener(MESSAGE_DELETED_EVENT, onDeleted)
    return () => window.removeEventListener(MESSAGE_DELETED_EVENT, onDeleted)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Mes messages supprimables : ceux envoyés après la dernière réponse de quelqu'un d'autre.
  const lastReplyIndex = messages.reduce((last, m, i) => (m.sender_id !== sdpUser?.id ? i : last), -1)

  async function deleteMessage(messageId: number) {
    setConfirmDeleteId(null)
    const previous = messages
    setMessages((prev) => prev.filter((m) => m.id !== messageId))
    try {
      await messagesClient.deleteMessage(messageId)
      refreshConversations()
    } catch {
      setMessages(previous)
    }
  }

  // Les URL locales (aperçu vocal, miniature) sont libérées dès qu'elles sont remplacées, envoyées ou supprimées.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url) }, [preview])
  useEffect(() => () => { if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl) }, [pendingFile])

  // Toutes les pièces jointes de la conversation, pour naviguer de l'une à l'autre dans la visionneuse.
  const files = useMemo(
    () => messages
      .filter((m) => m.attachment)
      .map((m): ViewableFile & { messageId: number } => ({
        messageId: m.id,
        filename: m.attachment!.name,
        url: m.attachment!.url,
        download_url: m.attachment!.download_url,
        content_type: m.attachment!.type,
      })),
    [messages]
  )

  function pickFile(file: File | undefined) {
    if (!file) return
    if (!isAllowedFile(file)) {
      setFileError('Seules les images et les PDF peuvent être envoyés.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError('Fichier trop volumineux (20 Mo maximum).')
      return
    }
    setFileError(null)
    setPendingFile({ file, previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null })
  }

  const send = useCallback(async () => {
    const content = draft.trim()
    if (sending || (!content && !pendingFile)) return
    setSending(true)
    setDraft('')
    try {
      const message = pendingFile
        ? await messagesClient.sendAttachment(target, pendingFile.file, content)
        : await messagesClient.sendMessage(target, content)
      setMessages((prev) => [...prev, message])
      setPendingFile(null)
      refreshConversations()
    } catch (err) {
      setDraft(content)
      if (pendingFile) setFileError(err instanceof Error ? err.message : "Échec de l'envoi du fichier")
    } finally {
      setSending(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, sending, pendingFile, key, refreshConversations])

  const sendRecording = useCallback(async (recording: VoiceRecording) => {
    setSending(true)
    try {
      const message = await messagesClient.sendVoiceMessage(target, recording.blob, recording.duration)
      setMessages((prev) => [...prev, message])
      setPreview(null)
      refreshConversations()
    } catch {
      // en cas d'échec, l'aperçu reste affiché pour pouvoir réessayer
    } finally {
      setSending(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, refreshConversations])

  /** Arrête l'enregistrement et passe en aperçu (réécoute avant envoi). */
  async function stopToPreview() {
    const recording = await recorder.stop()
    if (recording) setPreview({ ...recording, url: URL.createObjectURL(recording.blob) })
  }

  /** Envoi direct depuis l'enregistrement en cours. */
  async function stopAndSend() {
    const recording = await recorder.stop()
    if (recording) await sendRecording(recording)
  }

  let lastDay = ''

  return (
    <div className="flex flex-col h-full min-w-0 bg-gray-50">
      <div className="h-14 flex items-center gap-3 px-4 border-b border-gray-200 bg-white shrink-0">
        <button onClick={onBack} className="text-gray-600 hover:text-gray-900 transition-colors" aria-label="Retour aux discussions">
          <ArrowLeft size={18} />
        </button>
        <span className="w-8 h-8 shrink-0 rounded-full bg-indigo-600/10 text-indigo-600 text-xs font-bold flex items-center justify-center">
          {initials(name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-gray-900 truncate">{name}</p>
          {group && (
            <p className="text-[11px] text-gray-500 truncate">
              {group.members.length} participants · {group.members.map((m) => m.first_name).join(', ')}
            </p>
          )}
        </div>
        {group && (
          <button
            onClick={() => setSettingsOpen((o) => !o)}
            className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-full transition-colors ${settingsOpen ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
            aria-label="Gérer le groupe"
            title="Gérer le groupe"
          >
            <Settings size={16} />
          </button>
        )}
      </div>

      {group && settingsOpen && (
        <GroupSettings group={group} onClose={() => setSettingsOpen(false)} onDeleted={closeConversation} />
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-9 bg-gray-200 rounded-2xl animate-pulse w-2/3 ${i % 2 ? '' : 'ml-auto'}`} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-8">Aucun message pour l'instant. Dites bonjour !</p>
        ) : (
          <div className="space-y-1.5">
            {messages.map((m, index) => {
              const isMine = m.sender_id === sdpUser?.id
              const canDelete = isMine && index > lastReplyIndex
              const confirming = confirmDeleteId === m.id
              const showSender = isGroup && !isMine && messages[index - 1]?.sender_id !== m.sender_id
              const day = dayLabel(m.created_at)
              const showDay = day !== lastDay
              lastDay = day
              return (
                <div key={m.id}>
                  {showDay && (
                    <div className="flex justify-center py-2">
                      <span className="rounded-full bg-white px-3 py-0.5 text-[11px] font-medium text-gray-500 shadow-sm">{day}</span>
                    </div>
                  )}
                  {showSender && (
                    <p className="px-2 pt-1 text-[11px] font-semibold text-indigo-600">
                      {m.sender_first_name} {m.sender_last_name}
                    </p>
                  )}
                  <div className={`group flex items-center gap-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                    {canDelete && (
                      confirming ? (
                        <span className="flex shrink-0 items-center gap-1">
                          <button onClick={() => deleteMessage(m.id)} className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-red-500">
                            Supprimer
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-gray-400 hover:text-gray-700" aria-label="Annuler">
                            <X size={14} />
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(m.id)}
                          className="shrink-0 rounded-full p-1 text-gray-400 transition-opacity hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100"
                          aria-label="Supprimer le message"
                          title="Supprimer"
                        >
                          <Trash2 size={13} />
                        </button>
                      )
                    )}
                    <div
                      className={`min-w-0 rounded-2xl text-sm shadow-sm ${m.attachment ? 'p-1.5 w-[75%] max-w-[18rem]' : 'px-3 py-2'} ${m.audio_url ? 'w-[85%] max-w-[16rem]' : m.attachment ? '' : 'max-w-[80%]'} ${
                        isMine ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-white text-gray-900 rounded-bl-md'
                      }`}
                    >
                      {m.audio_url ? (
                        <VoiceMessagePlayer src={m.audio_url} duration={m.audio_duration ?? 0} isMine={isMine} />
                      ) : m.attachment ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setViewerIndex(files.findIndex((f) => f.messageId === m.id))}
                            className="block w-full text-left"
                            title="Afficher"
                          >
                            {m.attachment.type.startsWith('image/') ? (
                              <img src={m.attachment.url} alt={m.attachment.name} className="max-h-64 w-full rounded-xl object-cover" />
                            ) : (
                              <span className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 ${isMine ? 'bg-white/15' : 'bg-gray-100'}`}>
                                <FileText size={26} className={`shrink-0 ${isMine ? 'text-white' : 'text-red-500'}`} />
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-medium">{m.attachment.name}</span>
                                  <span className={`block text-[11px] ${isMine ? 'text-indigo-100' : 'text-gray-500'}`}>
                                    PDF{m.attachment_size ? ` · ${formatSize(m.attachment_size)}` : ''}
                                  </span>
                                </span>
                              </span>
                            )}
                          </button>
                          {captionOf(m) && <p className="px-1.5 pt-1.5 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{captionOf(m)}</p>}
                        </>
                      ) : (
                        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{m.content}</p>
                      )}
                      <p className={`text-[10px] mt-1 text-right ${m.attachment ? 'px-1.5' : ''} ${isMine ? 'text-indigo-100' : 'text-gray-500'}`}>{formatTime(m.created_at)}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {viewerIndex !== null && viewerIndex >= 0 && (
        <AttachmentViewer attachments={files} index={viewerIndex} onIndexChange={setViewerIndex} onClose={() => setViewerIndex(null)} />
      )}

      {(recorder.error || fileError) && <p className="px-4 pt-2 text-[11px] text-red-600 bg-white">{recorder.error || fileError}</p>}
      {pendingFile && (
        <div className="flex items-center gap-3 border-t border-gray-200 bg-white px-4 pt-3">
          {pendingFile.previewUrl ? (
            <img src={pendingFile.previewUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-gray-200" />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500"><FileText size={24} /></span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{pendingFile.file.name}</p>
            <p className="text-[11px] text-gray-500">{formatSize(pendingFile.file.size)} · ajoutez une légende si besoin</p>
          </div>
          <button onClick={() => setPendingFile(null)} className="text-gray-400 hover:text-gray-700" aria-label="Retirer le fichier">
            <X size={18} />
          </button>
        </div>
      )}
      <div className="p-3 border-t border-gray-200 bg-white shrink-0 flex items-center gap-2 min-w-0">
        {preview ? (
          <>
            <button
              onClick={() => setPreview(null)}
              disabled={sending}
              className={`${ROUND_BUTTON} text-gray-500 hover:bg-red-50 hover:text-red-600`}
              aria-label="Supprimer le vocal"
              title="Supprimer"
            >
              <Trash2 size={17} />
            </button>
            <div className="flex-1 min-w-0 rounded-full bg-gray-100 border border-gray-200 px-3 py-1.5">
              <VoiceMessagePlayer src={preview.url} duration={preview.duration} isMine={false} />
            </div>
            <button
              onClick={() => sendRecording(preview)}
              disabled={sending}
              className={`${ROUND_BUTTON} bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40`}
              aria-label="Envoyer le vocal"
            >
              <Send size={16} />
            </button>
          </>
        ) : recorder.recording ? (
          <>
            <button
              onClick={recorder.cancel}
              className={`${ROUND_BUTTON} text-gray-500 hover:bg-red-50 hover:text-red-600`}
              aria-label="Annuler l'enregistrement"
              title="Annuler"
            >
              <Trash2 size={17} />
            </button>
            <div className="flex-1 min-w-0 flex items-center gap-2 rounded-full bg-gray-100 border border-gray-200 px-4 py-2.5 text-sm text-gray-900">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 animate-pulse" />
              <span className="tabular-nums">{formatDuration(recorder.elapsed)}</span>
              <span className="truncate text-xs text-gray-500">Enregistrement…</span>
            </div>
            <button
              onClick={stopToPreview}
              className={`${ROUND_BUTTON} bg-gray-100 text-gray-700 hover:bg-gray-200`}
              aria-label="Arrêter et réécouter"
              title="Arrêter et réécouter"
            >
              <Square size={14} fill="currentColor" />
            </button>
            <button
              onClick={stopAndSend}
              className={`${ROUND_BUTTON} bg-indigo-600 text-white hover:bg-indigo-500`}
              aria-label="Envoyer le vocal"
              title="Envoyer"
            >
              <Send size={16} />
            </button>
          </>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = '' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              className={`${ROUND_BUTTON} text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40`}
              aria-label="Joindre une image ou un PDF"
              title="Joindre une image ou un PDF"
            >
              <Paperclip size={17} />
            </button>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              onPaste={(e) => {
                const image = Array.from(e.clipboardData.files).find((f) => f.type.startsWith('image/'))
                if (image) { e.preventDefault(); pickFile(image) }
              }}
              placeholder={pendingFile ? 'Ajouter une légende...' : 'Écrire un message...'}
              className="flex-1 min-w-0 bg-gray-100 border border-gray-200 rounded-full px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white transition-colors"
            />
            {draft.trim() || pendingFile ? (
              <button
                onClick={send}
                disabled={sending}
                className={`${ROUND_BUTTON} bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40`}
                aria-label="Envoyer"
              >
                <Send size={16} />
              </button>
            ) : (
              <button
                onClick={recorder.start}
                disabled={sending}
                className={`${ROUND_BUTTON} bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40`}
                aria-label="Enregistrer un message vocal"
                title="Message vocal"
              >
                <Mic size={16} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
