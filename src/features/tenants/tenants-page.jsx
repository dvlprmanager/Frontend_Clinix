import { CatalogPage } from '@/shared/components/catalog/catalog-page'
import { tenantsCatalogConfig } from '@/features/tenants/tenants.config'

export function TenantsPage() {
  return <CatalogPage config={tenantsCatalogConfig} />
}

