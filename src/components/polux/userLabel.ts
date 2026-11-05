import type { PoluxUserRef } from '../../types/polux'

/** Ancien membre (compte désactivé) : gardé pour l'historique, plus proposé à l'assignation. */
export function isFormerUser(user: PoluxUserRef): boolean {
  return user.is_active === false
}

/** Nom complet, suffixé « (ancien membre) » pour un compte désactivé. */
export function userFullName(user: PoluxUserRef): string {
  const name = `${user.first_name} ${user.last_name}`
  return isFormerUser(user) ? `${name} (ancien membre)` : name
}

/** Nom affiché d'un utilisateur Polux — « Moi » pour l'utilisateur connecté. */
export function userDisplayName(user: PoluxUserRef, currentUserEmail: string | null | undefined): string {
  return user.email === currentUserEmail ? 'Moi' : userFullName(user)
}

/** Utilisateurs proposables dans un sélecteur : les actifs, plus ceux déjà choisis (pour pouvoir les retirer). */
export function selectableUsers(users: PoluxUserRef[], keepIds: Array<number | null | undefined> = []): PoluxUserRef[] {
  return users.filter((u) => !isFormerUser(u) || keepIds.includes(u.id))
}

/** Utilisateur connecté en premier, puis ordre d'origine. */
export function currentUserFirst(users: PoluxUserRef[], currentUserEmail: string | null | undefined): PoluxUserRef[] {
  return [...users].sort((a, b) => Number(b.email === currentUserEmail) - Number(a.email === currentUserEmail))
}
