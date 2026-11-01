import { useEffect, useRef, useState } from 'react'
import FilePanel from '../FilePanel'
import { Icon } from '../../ui'
import { download } from '../../../utils/csv'
import * as workspaceApi from '../../../services/workspace'

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export default function TranscriptionTool({ cfg, ws, ctx }) {
  const audio = useRef(null)
  const area = useRef(null)
  const [sources, setSources] = useState([])        // [{ id, label, url }]
  const [current, setCurrent] = useState(null)
  const [state, setState] = useState({ playing: false, time: 0, duration: 0, rate: 1 })
  const [error, setError] = useState('')
  const text = ws.data.transcript || ''

  // Audio comes from the project's resources or from audio files uploaded to this workspace (private, short-lived links).
  const audioFiles = ctx.files.filter((f) => f.kind === 'audio')
  const audioKey = audioFiles.map((f) => f.id).join(',') + '|' + ctx.resources.map((r) => r.id).join(',')
  useEffect(() => {
    let off = false
    ;(async () => {
      const list = []
      for (const r of ctx.resources.filter((x) => x.kind === 'audio' || /^audio\//.test(x.mime || ''))) {
        try { list.push({ id: r.id, label: r.label, url: r.url || (await workspaceApi.signedUrl('project-resources', r.path, 3600)) }) } catch { /* skip an unreadable file */ }
      }
      for (const f of audioFiles) {
        try { list.push({ id: f.id, label: f.name, url: await workspaceApi.signedUrl('workspace-files', f.path, 3600) }) } catch { /* skip */ }
      }
      if (!off) { setSources(list); setCurrent((c) => c || list[0]?.id || null) }
    })()
    return () => { off = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioKey])

  const src = sources.find((s) => s.id === current)
  const toggle = () => { const a = audio.current; if (a) (a.paused ? a.play() : a.pause()) }
  const skip = (d) => { const a = audio.current; if (a) a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + d)) }
  const setRate = (r) => { if (audio.current) audio.current.playbackRate = r; setState((s) => ({ ...s, rate: r })) }
  const save = (value) => ws.set({ transcript: value, sections: { ...ws.data.sections, transcript: value.trim() } })
  function stamp() {
    const el = area.current, t = `[${mmss(audio.current?.currentTime || 0)}] `
    const at = el.selectionStart
    save(text.slice(0, at) + t + text.slice(el.selectionEnd))
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = at + t.length })
  }
  function onKey(e) {
    if (!(e.ctrlKey || e.metaKey)) return
    if (e.key === 'j') { e.preventDefault(); stamp() }
    else if (e.key === ' ') { e.preventDefault(); toggle() }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); skip(-5) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); skip(5) }
  }

  return (
    <div className="tool">
      {cfg.tools.includes('audio') && (
        <div className="player">
          {src ? (
            <>
              {sources.length > 1 && <select aria-label="Audio file" value={current || ''} onChange={(e) => setCurrent(e.target.value)}>{sources.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>}
              <audio ref={audio} src={src.url} preload="metadata" onPlay={() => setState((s) => ({ ...s, playing: true }))} onPause={() => setState((s) => ({ ...s, playing: false }))}
                onTimeUpdate={(e) => setState((s) => ({ ...s, time: e.target.currentTime }))} onLoadedMetadata={(e) => setState((s) => ({ ...s, duration: e.target.duration }))} onError={() => setError('This audio could not be played.')} />
              <div className="player-row">
                <button type="button" className="icon-tool" onClick={() => skip(-5)} aria-label="Back 5 seconds"><Icon name="fa-backward" /></button>
                <button type="button" className="btn" onClick={toggle}><Icon name={state.playing ? 'fa-pause' : 'fa-play'} /> {state.playing ? 'Pause' : 'Play'}</button>
                <button type="button" className="icon-tool" onClick={() => skip(5)} aria-label="Forward 5 seconds"><Icon name="fa-forward" /></button>
                <span className="counter">{mmss(state.time)} / {mmss(state.duration || 0)}</span>
                <label className="grow"><span className="sr">Seek</span><input type="range" min="0" max={state.duration || 0} step="0.1" value={state.time} onChange={(e) => { if (audio.current) audio.current.currentTime = Number(e.target.value) }} /></label>
                <label>Speed <select value={state.rate} onChange={(e) => setRate(Number(e.target.value))}>{[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => <option key={r} value={r}>{r}×</option>)}</select></label>
              </div>
              {error && <p className="bad-text">{error}</p>}
            </>
          ) : <p className="muted">No audio has been attached to this project yet.{cfg.allowAudioUpload ? ' You can upload an audio file below.' : ' Ask an administrator to attach the recording.'}</p>}
        </div>
      )}
      {cfg.allowAudioUpload && <FilePanel ctx={ctx} kind="audio" title="Audio files" accept="audio/*" hint="MP3, WAV, M4A, OGG or WebM, up to 25 MB" />}
      <div className="tool-bar">
        <button type="button" className="btn secondary" disabled={ctx.readOnly} onClick={stamp}><Icon name="fa-clock" /> Insert timestamp (Ctrl+J)</button>
        <span className="grow" />
        <span className="counter">{text.trim() ? text.trim().split(/\s+/).length : 0} words</span>
        <button type="button" className="btn secondary" onClick={() => download('transcript.txt', text)}>Export transcript</button>
      </div>
      <textarea ref={area} className="big-text mono" readOnly={ctx.readOnly} aria-label="Transcript" placeholder="Type the transcript here. Ctrl+Space plays or pauses, Ctrl+←/→ skips 5 seconds, Ctrl+J inserts a timestamp." value={text} onChange={(e) => save(e.target.value)} onKeyDown={onKey} />
      {cfg.tools.includes('attachments') && <FilePanel ctx={ctx} kind="attachment" title="Attachments" />}
    </div>
  )
}
