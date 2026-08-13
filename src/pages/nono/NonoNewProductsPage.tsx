import { formatVariantsDisplay, type NonoData } from './useNonoData'

export default function NonoNewProductsPage({ data }: { data: NonoData }) {
  const { newProducts, togglingProductId, handleToggleProductIsNew, openExistingProductModal } = data

  return (
    <div className="bg-gray-100 border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900">Nouveaux produits</h2>
        <p className="text-xs text-gray-600 mt-0.5">Clique sur un produit pour le modifier, ou retire-le des nouveautés directement.</p>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {newProducts.map((product) => (
          <div key={product.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              title="Cliquer pour modifier ce produit"
              className="w-full text-left hover:bg-gray-50 transition-colors"
              onClick={() => openExistingProductModal(product)}
            >
              {product.imageUrl ? (
                <img className="w-full h-28 object-cover" src={product.imageUrl} alt={product.name} />
              ) : (
                <div className="w-full h-28 bg-gray-200 flex items-center justify-center text-xs text-gray-500">Pas d'image</div>
              )}
              <div className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <strong className="text-sm text-gray-900">{product.name}</strong>
                  <span className="text-[10px] bg-indigo-600/10 text-indigo-600 px-1.5 py-0.5 rounded-full">Nouveau</span>
                </div>
                <p className="text-xs text-gray-600">{product.description || 'Aucune description'}</p>
                <p className="text-[10px] text-gray-500 mt-1">{formatVariantsDisplay(product.variants)}</p>
              </div>
            </button>
            <button
              type="button"
              disabled={togglingProductId === product.id}
              className="w-full text-xs text-red-700 hover:bg-red-500/10 px-3 py-1.5 border-t border-gray-200 transition-colors disabled:opacity-50"
              onClick={() => handleToggleProductIsNew(product)}
            >
              {togglingProductId === product.id ? '...' : 'Retirer des nouveautés'}
            </button>
          </div>
        ))}
        {!newProducts.length && (
          <p className="text-sm text-gray-600 text-center py-8 col-span-full">Aucun produit marqué comme nouveau pour le moment.</p>
        )}
      </div>
    </div>
  )
}
