import { Button } from '../ui/Button'
import { StatCard } from '../../pages/nono/shared'
import { useNonoData } from '../../pages/nono/useNonoData'
import NonoLocationsPage from '../../pages/nono/NonoLocationsPage'
import NonoCatalogsPage from '../../pages/nono/NonoCatalogsPage'
import NonoNewProductsPage from '../../pages/nono/NonoNewProductsPage'
import NonoStoreInfoPage from '../../pages/nono/NonoStoreInfoPage'
import NonoProductModal from '../../pages/nono/NonoProductModal'

const SECTION_TITLES: Record<string, string> = {
  locations: 'Lieux',
  catalogs: 'Catalogues',
  'new-products': 'Nouveautés',
  'store-info': 'Informations',
}

export default function NonoRenderer({ section }: { section: string }) {
  const data = useNonoData()
  const {
    backendOnline, loading, loadAll, killswitchEnabled, killswitchLoading, handleKillswitchToggle,
    locations, storeInfo, catalogs, newProducts, navigableCount, availableCount,
  } = data

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">🤖 Nono — {SECTION_TITLES[section] ?? 'Backoffice magasin'}</h1>
          <p className="text-xs text-gray-600 mt-0.5">
            Lieux, catalogues, produits et informations générales du robot magasin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${backendOnline ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-700'}`}>
            {backendOnline ? 'Backend connecté' : 'Backend non vérifié'}
          </span>
          <Button variant="ghost" size="sm" onClick={loadAll} disabled={loading}>
            {loading ? '...' : '🔄 Rafraîchir'}
          </Button>
          <Button
            variant={killswitchEnabled ? 'danger' : 'secondary'}
            size="sm"
            onClick={handleKillswitchToggle}
            loading={killswitchLoading}
          >
            {killswitchEnabled ? 'Désactiver le killswitch' : 'Activer le killswitch'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Lieux connus" value={locations.length} />
        <StatCard label="Guidage possible" value={navigableCount} />
        <StatCard label="Disponibles maintenant" value={availableCount} />
        <StatCard label="Infos magasin" value={storeInfo.length} />
        <StatCard label="Catalogues" value={catalogs.length} />
        <StatCard label="Nouveaux produits" value={newProducts.length} />
      </div>

      {section === 'locations' ? (
        <NonoLocationsPage data={data} />
      ) : section === 'catalogs' ? (
        <NonoCatalogsPage data={data} />
      ) : section === 'new-products' ? (
        <NonoNewProductsPage data={data} />
      ) : section === 'store-info' ? (
        <NonoStoreInfoPage data={data} />
      ) : (
        <NonoLocationsPage data={data} />
      )}

      <NonoProductModal data={data} />
    </div>
  )
}
