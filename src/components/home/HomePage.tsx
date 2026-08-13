import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowUpLeft, Bell, Bug, CheckCircle2, Headphones, HelpCircle, Inbox, LifeBuoy, Lightbulb, MessageSquare, Send, Sparkles } from 'lucide-react'
import { useToast } from '../ui/Toast'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useAuth } from '../../contexts/AuthContext'
import type { Project } from '../../types'
import { ticketsClient, type Ticket, type TicketCategory } from '../../api/ticketsClient'
import { notificationsClient, type AppNotification } from '../../api/notificationsClient'

interface HomePageProps {
  section: string
  projects: Project[]
  firstName?: string
  isAdmin?: boolean
  openTicketsCount?: number
  onOpenHelp: () => void
  onBackHome: () => void
  onOpenAdminTickets?: () => void
}

const CATEGORIES = [
  { id: 'bug', label: 'Bug / Problème', icon: Bug },
  { id: 'question', label: 'Question', icon: HelpCircle },
  { id: 'feature', label: 'Demande de fonctionnalité', icon: Lightbulb },
  { id: 'other', label: 'Autre', icon: MessageSquare },
]

const PRIORITIES = ['Basse', 'Moyenne', 'Haute']

const priorityStyles: Record<string, string> = {
  Basse: 'bg-gray-200/60 text-gray-600',
  Moyenne: 'bg-amber-500/10 text-amber-600',
  Haute: 'bg-red-500/10 text-red-600',
}

export default function HomePage({ section, projects, firstName, isAdmin, openTicketsCount = 0, onOpenHelp, onBackHome, onOpenAdminTickets }: HomePageProps) {
  const navigate = useNavigate()

  if (section === 'help') {
    return <HelpSection projects={projects} onBackHome={onBackHome} />
  }

  const solutions = projects.filter((p) => p.slug !== 'sdp-core')

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <section className="text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-indigo-600/10 text-indigo-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <Sparkles size={14} />
          Plateforme SDP
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
          {firstName ? (
            <>Bonjour <span className="text-indigo-600">{firstName}</span> 👋</>
          ) : (
            <>Bienvenue sur <span className="text-indigo-600">SDP</span></>
          )}
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
          La plateforme centralisée de gestion de vos applications : marketplace,
          application mobile et back-office, réunis dans un seul et même espace.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            onClick={() => document.getElementById('solutions')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Mes projets
            <ArrowRight size={14} />
          </Button>
          <Button variant="secondary" onClick={onOpenHelp}>
            <LifeBuoy size={14} />
            Besoin d'aide ?
          </Button>
        </div>
      </section>

      {isAdmin && openTicketsCount > 0 && (
        <button
          onClick={onOpenAdminTickets}
          className="w-full flex items-center gap-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 mb-16 text-left hover:border-amber-500/40 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
            <Headphones size={18} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">
              {openTicketsCount} ticket{openTicketsCount > 1 ? 's' : ''} support en attente
            </p>
            <p className="text-xs text-gray-600">Cliquez pour consulter et traiter les tickets ouverts.</p>
          </div>
          <ArrowRight size={16} className="text-amber-600 shrink-0" />
        </button>
      )}

      {!isAdmin && <NotificationsPanel />}

      <section id="solutions" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Projets</h2>
        <p className="text-sm text-gray-600 mb-6">
          Accédez à chacun de vos espaces directement depuis la plateforme.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {solutions.map((p) => (
            <button
              key={p.id}
              onClick={() => navigate(`/project/${p.slug}`)}
              className="group bg-gray-100 rounded-xl border border-gray-200 p-6 text-left transition-all hover:border-indigo-400 hover:shadow-md"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-900 font-bold text-sm mb-4"
                style={{ backgroundColor: p.color }}
              >
                {p.name.charAt(0)}
              </div>
              <h3 className="text-gray-900 font-semibold mb-1 group-hover:text-indigo-600 transition-colors">
                {p.name}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed mb-4">{p.description}</p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600">
                Ouvrir
                <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-indigo-500/20 bg-indigo-600/5 p-8 text-center">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Une question, un besoin ?</h2>
        <p className="text-sm text-gray-600 mb-5">
          Notre équipe support est là pour vous accompagner au quotidien.
        </p>
        <Button variant="secondary" onClick={onOpenHelp}>
          <LifeBuoy size={14} />
          Contacter le support
        </Button>
      </section>
    </div>
  )
}

function HelpSection({ projects, onBackHome }: { projects: Project[]; onBackHome: () => void }) {
  const { sdpUser } = useAuth()
  const { showSuccess, showError } = useToast()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<TicketCategory>('bug')
  const [project, setProject] = useState('SDP')
  const [priority, setPriority] = useState('Moyenne')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    ticketsClient.getTickets()
      .then(setTickets)
      .catch(() => { /* utilisateur non authentifié ou erreur réseau */ })
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const ticket = await ticketsClient.createTicket({ project, category, priority: priority as Ticket['priority'], subject, description })
      setTickets((prev) => [ticket, ...prev])
      showSuccess(`Ticket ${ticket.ticket_number} créé`, 'Notre équipe support va traiter votre demande.')
      setSubject('')
      setDescription('')
    } catch (err: any) {
      showError('Échec de la création du ticket', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const selectClassName = 'w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 transition-colors'

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <button
        onClick={onBackHome}
        className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1 text-xs mb-8"
      >
        <ArrowUpLeft size={14} />
        Retour à l'accueil
      </button>

      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600/10 text-indigo-600 mb-4">
          <LifeBuoy size={22} />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Ouvrir un ticket</h1>
        <p className="text-sm text-gray-600 max-w-md mx-auto">
          Décrivez votre problème ou votre demande, notre équipe support vous répondra rapidement.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-100 rounded-xl border border-gray-200 p-6 space-y-5 mb-10">
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Catégorie</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {CATEGORIES.map((c) => {
              const Icon = c.icon
              const selected = category === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id as TicketCategory)}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition-colors ${
                    selected
                      ? 'border-indigo-500 bg-indigo-600/10 text-indigo-600'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-indigo-300'
                  }`}
                >
                  <Icon size={16} />
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Projet concerné</label>
            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className={selectClassName}
            >
              <option value="SDP">SDP</option>
              {projects
                .filter((p) => p.slug !== 'sdp-core' && p.slug !== 'admin-portal')
                .map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Priorité</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className={selectClassName}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <Input
            label="Objet"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Résumez votre demande"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Description</label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez votre problème en détail..."
            rows={4}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none placeholder-gray-400 focus:border-indigo-500 transition-colors resize-none"
          />
        </div>

        <div className="flex items-center justify-between">
          {sdpUser && (
            <p className="text-xs text-gray-500">
              Envoyé en tant que <span className="text-gray-700 font-medium">{sdpUser.first_name} {sdpUser.last_name}</span> ({sdpUser.email})
            </p>
          )}
        </div>

        <div className="flex items-center justify-end">
          <Button type="submit" disabled={submitting}>
            <Send size={14} />
            {submitting ? 'Envoi...' : 'Ouvrir le ticket'}
          </Button>
        </div>
      </form>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-900">Mes tickets</h2>
        <span className="text-xs text-gray-600">{tickets.length} ticket{tickets.length > 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <p className="text-sm text-gray-600 text-center py-8">Chargement...</p>
      ) : tickets.length === 0 ? (
        <div className="bg-gray-100 rounded-xl border border-gray-200 p-10 text-center">
          <Inbox size={28} className="text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Aucun ticket pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => {
            const catInfo = CATEGORIES.find((c) => c.id === t.category)
            const CatIcon = catInfo?.icon ?? MessageSquare
            const statusStyle = t.status === 'Résolu' || t.status === 'Fermé'
              ? 'bg-emerald-500/10 text-emerald-600'
              : t.status === 'En cours'
                ? 'bg-blue-500/10 text-blue-600'
                : 'bg-amber-500/10 text-amber-600'
            return (
              <div key={t.id} className="bg-gray-100 rounded-xl border border-gray-200 p-4 flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-indigo-600/10 text-indigo-600 flex items-center justify-center shrink-0">
                  <CatIcon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-gray-900">{t.ticket_number}</span>
                    <span className="text-xs text-gray-600">{catInfo?.label ?? t.category}</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-600/10 text-indigo-600">{t.project_name || 'SDP'}</span>
                    <span className="text-[10px] text-gray-500 ml-auto">
                      {new Date(t.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 font-medium truncate">{t.subject}</p>
                  <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{t.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityStyles[t.priority]}`}>
                      {t.priority}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusStyle}`}>
                      <CheckCircle2 size={10} />
                      {t.status}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function NotificationsPanel() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    notificationsClient.getNotifications()
      .then(setNotifications)
      .catch(() => { /* utilisateur non authentifié ou erreur réseau */ })
      .finally(() => setLoading(false))
  }, [])

  const unread = notifications.filter((n) => !n.is_read)

  const markAllRead = async () => {
    if (unread.length === 0) return
    try {
      await notificationsClient.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch { /* ignore */ }
  }

  const markOneRead = async (n: AppNotification) => {
    if (n.is_read) return
    try {
      await notificationsClient.markAsRead(n.id)
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x))
    } catch { /* ignore */ }
  }

  if (loading || notifications.length === 0) return null

  return (
    <section className="mb-16">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-900">Notifications</h2>
          {unread.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {unread.length}
            </span>
          )}
        </div>
        {unread.length > 0 && (
          <button onClick={markAllRead} className="text-xs text-indigo-600 hover:text-indigo-500 transition-colors">
            Tout marquer comme lu
          </button>
        )}
      </div>
      <div className="space-y-2">
        {notifications.slice(0, 5).map((n) => (
          <button
            key={n.id}
            onClick={() => markOneRead(n)}
            className={`w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
              n.is_read ? 'bg-gray-100 border-gray-200' : 'bg-indigo-600/5 border-indigo-500/20'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.is_read ? 'bg-white text-gray-500' : 'bg-indigo-600/10 text-indigo-600'}`}>
              <Bell size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">{n.message}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {new Date(n.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {!n.is_read && <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5" />}
          </button>
        ))}
      </div>
    </section>
  )
}
