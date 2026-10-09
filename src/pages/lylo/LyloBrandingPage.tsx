import { useEffect, useState } from 'react'
import { Trash2, Upload } from 'lucide-react'
import { lyloApi } from '../../api/lyloClient'
import { useToast } from '../../components/ui/Toast'

export default function LyloBrandingPage() {
  const { showSuccess, showError } = useToast()
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    lyloApi.getBranding()
      .then((data) => setLogoUrl(data.logo_url))
      .catch((err) => showError('Échec du chargement', err.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleUpload(file: File) {
    setBusy(true)
    try {
      const updated = await lyloApi.uploadLogo(file)
      setLogoUrl(updated.logo_url)
      showSuccess('Logo mis à jour')
    } catch (err) {
      showError('Échec de l\'upload', err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    try {
      await lyloApi.deleteLogo()
      setLogoUrl(null)
      showSuccess('Logo supprimé')
    } catch (err) {
      showError('Échec de la suppression', err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-2">Branding</h1>
      <p className="text-sm text-gray-600 mb-6">
        Logo secondaire affiché sur le site Lylo, à côté du logo du Studio des Parfums (barre de
        navigation et page d'accueil). S'il n'est pas renseigné, aucun logo additionnel n'est affiché.
      </p>

      <div className="bg-gray-100 rounded-xl border border-gray-200 p-6 max-w-md space-y-4">
        {loading ? (
          <p className="text-sm text-gray-600">Chargement...</p>
        ) : (
          <>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo secondaire" className="h-20 w-auto max-w-full object-contain border border-gray-200 rounded-lg bg-white p-3" />
            ) : (
              <div className="h-20 w-full flex items-center justify-center border border-dashed border-gray-300 rounded-lg text-xs text-gray-500">
                Aucun logo
              </div>
            )}

            <div className="flex gap-2">
              <label className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50">
                <Upload size={14} />
                {logoUrl ? 'Remplacer' : 'Choisir une image'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void handleUpload(f)
                    e.target.value = ''
                  }}
                />
              </label>
              {logoUrl && (
                <button
                  onClick={handleDelete}
                  disabled={busy}
                  className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-700 px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  <Trash2 size={14} /> Supprimer
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
