import PoluxHomePage from '../../pages/polux/PoluxHomePage'
import PoluxMyTasksPage from '../../pages/polux/PoluxMyTasksPage'
import PoluxTeamPage from '../../pages/polux/PoluxTeamPage'
import PoluxLeadsPage from '../../pages/polux/PoluxLeadsPage'
import PoluxLeadFormPage from '../../pages/polux/PoluxLeadFormPage'

const TEAM_SECTION_PREFIX = 'team-'

interface PoluxRendererProps {
  section: string
  onTeamDeleted?: (teamSlug: string) => void
  onSectionChange?: (section: string) => void
}

export default function PoluxRenderer({ section, onTeamDeleted, onSectionChange }: PoluxRendererProps) {
  if (section === 'accueil') return <PoluxHomePage />
  if (section === 'mes-taches') return <PoluxMyTasksPage />
  if (section === 'leads') return <PoluxLeadsPage onCreateLead={() => onSectionChange?.('leads-nouveau')} />
  if (section === 'leads-nouveau') {
    return (
      <PoluxLeadFormPage
        onCreated={() => onSectionChange?.('leads')}
        onCancel={() => onSectionChange?.('leads')}
      />
    )
  }
  if (section.startsWith(TEAM_SECTION_PREFIX)) {
    const teamSlug = section.slice(TEAM_SECTION_PREFIX.length)
    return <PoluxTeamPage teamSlug={teamSlug} onDeleted={() => onTeamDeleted?.(teamSlug)} />
  }
  return <div className="text-sm text-gray-500 p-6">Section inconnue</div>
}
