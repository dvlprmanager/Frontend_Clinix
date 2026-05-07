import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { IconTooltipButton } from '@/components/common/icon-tooltip-button'
import { DataTable } from '@/components/ui/data-table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { buildVisiblePageNumbers } from '@/lib/pagination'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function EntityTable({
  columns,
  rows,
  isLoading,
  meta,
  onPageChange,
  renderRowActions,
  embedded = false,
  actionsColumnClassName = 'w-[220px] min-w-[220px]',
}) {
  const currentPage = Math.max(1, Number(meta?.page || 1))
  const totalPages = Math.max(1, Number(meta?.totalPages || 1))
  const pageNumbers = buildVisiblePageNumbers(currentPage, totalPages, 10)

  const renderCellValue = (column, row) => {
    const rawValue = row[column.key]
    const renderedValue = column.render ? column.render(rawValue, row) : rawValue

    if (column.variant === 'status-badge') {
      const isActive = Number(rawValue) === 1
      return (
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
            isActive
              ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
              : 'border-red-300 bg-red-100 text-red-700'
          }`}
        >
          {renderedValue}
        </span>
      )
    }

    if (typeof renderedValue === 'string' || typeof renderedValue === 'number') {
      const text = String(renderedValue)
      return (
        <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap" title={text}>
          {text}
        </span>
      )
    }

    return renderedValue
  }

  const desktopColumns = useMemo(
    () => [
      ...columns.map((column) => ({
        id: column.key,
        accessorKey: column.key,
        header: column.label,
        cell: ({ row }) => (
          <div className={`max-w-full overflow-hidden ${column.contentClassName || ''}`}>
            {renderCellValue(column, row.original)}
          </div>
        ),
        meta: {
          headerClassName: `${column.headerClassName || ''} font-semibold text-foreground`,
          cellClassName: `${column.cellClassName || ''} max-w-0 overflow-hidden align-top text-muted-foreground`,
        },
      })),
      {
        id: 'actions',
        header: () => <div className="text-center font-semibold text-foreground">Acciones</div>,
        cell: ({ row }) => (
          renderRowActions
            ? <div className="flex flex-nowrap justify-center gap-2 [&>*]:shrink-0">{renderRowActions(row.original)}</div>
            : null
        ),
        meta: {
          headerClassName: actionsColumnClassName,
          cellClassName: `${actionsColumnClassName} align-top`,
        },
      },
    ],
    [actionsColumnClassName, columns, renderRowActions],
  )

  if (isLoading) {
    return (
      <Card className={`flex h-full min-h-[420px] flex-col overflow-hidden ${embedded ? 'border-0 bg-transparent shadow-none' : ''}`}>
        <CardContent className="space-y-3 p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  const content = (
    <>
      <CardContent className="min-h-0 flex-1 overflow-y-auto p-0 sm:p-0">
        {rows.length === 0 ? (
          <div className="flex h-full min-h-[320px] items-center justify-center px-4 py-8 text-center text-sm text-muted-foreground">
            No hay registros para mostrar
          </div>
        ) : (
          <>
            <div className="grid gap-3 p-3 md:hidden">
              {rows.map((row) => (
                <div key={row.id} className="rounded-md border bg-background p-3">
                  <div className="space-y-2">
                    {columns.map((column) => (
                      <div key={`${row.id}-${column.key}`} className="flex items-start justify-between gap-3 text-sm">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{column.label}</span>
                        <span className="max-w-[65%] overflow-hidden text-right text-foreground">{renderCellValue(column, row)}</span>
                      </div>
                    ))}
                  </div>
                  {renderRowActions ? <div className="mt-3 flex flex-nowrap justify-end gap-2 border-t pt-3 [&>*]:shrink-0">{renderRowActions(row)}</div> : null}
                </div>
              ))}
            </div>

            <div className="hidden w-full overflow-x-auto md:block">
              <DataTable
                columns={desktopColumns}
                data={rows}
                emptyMessage="No hay registros para mostrar"
                tableClassName="min-w-[760px] table-fixed"
              />
            </div>
          </>
        )}
      </CardContent>

      <div className="flex flex-col gap-2 border-t px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
        <p className="text-muted-foreground">
          Pagina {meta?.page || 1} de {meta?.totalPages || 1} | Total: {meta?.total || 0}
        </p>
        <div className="flex items-center justify-end gap-2">
          <IconTooltipButton
            icon={ChevronLeft}
            label="Página anterior"
            variant="outline"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          />
          <div className="flex items-center gap-1">
            {pageNumbers.map((pageNumber) => (
              <TooltipProvider key={pageNumber}>
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      type="button"
                      variant={pageNumber === currentPage ? 'default' : 'outline'}
                      className="h-9 min-w-9 px-2"
                      onClick={() => onPageChange(pageNumber)}
                      aria-label={`Ir a página ${pageNumber}`}
                    >
                      {pageNumber}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{`Página ${pageNumber}`}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
          <IconTooltipButton
            icon={ChevronRight}
            label="Página siguiente"
            variant="outline"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          />
        </div>
      </div>
    </>
  )

  if (embedded) {
    return <div className="flex h-full min-h-[420px] flex-col overflow-hidden">{content}</div>
  }

  return (
    <Card className="flex h-full min-h-[420px] flex-col overflow-hidden">
      {content}
    </Card>
  )
}
