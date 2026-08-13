import { useEffect, useState } from 'react'
import { useToast } from '../../components/ui/Toast'
import { nonoRequest, nonoUploadImage, getErrorMessage } from '../../api/nonoClient'

export interface RobotLocation {
  id: string | number
  name: string
  details?: string
  description?: string
  zone?: string
  robotCanNavigate: boolean
  isCurrentlyAvailable: boolean
}

export interface StoreInfoEntry {
  id: string | number
  title: string
  kind: string
  value: string
  startsAt?: string | null
  endsAt?: string | null
}

export interface ProductVariant {
  label: string
  price: number | string
  currency: string
}

export interface Product {
  id: string | number
  name: string
  description?: string
  imageUrl?: string
  isNew: boolean
  variants: ProductVariant[]
  catalogName?: string
}

export interface Catalog {
  id: string | number
  name: string
  description?: string
  locations?: RobotLocation[]
  products?: Product[]
}

export const AVAILABLE_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF']

export const defaultLocationForm = { id: '', name: '', details: '', robotCanNavigate: false, isCurrentlyAvailable: false }
export const defaultStoreInfoForm = { id: '', title: '', kind: 'general', value: '', startsAt: '', endsAt: '', isActive: true }
export const defaultCatalogForm = { id: '', name: '', description: '' }
export const defaultVariant = (): ProductVariant => ({ label: '', price: '', currency: 'EUR' })
export const defaultProductForm = { id: '', name: '', description: '', imageUrl: '', isNew: false, variants: [defaultVariant()] }

export function mapLocationToForm(location: RobotLocation) {
  return {
    id: String(location.id || ''),
    name: location.name || '',
    details: location.details || location.description || location.zone || '',
    robotCanNavigate: Boolean(location.robotCanNavigate),
    isCurrentlyAvailable: Boolean(location.isCurrentlyAvailable),
  }
}

export function mapStoreInfoToForm(entry: StoreInfoEntry) {
  return {
    id: String(entry.id || ''),
    title: entry.title || '',
    kind: entry.kind || 'general',
    value: entry.value || '',
    startsAt: entry.startsAt ? String(entry.startsAt).slice(0, 16) : '',
    endsAt: entry.endsAt ? String(entry.endsAt).slice(0, 16) : '',
    isActive: true,
  }
}

export function mapCatalogToForm(catalog: Catalog) {
  return { id: String(catalog.id || ''), name: catalog.name || '', description: catalog.description || '' }
}

export function mapProductToForm(product: Product) {
  const variants = Array.isArray(product.variants) && product.variants.length
    ? product.variants.map((v) => ({ label: v.label || '', price: v.price === null || v.price === undefined ? '' : String(v.price), currency: v.currency || 'EUR' }))
    : [defaultVariant()]
  return { id: String(product.id || ''), name: product.name || '', description: product.description || '', imageUrl: product.imageUrl || '', isNew: Boolean(product.isNew), variants }
}

export function formatPriceDisplay(price: number | string, currency: string) {
  if (price === null || price === undefined || price === '') return 'Prix non renseigné'
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency || 'EUR' }).format(Number(price))
  } catch {
    return `${price} ${currency || 'EUR'}`
  }
}

export function formatVariantsDisplay(variants: ProductVariant[]) {
  if (!Array.isArray(variants) || !variants.length) return 'Aucun prix renseigné'
  if (variants.length === 1) return formatPriceDisplay(variants[0].price, variants[0].currency)
  const cheapest = variants.slice().sort((a, b) => Number(a.price) - Number(b.price))[0]
  return `À partir de ${formatPriceDisplay(cheapest.price, cheapest.currency)} (${variants.length} formats)`
}

// Hook central : centralise l'état et les appels API du backoffice Nono,
// partagé par les différentes pages de section (Lieux, Catalogues, Nouveautés, Informations).
export function useNonoData() {
  const { showSuccess, showError } = useToast()

  const [backendOnline, setBackendOnline] = useState(false)
  const [locations, setLocations] = useState<RobotLocation[]>([])
  const [storeInfo, setStoreInfo] = useState<StoreInfoEntry[]>([])
  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [locationForm, setLocationForm] = useState(defaultLocationForm)
  const [storeInfoForm, setStoreInfoForm] = useState(defaultStoreInfoForm)
  const [catalogForm, setCatalogForm] = useState(defaultCatalogForm)
  const [catalogLocationIds, setCatalogLocationIds] = useState<string[]>([])
  const [productForm, setProductForm] = useState(defaultProductForm)
  const [loading, setLoading] = useState(false)
  const [togglingProductId, setTogglingProductId] = useState<string | number | null>(null)
  const [deletingCatalogId, setDeletingCatalogId] = useState<string | number | null>(null)
  const [savingProduct, setSavingProduct] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [killswitchEnabled, setKillswitchEnabled] = useState(false)
  const [killswitchLoading, setKillswitchLoading] = useState(false)

  const [isRobotLocationModalOpen, setIsRobotLocationModalOpen] = useState(false)
  const [isManualLocationModalOpen, setIsManualLocationModalOpen] = useState(false)
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)

  async function loadAll() {
    setLoading(true)
    try {
      const results = await Promise.allSettled([
        nonoRequest('/health'),
        nonoRequest('/api/locations'),
        nonoRequest('/api/store-info'),
        nonoRequest('/api/catalogs'),
        nonoRequest('/api/killswitch'),
      ])

      const [healthResult, locationsResult, storeInfoResult, catalogsResult, killswitchResult] = results
      const health = healthResult.status === 'fulfilled' ? healthResult.value : null
      const locationsResponse = locationsResult.status === 'fulfilled' ? locationsResult.value : null
      const storeInfoResponse = storeInfoResult.status === 'fulfilled' ? storeInfoResult.value : null
      const catalogsResponse = catalogsResult.status === 'fulfilled' ? catalogsResult.value : null
      const killswitchResponse = killswitchResult.status === 'fulfilled' ? killswitchResult.value : null

      setBackendOnline(health?.status === 'ok')
      setLocations(locationsResponse?.locations || [])
      setStoreInfo(storeInfoResponse?.entries || [])
      setCatalogs(catalogsResponse?.catalogs || [])
      setKillswitchEnabled(Boolean(killswitchResponse?.enabled))

      const errors = results.filter((r) => r.status === 'rejected').map((r) => getErrorMessage((r as PromiseRejectedResult).reason))
      if (!health) showError('Backend inaccessible', errors[0])
      else if (errors.length) showError('Backend connecté, mais incomplet', errors.join(' | '))
    } catch (error) {
      setBackendOnline(false)
      showError('Erreur', getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  async function handleRobotLocationModalSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!selectedLocationId) { showError('Aucun lieu robot sélectionné.'); return }
    setLoading(true)
    try {
      await nonoRequest('/api/admin/locations/upsert', { method: 'POST', body: JSON.stringify({ ...locationForm, details: locationForm.details || '' }) })
      await loadAll()
      showSuccess('Lieu robot enrichi.')
      setIsRobotLocationModalOpen(false)
    } catch (error) {
      showError('Erreur', getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  async function handleManualLocationModalSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    try {
      await nonoRequest('/api/admin/locations/upsert', { method: 'POST', body: JSON.stringify({ ...locationForm, robotCanNavigate: false, details: locationForm.details || '' }) })
      await loadAll()
      showSuccess('Lieu manuel enregistré.')
      setIsManualLocationModalOpen(false)
    } catch (error) {
      showError('Erreur', getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteLocation(location: RobotLocation) {
    if (!window.confirm(`Supprimer le lieu « ${location.name} » ?`)) return
    setLoading(true)
    try {
      await nonoRequest('/api/admin/locations/delete', { method: 'POST', body: JSON.stringify({ id: location.id }) })
      if (String(selectedLocationId) === String(location.id)) {
        setSelectedLocationId('')
        setIsRobotLocationModalOpen(false)
        setIsManualLocationModalOpen(false)
      }
      await loadAll()
      showSuccess('Lieu supprimé.')
    } catch (error) {
      showError('Erreur', getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  async function handleStoreInfoSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    try {
      await nonoRequest('/api/admin/store-info/upsert', {
        method: 'POST',
        body: JSON.stringify({ ...storeInfoForm, startsAt: storeInfoForm.startsAt || null, endsAt: storeInfoForm.endsAt || null }),
      })
      await loadAll()
      showSuccess('Information magasin enregistrée.')
    } catch (error) {
      showError('Erreur', getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  function openNewCatalogModal() {
    setCatalogForm(defaultCatalogForm)
    setCatalogLocationIds([])
    setIsCatalogModalOpen(true)
  }

  function openExistingCatalogModal(catalog: Catalog) {
    setCatalogForm(mapCatalogToForm(catalog))
    setCatalogLocationIds((catalog.locations || []).map((l) => String(l.id)))
    setIsCatalogModalOpen(true)
  }

  function toggleCatalogLocation(locationId: string) {
    setCatalogLocationIds((current) => (current.includes(locationId) ? current.filter((id) => id !== locationId) : [...current, locationId]))
  }

  async function handleCatalogSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    try {
      const response = await nonoRequest<{ catalog: Catalog }>('/api/admin/catalogs/upsert', { method: 'POST', body: JSON.stringify(catalogForm) })
      const savedCatalog = response.catalog
      setCatalogForm(mapCatalogToForm(savedCatalog))

      await nonoRequest('/api/admin/catalog-locations/replace', {
        method: 'POST',
        body: JSON.stringify({
          catalogId: savedCatalog.id,
          locations: catalogLocationIds.map((locationId, index) => ({ locationId, priority: (index + 1) * 10 })),
        }),
      })

      await loadAll()
      showSuccess('Catalogue enregistré.')
    } catch (error) {
      showError('Erreur', getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteCatalog(catalog: Catalog) {
    const productCount = (catalog.products || []).length
    const confirmed = window.confirm(
      `Supprimer le catalogue « ${catalog.name} » ? ${productCount ? `Les ${productCount} produit(s) qu'il contient et qui ne sont dans aucun autre catalogue seront aussi supprimés.` : ''}`
    )
    if (!confirmed) return

    setDeletingCatalogId(catalog.id)
    try {
      await nonoRequest('/api/admin/catalogs/delete', { method: 'POST', body: JSON.stringify({ id: catalog.id }) })
      if (String(catalogForm.id) === String(catalog.id)) setIsCatalogModalOpen(false)
      await loadAll()
      showSuccess('Catalogue supprimé.')
    } catch (error) {
      showError('Erreur', getErrorMessage(error))
    } finally {
      setDeletingCatalogId(null)
    }
  }

  function openNewProductModal() {
    setProductForm(defaultProductForm)
    setIsProductModalOpen(true)
  }

  function openExistingProductModal(product: Product) {
    setProductForm(mapProductToForm(product))
    setIsProductModalOpen(true)
  }

  async function handleProductImageSelected(file: File | null) {
    if (!file) return
    setImageUploading(true)
    try {
      const result = await nonoUploadImage(file)
      setProductForm((current) => ({ ...current, imageUrl: result.imageUrl }))
      showSuccess('Image envoyée.')
    } catch (error) {
      showError('Erreur', getErrorMessage(error))
    } finally {
      setImageUploading(false)
    }
  }

  async function handleToggleProductIsNew(product: Product) {
    const parentCatalog = catalogs.find((catalog) => (catalog.products || []).some((p) => String(p.id) === String(product.id)))
    if (!parentCatalog) {
      showError('Erreur', "Impossible de retrouver le catalogue de ce produit. Rafraîchis la page et réessaie.")
      return
    }

    setTogglingProductId(product.id)
    try {
      const response = await nonoRequest<{ catalogs: Catalog[] }>('/api/admin/catalog-products/replace', {
        method: 'POST',
        body: JSON.stringify({
          catalogId: parentCatalog.id,
          products: (parentCatalog.products || []).map((existingProduct, index) => ({
            id: existingProduct.id,
            name: existingProduct.name,
            description: existingProduct.description,
            imageUrl: existingProduct.imageUrl,
            isNew: String(existingProduct.id) === String(product.id) ? !existingProduct.isNew : existingProduct.isNew,
            variants: existingProduct.variants,
            priority: (index + 1) * 10,
          })),
        }),
      })
      setCatalogs(response.catalogs || [])
      showSuccess(product.isNew ? 'Produit retiré des nouveautés.' : 'Produit marqué comme nouveau.')
    } catch (error) {
      showError('Erreur', getErrorMessage(error))
    } finally {
      setTogglingProductId(null)
    }
  }

  async function handleDeleteProductFromCatalog(product: Product) {
    if (!catalogForm.id) return
    if (!window.confirm(`Retirer « ${product.name} » de ce catalogue ?`)) return

    setLoading(true)
    try {
      const currentCatalog = catalogs.find((c) => String(c.id) === String(catalogForm.id))
      const remainingProducts = (currentCatalog?.products || []).filter((p) => String(p.id) !== String(product.id))

      const response = await nonoRequest<{ catalogs: Catalog[] }>('/api/admin/catalog-products/replace', {
        method: 'POST',
        body: JSON.stringify({
          catalogId: catalogForm.id,
          products: remainingProducts.map((p, index) => ({ id: p.id, name: p.name, description: p.description, imageUrl: p.imageUrl, isNew: p.isNew, variants: p.variants, priority: (index + 1) * 10 })),
        }),
      })
      setCatalogs(response.catalogs || [])
      showSuccess('Produit retiré du catalogue.')
    } catch (error) {
      showError('Erreur', getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  async function handleProductSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!catalogForm.id) { showError("Enregistre d'abord le catalogue."); return }

    setSavingProduct(true)
    try {
      const cleanedVariants = productForm.variants
        .filter((v) => v.price !== '')
        .map((v, i) => ({ label: v.label || 'Standard', price: Number(v.price), currency: v.currency || 'EUR', priority: (i + 1) * 10 }))

      if (!cleanedVariants.length) {
        showError('Renseigne au moins un prix.')
        setSavingProduct(false)
        return
      }

      if (productForm.id) {
        await nonoRequest('/api/admin/products/upsert', {
          method: 'POST',
          body: JSON.stringify({ id: productForm.id, name: productForm.name, description: productForm.description || '', imageUrl: productForm.imageUrl || '', isNew: Boolean(productForm.isNew), variants: cleanedVariants }),
        })
        await loadAll()
      } else {
        const currentCatalog = catalogs.find((c) => String(c.id) === String(catalogForm.id))
        const existingProducts = currentCatalog?.products || []

        const nextProducts = [
          ...existingProducts.map((p) => ({ id: p.id, name: p.name, description: p.description, imageUrl: p.imageUrl, isNew: p.isNew, variants: p.variants })),
          { name: productForm.name, description: productForm.description || '', imageUrl: productForm.imageUrl || '', isNew: Boolean(productForm.isNew), variants: cleanedVariants },
        ].map((p, index) => ({ ...p, priority: (index + 1) * 10 }))

        const response = await nonoRequest<{ catalogs: Catalog[] }>('/api/admin/catalog-products/replace', { method: 'POST', body: JSON.stringify({ catalogId: catalogForm.id, products: nextProducts }) })
        setCatalogs(response.catalogs || [])
      }

      showSuccess('Produit enregistré.')
      setIsProductModalOpen(false)
    } catch (error) {
      showError('Erreur', getErrorMessage(error))
    } finally {
      setSavingProduct(false)
    }
  }

  async function handleKillswitchToggle() {
    const nextEnabled = !killswitchEnabled
    const confirmed = window.confirm(
      nextEnabled
        ? "Activer le killswitch va rendre l'application du robot inutilisable (écran blanc). Continuer ?"
        : "Désactiver le killswitch va rendre l'application du robot de nouveau utilisable. Continuer ?"
    )
    if (!confirmed) return

    setKillswitchLoading(true)
    try {
      const state = await nonoRequest<{ enabled: boolean }>('/api/admin/killswitch/set', { method: 'POST', body: JSON.stringify({ enabled: nextEnabled }) })
      setKillswitchEnabled(Boolean(state?.enabled))
      showSuccess(nextEnabled ? 'Killswitch activé.' : 'Killswitch désactivé.')
    } catch (error) {
      showError('Erreur', getErrorMessage(error))
    } finally {
      setKillswitchLoading(false)
    }
  }

  const newProducts = catalogs
    .flatMap((catalog) => (catalog.products || []).map((product) => ({ ...product, catalogName: catalog.name })))
    .filter((product) => product.isNew)
    .filter((product, index, all) => all.findIndex((other) => String(other.id) === String(product.id)) === index)

  const availableCount = locations.filter((l) => l.isCurrentlyAvailable).length
  const navigableCount = locations.filter((l) => l.robotCanNavigate).length
  const robotLocations = locations.filter((l) => l.robotCanNavigate)
  const manualLocations = locations.filter((l) => !l.robotCanNavigate)
  const activeCatalog = catalogs.find((c) => String(c.id) === String(catalogForm.id))

  return {
    backendOnline, locations, storeInfo, catalogs, selectedLocationId, setSelectedLocationId,
    locationForm, setLocationForm, storeInfoForm, setStoreInfoForm, catalogForm, setCatalogForm,
    catalogLocationIds, productForm, setProductForm, loading, togglingProductId, deletingCatalogId, savingProduct,
    imageUploading, killswitchEnabled, killswitchLoading,
    isRobotLocationModalOpen, setIsRobotLocationModalOpen, isManualLocationModalOpen, setIsManualLocationModalOpen,
    isCatalogModalOpen, setIsCatalogModalOpen, isProductModalOpen, setIsProductModalOpen,
    loadAll, handleRobotLocationModalSubmit, handleManualLocationModalSubmit, handleDeleteLocation,
    handleStoreInfoSubmit, openNewCatalogModal, openExistingCatalogModal, toggleCatalogLocation,
    handleCatalogSubmit, handleDeleteCatalog, openNewProductModal, openExistingProductModal,
    handleProductImageSelected, handleToggleProductIsNew, handleDeleteProductFromCatalog,
    handleProductSubmit, handleKillswitchToggle,
    newProducts, availableCount, navigableCount, robotLocations, manualLocations, activeCatalog,
  }
}

export type NonoData = ReturnType<typeof useNonoData>
