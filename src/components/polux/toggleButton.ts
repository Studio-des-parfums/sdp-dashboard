/** Bouton-pile de la barre d'actions d'une tâche ("+ checklist", "+ client") : coloré quand son champ est ouvert. */
export function toggleButtonClass(active: boolean): string {
  return `inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium shadow-sm transition-colors ${
    active
      ? 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-500'
      : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-400 hover:text-indigo-600'
  }`
}
