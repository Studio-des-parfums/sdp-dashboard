import type { PoluxAttachment, PoluxComment, PoluxLead, PoluxLeadInteraction, PoluxReminder, PoluxTask, PoluxTeam, PoluxUserRef } from '../types/polux'

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
    id: 1, project_name: 'Refonte Aglae', team_id: 1, title: 'Corriger le bug d\'affichage des commandes',
    description: 'Les commandes annulées restent visibles dans la liste active.',
    assigned_to_ids: [2], created_by: 1, priority: 'urgente', color: '#ef4444', status: 'en_cours',
    start_date: iso(-10), deadline: iso(-1), created_at: iso(-7),
    reminders: mockPoluxReminders.filter(r => r.task_id === 1), attachments: [], comments: [],
  },
  {
    id: 2, project_name: 'Refonte Aglae', team_id: 1, title: 'Maquette de la nouvelle page produit',
    description: 'Proposer 2 variantes pour la fiche produit marketplace.',
    assigned_to_ids: [2], created_by: 1, priority: 'haute', color: '#f59e0b', status: 'en_revision',
    start_date: iso(-5), deadline: iso(3), created_at: iso(-5),
    reminders: [], attachments: mockPoluxAttachments.filter(a => a.task_id === 2), comments: mockPoluxComments.filter(c => c.task_id === 2),
  },
  {
    id: 3, project_name: 'Appli Ninno v2', team_id: 1, title: 'Intégrer le SDK de notifications push',
    description: '',
    assigned_to_ids: [3], created_by: 1, priority: 'moyenne', color: null, status: 'a_faire',
    start_date: null, deadline: iso(5), created_at: iso(-2),
    reminders: mockPoluxReminders.filter(r => r.task_id === 3), attachments: [], comments: [],
  },
  {
    id: 4, project_name: 'Appli Ninno v2', team_id: 1, title: 'Écrire les tests E2E du parcours de connexion',
    description: '',
    assigned_to_ids: [], created_by: 1, priority: 'basse', color: null, status: 'a_faire',
    start_date: null, deadline: null, created_at: iso(-1),
    reminders: [], attachments: [], comments: [],
  },
  {
    id: 5, project_name: 'Lancement campagne Q4', team_id: 2, title: 'Rédiger les visuels réseaux sociaux',
    description: 'Visuels pour Instagram et LinkedIn, thème fêtes de fin d\'année.',
    assigned_to_ids: [4], created_by: 4, priority: 'haute', color: '#6366f1', status: 'en_cours',
    start_date: iso(-4), deadline: iso(1), created_at: iso(-4),
    reminders: [], attachments: [], comments: [],
  },
  {
    id: 6, project_name: 'Lancement campagne Q4', team_id: 2, title: 'Planifier le calendrier d\'envoi des emails',
    description: '',
    assigned_to_ids: [5], created_by: 4, priority: 'moyenne', color: '#10b981', status: 'termine',
    start_date: iso(-10), deadline: iso(-5), created_at: iso(-10),
    reminders: [], attachments: [], comments: [],
  },
  {
    id: 7, project_name: 'Base de connaissance', team_id: 3, title: 'Mettre à jour la FAQ sur les délais de livraison',
    description: '',
    assigned_to_ids: [2], created_by: 5, priority: 'basse', color: null, status: 'a_faire',
    start_date: null, deadline: iso(10), created_at: iso(-1),
    reminders: [], attachments: [], comments: [],
  },
  {
    id: 8, project_name: 'Base de connaissance', team_id: 3, title: 'Répondre aux tickets en attente (>48h)',
    description: '',
    assigned_to_ids: [2], created_by: 5, priority: 'urgente', color: '#ef4444', status: 'en_cours',
    start_date: null, deadline: iso(0), created_at: iso(-1),
    reminders: [], attachments: [], comments: [],
  },
]

export const mockPoluxLeadInteractions: PoluxLeadInteraction[] = [
  { id: 1, lead_id: 1, author_id: 2, body: 'Premier contact téléphonique, devis à préparer.', created_at: iso(-6) },
  { id: 2, lead_id: 1, author_id: 2, body: 'Devis envoyé par mail.', created_at: iso(-4) },
]

export const mockPoluxLeads: PoluxLead[] = [
  {
    id: 1, contact_type: 'particulier', last_name: 'Dupont', first_name: 'Julie',
    phone: '06 12 34 56 78', email: 'julie.dupont@example.com', company: null,
    info: 'Intéressée par une prestation pour un anniversaire de 40 ans.',
    project_name: 'Anniversaire Julie D.', project_date: iso(30),
    first_deposit_date: null, second_deposit_date: null,
    status: 'a_relancer', call_date: iso(-6), next_follow_up_at: iso(1),
    assigned_to_id: 2, created_by: 2, created_at: iso(-6),
    interactions: mockPoluxLeadInteractions.filter((i) => i.lead_id === 1),
  },
  {
    id: 2, contact_type: 'professionnel', last_name: 'Moreau', first_name: 'Antoine',
    phone: '06 98 76 54 32', email: 'a.moreau@entreprise-exemple.fr', company: 'Entreprise Exemple SAS',
    info: 'Soirée d\'entreprise pour 80 personnes, date à confirmer.',
    project_name: 'Soirée fin d\'année Entreprise Exemple', project_date: iso(60),
    first_deposit_date: iso(-1), second_deposit_date: null,
    status: 'acompte_1_recu', call_date: iso(-10), next_follow_up_at: iso(14),
    assigned_to_id: 2, created_by: 2, created_at: iso(-10),
    interactions: [],
  },
  {
    id: 3, contact_type: 'particulier', last_name: 'Lefèvre', first_name: 'Sophie',
    phone: '07 11 22 33 44', email: 'sophie.lefevre@example.com', company: null,
    info: 'Mariage, demande de devis envoyée mais aucune nouvelle depuis.',
    project_name: 'Mariage Sophie & Karim', project_date: null,
    first_deposit_date: null, second_deposit_date: null,
    status: 'nouveau', call_date: iso(0), next_follow_up_at: null,
    assigned_to_id: null, created_by: 2, created_at: iso(0),
    interactions: [],
  },
]
