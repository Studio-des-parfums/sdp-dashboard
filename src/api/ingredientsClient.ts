// Référentiel de notes olfactives (table `ingredients` du dashboard SDP, partagé
// entre tous les projets) — utilisé par les formulaires de notes (FormulaDetailsPage,
// CustomerReviewsPage) à la place de listes codées en dur, pour rester à jour avec
// les notes gérées dans Admin > Coffrets et Notes.

const INGREDIENTS_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export async function fetchNoteNamesByType(ingredientType: 'top' | 'heart' | 'base'): Promise<string[]> {
  const res = await fetch(`${INGREDIENTS_API_URL}/ingredients?type=${ingredientType}&active_only=true`)
  if (!res.ok) return []
  const rows = await res.json() as Array<{ translations?: Record<string, string> }>
  return rows
    .map(r => r.translations?.fr)
    .filter((name): name is string => !!name && name.trim() !== '')
    .sort((a, b) => a.localeCompare(b, 'fr'))
}
