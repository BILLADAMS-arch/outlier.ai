import { createClient } from '@supabase/supabase-js'
import { config } from '../config'

export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey)

const camelKey = (k) => k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
/** Recursively converts snake_case keys from the database into camelCase. */
export const camel = (v) => {
  if (Array.isArray(v)) return v.map(camel)
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [camelKey(k), camel(x)]))
  return v
}

/** Returns data from a Supabase response or throws an Error with a readable message. */
export function unwrap({ data, error }) {
  if (error) throw Object.assign(new Error(error.message || 'Request failed'), { code: error.code })
  return camel(data)
}
export const rpc = async (name, args) => unwrap(await supabase.rpc(name, args))
