export function buildVisiblePageNumbers(currentPage, totalPages, maxVisible = 10) {
  const safeCurrentPage = Math.max(1, Number(currentPage || 1))
  const safeTotalPages = Math.max(1, Number(totalPages || 1))
  const safeMaxVisible = Math.max(1, Number(maxVisible || 10))

  if (safeTotalPages <= safeMaxVisible) {
    return Array.from({ length: safeTotalPages }, (_, index) => index + 1)
  }

  const halfWindow = Math.floor(safeMaxVisible / 2)
  let startPage = safeCurrentPage - halfWindow
  let endPage = startPage + safeMaxVisible - 1

  if (startPage < 1) {
    startPage = 1
    endPage = safeMaxVisible
  }

  if (endPage > safeTotalPages) {
    endPage = safeTotalPages
    startPage = safeTotalPages - safeMaxVisible + 1
  }

  return Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index)
}
