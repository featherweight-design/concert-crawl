import { QueryClient } from '@tanstack/react-query'

const STALE_30_MIN = 30 * 60 * 1000
const STALE_5_MIN = 5 * 60 * 1000

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_30_MIN,
        gcTime: 60 * 60 * 1000, // keep unused data 1 hour
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })
}

export { STALE_30_MIN, STALE_5_MIN }
