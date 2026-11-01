import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { json } from '@codemirror/lang-json'
import { sql } from '@codemirror/lang-sql'

const EXT = { javascript: () => javascript({ jsx: true, typescript: true }), python, html, css, json, sql }

/** CodeMirror 6 with syntax highlighting. Loaded on demand so it never slows down other project types. */
export default function CodeEditor({ value, lang, onChange, readOnly }) {
  return (
    <CodeMirror value={value} height="460px" theme="light" readOnly={readOnly} extensions={EXT[lang] ? [EXT[lang]()] : []} onChange={onChange}
      basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true, indentOnInput: true, bracketMatching: true, autocompletion: true }} aria-label="Code editor" />
  )
}
