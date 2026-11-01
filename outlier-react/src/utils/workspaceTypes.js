export const WORKSPACE_TYPES = {
  writing: { label: 'Writing & content', icon: 'fa-pen-nib', tools: { editor: 'Rich-text editor', attachments: 'File attachments' } },
  data_entry: { label: 'Data entry & administration', icon: 'fa-table-cells', tools: { table: 'Data-entry table', csv: 'CSV import / export', attachments: 'File attachments' } },
  research: { label: 'Research & analysis', icon: 'fa-magnifying-glass-chart', tools: { notes: 'Research notes', sources: 'Sources', findings: 'Structured findings', table: 'Data table', report: 'Report', attachments: 'File attachments' } },
  transcription: { label: 'Transcription', icon: 'fa-headphones', tools: { audio: 'Audio player', transcript: 'Transcript editor', attachments: 'File attachments' } },
  code: { label: 'Programming', icon: 'fa-code', tools: { editor: 'Code editor', snippets: 'Snippets', attachments: 'Deliverable uploads' } },
  design: { label: 'Design & creative', icon: 'fa-palette', tools: { assets: 'Assets & deliverables', references: 'Reference material' } },
  analysis: { label: 'Data analysis', icon: 'fa-chart-column', tools: { upload: 'CSV upload', table: 'Data table', calc: 'Calculations', chart: 'Charts', report: 'Findings & export' } },
  assistant: { label: 'Virtual assistance & coordination', icon: 'fa-list-check', tools: { checklist: 'Task checklist', notes: 'Notes', status: 'Status updates', documents: 'Documents' } },
}

// Which working environment a category gets unless the project overrides it.
export const CATEGORY_TYPE = {
  software: 'code', 'web-mobile': 'code', design: 'design', marketing: 'writing', writing: 'writing', data: 'data_entry', 'virtual-assistance': 'assistant',
  'customer-support': 'assistant', translation: 'transcription', 'video-photo': 'design', accounting: 'data_entry', 'research-consulting': 'research', 'ai-ml': 'research',
  education: 'writing', engineering: 'research', sales: 'assistant', hr: 'assistant', cybersecurity: 'research', 'project-management': 'assistant', 'architecture-cad': 'design',
}

export const DEFAULT_COLUMNS = [
  { key: 'item', label: 'Item', type: 'text', required: true },
  { key: 'value', label: 'Value', type: 'text', required: true },
  { key: 'notes', label: 'Notes', type: 'text', required: false },
]

const DEFAULTS = {
  writing: { subtasks: [{ id: 'draft', title: 'Write the first draft', required: true }, { id: 'review', title: 'Proofread and revise', required: true }], requiredDeliverables: [{ id: 'doc', label: 'Final document', kind: 'section', key: 'doc' }] },
  data_entry: { subtasks: [{ id: 'enter', title: 'Enter all records', required: true }, { id: 'check', title: 'Validate the data', required: true }], requiredDeliverables: [{ id: 'table', label: 'Completed data table', kind: 'section', key: 'table' }], columns: DEFAULT_COLUMNS, targetRows: 20 },
  research: { subtasks: [{ id: 'sources', title: 'Collect sources', required: true }, { id: 'findings', title: 'Record findings', required: true }, { id: 'report', title: 'Write the report', required: true }], requiredDeliverables: [{ id: 'report', label: 'Written report', kind: 'section', key: 'research' }] },
  transcription: { subtasks: [{ id: 'listen', title: 'Transcribe the full recording', required: true }, { id: 'review', title: 'Review against the audio', required: true }], requiredDeliverables: [{ id: 'transcript', label: 'Transcript', kind: 'section', key: 'transcript' }] },
  code: { subtasks: [{ id: 'implement', title: 'Implement the solution', required: true }, { id: 'test', title: 'Test and review the code', required: true }], requiredDeliverables: [{ id: 'code', label: 'Source code', kind: 'section', key: 'code' }] },
  design: { subtasks: [{ id: 'concept', title: 'Create the design', required: true }, { id: 'export', title: 'Export the final files', required: true }], requiredDeliverables: [{ id: 'files', label: 'Final design files', kind: 'file' }] },
  analysis: { subtasks: [{ id: 'load', title: 'Load and clean the data', required: true }, { id: 'analyse', title: 'Run the analysis', required: true }, { id: 'findings', title: 'Write the findings', required: true }], requiredDeliverables: [{ id: 'analysis', label: 'Analysis and findings', kind: 'section', key: 'analysis' }] },
  assistant: { subtasks: [{ id: 'tasks', title: 'Complete the assigned tasks', required: true }], requiredDeliverables: [{ id: 'checklist', label: 'Completed checklist', kind: 'section', key: 'assistant' }] },
}

/** The working-environment type for a project: its own setting, else the category's default. */
export const typeFor = (task) => task.workspaceType || CATEGORY_TYPE[task.categoryId] || 'assistant'

/** A project's effective configuration: stored settings on top of the defaults for its type. */
export function configFor(task) {
  const type = typeFor(task)
  const stored = task.workspaceConfig || {}
  const defaults = DEFAULTS[type] || {}
  const hasStored = Object.keys(stored).length > 0
  return {
    type,
    tools: stored.tools?.length ? stored.tools : Object.keys(WORKSPACE_TYPES[type].tools),
    subtasks: hasStored && stored.subtasks ? stored.subtasks : defaults.subtasks || [],
    requiredDeliverables: hasStored && stored.requiredDeliverables ? stored.requiredDeliverables : defaults.requiredDeliverables || [],
    columns: stored.columns?.length ? stored.columns : defaults.columns || DEFAULT_COLUMNS,
    targetRows: stored.targetRows ?? defaults.targetRows ?? 0,
    minWords: stored.minWords ?? 0,
    allowAudioUpload: stored.allowAudioUpload ?? false,
    submissionRequirements: stored.submissionRequirements || [],
    configured: hasStored,
  }
}

/** Which required deliverables / subtasks are still missing (client-side pre-check, mirrors the server). */
export function missingItems(cfg, data, progress, files) {
  const miss = []
  for (const d of cfg.requiredDeliverables) {
    if ((d.kind || 'file') === 'file') {
      if (!files.some((f) => f.kind === 'deliverable' && !f.removedAt && (d.id === 'files' ? true : f.slot === d.id))) miss.push(`${d.label} (upload a file)`)
    } else {
      const v = data?.sections?.[d.key] ?? data?.[d.key]
      const filled = typeof v === 'string' ? v.replace(/<[^>]*>/g, '').trim() !== '' : Array.isArray(v) ? v.length > 0 : v && typeof v === 'object' ? Object.values(v).some((x) => (Array.isArray(x) ? x.length : String(x ?? '').replace(/<[^>]*>/g, '').trim() !== '')) : !!v
      if (!filled) miss.push(`${d.label} (complete this section)`)
    }
  }
  for (const s of cfg.subtasks) if (s.required && !progress?.[s.id]) miss.push(`Subtask: ${s.title}`)
  return miss
}

export const progressPercent = (cfg, progress) => (cfg.subtasks.length ? Math.round((100 * cfg.subtasks.filter((s) => progress?.[s.id]).length) / cfg.subtasks.length) : null)
