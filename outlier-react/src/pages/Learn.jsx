import { PageHeader } from '../components/ui'

const STEPS = [
  ['Register and get approved', 'Create an account with your full name. An administrator reviews and approves it before you can browse projects.'],
  ['Find or receive a project', 'Apply from the Marketplace, or an administrator can assign a project directly. Applications must be approved before you can work.'],
  ['Complete onboarding', 'The first time you open a project you read its overview, objectives, instructions, deliverables, pay and guidelines, then confirm.'],
  ['Work on the timer', 'Start the timer when you begin, pause for breaks, and resume. Time is recorded on the server, so refreshing or signing in again never loses it.'],
  ['Submit your work', 'Submitting stops the timer. An administrator reviews the work and the tracked time.'],
  ['Get paid', 'Earnings are approved hours × your hourly rate. Once the payment is approved and your US bank account is verified, it is paid out.'],
]

export default function Learn() {
  return (
    <>
      <PageHeader title="Learn Skills">How working on Outlier works, step by step.</PageHeader>
      <div className="content-box">
        <h2>How to work on Outlier</h2>
        <ol>{STEPS.map(([t, d]) => <li key={t}><strong>{t}:</strong> {d}</li>)}</ol>
      </div>
    </>
  )
}
