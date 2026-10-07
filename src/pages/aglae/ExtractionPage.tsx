import { useState, useRef, useCallback } from 'react'
import { useExtractionQueue, SECONDS_PER_PAGE } from '../../contexts/ExtractionQueueContext'
import { Button } from '../../components/ui/Button'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return remaining > 0 ? `${minutes}min ${remaining}s` : `${minutes}min`
}

export default function ExtractionPage() {
  const { queue, processing, addFiles, processQueue, clearCompleted, removeItem } = useExtractionQueue()
  const [dragging, setDragging] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const doneCount = queue.filter(q => q.status === 'done').length
  const errorCount = queue.filter(q => q.status === 'error').length
  const pendingCount = queue.filter(q => q.status === 'pending').length
  const pendingItems = queue.filter(q => q.status === 'pending')
  const totalEstimatedTime = pendingItems.reduce((sum, q) => sum + (q.estimatedTime ?? SECONDS_PER_PAGE), 0)

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
