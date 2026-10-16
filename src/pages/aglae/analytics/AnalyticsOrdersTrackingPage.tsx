// sdp-dashboard/src/pages/aglae/analytics/AnalyticsOrdersTrackingPage.tsx

import React, { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { PackageCheck, Clock, CheckCircle2, AlertTriangle, Users } from 'lucide-react'
import { customersApi, ordersApi } from '../../../api/ocrClient'
import { useToast } from '../../../components/ui/Toast'
import { formatNumber } from './analyticsUtils'

const COLORS = ['#996F56', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899']

interface AnalyticsData {
  distribution?: { label: string; value: number }[]
  topCustomers?: { id: number; name: string; total_orders: number; total_spent: number }[]
  total_customers?: number
}

interface Order {
  id: number
  order_type: string
  status: string
  created_at: string
  customer_name?: string
  formula_id?: number | null
}

export const AnalyticsOrdersTrackingPage: React.FC = () => {
  const { showError, showSuccess } = useToast()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [withoutFormula, setWithoutFormula] = useState<Order[]>([])
  const [inProgress, setInProgress] = useState<Order[]>([])
  const [completed, setCompleted] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)

  /**
   * Récupère la liste des commandes correspondant à un statut opérationnel donné.
   * Gère les variantes de structure de réponse de l'API (results, data ou orders).
   */
  const fetchOrders = async (status: string) => {
    const res = await ordersApi.getAll(1, 100, { status })
    return res.results || res.data || res.orders || []
  }

  /**
   * Charge simultanément les métriques analytiques clients et les 3 files de suivi des commandes :
   * - sans_formule : commandes en attente d'association avec une fiche parfum
   * - en_cours : fabrication ou préparation en cours en atelier
   * - terminee : commandes finalisées prêtes pour retrait ou expédition
   */
  const loadData = () => {
    customersApi
      .getAnalytics()
      .then(setAnalytics)
      .catch(() => showError('Erreur', 'Impossible de charger les statistiques clients'))
      .finally(() => setAnalyticsLoading(false))

    Promise.all([
      fetchOrders('sans_formule'),
      fetchOrders('en_cours'),
      fetchOrders('terminee'),
    ])
      .then(([wf, ip, co]) => {
        setWithoutFormula(wf)
        setInProgress(ip)
        setCompleted(co)
      })
      .catch(() => showError('Erreur', 'Impossible de charger les commandes'))
      .finally(() => setOrdersLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  /**
   * Met à jour le statut d'une commande (ex: passer de 'en_cours' à 'terminee')
   * et rafraîchit immédiatement les 3 files pour une mise à jour instantanée de l'UI.
   */
  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      await ordersApi.updateStatus(orderId, newStatus)
      showSuccess('Statut mis à jour')
      const [wf, ip, co] = await Promise.all([
        fetchOrders('sans_formule'),
        fetchOrders('en_cours'),
        fetchOrders('terminee'),
      ])
      setWithoutFormula(wf)
      setInProgress(ip)
      setCompleted(co)
    } catch {
      showError('Erreur', 'Impossible de mettre à jour le statut')
    }
  }

  const loading = analyticsLoading || ordersLoading

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-gray-200 rounded-xl" />
          <div className="h-72 bg-gray-200 rounded-xl" />
        </div>
        <div className="h-48 bg-gray-200 rounded-xl" />
        <div className="h-48 bg-gray-200 rounded-xl" />
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  const distribution = analytics?.distribution || []
  const topCustomers = analytics?.topCustomers || []

  const renderOrderTable = (
    title: string,
    icon: React.ReactNode,
    orders: Order[],
    statusActions: { label: string; status: string; color: string }[]
  ) => (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
      <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        {icon}
        {title} ({orders.length})
      </h2>
      {orders.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">Aucune commande</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px]">
                <th className="text-left py-2.5 px-3">Client</th>
                <th className="text-left py-2.5 px-3">Type</th>
                <th className="text-left py-2.5 px-3">Date</th>
                <th className="text-right py-2.5 px-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-gray-900">
                    {o.customer_name || `#${o.id}`}
                  </td>
                  <td className="py-2.5 px-3 text-gray-600">{o.order_type}</td>
                  <td className="py-2.5 px-3 text-gray-500">
                    {new Date(o.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex justify-end gap-1">
                      {statusActions.map((a) => (
                        <button
                          key={a.status}
                          type="button"
                          onClick={() => handleStatusChange(o.id, a.status)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${a.color}`}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <PackageCheck size={20} className="text-indigo-600" />
          Suivi Opérationnel des Commandes & Portefeuille Client
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Gestion du workflow de fabrication des formules et suivi des commandes sans formule, en cours ou terminées
        </p>
      </div>

      {/* Client Distribution & Top Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users size={16} className="text-indigo-600" />
            Répartition des types de clients
          </h2>
          {distribution.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">Aucune donnée</p>
          ) : (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={distribution}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={45}
                  >
                    {distribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#FFFFFF',
                      border: '1px solid #EAE2D9',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#2B211B',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {distribution.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-gray-100 pt-3">
              {distribution.map((d, i) => (
                <div key={d.label} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-gray-600">{d.label}</span>
                  <span className="ml-auto text-gray-900 font-semibold">{formatNumber(d.value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Top clients par dépenses</h2>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">Aucune donnée</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px]">
                    <th className="text-left py-2.5 px-3">#</th>
                    <th className="text-left py-2.5 px-3">Nom</th>
                    <th className="text-right py-2.5 px-3">Commandes</th>
                    <th className="text-right py-2.5 px-3">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {topCustomers.map((c, i) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 px-3 text-gray-500 font-medium">{i + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900">{c.name}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{c.total_orders}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-gray-900">
                        {c.total_spent ? `${c.total_spent.toFixed(2)} €` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Orders workflow tables */}
      {renderOrderTable(
        'Commandes sans formule',
        <AlertTriangle size={16} className="text-red-600" />,
        withoutFormula,
        [
          {
            label: 'Passer en cours',
            status: 'en_cours',
            color: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100',
          },
        ]
      )}

      {renderOrderTable(
        'En cours de traitement',
        <Clock size={16} className="text-amber-600" />,
        inProgress,
        [
          {
            label: 'Terminer',
            status: 'terminee',
            color: 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
          },
          {
            label: 'Sans formule',
            status: 'sans_formule',
            color: 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100',
          },
        ]
      )}

      {renderOrderTable(
        'Commandes terminées',
        <CheckCircle2 size={16} className="text-emerald-600" />,
        completed,
        [
          {
            label: 'Réouvrir en cours',
            status: 'en_cours',
            color: 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100',
          },
        ]
      )}
    </div>
  )
}
