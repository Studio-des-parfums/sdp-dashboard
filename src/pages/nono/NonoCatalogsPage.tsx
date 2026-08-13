import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Field, inputClass } from './shared'
import { formatVariantsDisplay, type NonoData, type Product } from './useNonoData'

export default function NonoCatalogsPage({ data }: { data: NonoData }) {
  const {
    catalogs, locations, loading,
    deletingCatalogId, catalogForm, setCatalogForm, catalogLocationIds, toggleCatalogLocation,
    activeCatalog,
    isCatalogModalOpen, setIsCatalogModalOpen,
    openNewCatalogModal, openExistingCatalogModal, handleCatalogSubmit, handleDeleteCatalog,
    openNewProductModal, openExistingProductModal,
    handleDeleteProductFromCatalog,
  } = data

  return (
    <div className="space-y-6">
      <div className="bg-gray-100 border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Catalogues de produits</h2>
            <p className="text-xs text-gray-600 mt-0.5">Chaque catalogue se relie à un ou plusieurs lieux où le robot guide le client.</p>
          </div>
          <Button size="sm" variant="secondary" onClick={openNewCatalogModal}>+ Nouveau catalogue</Button>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {catalogs.map((catalog) => (
            <div key={catalog.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <button type="button" className="w-full text-left p-3 hover:bg-gray-50 transition-colors" onClick={() => openExistingCatalogModal(catalog)}>
                <div className="flex items-center justify-between mb-1">
                  <strong className="text-sm text-gray-900">{catalog.name}</strong>
                  <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{(catalog.products || []).length} produit(s)</span>
                </div>
                <p className="text-xs text-gray-600">{catalog.description || 'Aucune description'}</p>
                <p className="text-[10px] text-gray-500 mt-1">
                  {(catalog.locations || []).length ? `Lieux : ${catalog.locations!.map((l) => l.name).join(', ')}` : 'Aucun lieu associé'}
                </p>
              </button>
              <button
                type="button"
                disabled={deletingCatalogId === catalog.id}
                className="w-full text-xs text-red-700 hover:bg-red-500/10 px-3 py-1.5 border-t border-gray-200 transition-colors disabled:opacity-50"
                onClick={(e) => { e.stopPropagation(); handleDeleteCatalog(catalog) }}
              >
                {deletingCatalogId === catalog.id ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          ))}
          {!catalogs.length && (
            <p className="text-sm text-gray-600 text-center py-8 col-span-full">
              Aucun catalogue pour le moment. Crée un catalogue, associe-le à un lieu, puis ajoute des produits.
            </p>
          )}
        </div>
      </div>

      {/* Modal catalogue */}
      <Modal isOpen={isCatalogModalOpen} onClose={() => setIsCatalogModalOpen(false)} title={catalogForm.name || 'Nouveau catalogue'} size="lg">
        <p className="text-xs text-gray-600 mb-4">
          Un catalogue regroupe des produits (ex : « Sacs à main ») et se relie à un ou plusieurs lieux du magasin pour que le robot sache où l'orienter.
        </p>
        <form className="flex flex-col gap-3" onSubmit={handleCatalogSubmit}>
          <Field label="Nom du catalogue">
            <input className={inputClass} value={catalogForm.name} onChange={(e) => setCatalogForm({ ...catalogForm, name: e.target.value })} required />
          </Field>
          <Field label="Description">
            <textarea className={inputClass} rows={2} value={catalogForm.description} onChange={(e) => setCatalogForm({ ...catalogForm, description: e.target.value })} />
          </Field>
          <Field label="Lieux associés" hint="Le robot orientera le client vers l'un de ces lieux pour les produits de ce catalogue.">
            <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto bg-white border border-gray-200 rounded-lg p-2">
              {locations.map((location) => (
                <label key={location.id} className="flex items-center gap-2 text-xs text-gray-700">
                  <input type="checkbox" checked={catalogLocationIds.includes(String(location.id))} onChange={() => toggleCatalogLocation(String(location.id))} />
                  {location.name}
                </label>
              ))}
              {!locations.length && <span className="text-xs text-gray-500">Aucun lieu configuré pour le moment.</span>}
            </div>
          </Field>
          <Button type="submit" size="sm" loading={loading}>Enregistrer le catalogue</Button>
        </form>

        {catalogForm.id ? (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Produits du catalogue</h3>
              <Button size="sm" variant="secondary" onClick={openNewProductModal}>+ Ajouter un produit</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(activeCatalog?.products || []).map((product: Product) => (
                <div key={product.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden flex">
                  <button
                    type="button"
                    title="Cliquer pour modifier ce produit"
                    className="flex flex-1 min-w-0 text-left hover:bg-gray-50 transition-colors"
                    onClick={() => openExistingProductModal(product)}
                  >
                    {product.imageUrl ? (
                      <img className="w-20 h-20 object-cover shrink-0" src={product.imageUrl} alt={product.name} />
                    ) : (
                      <div className="w-20 h-20 shrink-0 bg-gray-200 flex items-center justify-center text-[10px] text-gray-500">Pas d'image</div>
                    )}
                    <div className="p-2 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <strong className="text-xs text-gray-900 truncate">{product.name}</strong>
                        {product.isNew && <span className="text-[9px] bg-indigo-600/10 text-indigo-600 px-1 py-0.5 rounded-full shrink-0">Nouveau</span>}
                      </div>
                      <p className="text-[10px] text-gray-600 truncate">{product.description || 'Aucune description'}</p>
                      <p className="text-[10px] text-gray-500">{formatVariantsDisplay(product.variants)}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    title="Retirer ce produit du catalogue"
                    className="shrink-0 self-stretch px-2 text-[10px] text-red-700 hover:bg-red-500/10 transition-colors border-l border-gray-200"
                    onClick={() => handleDeleteProductFromCatalog(product)}
                  >
                    Retirer
                  </button>
                </div>
              ))}
              {!(activeCatalog?.products || []).length && (
                <p className="text-xs text-gray-600 col-span-full text-center py-4">Aucun produit dans ce catalogue pour le moment.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-600 mt-4">Enregistre d'abord le catalogue pour pouvoir y ajouter des produits.</p>
        )}
      </Modal>
    </div>
  )
}
