import { CatalogPage } from '@/shared/components/catalog/catalog-page'
import { rolesCatalogConfig } from '@/features/roles/roles.config'
import { AssignRolePermissionsDialog } from '@/features/roles/assign-role-permissions-dialog'

export function RolesPage() {
  return (
    <CatalogPage
      config={{
        ...rolesCatalogConfig,
        renderCustomRowActions: (record) => (
          <AssignRolePermissionsDialog roleId={record.id} roleCode={record.code} roleName={record.name} />
        ),
      }}
    />
  )
}
