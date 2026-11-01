export const DEFAULT_GUIDELINES = [
  'Run the timer only while you are actively working on this project, and pause it for breaks.',
  'You are paid for approved tracked time only. Paused time is never counted.',
  'Keep project materials confidential and do not share them outside the platform.',
  'Do your own work and follow the instructions exactly. Ask before changing the scope.',
  'An administrator reviews every submission and may send it back for changes before approving it.',
]

/** Builds the onboarding sections from a project record, falling back to its other fields. */
export function onboardingContent(task) {
  return {
    overview: task.description,
    objectives: task.objectives?.length ? task.objectives : [task.summary],
    instructions: task.instructions ? task.instructions.split('\n').filter(Boolean) : task.responsibilities,
    deliverables: task.deliverables,
    skills: task.skills,
    guidelines: task.guidelines?.length ? task.guidelines : DEFAULT_GUIDELINES,
  }
}
