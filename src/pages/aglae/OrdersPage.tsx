import { useEffect, useState, useCallback } from 'react'
import { ordersApi } from '../../api/ocrClient'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

interface Order {
  id: number
  customer_name: string
  order_type: string
  status: string
  created_at: string
}

interface Filters {
  search: string
  status: string
  customerName: string
  dateFrom: string
  dateTo: string
  orderType: string
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  total_pages: number
}

const STATUS_OPTIONS = ['', 'pending', 'processing', 'completed', 'cancelled']
const TYPE_OPTIONS = ['', 'standard', 'express', 'bulk']

export default function OrdersPage({ onOpenOrder }: { onOpenOrder: (orderId: number) => void }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, total_pages: 0 })
  const [filters, setFilters] = useState<Filters>({ search: '', status: '', customerName: '', dateFrom: '', dateTo: '', orderType: '' })
  const [showFilters, setShowFilters] = useState(false)

  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const apiFilters: Record<string, string> = {}
      if (filters.status) apiFilters.status = filters.status
      if (filters.customerName) apiFilters.customerName = filters.customerName
      if (filters.dateFrom) apiFilters.dateFrom = filters.dateFrom
      if (filters.dateTo) apiFilters.dateTo = filters.dateTo
      if (filters.orderType) apiFilters.orderType = filters.orderType
      if (filters.search) apiFilters.search = filters.search

      const data = await ordersApi.getAll(page, pagination.pageSize, Object.keys(apiFilters).length ? apiFilters as any : undefined)
      setOrders(Array.isArray(data) ? data : data.orders ?? data.items ?? [])
      if (data.total !== undefined) setPagination(prev => ({ ...prev, page, total: data.total, total_pages: data.total_pages ?? Math.ceil(data.total / pagination.pageSize) }))
    } catch {
      setError('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.pageSize])

  useEffect(() => { fetchOrders(1) }, [])

  const handleFilter = () => { fetchOrders(1) }
  const resetFilters = () => {
    setFilters({ search: '', status: '', customerName: '', dateFrom: '', dateTo: '', orderType: '' })
    fetchOrders(1)
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-amber-500/10 text-amber-600',
      processing: 'bg-blue-500/10 text-blue-600',
      completed: 'bg-emerald-500/10 text-emerald-600',
      cancelled: 'bg-red-500/10 text-red-700',
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${colors[status] || 'bg-gray-300/10 text-gray-600'}`}>
        {status || 'unknown'}
      </span>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Orders</h1>
          <p className="text-xs text-gray-600 mt-0.5">
            {pagination.total > 0 ? `${pagination.total} order${pagination.total !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
          {showFilters ? '🔽 Hide Filters' : '🔼 Filters'}
        </Button>
      </div>

      {showFilters && (
        <div className="bg-gray-100 border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Input label="Search" placeholder="Order ID or keyword..." value={filters.search} onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))} />
            <Input label="Customer Name" placeholder="Filter by customer..." value={filters.customerName} onChange={e => setFilters(prev => ({ ...prev, customerName: e.target.value }))} />
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Status</label>
              <select value={filters.status} onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 transition-colors">
                <option value="">All</option>
                {STATUS_OPTIONS.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Order Type</label>
              <select value={filters.orderType} onChange={e => setFilters(prev => ({ ...prev, orderType: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 transition-colors">
                <option value="">All</option>
                {TYPE_OPTIONS.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Input label="Date From" type="date" value={filters.dateFrom} onChange={e => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))} />
            <Input label="Date To" type="date" value={filters.dateTo} onChange={e => setFilters(prev => ({ ...prev, dateTo: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={resetFilters}>Reset</Button>
            <Button size="sm" onClick={handleFilter}>Apply Filters</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-gray-100 border border-gray-200 rounded-xl p-4 animate-pulse flex gap-4">
              <div className="h-4 bg-gray-200 rounded w-16" />
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-4 bg-gray-200 rounded w-20 ml-auto" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-600">
          <span className="text-3xl mb-2">📦</span>
          <p className="text-sm">No orders found</p>
        </div>
      ) : (
        <>
          <div className="bg-gray-100 border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Order ID</th>
                  <th className="text-left px-4 py-3 font-medium">Customer</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr
                    key={o.id}
                    className="border-b border-gray-200/50 hover:bg-gray-100/60 cursor-pointer transition-colors"
                    onClick={() => onOpenOrder(o.id)}
                  >
                    <td className="px-4 py-3 text-gray-900 font-mono text-xs">#{o.id}</td>
                    <td className="px-4 py-3 text-gray-600">{o.customer_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{o.order_type || '—'}</td>
                    <td className="px-4 py-3">{statusBadge(o.status)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); onOpenOrder(o.id) }}>👁️</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-gray-600">
                Page {pagination.page} of {pagination.total_pages}
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={pagination.page <= 1} onClick={() => fetchOrders(pagination.page - 1)}>◀ Prev</Button>
                <Button variant="secondary" size="sm" disabled={pagination.page >= pagination.total_pages} onClick={() => fetchOrders(pagination.page + 1)}>Next ▶</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
