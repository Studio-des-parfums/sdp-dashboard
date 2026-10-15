import type { PoluxAttachment, PoluxComment, PoluxProject, PoluxReminder, PoluxTask, PoluxTeam, PoluxUserRef } from '../types/polux'

export const mockPoluxUsers: PoluxUserRef[] = [
  { id: 1, first_name: 'Thomas', last_name: 'Martin', email: 'thomas@sdp.fr' },
  { id: 2, first_name: 'Marine', last_name: 'Sola', email: 'marine@sdp.fr' },
  { id: 3, first_name: 'Lucas', last_name: 'Bernard', email: 'lucas@sdp.fr' },
  { id: 4, first_name: 'Chloé', last_name: 'Dubois', email: 'chloe@sdp.fr' },
  { id: 5, first_name: 'Hugo', last_name: 'Petit', email: 'hugo@sdp.fr' },
]

export const mockPoluxTeams: PoluxTeam[] = [
  { id: 1, slug: 'produit', name: 'Produit', color: '#6366f1', member_ids: [1, 2, 3] },
  { id: 2, slug: 'marketing', name: 'Marketing', color: '#ec4899', member_ids: [4, 5] },
  { id: 3, slug: 'support', name: 'Support', color: '#14b8a6', member_ids: [2, 5] },
]

export const mockPoluxProjects: PoluxProject[] = [
  { id: 1, team_id: 1, name: 'Refonte Aglae', description: 'Refonte de la marketplace B2B', color: '#f59e0b', archived: false },
  { id: 2, team_id: 1, name: 'Appli Ninno v2', description: 'Nouvelle version de l\'app mobile', color: '#10b981', archived: false },
  { id: 3, team_id: 2, name: 'Lancement campagne Q4', description: 'Campagne marketing fin d\'année', color: '#ec4899', archived: false },
  { id: 4, team_id: 3, name: 'Base de connaissance', description: 'Documentation support client', color: '#14b8a6', archived: false },
]

function iso(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString()
}

export const mockPoluxReminders: PoluxReminder[] = [
  { id: 1, task_id: 1, remind_at: iso(-1), sent: false },
  { id: 2, task_id: 3, remind_at: iso(2), sent: false },
]

export const mockPoluxAttachments: PoluxAttachment[] = [
  { id: 1, task_id: 2, filename: 'maquette-v2.png', url: 'https://example-bucket.s3.eu-west-3.amazonaws.com/polux/maquette-v2.png', content_type: 'image/png', size: 245_000, uploaded_by: 2, created_at: iso(-3) },
]

export const mockPoluxComments: PoluxComment[] = [
  { id: 1, task_id: 2, user_id: 1, body: 'On valide la maquette avant de dev ? @Marine Sola', mentioned_user_ids: [2], created_at: iso(-2) },
  { id: 2, task_id: 2, user_id: 2, body: 'Oui, je mets à jour les specs demain.', mentioned_user_ids: [], created_at: iso(-1) },
]

export const mockPoluxTasks: PoluxTask[] = [
  {
    id: 1, project_id: 1, team_id: 1, title: 'Corriger le bug d\'affichage des commandes',
    description: 'Les commandes annulées restent visibles dans la liste active.',
    assigned_to: 2, created_by: 1, priority: 'urgente', status: 'en_cours',
    deadline: iso(-1), created_at: iso(-7),
    reminders: mockPoluxReminders.filter(r => r.task_id === 1), attachments: [], comments: [],
  },
  {
    id: 2, project_id: 1, team_id: 1, title: 'Maquette de la nouvelle page produit',
    description: 'Proposer 2 variantes pour la fiche produit marketplace.',
    assigned_to: 2, created_by: 1, priority: 'haute', status: 'en_revision',
    deadline: iso(3), created_at: iso(-5),
    reminders: [], attachments: mockPoluxAttachments.filter(a => a.task_id === 2), comments: mockPoluxComments.filter(c => c.task_id === 2),
  },
  {
    id: 3, project_id: 2, team_id: 1, title: 'Intégrer le SDK de notifications push',
    description: '',
    assigned_to: 3, created_by: 1, priority: 'moyenne', status: 'a_faire',
    deadline: iso(5), created_at: iso(-2),
    reminders: mockPoluxReminders.filter(r => r.task_id === 3), attachments: [], comments: [],
  },
  {
    id: 4, project_id: 2, team_id: 1, title: 'Écrire les tests E2E du parcours de connexion',
    description: '',
    assigned_to: null, created_by: 1, priority: 'basse', status: 'a_faire',
    deadline: null, created_at: iso(-1),
    reminders: [], attachments: [], comments: [],
  },
  {
    id: 5, project_id: 3, team_id: 2, title: 'Rédiger les visuels réseaux sociaux',
    description: 'Visuels pour Instagram et LinkedIn, thème fêtes de fin d\'année.',
    assigned_to: 4, created_by: 4, priority: 'haute', status: 'en_cours',
    deadline: iso(1), created_at: iso(-4),
    reminders: [], attachments: [], comments: [],
  },
  {
    id: 6, project_id: 3, team_id: 2, title: 'Planifier le calendrier d\'envoi des emails',
    description: '',
    assigned_to: 5, created_by: 4, priority: 'moyenne', status: 'termine',
    deadline: iso(-5), created_at: iso(-10),
    reminders: [], attachments: [], comments: [],
  },
  {
    id: 7, project_id: 4, team_id: 3, title: 'Mettre à jour la FAQ sur les délais de livraison',
    description: '',
    assigned_to: 2, created_by: 5, priority: 'basse', status: 'a_faire',
    deadline: iso(10), created_at: iso(-1),
    reminders: [], attachments: [], comments: [],
  },
  {
    id: 8, project_id: 4, team_id: 3, title: 'Répondre aux tickets en attente (>48h)',
    description: '',
    assigned_to: 2, created_by: 5, priority: 'urgente', status: 'en_cours',
    deadline: iso(0), created_at: iso(-1),
    reminders: [], attachments: [], comments: [],
  },
]
