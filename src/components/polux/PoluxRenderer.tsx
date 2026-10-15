import PoluxHomePage from '../../pages/polux/PoluxHomePage'
import PoluxMyTasksPage from '../../pages/polux/PoluxMyTasksPage'
import PoluxTeamPage from '../../pages/polux/PoluxTeamPage'

const TEAM_SECTION_PREFIX = 'team-'

export default function PoluxRenderer({ section }: { section: string }) {
  if (section === 'accueil') return <PoluxHomePage />
  if (section === 'mes-taches') return <PoluxMyTasksPage />
  if (section.startsWith(TEAM_SECTION_PREFIX)) {
    return <PoluxTeamPage teamSlug={section.slice(TEAM_SECTION_PREFIX.length)} />
  }
  return <div className="text-sm text-gray-500 p-6">Section inconnue</div>
}
