import PocketBase from 'pocketbase'

const PB_URL = process.env.NEXT_PUBLIC_PB_URL || 'http://127.0.0.1:8090'

function createPb() {
  const instance = new PocketBase(PB_URL)
  // Disable auto-cancellation globally — prevents ClientResponseError 0
  // when the same request key fires multiple times (e.g. React StrictMode,
  // rapid re-renders, or concurrent useEffect calls).
  instance.autoCancellation(false)
  return instance
}

let pb: PocketBase

if (typeof window !== 'undefined') {
  // Browser singleton — reuse across hot-reloads in dev
  if (!(global as any).__pb) {
    ;(global as any).__pb = createPb()
  }
  pb = (global as any).__pb
} else {
  pb = createPb()
}

export default pb
export { PocketBase }

/**
 * Helper: get a collection proxy where every method has requestKey:null
 * so PocketBase never auto-cancels duplicate requests (safe for React StrictMode).
 */
export function col(name: string) {
  const c = pb.collection(name)
  return {
    getList: (page: number, perPage: number, opts?: any) =>
      c.getList(page, perPage, { requestKey: null, ...opts }),
    getFullList: (opts?: any) =>
      c.getFullList({ requestKey: null, ...opts }),
    getOne: (id: string, opts?: any) =>
      c.getOne(id, { requestKey: null, ...opts }),
    create: (data: any, opts?: any) =>
      c.create(data, { requestKey: null, ...opts }),
    update: (id: string, data: any, opts?: any) =>
      c.update(id, data, { requestKey: null, ...opts }),
    delete: (id: string, opts?: any) =>
      c.delete(id, { requestKey: null, ...opts }),
  }
}
