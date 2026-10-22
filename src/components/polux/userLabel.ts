import type { PoluxUserRef } from '../../types/polux'

/** Nom affiché d'un utilisateur Polux — « Moi » pour l'utilisateur connecté. */
export function userDisplayName(user: PoluxUserRef, currentUserEmail: string | null | undefined): string {
  return user.email === currentUserEmail ? 'Moi' : `${user.first_name} ${user.last_name}`
}

/** Utilisateur connecté en premier, puis ordre d'origine. */
export function currentUserFirst(users: PoluxUserRef[], currentUserEmail: string | null | undefined): PoluxUserRef[] {
  return [...users].sort((a, b) => Number(b.email === currentUserEmail) - Number(a.email === currentUserEmail))
}
