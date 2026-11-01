import { useAsync } from './useAsync'
import * as profilesApi from '../services/profiles'

/** Admin: all profiles plus an id -> name lookup. */
export function useProfiles() {
  const query = useAsync(profilesApi.listAll, [], { refreshOnFocus: true })
  const names = Object.fromEntries((query.data || []).map((p) => [p.id, p.displayName]))
  return { ...query, names, nameOf: (id) => names[id] || 'Unknown user' }
}
