const BASE_URL = (import.meta.env.VITE_LYLO_API_URL || 'https://lylo-back-production.up.railway.app').replace(/\/+$/, '')

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    let details = ''
    try { details = await res.text() } catch { /* ignore */ }
    throw new Error(`HTTP ${res.status}${details ? ` — ${details}` : ''}`)
  }
  if (res.status === 204) return null as T
  const contentLength = res.headers.get('content-length')
  if (contentLength === '0') return null as T
  return res.json() as Promise<T>
}

function normalizeArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (payload && typeof payload === 'object') {
    const maybe = (payload as Record<string, unknown>).data
    if (Array.isArray(maybe)) return maybe as T[]
  }
  return []
}

export const lyloApi = {
  getCustomers: () => apiFetch<unknown>('/customers/').then(d => normalizeArray<import('../types/lylo').LyloClient>(d)),
  createCustomer: (data: Record<string, unknown>) => apiFetch('/customers/', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string | number, data: Record<string, unknown>) => apiFetch(`/customers/${encodeURIComponent(String(id))}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCustomer: (id: string | number) => apiFetch(`/customers/${encodeURIComponent(String(id))}`, { method: 'DELETE' }),

  getTeam: () => apiFetch<unknown>('/teams/').then(d => normalizeArray<import('../types/lylo').LyloTeamMember>(d)),
  createTeamMember: (data: Record<string, unknown>) => apiFetch('/teams/', { method: 'POST', body: JSON.stringify(data) }),
  updateTeamMember: (id: string | number, data: Record<string, unknown>) => apiFetch(`/teams/${encodeURIComponent(String(id))}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTeamMember: (id: string | number) => apiFetch(`/teams/${encodeURIComponent(String(id))}`, { method: 'DELETE' }),

  getFormulas: (params?: string) => apiFetch<unknown>(`/api/formulas${params ? `?${params}` : ''}`),
  getFormulasByRef: (ref: string) => apiFetch<unknown>(`/api/formulas?reference=${encodeURIComponent(ref)}`),
  sendFormulaEmail: (ref: string, email: string) => apiFetch(`/api/formulas/${encodeURIComponent(ref)}/send-mail`, { method: 'POST', body: JSON.stringify({ email }) }),

  // Les notes olfactives (ex-ingrédients) sont désormais gérées depuis Admin > Notes
  // olfactives (src/pages/admin/AdminNotesPage.tsx), qui appelle directement l'API du
  // dashboard SDP — ce client Lylo n'en a plus la responsabilité.

  getQuestionGroups: () => apiFetch<unknown>('/catalog/question-groups'),
  getQuestions: (params?: string) => apiFetch<unknown>(`/catalog/questions${params ? `?${params}` : ''}`),
  createQuestion: (data: Record<string, unknown>) => apiFetch('/catalog/questions', { method: 'POST', body: JSON.stringify(data) }),
  updateQuestion: (id: number, data: Record<string, unknown>) => apiFetch(`/catalog/questions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteQuestion: (id: number) => apiFetch(`/catalog/questions/${id}`, { method: 'DELETE' }),
  createChoice: (data: Record<string, unknown>) => apiFetch('/catalog/choices', { method: 'POST', body: JSON.stringify(data) }),
  deleteChoice: (id: number) => apiFetch(`/catalog/choices/${id}`, { method: 'DELETE' }),
  createQuestionGroup: (data: Record<string, unknown>) => apiFetch('/catalog/question-groups', { method: 'POST', body: JSON.stringify(data) }),
  updateQuestionGroup: (id: number, data: Record<string, unknown>) => apiFetch(`/catalog/question-groups/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteQuestionGroup: (id: number) => apiFetch(`/catalog/question-groups/${id}`, { method: 'DELETE' }),

  getPrinters: () => apiFetch<unknown>('/printers/').then(d => normalizeArray<import('../types/lylo').LyloPrinter>(d)),
  createPrinter: (data: Record<string, unknown>) => apiFetch('/printers/', { method: 'POST', body: JSON.stringify(data) }),
  updatePrinter: (id: string | number, data: Record<string, unknown>) => apiFetch(`/printers/${encodeURIComponent(String(id))}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePrinter: (id: string | number) => apiFetch(`/printers/${encodeURIComponent(String(id))}`, { method: 'DELETE' }),
  scanNetwork: () => apiFetch<{ printers: { ip: string; port?: number; hostname?: string }[]; printnode_printers: { printnode_id: string | number; name: string; state: string }[] }>('/printers/network/scan'),
}
