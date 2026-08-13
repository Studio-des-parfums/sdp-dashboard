// Client pour le backend du robot Nono (déployé séparément sur Railway).
// Reprend telle quelle la logique de requête de l'app backoffice d'origine.

const RAW_API_BASE = import.meta.env.VITE_NONO_API_URL || 'https://nono-le-robot-production.up.railway.app'

function normalizeApiBase(value: string): string {
  const trimmed = String(value || '').trim()
  if (!trimmed || trimmed === '/') return ''
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  return withProtocol.replace(/\/+$/, '')
}

const API_BASE = normalizeApiBase(RAW_API_BASE)

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error || 'Erreur inconnue')
}

export async function nonoRequest<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json() : null

  if (!response.ok) {
    throw new Error(data?.error || `Erreur HTTP ${response.status}`)
  }

  return data as T
}

export async function nonoUploadImage(file: File): Promise<{ imageUrl: string }> {
  const formData = new FormData()
  formData.append('image', file)

  const response = await fetch(`${API_BASE}/api/admin/products/upload-image`, {
    method: 'POST',
    body: formData,
  })

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json() : null

  if (!response.ok) {
    throw new Error(data?.error || `Erreur HTTP ${response.status}`)
  }

  return data
}
