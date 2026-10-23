import { useLayoutEffect, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

interface FloatingPanelProps {
  anchorRef: RefObject<HTMLElement | null>
  onClose: () => void
  /** Largeur en px ; par défaut celle de l'élément d'ancrage. */
  width?: number
  maxHeight?: number
  /** false : pas de calque de fermeture au clic (ex. autocomplete pendant la frappe, fermé par son parent). */
  backdrop?: boolean
  children: ReactNode
}

const GAP = 4
const MARGIN = 8

// Menu déroulant rendu dans <body> en position fixe : il n'est pas coupé par le contenu
// scrollable d'une modale, et s'ouvre vers le haut quand la place manque en bas.
export function FloatingPanel({ anchorRef, onClose, width, maxHeight = 288, backdrop = true, children }: FloatingPanelProps) {
  const [style, setStyle] = useState<React.CSSProperties | null>(null)

  useLayoutEffect(() => {
    function place() {
      const anchor = anchorRef.current
      if (!anchor) return
      const rect = anchor.getBoundingClientRect()
      const panelWidth = width ?? rect.width
      const spaceBelow = window.innerHeight - rect.bottom - GAP - MARGIN
      const spaceAbove = rect.top - GAP - MARGIN
      const openUp = spaceBelow < maxHeight && spaceAbove > spaceBelow
      const left = Math.min(Math.max(MARGIN, rect.left), window.innerWidth - panelWidth - MARGIN)
      setStyle({
        position: 'fixed',
        left,
        width: panelWidth,
        maxHeight: Math.min(maxHeight, openUp ? spaceAbove : spaceBelow),
        ...(openUp ? { bottom: window.innerHeight - rect.top + GAP } : { top: rect.bottom + GAP }),
      })
    }
    place()
    // capture : suit aussi le scroll du contenu de la modale, pas seulement celui de la fenêtre
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [anchorRef, width, maxHeight])

  if (!style) return null

  return createPortal(
    <>
      {/* Au-dessus de toutes les couches (modales, panneau de messagerie, résumé de réunion). */}
      {backdrop && <div className="fixed inset-0 z-[95]" onClick={onClose} />}
      <div style={style} className="z-[96] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
        {children}
      </div>
    </>,
    document.body
  )
}
