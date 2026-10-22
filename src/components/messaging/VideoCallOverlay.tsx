import { useEffect, useRef, useState } from 'react'
import DailyIframe, { type DailyCall } from '@daily-co/daily-js'
import { FileText, Maximize2, Minimize2, PhoneOff } from 'lucide-react'
import { useMessaging, SUMMARY_FAILED_EVENT, SUMMARY_PENDING_EVENT, SUMMARY_READY_EVENT } from '../../contexts/MessagingContext'
import { messagesClient } from '../../api/messagesClient'

// Fin de réunion côté propriétaire, transcription activée : on génère le résumé en arrière-plan.
// La conversation suit l'avancement via les événements window (« en préparation », puis la carte).
function generateSummaryInBackground(callUrl: string) {
  window.dispatchEvent(new CustomEvent(SUMMARY_PENDING_EVENT, { detail: { callUrl } }))
  messagesClient.generateCallSummary(callUrl)
    .then((message) => window.dispatchEvent(new CustomEvent(SUMMARY_READY_EVENT, { detail: { callUrl, message } })))
    .catch((err: Error) => window.dispatchEvent(new CustomEvent(SUMMARY_FAILED_EVENT, { detail: { callUrl, error: err.message } })))
}

// Fenêtre d'appel visio (Daily Prebuilt) : plein écran par-dessus SDP, ou réduite en vignette
// en bas à gauche pour continuer à utiliser l'application pendant l'appel.
export function VideoCallOverlay() {
  const { activeCall, closeCall } = useMessaging()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const frameRef = useRef<DailyCall | null>(null)
  const [minimized, setMinimized] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [transcribing, setTranscribing] = useState(false)

  useEffect(() => {
    if (!activeCall || !containerRef.current) return
    setMinimized(false)
    setIsOwner(false)
    setTranscribing(false)
    const frame = DailyIframe.createFrame(containerRef.current, {
      iframeStyle: { width: '100%', height: '100%', border: '0' },
      showLeaveButton: true,
      showFullscreenButton: true,
      lang: 'fr',
    })
    frameRef.current = frame
    let owner = false
    let transcribed = false
    let left = false
    frame.on('left-meeting', () => {
      if (left) return
      left = true
      if (owner && transcribed) generateSummaryInBackground(activeCall.url)
      closeCall()
    })
    frame.on('joined-meeting', () => {
      owner = !!frame.participants().local?.owner
      setIsOwner(owner)
    })
    frame.on('transcription-started', () => { transcribed = true; setTranscribing(true) })
    frame.on('transcription-stopped', () => setTranscribing(false))
    frame.join({ url: activeCall.url, token: activeCall.token }).catch(closeCall)
    return () => {
      frameRef.current = null
      frame.destroy()
    }
  }, [activeCall, closeCall])

  if (!activeCall) return null

  return (
    <div
      className={
        minimized
          ? 'fixed bottom-4 left-4 z-[80] h-60 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl bg-gray-900 shadow-2xl ring-1 ring-black/20'
          : 'fixed inset-0 z-[80] flex flex-col bg-gray-900'
      }
    >
      <div className={`flex items-center gap-2 ${minimized ? 'absolute right-2 top-2 z-10' : 'shrink-0 px-4 py-2'}`}>
        {!minimized && <p className="flex-1 text-sm font-medium text-white">Appel visio</p>}
        {transcribing && (
          <span className="flex items-center gap-1.5 rounded-full bg-red-600/90 px-2.5 py-1 text-[11px] font-semibold text-white" title="La réunion est transcrite pour le compte rendu IA">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            {!minimized && 'Transcription en cours'}
          </span>
        )}
        {isOwner && !minimized && (
          <button
            onClick={() =>
              transcribing
                ? frameRef.current?.stopTranscription()
                // Traitement en Europe (RGPD) ; modèle Deepgram généraliste, en français.
                : frameRef.current?.startTranscription({ language: 'fr', model: 'nova-2-general', transcription_geo: 'eu' })
            }
            className="flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-xs font-medium text-white hover:bg-white/20"
            title="La transcription sert à générer le compte rendu à la fin de l'appel"
          >
            <FileText size={14} />
            {transcribing ? 'Arrêter la transcription' : 'Activer le compte rendu IA'}
          </button>
        )}
        <button
          onClick={() => setMinimized((m) => !m)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20"
          title={minimized ? 'Agrandir' : 'Réduire (continuer à utiliser SDP)'}
        >
          {minimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
        </button>
        <button
          // La fermeture passe par 'left-meeting' (déclenche aussi le résumé si besoin).
          onClick={() => (frameRef.current ? frameRef.current.leave().catch(closeCall) : closeCall())}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-500"
          title="Quitter l'appel"
        >
          <PhoneOff size={15} />
        </button>
      </div>
      <div ref={containerRef} className={minimized ? 'h-full w-full' : 'min-h-0 flex-1'} />
    </div>
  )
}
