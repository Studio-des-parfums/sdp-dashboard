import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Field, inputClass } from './shared'
import { AVAILABLE_CURRENCIES, defaultVariant, type NonoData } from './useNonoData'

// Modal d'édition d'un produit, partagé entre la page Catalogues (créer/modifier depuis un catalogue)
// et la page Nouveautés (modifier un produit déjà marqué comme nouveau).
export default function NonoProductModal({ data }: { data: NonoData }) {
  const {
    productForm, setProductForm, loading, savingProduct, imageUploading,
    isProductModalOpen, setIsProductModalOpen, handleProductImageSelected, handleProductSubmit,
  } = data

  return (
    <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title={productForm.name || 'Nouveau produit'} size="lg">
      <form className="flex flex-col gap-3" onSubmit={handleProductSubmit}>
        <Field label="Nom du produit">
          <input className={inputClass} value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} required />
        </Field>
        <Field label="Description">
          <textarea className={inputClass} rows={3} value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
        </Field>
        <Field label="Image du produit" hint={imageUploading ? "Envoi de l'image en cours..." : 'Formats acceptés : JPG, PNG, WEBP, GIF (8 Mo max)'}>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={imageUploading} onChange={(e) => handleProductImageSelected(e.target.files?.[0] || null)} className="text-xs" />
        </Field>
        {productForm.imageUrl && (
          <img className="w-full max-h-40 object-contain bg-white border border-gray-200 rounded-lg" src={productForm.imageUrl} alt="Aperçu produit" />
        )}

        <label className="flex items-center gap-2 text-xs text-gray-700">
          <input type="checkbox" checked={productForm.isNew} onChange={(e) => setProductForm({ ...productForm, isNew: e.target.checked })} />
          Marquer ce produit comme nouveau
        </label>

        <Field label="Prix" hint="Un produit simple n'a qu'une ligne. Ajoute des lignes pour un produit décliné en plusieurs formats.">
          <div className="flex flex-col gap-2">
            {productForm.variants.map((variant, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  className={`${inputClass} flex-1`}
                  placeholder={productForm.variants.length > 1 ? 'Format (ex: 100ml)' : 'Format (optionnel)'}
                  value={variant.label}
                  onChange={(e) => {
                    const next = productForm.variants.slice()
                    next[index] = { ...variant, label: e.target.value }
                    setProductForm({ ...productForm, variants: next })
                  }}
                />
                <input
                  className={`${inputClass} w-24`}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Prix"
                  value={variant.price}
                  onChange={(e) => {
                    const next = productForm.variants.slice()
                    next[index] = { ...variant, price: e.target.value }
                    setProductForm({ ...productForm, variants: next })
                  }}
                  required
                />
                <select
                  className={`${inputClass} w-20`}
                  value={variant.currency}
                  onChange={(e) => {
                    const next = productForm.variants.slice()
                    next[index] = { ...variant, currency: e.target.value }
                    setProductForm({ ...productForm, variants: next })
                  }}
                >
                  {AVAILABLE_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {productForm.variants.length > 1 && (
                  <button
                    type="button"
                    className="text-xs text-red-700 hover:underline shrink-0"
                    onClick={() => setProductForm({ ...productForm, variants: productForm.variants.filter((_, i) => i !== index) })}
                  >
                    Retirer
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="text-xs text-indigo-600 hover:underline mt-2 text-left"
            onClick={() => setProductForm({ ...productForm, variants: [...productForm.variants, defaultVariant()] })}
          >
            + Ajouter un format
          </button>
        </Field>

        <Button type="submit" size="sm" loading={loading || savingProduct}>
          {savingProduct ? 'Enregistrement…' : 'Enregistrer le produit'}
        </Button>
      </form>
    </Modal>
  )
}
