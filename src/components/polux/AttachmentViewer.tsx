import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Download, ExternalLink, FileText, X } from 'lucide-react'
import type { PoluxAttachment } from '../../types/polux'

interface AttachmentViewerProps {
  attachments: PoluxAttachment[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
}

export function isImage(a: PoluxAttachment): boolean {
  return a.content_type.startsWith('image/')
}

function Preview({ attachment }: { attachment: PoluxAttachment }) {
  const type = attachment.content_type
  if (type.startsWith('image/')) {
    return <img src={attachment.url} alt={attachment.filename} className="max-h-full max-w-full object-contain" />
  }
  if (type === 'application/pdf' || type.startsWith('text/')) {
    return <iframe src={attachment.url} title={attachment.filename} className="h-full w-full rounded-lg bg-white" />
  }
  if (type.startsWith('video/')) {
    return <video src={attachment.url} controls className="max-h-full max-w-full" />
  }
  if (type.startsWith('audio/')) {
    return <audio src={attachment.url} controls />
  }
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-8 text-center">
      <FileText size={40} className="text-gray-400" />
      <p className="text-sm text-gray-700">Aperçu non disponible pour ce type de fichier.</p>
      <a href={attachment.download_url ?? attachment.url} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
        Télécharger
      </a>
    </div>
  )
}

// Visionneuse plein écran des pièces jointes d'une tâche (image, PDF, vidéo, audio, texte),
// rendue dans <body> par-dessus la modale de la tâche.
export function AttachmentViewer({ attachments, index, onIndexChange, onClose }: AttachmentViewerProps) {
  const attachment = attachments[index]
  const hasPrev = index > 0
  const hasNext = index < attachments.length - 1

  useEffect(() => {
    // capture + stopImmediatePropagation : Échap ferme la visionneuse sans fermer la modale dessous.
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); onClose() }
      if (e.key === 'ArrowLeft' && hasPrev) onIndexChange(index - 1)
      if (e.key === 'ArrowRight' && hasNext) onIndexChange(index + 1)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [index, hasPrev, hasNext, onClose, onIndexChange])

  if (!attachment) return null

  const iconButton = 'flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white'

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-black/85" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="flex shrink-0 items-center gap-2 px-4 py-3">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-white">
          {attachment.filename}
          {attachments.length > 1 && <span className="ml-2 text-white/50">{index + 1} / {attachments.length}</span>}
        </p>
        <a href={attachment.url} target="_blank" rel="noreferrer" className={iconButton} title="Ouvrir dans un nouvel onglet"><ExternalLink size={18} /></a>
        <a href={attachment.download_url ?? attachment.url} className={iconButton} title="Télécharger"><Download size={18} /></a>
        <button type="button" onClick={onClose} className={iconButton} title="Fermer"><X size={20} /></button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-16 pb-6" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <Preview attachment={attachment} />
        {hasPrev && (
          <button type="button" onClick={() => onIndexChange(index - 1)} className={`${iconButton} absolute left-4`} title="Précédent"><ChevronLeft size={24} /></button>
        )}
        {hasNext && (
          <button type="button" onClick={() => onIndexChange(index + 1)} className={`${iconButton} absolute right-4`} title="Suivant"><ChevronRight size={24} /></button>
        )}
      </div>
    </div>,
    document.body
  )
}
