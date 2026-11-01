import { useEffect, useRef, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import * as workspaceApi from '../../services/workspace'
import { Icon } from '../ui'

const fmtSize = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)
const isImage = (mime) => /^image\/(png|jpe?g|gif|webp)$/.test(mime || '')

function Thumb({ file }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let off = false
    if (isImage(file.mime)) workspaceApi.signedUrl('workspace-files', file.path).then((u) => !off && setUrl(u), () => {})
    return () => { off = true }
  }, [file.path, file.mime])
  return url ? <img className="file-thumb" src={url} alt="" /> : <span className="file-icon"><Icon name={file.mime === 'application/pdf' ? 'fa-file-pdf' : file.mime?.startsWith('audio') ? 'fa-file-audio' : 'fa-file'} /></span>
}

/** Upload, list, preview, download and remove files of one kind. Files live in a private bucket and open through short-lived links. */
export default function FilePanel({ ctx, kind, slot, title, accept, hint }) {
  const toast = useToast()
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)
  const files = ctx.files.filter((f) => f.kind === kind && (slot == null || f.slot === slot))

  async function add(list) {
    setBusy(true)
    try {
      for (const file of list) await workspaceApi.uploadFile({ assignmentId: ctx.assignmentId, kind, slot, file })
      toast.success(list.length > 1 ? 'Files uploaded.' : 'File uploaded.')
      ctx.reloadFiles()
    } catch (e) { toast.error(e.message) } finally { setBusy(false); if (input.current) input.current.value = '' }
  }
  const open = async (f) => { try { window.open(await workspaceApi.signedUrl('workspace-files', f.path), '_blank', 'noopener') } catch (e) { toast.error(e.message) } }
  const remove = async (f) => { try { await workspaceApi.removeFile(f.id); ctx.reloadFiles() } catch (e) { toast.error(e.message) } }

  return (
    <div className="file-panel">
      {title && <h3>{title}</h3>}
      {!ctx.readOnly && (
        <div className={`dropzone${over ? ' over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files.length) add([...e.dataTransfer.files]) }}>
          <Icon name="fa-cloud-arrow-up" /> <span>{busy ? 'Uploading…' : 'Drop files here or'}</span>
          <button type="button" className="btn secondary" disabled={busy} onClick={() => input.current.click()}>Choose files</button>
          <input ref={input} type="file" multiple hidden accept={accept} onChange={(e) => e.target.files.length && add([...e.target.files])} />
          {hint && <small>{hint}</small>}
        </div>
      )}
      {files.length ? (
        <ul className="file-list">
          {files.map((f) => (
            <li key={f.id}>
              <Thumb file={f} />
              <div className="grow"><b>{f.name}</b><small>v{f.version} · {fmtSize(f.size)} · {new Date(f.createdAt).toLocaleString()}</small></div>
              <button type="button" className="link-btn" onClick={() => open(f)}>Open</button>
              {!ctx.readOnly && <button type="button" className="link-btn danger-text" onClick={() => remove(f)} aria-label={`Remove ${f.name}`}><Icon name="fa-trash" /></button>}
            </li>
          ))}
        </ul>
      ) : <p className="muted small">No files yet.</p>}
    </div>
  )
}
