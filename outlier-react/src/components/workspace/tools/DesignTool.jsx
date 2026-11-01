import { useEffect, useState } from 'react'
import FilePanel from '../FilePanel'
import { Icon } from '../../ui'
import * as workspaceApi from '../../../services/workspace'

function Ref({ r }) {
  const [url, setUrl] = useState(r.url || null)
  useEffect(() => {
    let off = false
    if (r.path) workspaceApi.signedUrl('project-resources', r.path, 3600).then((u) => !off && setUrl(u), () => {})
    return () => { off = true }
  }, [r.path])
  const img = /^image\//.test(r.mime || '')
  return (
    <figure className="ref">
      {img && url ? <img src={url} alt={r.label} /> : <div className="ref-icon"><Icon name={r.url ? 'fa-link' : 'fa-file'} /></div>}
      <figcaption>{r.label}{url && <a href={url} target="_blank" rel="noopener noreferrer"> Open</a>}</figcaption>
    </figure>
  )
}

export default function DesignTool({ cfg, ctx }) {
  const refs = ctx.resources.filter((r) => r.kind !== 'audio')
  return (
    <div className="tool">
      {cfg.tools.includes('references') && (
        <section><h3>Project reference material</h3>
          {refs.length ? <div className="refs">{refs.map((r) => <Ref key={r.id} r={r} />)}</div> : <p className="muted small">No reference material was attached to this project.</p>}
        </section>
      )}
      {cfg.tools.includes('assets') && (
        <>
          <section><h3>Deliverables</h3>
            {cfg.requiredDeliverables.filter((d) => (d.kind || 'file') === 'file' && d.id !== 'files').map((d) => <FilePanel key={d.id} ctx={ctx} kind="deliverable" slot={d.id} title={d.label} />)}
            <FilePanel ctx={ctx} kind="deliverable" slot="files" title="Final files" hint="Uploading a file with the same name creates a new version; older versions are kept." />
          </section>
          <section><h3>Working assets</h3><FilePanel ctx={ctx} kind="attachment" hint="Sketches, source files, drafts and supporting images" /></section>
        </>
      )}
    </div>
  )
}
