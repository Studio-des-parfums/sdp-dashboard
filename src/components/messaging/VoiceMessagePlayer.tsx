import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'

const SPEEDS = [1, 1.5, 2] as const

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

interface VoiceMessagePlayerProps {
  src: string
  /** Durée enregistrée côté serveur — un webm de navigateur n'expose pas toujours la sienne. */
  duration: number
  isMine: boolean
}

// Lecteur façon WhatsApp : lecture/pause, barre de progression cliquable, temps, vitesse.
export function VoiceMessagePlayer({ src, duration, isMine }: VoiceMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [speedIndex, setSpeedIndex] = useState(0)
  const [fileDuration, setFileDuration] = useState(0)

  const total = duration > 0 ? duration : fileDuration
  const progress = total > 0 ? Math.min(1, current / total) : 0

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[speedIndex]
  }, [speedIndex])

  // Un seul vocal à la fois : démarrer celui-ci met les autres en pause.
  useEffect(() => {
    const onOtherPlay = (e: Event) => {
      if (e.target !== audioRef.current) audioRef.current?.pause()
    }
    document.addEventListener('play', onOtherPlay, true)
    return () => document.removeEventListener('play', onOtherPlay, true)
  }, [])

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) audio.play().catch(() => {})
    else audio.pause()
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current
    if (!audio || total <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * total
    setCurrent(audio.currentTime)
  }

  const track = isMine ? 'bg-white/30' : 'bg-gray-300'
  const fill = isMine ? 'bg-white' : 'bg-indigo-600'

  return (
    <div className="flex w-full min-w-0 items-center gap-2">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => { if (Number.isFinite(e.currentTarget.duration)) setFileDuration(e.currentTarget.duration) }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrent(0) }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
      />
      <button
        type="button"
        onClick={toggle}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isMine ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'}`}
        aria-label={playing ? 'Pause' : 'Écouter'}
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className={`relative h-1.5 cursor-pointer rounded-full ${track}`} onClick={seek}>
          <div className={`absolute inset-y-0 left-0 rounded-full ${fill}`} style={{ width: `${progress * 100}%` }} />
          <div className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full ${fill}`} style={{ left: `calc(${progress * 100}% - 6px)` }} />
        </div>
        <p className={`mt-1 text-[10px] ${isMine ? 'text-indigo-100' : 'text-gray-600'}`}>
          {formatDuration(playing || current > 0 ? current : total)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setSpeedIndex((i) => (i + 1) % SPEEDS.length)}
        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${isMine ? 'bg-white/20 text-white' : 'bg-gray-300 text-gray-700'}`}
        title="Vitesse de lecture"
      >
        {SPEEDS[speedIndex]}×
      </button>
    </div>
  )
}
