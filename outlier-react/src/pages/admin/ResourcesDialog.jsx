import { useRef, useState } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { useToast } from '../../context/ToastContext'
import * as workspaceApi from '../../services/workspace'
import FormDialog from '../../components/FormDialog'
import { Loaded } from '../../components/ui'
import { Modal } from '../../components/workspace/Dialogs'

/** Supporting documents, reference images and audio for a project. Files are private; only assigned taskers and admins can open them. */
export default function ResourcesDialog({ task, onClose }) {
  const toast = useToast()
  const query = useAsync(() => workspaceApi.listResources(task.id), [task.id])
  const input = useRef(null)
  const [kind, setKind] = useState('document')
  const [link, setLink] = useState(false)
  const [busy, setBusy] = useState(false)
  const upload = async (file) => {
    setBusy(true)
    try { await workspaceApi.uploadResource(task.id, file, kind); toast.success('Resource added.'); query.reload() } catch (e) { toast.error(e.message) } finally { setBusy(false); if (input.current) input.current.value = '' }
  }
  const open = async (r) => { try { window.open(r.url || (await workspaceApi.signedUrl('project-resources', r.path)), '_blank', 'noopener') } catch (e) { toast.error(e.message) } }
  return (
    <Modal title={`Resources: ${task.title}`} onClose={onClose} wide>
      <Loaded query={query}>
        {(rows) => (
          <>
            {rows.length ? <ul className="file-list">{rows.map((r) => <li key={r.id}><div className="grow"><b>{r.label}</b><small>{r.kind} · {r.url ? 'link' : 'file'}</small></div><button className="link-btn" onClick={() => open(r)}>Open</button><button className="link-btn danger-text" onClick={async () => { try { await workspaceApi.deleteResource(r); query.reload() } catch (e) { toast.error(e.message) } }}>Remove</button></li>)}</ul> : <p className="muted">No resources yet.</p>}
            <div className="inline-actions">
              <select aria-label="Resource type" value={kind} onChange={(e) => setKind(e.target.value)}><option value="document">Supporting document</option><option value="reference">Reference image or file</option><option value="audio">Audio recording</option></select>
              <button className="btn" disabled={busy} onClick={() => input.current.click()}>{busy ? 'Uploading…' : 'Upload file'}</button><input ref={input} type="file" hidden onChange={(e) => e.target.files[0] && upload(e.target.files[0])} />
              <button className="btn secondary" onClick={() => setLink(true)}>Add link</button>
            </div>
          </>
        )}
      </Loaded>
      <div className="modal-actions"><button className="btn secondary" onClick={onClose}>Close</button></div>
      {link && <FormDialog title="Add a link" confirmLabel="Add" onClose={() => setLink(false)} fields={[{ name: 'label', label: 'Label', required: true, maxLength: 200 }, { name: 'url', label: 'Address', type: 'url', required: true, placeholder: 'https://…' }]}
        validate={(d) => ({ url: /^https?:\/\/\S+$/i.test(d.url) ? '' : 'Enter a link starting with http:// or https://' })} onSubmit={async (d) => { await workspaceApi.addLinkResource(task.id, d.label, d.url, kind === 'audio' ? 'audio' : 'link'); query.reload() }} />}
    </Modal>
  )
}
