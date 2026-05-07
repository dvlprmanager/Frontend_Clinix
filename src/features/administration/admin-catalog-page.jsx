import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CatalogPage } from '@/shared/components/catalog/catalog-page'
import { buildAdminCatalogPageConfig } from '@/features/administration/admin-catalogs.config'

export function AdminCatalogPage({ catalogKey }) {
  const config = buildAdminCatalogPageConfig(catalogKey)

  if (!config) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Catálogo no disponible</AlertTitle>
        <AlertDescription>La configuración del catálogo solicitado no existe.</AlertDescription>
      </Alert>
    )
  }

  return <CatalogPage config={config} />
}
