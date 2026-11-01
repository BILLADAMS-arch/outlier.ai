const ALLOWED = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'P', 'BR', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'A', 'DIV', 'SPAN', 'CODE', 'PRE', 'HR'])

/** Strips everything except a small set of formatting tags (no scripts, styles, event handlers or unsafe links). */
export function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html')
  const walk = (node) => {
    for (const child of [...node.children]) {
      if (!ALLOWED.has(child.tagName)) { child.replaceWith(...child.childNodes); continue }
      for (const attr of [...child.attributes]) {
        const keep = child.tagName === 'A' && attr.name === 'href' && /^(https?:|mailto:)/i.test(attr.value)
        if (!keep) child.removeAttribute(attr.name)
      }
      if (child.tagName === 'A') { child.setAttribute('target', '_blank'); child.setAttribute('rel', 'noopener noreferrer') }
      walk(child)
    }
  }
  walk(doc.body)
  return doc.body.innerHTML
}
export const htmlToText = (html) => { const d = document.createElement('div'); d.innerHTML = sanitizeHtml(html); return (d.innerText || d.textContent || '').trim() }
export const wordCount = (text) => (text.trim() ? text.trim().split(/\s+/).length : 0)
export const uid = () => Math.random().toString(36).slice(2, 10)
