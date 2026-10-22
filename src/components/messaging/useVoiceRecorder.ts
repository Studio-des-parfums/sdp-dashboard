import { useEffect, useRef, useState } from 'react'

const MAX_SECONDS = 300

// Formats supportés selon le navigateur : opus/webm (Chrome, Electron, Firefox), mp4 (Safari).
function pickMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  return candidates.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) ?? ''
}

export interface VoiceRecording {
  blob: Blob
  duration: number
}

// Enregistrement d'un message vocal via le micro (MediaRecorder). Limité à 5 minutes.
export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const timerRef = useRef<number | null>(null)
  const resolveRef = useRef<((r: VoiceRecording | null) => void) | null>(null)
  const cancelledRef = useRef(false)

  function cleanup() {
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = null
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop())
    recorderRef.current = null
    setRecording(false)
    setElapsed(0)
  }

  useEffect(() => () => {
    cancelledRef.current = true
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    cleanup()
  }, [])

  async function start() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = pickMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []
      cancelledRef.current = false
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const duration = (Date.now() - startedAtRef.current) / 1000
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        cleanup()
        resolveRef.current?.(cancelledRef.current || blob.size === 0 ? null : { blob, duration })
        resolveRef.current = null
      }
      recorderRef.current = recorder
      startedAtRef.current = Date.now()
      recorder.start()
      setRecording(true)
      timerRef.current = window.setInterval(() => {
        const seconds = (Date.now() - startedAtRef.current) / 1000
        setElapsed(seconds)
        if (seconds >= MAX_SECONDS) recorder.stop()
      }, 250)
    } catch {
      setError("Micro inaccessible : autorisez l'accès au microphone pour enregistrer un vocal.")
      cleanup()
    }
  }

  /** Arrête l'enregistrement et renvoie l'audio (null si annulé ou vide). */
  function stop(): Promise<VoiceRecording | null> {
    return new Promise((resolve) => {
      const recorder = recorderRef.current
      if (!recorder || recorder.state !== 'recording') return resolve(null)
      resolveRef.current = resolve
      recorder.stop()
    })
  }

  function cancel() {
    cancelledRef.current = true
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    else cleanup()
  }

  return { recording, elapsed, error, start, stop, cancel }
}
