import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { ocrApi, quotasApi } from '../api/ocrClient'
import { useAuth } from './AuthContext'
import { useToast } from '../components/ui/Toast'

// Monté une seule fois dans App.tsx (jamais démonté par la navigation interne du
// dashboard), pour que la file d'attente et le polling des scans OCR survivent
// même si l'utilisateur quitte la page Extraction pendant qu'un scan tourne —
// le traitement côté serveur peut prendre plusieurs minutes pour un PDF multi-pages.

export const SECONDS_PER_PAGE = 5
const POLL_INTERVAL = 3000
// Une requête de polling peut échouer ponctuellement (coupure réseau, redémarrage
// du service...) sans que le job OCR lui-même ait échoué côté serveur. On tolère
// quelques échecs consécutifs avant d'abandonner, pour ne pas afficher une erreur
// alors que le scan est toujours en cours.
const MAX_CONSECUTIVE_POLL_ERRORS = 5

export interface QueueItem {
  id: string
  file: File
  filename: string
  size: number
  pages: number | null
  estimatedTime: number | null
  status: 'pending' | 'processing' | 'done' | 'error'
  error?: string
  jobId?: string
}

async function getPdfPageCount(file: File): Promise<number> {
  try {
    const pdfjsLib = await import('pdfjs-dist')
    const buffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
    return pdf.numPages
  } catch {
    return 0
  }
}

interface ExtractionQueueContextType {
  queue: QueueItem[]
  processing: boolean
  addFiles: (files: FileList | File[]) => Promise<void>
  processQueue: () => Promise<void>
  clearCompleted: () => void
  removeItem: (id: string) => void
}

const ExtractionQueueContext = createContext<ExtractionQueueContextType | null>(null)

export const useExtractionQueue = () => {
  const ctx = useContext(ExtractionQueueContext)
  if (!ctx) throw new Error('useExtractionQueue must be used inside ExtractionQueueProvider')
  return ctx
}

export function ExtractionQueueProvider({ children }: { children: ReactNode }) {
  const { sdpUser } = useAuth()
  const { showError, showSuccess, showWarning, showQuotaError } = useToast()
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [processing, setProcessing] = useState(false)

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const newItems: QueueItem[] = []
    for (const file of Array.from(files)) {
      if (file.type !== 'application/pdf') {
        showWarning('Fichier ignoré', `${file.name} n'est pas un PDF`)
        continue
      }
      const pages = await getPdfPageCount(file)
      const estimatedTime = pages > 0 ? pages * SECONDS_PER_PAGE : null
      newItems.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        filename: file.name,
        size: file.size,
        pages,
        estimatedTime,
        status: 'pending',
      })
    }
    setQueue(prev => [...prev, ...newItems])
  }, [showWarning])

  const pollJob = useCallback((jobId: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      let consecutiveErrors = 0
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_OCR_API_URL || import.meta.env.VITE_API_URL}/api/v1/ocr/jobs/${jobId}`)
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const data = await res.json()
          consecutiveErrors = 0
          if (data.status === 'completed' || data.status === 'done') {
            clearInterval(interval)
            resolve('done')
          } else if (data.status === 'failed' || data.status === 'error') {
            clearInterval(interval)
            reject(new Error(data.error || 'Job failed'))
          }
        } catch {
          consecutiveErrors++
          if (consecutiveErrors >= MAX_CONSECUTIVE_POLL_ERRORS) {
            clearInterval(interval)
            reject(new Error('Polling failed'))
          }
        }
      }, POLL_INTERVAL)
    })
  }, [])

  const processQueue = useCallback(async () => {
    if (!sdpUser) { showError('Non connecté'); return }
    setProcessing(true)

    // On capture la file au moment du lancement : comme ce contexte survit à la
    // navigation, `queue` peut avoir changé entre deux rendus, mais le traitement
    // doit porter sur les éléments pending existants au clic sur "Démarrer".
    const itemsToProcess = queue.filter(q => q.status === 'pending')

    for (const item of itemsToProcess) {
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'processing' } : q))

      try {
        await quotasApi.consumePdfQuota(sdpUser.id)
      } catch (err: unknown) {
        const error = err as { status?: number; detail?: unknown; message?: string }
        if (error.status === 429) {
          showQuotaError(error.detail as { type?: string; message?: string } | undefined)
          setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error', error: 'Quota dépassé' } : q))
          setProcessing(false)
          return
        }
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error', error: error.message } : q))
        continue
      }

      try {
        const result = await ocrApi.uploadPdf(item.file)
        const jobId = result.job_id || result.id
        if (jobId) {
          await pollJob(jobId)
        }
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'done' } : q))
        showSuccess('Extraction réussie', item.filename)
      } catch (err: unknown) {
        const error = err as { message?: string }
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error', error: error.message } : q))
      }
    }

    setProcessing(false)
  }, [queue, sdpUser, showError, showSuccess, showQuotaError, pollJob])

  const clearCompleted = useCallback(() => {
    setQueue(prev => prev.filter(q => q.status === 'pending' || q.status === 'processing'))
  }, [])

  const removeItem = useCallback((id: string) => {
    setQueue(prev => prev.filter(q => q.id !== id))
  }, [])

  return (
    <ExtractionQueueContext.Provider value={{ queue, processing, addFiles, processQueue, clearCompleted, removeItem }}>
      {children}
    </ExtractionQueueContext.Provider>
  )
}
