import { useState } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { useToast } from '../../context/ToastContext'
import * as tasksApi from '../../services/tasks'
import { checkUnsplashId, unsplashId } from '../../utils/images'
import { EmptyState, Icon, Loaded } from '../../components/ui'
import FormDialog from '../../components/FormDialog'
import TaskPhoto from '../../components/TaskPhoto'

export default function AdminCategories() {
  const toast = useToast()
  const [editing, setEditing] = useState(undefined)
  const [confirm, setConfirm] = useState(null)
  const query = useAsync(async () => ({ categories: await tasksApi.listCategories(), tasks: await tasksApi.listTasks() }), [])

  return (
    <Loaded query={query}>
      {({ categories, tasks }) => {
        const used = (id) => tasks.filter((t) => t.categoryId === id).length
        return (
          <>
            <div className="toolbar"><button className="btn" onClick={() => setEditing(null)}><Icon name="fa-plus" /> New category</button></div>
            {categories.length ? categories.map((c) => (
              <div className="row-card" key={c.id}>
                <div className="thumb" style={{ width: 110 }}><TaskPhoto image={c.images[0]} icon={c.icon} w={160} h={100} /></div>
                <div className="grow"><h3><Icon name={c.icon} /> {c.name}</h3><p>{used(c.id)} projects · {c.images.length} photo{c.images.length === 1 ? '' : 's'}</p></div>
                <button className="btn secondary" onClick={() => setEditing(c)}>Edit</button>
                <button className="btn secondary danger-text" onClick={() => (used(c.id) ? toast.error('Move or delete this category\'s projects first.') : setConfirm(c))}>Delete</button>
              </div>
            )) : <EmptyState icon="fa-tags" title="No categories">Create one to organise projects.</EmptyState>}
            {confirm && <FormDialog title="Delete category?" intro={`“${confirm.name}” will be removed.`} danger confirmLabel="Delete" onClose={() => setConfirm(null)} onSubmit={async () => { await tasksApi.deleteCategory(confirm.id); toast.success('Category deleted.'); query.reload() }} />}
            {editing !== undefined && (
              <FormDialog title={editing ? 'Edit category' : 'New category'} confirmLabel="Save" onClose={() => setEditing(undefined)}
                initial={editing ? { name: editing.name, icon: editing.icon, images: editing.images.map((i) => `https://images.unsplash.com/${i}`).join('\n') } : { icon: 'fa-briefcase' }}
                fields={[
                  { name: 'name', label: 'Name', required: true, maxLength: 60 },
                  { name: 'icon', label: 'Font Awesome icon class', hint: 'e.g. fa-briefcase, fa-code' },
                  { name: 'images', label: 'Unsplash photo URLs (one per line)', type: 'textarea', required: true, maxLength: 800, hint: 'At least one https://images.unsplash.com/photo-… URL; each is checked before saving.' },
                ]}
                validate={(d) => {
                  const e = {}
                  if (d.name.length < 2) e.name = 'Enter a name.'
                  else if (categories.some((x) => x.name.toLowerCase() === d.name.toLowerCase() && x.id !== editing?.id)) e.name = 'A category with this name already exists.'
                  if (!/^fa-[a-z0-9-]+$/.test(d.icon)) e.icon = 'Use a class like fa-briefcase.'
                  if (d.images.split('\n').map((s) => s.trim()).filter(Boolean).some((u) => !unsplashId(u))) e.images = 'Every line must be an images.unsplash.com/photo-… URL.'
                  return e
                }}
                onSubmit={async (d) => {
                  const ids = [...new Set(d.images.split('\n').map((s) => s.trim()).filter(Boolean).map(unsplashId))]
                  for (const id of ids) if (!(await checkUnsplashId(id))) throw new Error(`Could not load ${id}.`)
                  await tasksApi.saveCategory({ id: editing?.id || d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), name: d.name, icon: d.icon, images: ids })
                  toast.success('Category saved.')
                  query.reload()
                }} />
            )}
          </>
        )
      }}
    </Loaded>
  )
}
