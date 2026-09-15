const OCR_API_URL = import.meta.env.VITE_OCR_API_URL || import.meta.env.VITE_API_URL

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `HTTP error! status: ${response.status}`)
  }
  return response.json()
}

const handleBlobResponse = async (response: Response) => {
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
  return response.blob()
}

export const authApi = {
  getUserByEmail: async (email: string) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/users/by-email?email=${email}`)
    return handleResponse(response)
  },
  updateLoginStatus: async (userId: number, isOnline: boolean) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/users/${userId}/login-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_online: isOnline }),
    })
    return handleResponse(response)
  },
  recordLoginEvent: async (userId: number, type: string) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/login-history/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, type }),
    })
    return handleResponse(response)
  },
  getGoogleUserInfo: async (accessToken: string) => {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    return handleResponse(response)
  },
}

export const usersApi = {
  getAll: async () => {
    const response = await fetch(`${OCR_API_URL}/api/v1/users`)
    return handleResponse(response)
  },
  getOnline: async () => {
    const response = await fetch(`${OCR_API_URL}/api/v1/users/online`)
    return handleResponse(response)
  },
  getByTeam: async (team: string) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/users/team/${team}`)
    return handleResponse(response)
  },
  getByRole: async (role: string) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/users/role/${role}`)
    return handleResponse(response)
  },
  create: async (userData: Record<string, unknown>) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    })
    return handleResponse(response)
  },
  update: async (userId: number, userData: Record<string, unknown>) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    })
    return handleResponse(response)
  },
  getLoginHistory: async (userId: number, page: number, size = 10, year: number | null = null, month: number | null = null) => {
    let url = `${OCR_API_URL}/api/v1/login-history/user/${userId}?page=${page}&size=${size}`
    if (year) url += `&year=${year}`
    if (month) url += `&month=${month}`
    const response = await fetch(url)
    return handleResponse(response)
  },
  getLoginHistoryPeriods: async (userId: number) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/login-history/user/${userId}/periods`)
    return handleResponse(response)
  },
}

export const customersApi = {
  getAll: async (page = 1, pageSize = 10, searchTerm: string | null = null) => {
    let url = `${OCR_API_URL}/api/v1/customers?page=${page}&size=${pageSize}`
    if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`
    const response = await fetch(url)
    return handleResponse(response)
  },
  getAllNoPagination: async () => {
    const response = await fetch(`${OCR_API_URL}/api/v1/customers/`)
    return handleResponse(response)
  },
  getById: async (customerId: number) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/customers/${customerId}`)
    return handleResponse(response)
  },
  update: async (customerId: number, customerData: Record<string, unknown>) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/customers/${customerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerData),
    })
    return handleResponse(response)
  },
  search: async (params: string) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/customers?${params}`)
    return handleResponse(response)
  },
  bulkUpdate: async (customers: Record<string, unknown>[]) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/customers/bulk`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customers }),
    })
    return handleResponse(response)
  },
  delete: async (customerId: number) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/customers/${customerId}`, {
      method: 'DELETE',
    })
    return handleResponse(response)
  },
  getAnalytics: async () => {
    const response = await fetch(`${OCR_API_URL}/api/v1/customers/stats/analytics`)
    return handleResponse(response)
  },
  getCountries: async () => {
    const response = await fetch(`${OCR_API_URL}/api/v1/customers/countries`)
    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data)) return data
      if (data.countries && Array.isArray(data.countries)) return data.countries
      if (data.data && Array.isArray(data.data)) return data.data
    }
    const allData = await customersApi.getAll(1, 100)
    const allCustomers = (Array.isArray(allData) ? allData : allData.customers || allData.results || allData.data || allData.items || [])
    const seen = new Set<string>()
    allCustomers.forEach((c: { pays?: string; country?: string }) => {
      const val = c.pays || c.country || ''
      const cleaned = val.replace(/[^a-zA-ZÀ-ÿ\s\-']/g, '').trim()
      if (!cleaned || /\d/.test(cleaned)) return
      const key = cleaned.toLowerCase()
      if (!seen.has(key)) seen.add(key)
    })
    return Array.from(seen).sort()
  },
}

export const groupsApi = {
  getAll: async () => {
    const response = await fetch(`${OCR_API_URL}/api/v1/groups/`)
    return handleResponse(response)
  },
  getById: async (groupId: number) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/groups/${groupId}`)
    return handleResponse(response)
  },
  getByCustomerId: async (customerId: number) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/groups/customer/${customerId}`)
    return handleResponse(response)
  },
  getCustomersByGroupIds: async (groupIds: number[]) => {
    const groupIdsParam = groupIds.join(',')
    const response = await fetch(`${OCR_API_URL}/api/v1/groups/customers?group_ids=${groupIdsParam}`)
    return handleResponse(response)
  },
  create: async (groupData: Record<string, unknown>) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/groups/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(groupData),
    })
    return handleResponse(response)
  },
  delete: async (groupId: number) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/groups/${groupId}`, {
      method: 'DELETE',
    })
    return handleResponse(response)
  },
  addCustomers: async (groupId: number, customerIds: number[], addedBy: number) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/groups/${groupId}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_ids: customerIds, added_by: addedBy }),
    })
    return handleResponse(response)
  },
  removeCustomers: async (groupId: number, customerIds: number[]) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/groups/${groupId}/customers`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_ids: customerIds }),
    })
    return handleResponse(response)
  },
}

export const ordersApi = {
  getAll: async (page = 1, pageSize = 20, filters?: { status?: string; customerName?: string; customerId?: number; dateFrom?: string; dateTo?: string; orderType?: string; search?: string }) => {
    let url = `${OCR_API_URL}/api/v1/orders/?page=${page}&size=${pageSize}`
    if (filters) {
      if (filters.status) url += `&status=${filters.status}`
      if (filters.customerName) url += `&customer_name=${encodeURIComponent(filters.customerName)}`
      if (filters.customerId) url += `&customer_id=${filters.customerId}`
      if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`
      if (filters.dateFrom) url += `&date_from=${filters.dateFrom}`
      if (filters.dateTo) url += `&date_to=${filters.dateTo}`
      if (filters.orderType) url += `&order_type=${encodeURIComponent(filters.orderType)}`
    }
    const response = await fetch(url)
    return handleResponse(response)
  },
  getByFormulaId: async (formulaId: number) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/orders?formula_id=${formulaId}`)
    return handleResponse(response)
  },
  getById: async (orderId: number) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/orders/${orderId}`)
    return handleResponse(response)
  },
  updateStatus: async (orderId: number, status: string) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    return handleResponse(response)
  },
  update: async (orderId: number, orderData: Record<string, unknown>) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    })
    return handleResponse(response)
  },
  addItem: async (orderId: number, itemData: Record<string, unknown>) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/orders/${orderId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData),
    })
    return handleResponse(response)
  },
  updateItem: async (orderId: number, itemId: number, itemData: Record<string, unknown>) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/orders/${orderId}/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData),
    })
    return handleResponse(response)
  },
  deleteItem: async (orderId: number, itemId: number) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/orders/${orderId}/items/${itemId}`, {
      method: 'DELETE',
    })
    return handleResponse(response)
  },
}

export const formulasApi = {
  getById: async (formulaId: number) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/formulas/${formulaId}`)
    return handleResponse(response)
  },
  updateNotes: async (formulaId: number, notesData: Record<string, unknown>) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/formulas/${formulaId}/notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notesData),
    })
    return handleResponse(response)
  },
  getThumbnailUrl: (formulaId: number) => `${OCR_API_URL}/api/v1/formulas/${formulaId}/file/thumbnail`,
  generatePdf: async (formulaId: number) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/formulas/${formulaId}/pdf`, {
      method: 'POST',
    })
    return handleResponse(response)
  },
}

export const filesApi = {
  getContentUrl: (fileId: number) => `${OCR_API_URL}/api/v1/files/${fileId}/content`,
  getDownloadUrl: (fileId: number) => `${OCR_API_URL}/api/v1/files/${fileId}/download`,
}

export const quotasApi = {
  getUserQuotas: async (userId: number) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/users/${userId}/quotas`)
    return handleResponse(response)
  },
  consumeCsvQuota: async (userId: number) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/users/${userId}/quotas/csv/consume`, { method: 'POST' })
    if (response.status === 429) {
      const error = await response.json()
      const quotaError = new Error(error.detail?.message || 'Quota CSV dépassé') as Error & { status: number; detail: unknown }
      quotaError.status = 429
      quotaError.detail = error.detail
      throw quotaError
    }
    return handleResponse(response)
  },
  consumePdfQuota: async (userId: number) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/users/${userId}/quotas/pdf/consume`, { method: 'POST' })
    if (response.status === 429) {
      const error = await response.json()
      const quotaError = new Error(error.detail?.message || 'Quota PDF dépassé') as Error & { status: number; detail: unknown }
      quotaError.status = 429
      quotaError.detail = error.detail
      throw quotaError
    }
    return handleResponse(response)
  },
}

export const ocrApi = {
  uploadPdf: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch(`${OCR_API_URL}/api/v1/ocr/upload-pdf-csv`, {
      method: 'POST',
      body: formData,
    })
    return handleResponse(response)
  },
}

export const rolesApi = {
  getAll: async (page = 1, size = 50, search: string | null = null, includeDeleted = false) => {
    let url = `${OCR_API_URL}/api/v1/roles/?page=${page}&size=${size}`
    if (search) url += `&search=${encodeURIComponent(search)}`
    if (includeDeleted) url += `&include_deleted=true`
    const response = await fetch(url)
    return handleResponse(response)
  },
  getById: async (roleId: number) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/roles/${roleId}`)
    return handleResponse(response)
  },
  create: async (roleData: Record<string, unknown>) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/roles/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roleData),
    })
    return handleResponse(response)
  },
  update: async (roleId: number, roleData: Record<string, unknown>) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/roles/${roleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roleData),
    })
    return handleResponse(response)
  },
  delete: async (roleId: number) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/roles/${roleId}`, { method: 'DELETE' })
    return handleResponse(response)
  },
  restore: async (roleId: number) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/roles/${roleId}/restore`, { method: 'POST' })
    return handleResponse(response)
  },
}

export const devicesApi = {
  getAll: async () => {
    const response = await fetch(`${OCR_API_URL}/api/v1/devices`)
    return handleResponse(response)
  },
  approve: async (deviceId: number) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/devices/${deviceId}/approve`, { method: 'PATCH' })
    return handleResponse(response)
  },
  reject: async (deviceId: number) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/devices/${deviceId}/reject`, { method: 'PATCH' })
    return handleResponse(response)
  },
  rename: async (deviceId: number, deviceName: string) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/devices/${deviceId}/rename`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_name: deviceName }),
    })
    return handleResponse(response)
  },
}

export const exportApi = {
  generateCsv: async (headers: string[], data: Record<string, unknown>[]) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/export/generate-csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headers, data }),
    })
    return handleBlobResponse(response)
  },
}

export const customerReviewsApi = {
  getAll: async (page = 1, pageSize = 10, reviewType: string | null = null, search: string | null = null) => {
    let url = `${OCR_API_URL}/api/v1/customer-reviews/?page=${page}&size=${pageSize}`
    if (reviewType) url += `&review_type=${reviewType}`
    if (search) url += `&search=${encodeURIComponent(search)}`
    const response = await fetch(url)
    return handleResponse(response)
  },
  getById: async (reviewId: number) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/customer-reviews/${reviewId}`)
    return handleResponse(response)
  },
  update: async (reviewId: number, data: Record<string, unknown>) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/customer-reviews/${reviewId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return handleResponse(response)
  },
  delete: async (reviewId: number) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/customer-reviews/${reviewId}`, {
      method: 'DELETE',
    })
    return handleResponse(response)
  },
  validate: async (reviewId: number) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/customer-reviews/${reviewId}/transfer`, {
      method: 'POST',
    })
    return handleResponse(response)
  },
  getFiles: async (reviewId: number) => {
    const response = await fetch(`${OCR_API_URL}/api/v1/customer-reviews/${reviewId}/files`)
    return handleResponse(response)
  },
}
