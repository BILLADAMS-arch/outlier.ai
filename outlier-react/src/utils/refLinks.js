/** Reference links on a project: { title, url, kind: 'reference' | 'tool' }. Stored as jsonb on tasks.reference_links. */
export const formatRefLinks = (links = []) => links.map((l) => `${l.title} | ${l.url} | ${l.kind === 'tool' ? 'tool' : 'reference'}`).join('\n')

/** Parses "Title | https://url | reference or tool" lines. Throws a readable message for a bad line. */
export function parseRefLinks(text = '') {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((line, i) => {
    const [title = '', url = '', kind = 'reference'] = line.split('|').map((x) => x.trim())
    if (!title) throw new Error(`Reference line ${i + 1} needs a title.`)
    if (!/^https:\/\/[^\s]+$/i.test(url)) throw new Error(`Reference line ${i + 1} needs an https:// link.`)
    const k = kind.toLowerCase() || 'reference'
    if (k !== 'reference' && k !== 'tool') throw new Error(`Reference line ${i + 1}: type must be "reference" or "tool".`)
    return { title, url, kind: k }
  })
}
