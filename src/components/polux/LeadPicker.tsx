import { useEffect, useMemo, useRef, useState } from 'react'
import { poluxApi } from '../../api/poluxClient'
import type { PoluxLead, PoluxTaskLead } from '../../types/polux'
import { FloatingPanel } from './FloatingPanel'

interface LeadPickerProps {
  value: number | null
  /** Lead déjà rattaché (renvoyé avec la tâche) — permet d'afficher son nom avant le chargement de la liste. */
  initialLead?: PoluxTaskLead | null
  onChange: (leadId: number | null) => void
}

export function leadLabel(lead: Pick<PoluxLead, 'first_name' | 'last_name' | 'company'>): string {
  const name = `${lead.first_name} ${lead.last_name}`
  return lead.company ? `${name} — ${lead.company}` : name
}

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Champ de recherche façon combobox : la liste complète des leads/prospects s'ouvre comme
// un select, et taper un nom (ou une société) la filtre.
export function LeadPicker({ value, initialLead = null, onChange }: LeadPickerProps) {
  const [leads, setLeads] = useState<PoluxLead[] | null>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const anchorRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open || leads) return
    poluxApi.getLeads().then(setLeads).catch(() => setLeads([]))
  }, [open, leads])

  const selectedLabel = useMemo(() => {
    if (value == null) return ''
    const lead = leads?.find((l) => l.id === value) ?? (initialLead?.id === value ? initialLead : null)
    return lead ? leadLabel(lead) : ''
  }, [value, leads, initialLead])

  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    if (!leads) return []
    return q ? leads.filter((l) => normalize(`${l.first_name} ${l.last_name} ${l.company ?? ''}`).includes(q)) : leads
  }, [leads, query])

  function select(leadId: number | null) {
    onChange(leadId)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <input
          ref={anchorRef}
          value={open ? query : selectedLabel}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher un client (lead / prospect)..."
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
        />
        {value != null && !open && (
          <button type="button" onClick={() => select(null)} className="shrink-0 text-xs text-gray-500 hover:text-gray-900">
            Retirer
          </button>
        )}
      </div>
      {open && (
        <FloatingPanel anchorRef={anchorRef} onClose={() => { setOpen(false); setQuery('') }} maxHeight={240}>
            {leads === null && <p className="px-3 py-2 text-sm text-gray-500">Chargement...</p>}
            {leads !== null && filtered.length === 0 && <p className="px-3 py-2 text-sm text-gray-500">Aucun client trouvé</p>}
            {filtered.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => select(l.id)}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${l.id === value ? 'font-medium text-indigo-600' : 'text-gray-700'}`}
              >
                {leadLabel(l)}
              </button>
            ))}
        </FloatingPanel>
      )}
    </div>
  )
}
