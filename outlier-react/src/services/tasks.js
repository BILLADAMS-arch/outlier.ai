import { supabase, unwrap } from '../lib/supabase'

const today = () => new Date().toISOString().slice(0, 10)
export const isOpenListing = (t) => t.status === 'published' && (!t.deadline || t.deadline >= today())

export const listTasks = async () =>
  unwrap(await supabase.from('tasks').select('*').order('posted_at', { ascending: false }).order('title'))
export const listCategories = async () => unwrap(await supabase.from('categories').select('*').order('name'))
export const getTask = async (id) => unwrap(await supabase.from('tasks').select('*').eq('id', id).maybeSingle())

const toRow = (t) => ({
  id: t.id, title: t.title, category_id: t.category, image: t.image, difficulty: t.difficulty, hourly_rate: t.hourlyRate,
  currency: 'USD', rate_type: t.rateType, estimated_hours: t.estimatedHours, experience: t.experience, skills: t.skills,
  summary: t.summary, description: t.description, responsibilities: t.responsibilities, deliverables: t.deliverables,
  qualifications: t.qualifications, apply_instructions: t.applyInstructions, objectives: t.objectives,
  instructions: t.instructions || null, guidelines: t.guidelines, posted_at: t.postedAt, deadline: t.deadline || null, status: t.status,
})
export const saveTask = async (t) => unwrap(await supabase.from('tasks').upsert(toRow(t)).select().single())
export const deleteTask = async (id) => unwrap(await supabase.from('tasks').delete().eq('id', id))
export const saveCategory = async (c) => unwrap(await supabase.from('categories').upsert(c).select().single())
export const deleteCategory = async (id) => unwrap(await supabase.from('categories').delete().eq('id', id))

/** Loads the bundled starter library (public/data/tasks.json) into an empty database. Admin only via RLS. */
export async function importStarterLibrary() {
  const res = await fetch('/data/tasks.json')
  if (!res.ok) throw new Error('The starter library file could not be loaded.')
  const seed = await res.json()
  const { error: catError } = await supabase.from('categories').upsert(seed.categories)
  if (catError) throw new Error(catError.message)
  const rows = seed.tasks.map((t) => toRow({ ...t, category: t.category, objectives: [], instructions: null, guidelines: [], hourlyRate: t.hourlyRate, estimatedHours: t.estimatedHours, rateType: t.rateType, applyInstructions: t.applyInstructions, postedAt: t.postedAt }))
  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await supabase.from('tasks').upsert(rows.slice(i, i + 50))
    if (error) throw new Error(error.message)
  }
  return seed.tasks.length
}
