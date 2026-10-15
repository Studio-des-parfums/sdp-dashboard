import type { PoluxUserRef } from '../../types/polux'

const ASSIGNED_LABEL = 'Personnes assignées'

interface CommentBodyProps {
  body: string
  users: PoluxUserRef[]
}

// Colore les mentions "@Prénom Nom" (et "@Personnes assignées") dans un commentaire déjà
// posté — on ne reconnaît que les noms correspondant à un utilisateur réel pour éviter de
// colorer un "@" suivi de texte qui n'est pas une mention.
export function CommentBody({ body, users }: CommentBodyProps) {
  const names = [ASSIGNED_LABEL, ...users.map((u) => `${u.first_name} ${u.last_name}`)]
    .sort((a, b) => b.length - a.length)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  if (names.length === 0) return <>{body}</>

  const pattern = new RegExp(`@(${names.join('|')})`, 'g')
  const parts = body.split(pattern)

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="font-semibold text-red-600">@{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}
