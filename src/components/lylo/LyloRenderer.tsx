import LyloHomePage from '../../pages/lylo/LyloHomePage'
import LyloClientsPage from '../../pages/lylo/LyloClientsPage'
import LyloTeamPage from '../../pages/lylo/LyloTeamPage'
import LyloFormulesPage from '../../pages/lylo/LyloFormulesPage'
import LyloQuestionnairePage from '../../pages/lylo/LyloQuestionnairePage'
import LyloImprimantesPage from '../../pages/lylo/LyloImprimantesPage'
import LyloAnalysesPage from '../../pages/lylo/LyloAnalysesPage'

// Les notes olfactives (ex-"Ingrédients") sont désormais un référentiel partagé,
// géré depuis Admin > Notes olfactives plutôt que depuis ce menu Lylo.
const LYLO_PAGES: Record<string, React.ComponentType> = {
  accueil: LyloHomePage,
  clients: LyloClientsPage,
  equipe: LyloTeamPage,
  formules: LyloFormulesPage,
  questionnaire: LyloQuestionnairePage,
  imprimantes: LyloImprimantesPage,
  analyses: LyloAnalysesPage,
}

export default function LyloRenderer({ section }: { section: string }) {
  const Page = LYLO_PAGES[section]
  if (!Page) return <div className="text-sm text-gray-500 p-6">Section inconnue</div>
  return <Page />
}
