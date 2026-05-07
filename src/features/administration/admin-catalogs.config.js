export const adminCatalogConfigs = {
  specialties: {
    entity: 'masters/specialties',
    title: 'Especialidades',
    description: 'Catálogo maestro de especialidades médicas',
    searchPlaceholder: 'Buscar por código o nombre',
    columns: [
      { key: 'code', label: 'Código' },
      { key: 'name', label: 'Nombre' },
      { key: 'estatus', label: 'Estado', render: (value) => (Number(value) === 1 ? 'Activo' : 'Inactivo'), variant: 'status-badge' },
    ],
  },
  'appointment-types': {
    entity: 'masters/appointment-types',
    title: 'Tipos de Cita',
    description: 'Catálogo de tipos de cita',
    searchPlaceholder: 'Buscar tipo de cita',
    columns: [
      { key: 'code', label: 'Código' },
      { key: 'name', label: 'Nombre' },
      { key: 'estatus', label: 'Estado', render: (value) => (Number(value) === 1 ? 'Activo' : 'Inactivo'), variant: 'status-badge' },
    ],
  },
  'appointment-status': {
    entity: 'masters/appointment-status',
    title: 'Estados de Cita',
    description: 'Catálogo de estados de citas',
    searchPlaceholder: 'Buscar estado',
    columns: [
      { key: 'code', label: 'Código' },
      { key: 'name', label: 'Nombre' },
      { key: 'estatus', label: 'Estado', render: (value) => (Number(value) === 1 ? 'Activo' : 'Inactivo'), variant: 'status-badge' },
    ],
  },
  'file-types': {
    entity: 'masters/file-types',
    title: 'Tipos de Archivo',
    description: 'Catálogo de tipos de archivo clínico',
    searchPlaceholder: 'Buscar tipo de archivo',
    columns: [
      { key: 'code', label: 'Código' },
      { key: 'name', label: 'Nombre' },
      { key: 'estatus', label: 'Estado', render: (value) => (Number(value) === 1 ? 'Activo' : 'Inactivo'), variant: 'status-badge' },
    ],
  },
  'storage-providers': {
    entity: 'masters/storage-providers',
    title: 'Proveedores de Almacenamiento',
    description: 'Catálogo de proveedores de almacenamiento',
    searchPlaceholder: 'Buscar proveedor',
    columns: [
      { key: 'code', label: 'Código' },
      { key: 'name', label: 'Nombre' },
      { key: 'estatus', label: 'Estado', render: (value) => (Number(value) === 1 ? 'Activo' : 'Inactivo'), variant: 'status-badge' },
    ],
  },
  'invoice-status': {
    entity: 'masters/invoice-status',
    title: 'Estados de Factura',
    description: 'Catálogo de estados de facturación',
    searchPlaceholder: 'Buscar estado de factura',
    columns: [
      { key: 'code', label: 'Código' },
      { key: 'name', label: 'Nombre' },
      { key: 'estatus', label: 'Estado', render: (value) => (Number(value) === 1 ? 'Activo' : 'Inactivo'), variant: 'status-badge' },
    ],
  },
  'payment-methods': {
    entity: 'masters/payment-methods',
    title: 'Métodos de Pago',
    description: 'Catálogo de métodos de pago',
    searchPlaceholder: 'Buscar método',
    columns: [
      { key: 'code', label: 'Código' },
      { key: 'name', label: 'Nombre' },
      { key: 'estatus', label: 'Estado', render: (value) => (Number(value) === 1 ? 'Activo' : 'Inactivo'), variant: 'status-badge' },
    ],
  },
  'payment-status': {
    entity: 'masters/payment-status',
    title: 'Estados de Pago',
    description: 'Catálogo de estados de pagos',
    searchPlaceholder: 'Buscar estado de pago',
    columns: [
      { key: 'code', label: 'Código' },
      { key: 'name', label: 'Nombre' },
      { key: 'estatus', label: 'Estado', render: (value) => (Number(value) === 1 ? 'Activo' : 'Inactivo'), variant: 'status-badge' },
    ],
  },
  'share-types': {
    entity: 'masters/share-types',
    title: 'Tipos de Compartición',
    description: 'Catálogo de tipos de compartición clínica',
    searchPlaceholder: 'Buscar tipo',
    columns: [
      { key: 'code', label: 'Código' },
      { key: 'name', label: 'Nombre' },
      { key: 'estatus', label: 'Estado', render: (value) => (Number(value) === 1 ? 'Activo' : 'Inactivo'), variant: 'status-badge' },
    ],
  },
  'share-standards': {
    entity: 'masters/share-standards',
    title: 'Estándares de Intercambio',
    description: 'Catálogo de estándares para intercambio clínico',
    searchPlaceholder: 'Buscar estándar',
    columns: [
      { key: 'code', label: 'Código' },
      { key: 'name', label: 'Nombre' },
      { key: 'description', label: 'Descripción', render: (value) => value || 'N/A' },
      { key: 'estatus', label: 'Estado', render: (value) => (Number(value) === 1 ? 'Activo' : 'Inactivo'), variant: 'status-badge' },
    ],
    formFields: [
      { name: 'name', label: 'Nombre', required: true, placeholder: 'HL7 FHIR' },
      { name: 'description', label: 'Descripción', placeholder: 'Descripción del estándar', fullWidth: true },
    ],
  },
  services: {
    entity: 'services',
    title: 'Servicios',
    description: 'Catálogo de servicios por clínica',
    searchPlaceholder: 'Buscar servicio',
    columns: [
      { key: 'code', label: 'Código' },
      { key: 'name', label: 'Nombre' },
      { key: 'description', label: 'Descripción', render: (value) => value || 'N/A' },
      { key: 'subtotal', label: 'Subtotal', render: (value) => `Q ${Number(value || 0).toFixed(2)}` },
      { key: 'tax_amount', label: 'IVA', render: (value) => `Q ${Number(value || 0).toFixed(2)}` },
      { key: 'default_price', label: 'Total', render: (value) => `Q ${Number(value || 0).toFixed(2)}` },
      { key: 'estatus', label: 'Estado', render: (value) => (Number(value) === 1 ? 'Activo' : 'Inactivo'), variant: 'status-badge' },
    ],
    formFields: [
      { name: 'name', label: 'Nombre', required: true, placeholder: 'Consulta General' },
      {
        name: 'description',
        label: 'Descripción',
        placeholder: 'Detalle para citas y facturación',
        fullWidth: true,
      },
      {
        name: 'default_price',
        label: 'Total (IVA incluido)',
        required: true,
        placeholder: '250.00',
        regex: '^\\d+(\\.\\d{1,2})?$',
        regexMessage: 'Número válido con hasta 2 decimales',
      },
      {
        name: 'tax_rate',
        label: 'IVA %',
        required: true,
        defaultValue: '12',
        placeholder: '12',
        regex: '^\\d+(\\.\\d{1,2})?$',
        regexMessage: 'Porcentaje válido',
        toFormValue: (rawValue) => {
          const numeric = Number(rawValue)
          if (!Number.isFinite(numeric)) return '12'
          return numeric <= 1 ? String((numeric * 100).toFixed(2).replace(/\.00$/, '')) : String(numeric)
        },
        fromFormValue: (rawValue) => {
          const numeric = Number(rawValue)
          if (!Number.isFinite(numeric)) return 12
          return numeric <= 1 ? numeric * 100 : numeric
        },
      },
      {
        name: 'subtotal',
        label: 'Subtotal (calculado)',
        readOnly: true,
        deriveValue: (values) => {
          const total = Number(values.default_price || 0)
          const ivaPercent = Number(values.tax_rate || 12)
          const rate = Number.isFinite(ivaPercent) ? (ivaPercent > 1 ? ivaPercent / 100 : ivaPercent) : 0.12
          const subtotal = total > 0 ? total / (1 + rate) : 0
          return subtotal.toFixed(2)
        },
      },
      {
        name: 'tax_amount',
        label: 'IVA (calculado)',
        readOnly: true,
        deriveValue: (values) => {
          const total = Number(values.default_price || 0)
          const subtotal = Number(values.subtotal || 0)
          const tax = total - subtotal
          return tax.toFixed(2)
        },
      },
    ],
  },
}

const defaultFormFields = [
  { name: 'name', label: 'Nombre', required: true, placeholder: 'Nombre del registro' },
]

export function buildAdminCatalogPageConfig(catalogKey) {
  const catalog = adminCatalogConfigs[catalogKey]
  if (!catalog) return null

  return {
    entity: catalog.entity,
    title: catalog.title,
    description: catalog.description,
    searchPlaceholder: catalog.searchPlaceholder || 'Buscar',
    pageSize: 10,
    sortBy: catalog.entity === 'services' ? 'name' : 'name',
    sortDir: 'asc',
    columns: catalog.columns,
    formFields: catalog.formFields || defaultFormFields,
    messages: {
      created: `${catalog.title} creado correctamente`,
      updated: `${catalog.title} actualizado correctamente`,
      deleted: `${catalog.title} inactivado correctamente`,
    },
  }
}
