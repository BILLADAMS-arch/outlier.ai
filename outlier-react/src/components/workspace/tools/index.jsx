import WritingTool from './WritingTool'
import DataEntryTool from './DataEntryTool'
import ResearchTool from './ResearchTool'
import TranscriptionTool from './TranscriptionTool'
import CodeTool from './CodeTool'
import DesignTool from './DesignTool'
import AnalysisTool from './AnalysisTool'
import AssistantTool from './AssistantTool'

const TOOLS = { writing: WritingTool, data_entry: DataEntryTool, research: ResearchTool, transcription: TranscriptionTool, code: CodeTool, design: DesignTool, analysis: AnalysisTool, assistant: AssistantTool }

/** Loads the working tools for a project's environment type: one reusable component per type, configured per project. */
export default function ToolRenderer({ cfg, ws, ctx }) {
  const Tool = TOOLS[cfg.type]
  return Tool ? <Tool cfg={cfg} ws={ws} ctx={ctx} /> : <p>Unknown working environment.</p>
}
