import { Button } from '../../components/ui/Button'
import { Field, inputClass } from './shared'
import { mapStoreInfoToForm, type NonoData } from './useNonoData'

export default function NonoStoreInfoPage({ data }: { data: NonoData }) {
  const { storeInfo, storeInfoForm, setStoreInfoForm, loading, handleStoreInfoSubmit } = data

  return (
    <div className="bg-gray-100 border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900">Informations générales</h2>
        <p className="text-xs text-gray-600 mt-0.5">Horaires, coordonnées, événements ou informations utiles que le robot doit savoir donner.</p>
      </div>
      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          {storeInfo.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="w-full text-left bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
              onClick={() => setStoreInfoForm(mapStoreInfoToForm(entry))}
            >
              <strong className="text-sm text-gray-900">{entry.title}</strong>
              <p className="text-xs text-gray-600">{entry.kind}</p>
              <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{entry.value}</p>
            </button>
          ))}
          {!storeInfo.length && <p className="text-sm text-gray-600 text-center py-8">Aucune information pour le moment.</p>}
        </div>

        <form className="flex flex-col gap-3" onSubmit={handleStoreInfoSubmit}>
          <Field label="Titre">
            <input className={inputClass} value={storeInfoForm.title} onChange={(e) => setStoreInfoForm({ ...storeInfoForm, title: e.target.value })} required />
          </Field>
          <Field label="Type">
            <select className={inputClass} value={storeInfoForm.kind} onChange={(e) => setStoreInfoForm({ ...storeInfoForm, kind: e.target.value })}>
              <option value="general">Général</option>
              <option value="hours">Horaires</option>
              <option value="phone">Téléphone</option>
              <option value="email">Email</option>
              <option value="event">Événement</option>
              <option value="service">Service</option>
              <option value="policy">Politique</option>
            </select>
          </Field>
          <Field label="Valeur">
            <textarea className={inputClass} rows={4} value={storeInfoForm.value} onChange={(e) => setStoreInfoForm({ ...storeInfoForm, value: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Début">
              <input type="datetime-local" className={inputClass} value={storeInfoForm.startsAt} onChange={(e) => setStoreInfoForm({ ...storeInfoForm, startsAt: e.target.value })} />
            </Field>
            <Field label="Fin">
              <input type="datetime-local" className={inputClass} value={storeInfoForm.endsAt} onChange={(e) => setStoreInfoForm({ ...storeInfoForm, endsAt: e.target.value })} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={storeInfoForm.isActive} onChange={(e) => setStoreInfoForm({ ...storeInfoForm, isActive: e.target.checked })} />
            Information active
          </label>
          <Button type="submit" size="sm" loading={loading}>Enregistrer l'information</Button>
        </form>
      </div>
    </div>
  )
}
