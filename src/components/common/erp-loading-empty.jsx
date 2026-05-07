import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'

export function ErpLoadingEmpty({
  title = 'Cargando información',
  description = 'Estamos procesando los datos clínicos y administrativos. Por favor espera.',
  className,
}) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia>
          <Spinner />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export function ErpTableLoadingRow({
  colSpan,
  title = 'Cargando registros',
}) {
  return (
    <tr>
      <td className="px-4 py-4" colSpan={colSpan}>
        <ErpLoadingEmpty
          className="border-dashed"
          title={title}
          description="Estamos consultando la operación de la clínica."
        />
      </td>
    </tr>
  )
}

