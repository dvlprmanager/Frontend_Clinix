import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCatalogItem, deleteCatalogItem, listCatalog, patchCatalogItem, updateCatalogItem } from '@/shared/api/catalog-api'

export function useCatalogList(entity, query) {
  return useQuery({
    queryKey: [entity, query],
    queryFn: () => listCatalog(entity, query),
    placeholderData: keepPreviousData,
  })
}

export function useCatalogMutations(entity) {
  const queryClient = useQueryClient()

  const invalidateEntity = async () => {
    await queryClient.invalidateQueries({
      queryKey: [entity],
      exact: false,
    })
  }

  const createMutation = useMutation({
    mutationFn: (payload) => createCatalogItem(entity, payload),
    onSuccess: invalidateEntity,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateCatalogItem(entity, id, payload),
    onSuccess: invalidateEntity,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteCatalogItem(entity, id),
    onSuccess: invalidateEntity,
  })

  const patchStatusMutation = useMutation({
    mutationFn: ({ id, payload }) => patchCatalogItem(entity, id, payload),
    onSuccess: invalidateEntity,
  })

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    patchStatusMutation,
  }
}

