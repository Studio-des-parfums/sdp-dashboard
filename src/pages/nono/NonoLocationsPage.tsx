import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Field, inputClass } from './shared'
import { mapLocationToForm, defaultLocationForm, type NonoData } from './useNonoData'

export default function NonoLocationsPage({ data }: { data: NonoData }) {
  const {
    robotLocations, manualLocations, loading, locationForm, setLocationForm,
    setSelectedLocationId,
    isRobotLocationModalOpen, setIsRobotLocationModalOpen,
    isManualLocationModalOpen, setIsManualLocationModalOpen,
    handleRobotLocationModalSubmit, handleManualLocationModalSubmit, handleDeleteLocation,
  } = data

  return (
    <div className="space-y-6">
      {/* Lieux robot */}
      <div className="bg-gray-100 border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Lieux récupérés via le robot</h2>
            <p className="text-xs text-gray-600 mt-0.5">Points réellement navigables et leur disponibilité actuelle.</p>
          </div>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {robotLocations.map((location) => (
            <div key={location.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                className="w-full text-left p-3 hover:bg-gray-50 transition-colors"
                onClick={() => { setSelectedLocationId(String(location.id)); setLocationForm(mapLocationToForm(location)); setIsRobotLocationModalOpen(true) }}
              >
                <div className="flex items-center justify-between mb-1">
                  <strong className="text-sm text-gray-900">{location.name}</strong>
                  <span className={`w-2 h-2 rounded-full ${location.isCurrentlyAvailable ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                </div>
                <p className="text-xs text-gray-600">{location.details || location.description || 'Aucune information renseignée'}</p>
                <p className="text-[10px] text-gray-500 mt-1">
                  {location.robotCanNavigate ? 'Guidage possible' : 'Info seule'} · {location.isCurrentlyAvailable ? 'Disponible' : 'Indisponible'}
                </p>
              </button>
              <button
                type="button"
                className="w-full text-xs text-red-700 hover:bg-red-500/10 px-3 py-1.5 border-t border-gray-200 transition-colors"
                onClick={(e) => { e.stopPropagation(); handleDeleteLocation(location) }}
              >
                Supprimer
              </button>
            </div>
          ))}
          {!robotLocations.length && (
            <p className="text-sm text-gray-600 text-center py-8 col-span-full">
              Aucun lieu reçu du robot pour le moment. Ouvre l'accueil de l'app robot pour lancer la synchronisation.
            </p>
          )}
        </div>
      </div>

      {/* Lieux manuels */}
      <div className="bg-gray-100 border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Lieux ajoutés manuellement</h2>
            <p className="text-xs text-gray-600 mt-0.5">Lieux non atteignables par le robot mais dont il doit connaître l'existence.</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => { setLocationForm({ ...defaultLocationForm, robotCanNavigate: false }); setSelectedLocationId(''); setIsManualLocationModalOpen(true) }}
          >
            + Nouveau lieu manuel
          </Button>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {manualLocations.map((location) => (
            <div key={location.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                className="w-full text-left p-3 hover:bg-gray-50 transition-colors"
                onClick={() => { setSelectedLocationId(String(location.id)); setLocationForm(mapLocationToForm(location)); setIsManualLocationModalOpen(true) }}
              >
                <div className="flex items-center justify-between mb-1">
                  <strong className="text-sm text-gray-900">{location.name}</strong>
                  <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">Info seule</span>
                </div>
                <p className="text-xs text-gray-600">{location.details || location.description || 'Aucune information renseignée'}</p>
                <p className="text-[10px] text-gray-500 mt-1">Lieu non navigable par le robot</p>
              </button>
              <button
                type="button"
                className="w-full text-xs text-red-700 hover:bg-red-500/10 px-3 py-1.5 border-t border-gray-200 transition-colors"
                onClick={(e) => { e.stopPropagation(); handleDeleteLocation(location) }}
              >
                Supprimer
              </button>
            </div>
          ))}
          {!manualLocations.length && (
            <p className="text-sm text-gray-600 text-center py-8 col-span-full">
              Aucun lieu manuel pour l'instant.
            </p>
          )}
        </div>
      </div>

      {/* Modal lieu robot */}
      <Modal isOpen={isRobotLocationModalOpen} onClose={() => setIsRobotLocationModalOpen(false)} title={locationForm.name || 'Édition du lieu'} size="md">
        <p className="text-xs text-gray-600 mb-4">
          Renseigne ici les précisions utiles sur ce lieu. Les catalogues de produits présents ici se gèrent depuis la section Catalogues.
        </p>
        <form className="flex flex-col gap-3" onSubmit={handleRobotLocationModalSubmit}>
          <Field label="Nom du lieu">
            <input className={inputClass} value={locationForm.name} onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })} required />
          </Field>
          <Field label="Informations sur le lieu">
            <textarea className={inputClass} rows={3} value={locationForm.details} onChange={(e) => setLocationForm({ ...locationForm, details: e.target.value })} />
          </Field>
          <Button type="submit" size="sm" loading={loading}>Enregistrer ce lieu</Button>
        </form>
      </Modal>

      {/* Modal lieu manuel */}
      <Modal isOpen={isManualLocationModalOpen} onClose={() => setIsManualLocationModalOpen(false)} title={locationForm.name || 'Nouveau lieu manuel'} size="md">
        <p className="text-xs text-gray-600 mb-4">
          Ajoute ici un lieu connu du magasin que le robot ne peut pas atteindre, mais sur lequel il doit pouvoir informer le client.
        </p>
        <form className="flex flex-col gap-3" onSubmit={handleManualLocationModalSubmit}>
          <Field label="Nom du lieu">
            <input className={inputClass} value={locationForm.name} onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })} required />
          </Field>
          <Field label="Informations sur le lieu">
            <textarea className={inputClass} rows={3} value={locationForm.details} onChange={(e) => setLocationForm({ ...locationForm, details: e.target.value })} />
          </Field>
          <Button type="submit" size="sm" loading={loading}>Enregistrer le lieu manuel</Button>
        </form>
      </Modal>
    </div>
  )
}
