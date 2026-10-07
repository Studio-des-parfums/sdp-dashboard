import { useState, useRef, useCallback } from 'react'
import { ocrApi, quotasApi } from '../../api/ocrClient'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'

const SECONDS_PER_PAGE = 5
const POLL_INTERVAL = 3000
// Une requête de polling peut échouer ponctuellement (coupure réseau, redémarrage
// du service...) sans que le job OCR lui-même ait échoué côté serveur. On tolère
// quelques échecs consécutifs avant d'abandonner, pour ne pas afficher une erreur
// alors que le scan est toujours en cours.
const MAX_CONSECUTIVE_POLL_ERRORS = 5

interface QueueItem {
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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

export default function ExtractionPage() {
  const { sdpUser } = useAuth()
  const { showError, showSuccess, showWarning, showQuotaError } = useToast()
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const doneCount = queue.filter(q => q.status === 'done').length
  const errorCount = queue.filter(q => q.status === 'error').length
  const pendingCount = queue.filter(q => q.status === 'pending').length
  const pendingItems = queue.filter(q => q.status === 'pending')
  const totalEstimatedTime = pendingItems.reduce((sum, q) => sum + (q.estimatedTime ?? SECONDS_PER_PAGE), 0)

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remaining = seconds % 60
    return remaining > 0 ? `${minutes}min ${remaining}s` : `${minutes}min`
  }

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
  }, [addFiles])

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files)
      e.target.value = ''
    }
  }

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

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i]
      if (item.status !== 'pending') continue

      setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'processing' } : q))

      try {
        await quotasApi.consumePdfQuota(sdpUser.id)
      } catch (err: unknown) {
        const error = err as { status?: number; detail?: unknown; message?: string }
        if (error.status === 429) {
          showQuotaError(error.detail as { type?: string; message?: string } | undefined)
          setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'error', error: 'Quota dépassé' } : q))
          setProcessing(false)
          return
        }
        setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'error', error: error.message } : q))
        continue
      }

      try {
        const result = await ocrApi.uploadPdf(item.file)
        const jobId = result.job_id || result.id
        if (jobId) {
          await pollJob(jobId)
        }
        setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'done' } : q))
        showSuccess('Extraction réussie', item.filename)
      } catch (err: unknown) {
        const error = err as { message?: string }
        setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'error', error: error.message } : q))
      }
    }

    setProcessing(false)
  }, [queue, sdpUser, showError, showSuccess, showQuotaError, pollJob])

  const clearCompleted = () => {
    setQueue(prev => prev.filter(q => q.status === 'pending' || q.status === 'processing'))
  }

  const removeItem = (id: string) => {
    setQueue(prev => prev.filter(q => q.id !== id))
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">📄 Extraction PDF</h1>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-600 border border-indigo-500/30 px-1.5 py-0.5 rounded-full font-medium">V2</span>
          </div>
          <p className="text-xs text-gray-600 mt-0.5">Glissez-déposez vos fichiers PDF pour extraction</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {doneCount > 0 && <span>✅ {doneCount}</span>}
          {errorCount > 0 && <span>⚠️ {errorCount}</span>}
          {pendingCount > 0 && <span>📋 {pendingCount}</span>}
        </div>
      </div>

      <div
        ref={dropRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragging
            ? 'border-indigo-500 bg-indigo-500/5'
            : 'border-gray-300 bg-gray-100/50 hover:border-gray-300 hover:bg-gray-100'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="text-4xl mb-3">📄</div>
        <p className="text-sm text-gray-600 font-medium">
          {dragging ? 'Déposez vos fichiers ici' : 'Glissez-déposez vos PDF ici'}
        </p>
        <p className="text-xs text-gray-600 mt-1">ou cliquez pour sélectionner des fichiers</p>
      </div>

      {queue.length > 0 && (
        <div className="bg-gray-100 border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-900">📋 File d'attente ({queue.length})</span>
              {pendingCount > 0 && (
                <span className="text-xs text-gray-500">⏱ ~{formatDuration(totalEstimatedTime)} au total</span>
              )}
            </div>
            <div className="flex gap-2">
              {pendingCount > 0 && (
                <Button size="sm" onClick={processQueue} loading={processing}>
                  {processing ? 'Traitement...' : '🚀 Démarrer'}
                </Button>
              )}
              {doneCount + errorCount > 0 && (
                <Button variant="secondary" size="sm" onClick={clearCompleted}>
                  🧹 Nettoyer
                </Button>
              )}
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Fichier</th>
                <th className="text-left px-4 py-3 font-medium">Taille</th>
                <th className="text-left px-4 py-3 font-medium">Pages</th>
                <th className="text-left px-4 py-3 font-medium">Estimation</th>
                <th className="text-left px-4 py-3 font-medium">Statut</th>
                <th className="text-right px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((item, idx) => (
                <tr key={item.id} className="border-b border-gray-200/50 hover:bg-gray-100/60 transition-colors">
                  <td className="px-4 py-3 text-gray-900">{item.filename}</td>
                  <td className="px-4 py-3 text-gray-500">{formatBytes(item.size)}</td>
                  <td className="px-4 py-3 text-gray-600">{item.pages ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {item.estimatedTime ? `~${item.estimatedTime}s` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {item.status === 'pending' && <span className="text-gray-600">⏳ En attente</span>}
                    {item.status === 'processing' && (
                      <div className="flex items-center gap-2">
                        <span className="text-blue-600 text-xs">⚙️ Traitement...</span>
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: `${((idx + 1) / queue.length) * 100}%` }} />
                        </div>
                      </div>
                    )}
                    {item.status === 'done' && <span className="text-emerald-600">✅ Terminé</span>}
                    {item.status === 'error' && (
                      <span className="text-red-700" title={item.error}>⚠️ {item.error || 'Erreur'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.status !== 'processing' && (
                      <button onClick={() => removeItem(item.id)} className="text-gray-600 hover:text-red-700 transition-colors text-xs">
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {queue.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-gray-600">
          <span className="text-3xl mb-2">📂</span>
          <p className="text-sm">Aucun fichier dans la file d'attente</p>
          <p className="text-xs text-gray-700 mt-1">Ajoutez des PDF pour commencer l'extraction</p>
        </div>
      )}
    </div>
  )
}
