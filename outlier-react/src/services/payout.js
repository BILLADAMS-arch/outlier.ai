import { supabase, unwrap, rpc } from '../lib/supabase'

// The encrypted column is not selectable, so list the safe columns explicitly.
const COLS = 'user_id, method, display_mask, account_holder, bank_name, account_type, routing_last4, account_last4, status, review_note, created_at, updated_at, verified_at'
export const getMine = async (userId) => unwrap(await supabase.from('payout_accounts').select(COLS).eq('user_id', userId).maybeSingle())
export const listAll = async () => unwrap(await supabase.from('payout_accounts').select(COLS).order('created_at', { ascending: false }))
export const saveAirtm = ({ name, email, us }) => rpc('save_airtm_account', { p_name: name, p_email: email, p_us_confirmed: us })
export const save = ({ holder, bank, type, routing, account }) =>
  rpc('save_payout_account', { p_holder: holder, p_bank: bank, p_type: type, p_routing: routing, p_account: account })
export const review = (userId, status, note) => rpc('review_payout_account', { p_user: userId, p_status: status, p_note: note || '' })
export const reveal = (userId) => rpc('reveal_payout_account', { p_user: userId })

export const getTax = async (userId) => unwrap(await supabase.from('tax_forms').select('*').eq('user_id', userId).maybeSingle())
export const saveTax = async (userId, f) =>
  unwrap(await supabase.from('tax_forms').upsert({
    user_id: userId, form_type: f.formType, legal_name: f.legalName, classification: f.classification, tin_last4: f.tinLast4, certified: true, submitted_at: new Date().toISOString(),
  }).select().single())
