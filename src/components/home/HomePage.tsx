import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowUpLeft, Bug, CheckCircle2, HelpCircle, Inbox, LifeBuoy, Lightbulb, MessageSquare, Rocket, Send, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { useToast } from '../ui/Toast'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import type { Project } from '../../types'

interface HomePageProps {
  section: string
  projects: Project[]
  firstName?: string
  onOpenHelp: () => void
  onBackHome: () => void
}

interface SupportTicket {
  id: string
  category: string
  project: string
  priority: string
  subject: string
  description: string
  email: string
  createdAt: string
  status: 'Ouvert'
}

const STORAGE_KEY = 'sdp_support_tickets'

function loadTickets(): SupportTicket[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as SupportTicket[] : []
  } catch {
    return []
  }
}

function saveTickets(tickets: SupportTicket[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets))
  } catch {
    /* stockage indisponible */
  }
}

const FEATURES = [
  { icon: ShieldCheck, title: 'Sécurité renforcée', description: 'Authentification sécurisée et accès contrôlés à chaque espace de la plateforme.' },
  { icon: Zap, title: 'Rapidité', description: 'Des interfaces réactives et optimisées pour aller à l\'essentiel.' },
  { icon: Sparkles, title: 'Expérience moderne', description: 'Un design épuré et cohérent sur l\'ensemble de vos applications.' },
  { icon: Rocket, title: 'Évolutif', description: 'Une plateforme pensée pour accompagner la croissance de vos projets.' },
]

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

export default function HomePage({ section, projects, firstName, onOpenHelp, onBackHome }: HomePageProps) {
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
            Découvrir nos solutions
            <ArrowRight size={14} />
          </Button>
          <Button variant="secondary" onClick={onOpenHelp}>
            <LifeBuoy size={14} />
            Besoin d'aide ?
          </Button>
        </div>
      </section>

      <section id="solutions" className="mb-16 scroll-mt-24">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Nos solutions</h2>
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

      <section className="mb-16">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Pourquoi SDP ?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.title} className="bg-gray-100 rounded-xl border border-gray-200 p-5">
                <div className="w-9 h-9 rounded-lg bg-indigo-600/10 text-indigo-600 flex items-center justify-center mb-3">
                  <Icon size={16} />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed">{f.description}</p>
              </div>
            )
          })}
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
  const { showSuccess } = useToast()
  const [tickets, setTickets] = useState<SupportTicket[]>(loadTickets)
  const [category, setCategory] = useState('bug')
  const [project, setProject] = useState('SDP')
  const [priority, setPriority] = useState('Moyenne')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const ticket: SupportTicket = {
      id: `SDP-${String(tickets.length + 1).padStart(4, '0')}`,
      category: CATEGORIES.find((c) => c.id === category)?.label ?? category,
      project,
      priority,
      subject,
      description,
      email,
      createdAt: new Date().toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      }),
      status: 'Ouvert',
    }
    const next = [ticket, ...tickets]
    setTickets(next)
    saveTickets(next)
    showSuccess(`Ticket ${ticket.id} créé`, 'Notre équipe support va traiter votre demande.')
    setSubject('')
    setDescription('')
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
                  onClick={() => setCategory(c.id)}
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

        <Input
          label="E-mail de contact"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.fr"
        />

        <div className="flex items-center justify-end">
          <Button type="submit">
            <Send size={14} />
            Ouvrir le ticket
          </Button>
        </div>
      </form>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-900">Mes tickets</h2>
        <span className="text-xs text-gray-600">{tickets.length} ticket{tickets.length > 1 ? 's' : ''}</span>
      </div>

      {tickets.length === 0 ? (
        <div className="bg-gray-100 rounded-xl border border-gray-200 p-10 text-center">
          <Inbox size={28} className="text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Aucun ticket pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => {
            const CatIcon = CATEGORIES.find((c) => c.label === t.category)?.icon ?? MessageSquare
            return (
              <div key={t.id} className="bg-gray-100 rounded-xl border border-gray-200 p-4 flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-indigo-600/10 text-indigo-600 flex items-center justify-center shrink-0">
                  <CatIcon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-gray-900">{t.id}</span>
                    <span className="text-xs text-gray-600">{t.category}</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-600/10 text-indigo-600">{t.project || 'SDP'}</span>
                    <span className="text-[10px] text-gray-500 ml-auto">{t.createdAt}</span>
                  </div>
                  <p className="text-sm text-gray-900 font-medium truncate">{t.subject}</p>
                  <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{t.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityStyles[t.priority]}`}>
                      {t.priority}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
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
