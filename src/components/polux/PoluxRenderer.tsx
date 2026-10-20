import PoluxHomePage from '../../pages/polux/PoluxHomePage'
import PoluxTeamPage from '../../pages/polux/PoluxTeamPage'
import PoluxLeadsPage from '../../pages/polux/PoluxLeadsPage'
import PoluxLeadFormPage from '../../pages/polux/PoluxLeadFormPage'

const TEAM_SECTION_PREFIX = 'team-'

interface PoluxRendererProps {
  section: string
  onTeamDeleted?: (teamSlug: string) => void
  onSectionChange?: (section: string) => void
  isAdmin?: boolean
}

export default function PoluxRenderer({ section, onTeamDeleted, onSectionChange, isAdmin }: PoluxRendererProps) {
  if (section === 'accueil') return <PoluxHomePage isAdmin={!!isAdmin} onOpenTeam={(slug) => onSectionChange?.(`team-${slug}`)} />
  if (section === 'leads') {
    return <PoluxLeadsPage onCreateLead={() => onSectionChange?.('leads-nouveau')} canManageAccess={!!isAdmin} />
  }
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
    return <PoluxTeamPage teamSlug={teamSlug} isAdmin={!!isAdmin} onDeleted={() => onTeamDeleted?.(teamSlug)} />
  }
  return <div className="text-sm text-gray-500">Section inconnue</div>
}
