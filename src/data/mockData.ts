import type { Dashboard, Notification, Project } from '../types'

export const mockUser = {
  firstName: 'Thomas',
}

export const mockNotifications: Notification[] = [
  { id: 1, message: 'Mise à jour SDP Core v2.4 déployée avec succès', time: 'Il y a 2 heures' },
  { id: 2, message: 'Nouveau rapport mensuel disponible dans Analytics', time: 'Il y a 5 heures' },
  { id: 3, message: 'Maintenance prévue sur Admin Portal ce weekend', time: 'Il y a 1 jour' },
]

export const mockProjects: Project[] = [
  { id: 1, name: 'Accueil', slug: 'sdp-core', description: 'Plateforme principale de gestion des paiements', color: '#996F56', status: 'active', created_at: '2024-01-01T00:00:00Z' },
  { id: 2, name: 'Aglae', slug: 'aglae', description: 'Place de marché B2B', color: '#f59e0b', status: 'active', created_at: '2024-01-01T00:00:00Z' },
  { id: 3, name: 'Ninno', slug: 'mobile-app', description: 'Application mobile clients', color: '#10b981', status: 'active', created_at: '2024-01-01T00:00:00Z' },
  { id: 4, name: 'Lylo', slug: 'lylo', description: 'Back-office Lylo', color: '#996f56', status: 'active', created_at: '2024-01-01T00:00:00Z' },
  { id: 5, name: 'Admin Portal', slug: 'admin-portal', description: "Portail d'administration interne", color: '#8b5cf6', status: 'maintenance', created_at: '2024-01-01T00:00:00Z' },
  { id: 6, name: 'Nono', slug: 'nono', description: 'Backoffice du robot magasin', color: '#0ea5e9', status: 'active', created_at: '2024-01-01T00:00:00Z' },
]

export const mockDashboards: Record<string, Dashboard> = {
  'sdp-core': {
    id: 1, name: 'Accueil', slug: 'sdp-core', description: 'Plateforme principale de gestion des paiements', color: '#996F56', status: 'active', created_at: '2024-01-01T00:00:00Z',
    sections: [
      { id: 'help', name: 'Besoin d\'aide ?', icon: 'Headphones', metricIds: [], chartIds: [] },
    ],
    metrics: [],
    charts: [],
  },
  'aglae': {
    id: 2, name: 'Aglae', slug: 'aglae', description: 'Place de marché B2B & OCR', color: '#f59e0b', status: 'active', created_at: '2024-01-01T00:00:00Z',
    sections: [
      { id: 'extraction', name: 'Extraction PDF', icon: 'FileText', metricIds: [], chartIds: [] },
      { id: 'clients', name: 'Clients', icon: 'Users', metricIds: [], chartIds: [] },
      { id: 'groups', name: 'Groupes', icon: 'Users', metricIds: [], chartIds: [] },
      { id: 'analysis', name: 'Analyse', icon: 'BarChart3', metricIds: [], chartIds: [] },
      { id: 'orders', name: 'Commandes', icon: 'ShoppingCart', metricIds: [], chartIds: [] },
      { id: 'devices', name: 'Appareils', icon: 'Tablet', metricIds: [], chartIds: [] },
    ],
    metrics: [
      { id: 5, project_id: 2, name: 'Vendeurs actifs', value: 3421, unit: '', type: 'number', change: 15.3 },
      { id: 6, project_id: 2, name: 'Produits listés', value: 28743, unit: '', type: 'number', change: 22.7 },
      { id: 7, project_id: 2, name: 'Panier moyen', value: 89.5, unit: '€', type: 'currency', change: 5.2 },
      { id: 8, project_id: 2, name: 'Commandes/jour', value: 1567, unit: '', type: 'number', change: 11.8 },
    ],
    charts: [
      { id: 4, title: 'Ventes par catégorie', type: 'bar', data: [
        { label: 'Électronique', value: 35 }, { label: 'Mode', value: 25 }, { label: 'Maison', value: 20 },
        { label: 'Sport', value: 12 }, { label: 'Autre', value: 8 },
      ]},
      { id: 5, title: 'Évolution du CA', type: 'line', data: [
        { label: 'Sem 1', value: 45000 }, { label: 'Sem 2', value: 52000 },
        { label: 'Sem 3', value: 48500 }, { label: 'Sem 4', value: 56000 },
      ]},
    ],
  },
  'mobile-app': {
    id: 3, name: 'Ninno', slug: 'mobile-app', description: 'Application mobile clients', color: '#10b981', status: 'active', created_at: '2024-01-01T00:00:00Z',
    sections: [
      { id: 'appearance', name: 'Apparence', icon: 'Image', metricIds: [], chartIds: [] },
      { id: 'notes', name: 'Notes', icon: 'StickyNote', metricIds: [], chartIds: [] },
    ],
    metrics: [],
    charts: [],
  },
  'lylo': {
    id: 4, name: 'Lylo', slug: 'lylo', description: 'Back-office Lylo', color: '#996f56', status: 'active', created_at: '2024-01-01T00:00:00Z',
    sections: [
      { id: 'accueil', name: 'Accueil', icon: 'LayoutDashboard', metricIds: [], chartIds: [] },
      { id: 'clients', name: 'Clients', icon: 'Users', metricIds: [], chartIds: [] },
      { id: 'equipe', name: 'Équipe', icon: 'Users', metricIds: [], chartIds: [] },
      { id: 'formules', name: 'Formules', icon: 'FlaskConical', metricIds: [], chartIds: [] },
      { id: 'questionnaire', name: 'Questionnaire', icon: 'ClipboardList', metricIds: [], chartIds: [] },
      { id: 'imprimantes', name: 'Imprimantes', icon: 'Printer', metricIds: [], chartIds: [] },
      { id: 'analyses', name: 'Analyses', icon: 'BarChart3', metricIds: [], chartIds: [] },
    ],
    metrics: [],
    charts: [],
  },
  'nono': {
    id: 6, name: 'Nono', slug: 'nono', description: 'Backoffice du robot magasin', color: '#0ea5e9', status: 'active', created_at: '2024-01-01T00:00:00Z',
    sections: [
      { id: 'locations', name: 'Lieux', icon: 'Bot', metricIds: [], chartIds: [] },
      { id: 'catalogs', name: 'Catalogues', icon: 'ShoppingCart', metricIds: [], chartIds: [] },
      { id: 'new-products', name: 'Nouveautés', icon: 'Store', metricIds: [], chartIds: [] },
      { id: 'store-info', name: 'Informations', icon: 'FileText', metricIds: [], chartIds: [] },
    ],
    metrics: [],
    charts: [],
  },
  'admin-portal': {
    id: 5, name: 'Admin Portal', slug: 'admin-portal', description: "Portail d'administration interne", color: '#8b5cf6', status: 'maintenance', created_at: '2024-01-01T00:00:00Z',
    sections: [
      { id: 'projects', name: 'Projets', icon: 'LayoutDashboard', metricIds: [], chartIds: [] },
      { id: 'users', name: 'Utilisateurs', icon: 'Users', metricIds: [], chartIds: [] },
      { id: 'tickets', name: 'Tickets', icon: 'Headphones', metricIds: [], chartIds: [] },
    ],
    metrics: [],
    charts: [
      { id: 10, title: 'Utilisation API', type: 'line', data: [
        { label: 'Lun', value: 12500 }, { label: 'Mar', value: 13100 }, { label: 'Mer', value: 12800 },
        { label: 'Jeu', value: 13400 }, { label: 'Ven', value: 14200 }, { label: 'Sam', value: 11500 },
        { label: 'Dim', value: 10900 },
      ]},
      { id: 11, title: 'Tickets par catégorie', type: 'bar', data: [
        { label: 'Bug', value: 40 }, { label: 'Feature', value: 25 },
        { label: 'Support', value: 20 }, { label: 'Autre', value: 15 },
      ]},
    ],
  },
}
