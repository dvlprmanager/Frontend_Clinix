export const rolesCatalogConfig = {
  entity: 'roles',
  title: 'Roles',
  description: 'Administración de roles del sistema',
  searchPlaceholder: 'Buscar por código o nombre',
  pageSize: 10,
  sortBy: 'name',
  sortDir: 'asc',
  columns: [
    { key: 'code', label: 'Código' },
    { key: 'name', label: 'Nombre' },
    {
      key: 'estatus',
      label: 'Estado',
      render: (value) => (Number(value) === 1 ? 'Activo' : 'Inactivo'),
      variant: 'status-badge',
    },
  ],
  formFields: [
    {
      name: 'name',
      label: 'Nombre',
      required: true,
      placeholder: 'Doctor',
    },
  ],
  messages: {
    created: 'Rol creado correctamente',
    updated: 'Rol actualizado correctamente',
    deleted: 'Rol inactivado correctamente',
  },
}
