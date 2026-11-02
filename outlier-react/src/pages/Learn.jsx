import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui'
import TaskPhoto from '../components/TaskPhoto'
import LIcon from '../components/LIcon'

const STEPS = [
  ['Register and get approved', 'Create an account with your full name. An administrator reviews and approves it before you can browse projects.', 'photo-1516534775068-ba3e7458af70'],
  ['Find or receive a project', 'Apply from the Marketplace, or an administrator can assign a project directly. Applications must be approved before you can work.', 'photo-1460925895917-afdab827c52f'],
  ['Complete onboarding', 'The first time you open a project you read its overview, objectives, instructions, deliverables, pay and guidelines, then confirm.', 'photo-1590402494587-44b71d7772f6'],
  ['Work on the timer', 'Start the timer when you begin, pause for breaks, and resume. Time is recorded on the server, so refreshing or signing in again never loses it.', 'photo-1531482615713-2afd69097998'],
  ['Submit your work', 'Submitting stops the timer. An administrator reviews the work and the tracked time.', 'photo-1461749280684-dccba630e2f6'],
  ['Get paid', 'Earnings are approved hours × your hourly rate. Once the payment is approved and your US bank account is verified, it is paid out.', 'photo-1556742049-0cfed4f6a45d'],
]

// Every video below is licensed Creative Commons Attribution (CC BY) on YouTube and allows embedding.
const VIDEOS = [
  { id: 'u523JOz2VaU', title: 'How Large Language Models work', by: 'AI Hints', mins: 5, why: 'Many Outlier projects improve AI models. This short explainer shows what tokens and context windows are.' },
  { id: 'dCelRItdGfc', title: 'Reinforcement Learning through Human Feedback, explained', by: 'CodeEmporium', mins: 10, why: 'Understand why careful human reviews and ratings matter, and how your work is used to teach a model.' },
  { id: 'SyAveS_x0PM', title: 'Time Management and Productivity', by: 'Some Critical Thinking', mins: 3, why: 'Quick habits for planning your working hours so the timer reflects focused, productive time.' },
  { id: 'yKdVBKUzPyY', title: 'Using the Pomodoro Technique to Boost Productivity', by: 'GoDaddy: The Journey', mins: 2, why: 'Work in focused blocks with breaks. It fits the pause and resume timer.' },
]

const TIPS = [
  ['clock', 'Track honestly', 'Start the timer when you start and pause for breaks. Only time that is tracked and approved is paid.'],
  ['check', 'Read before you begin', 'Onboarding lists the objectives, deliverables and guidelines. Re-read them when you are unsure.'],
  ['list', 'Save progress as you go', 'Workspaces autosave, and the progress bar on your dashboard shows what is still missing.'],
  ['mail', 'Watch your notifications', 'Approvals, review notes and payment updates arrive in the bell and by email.'],
]

const FAQ = [
  ['What happens if I refresh or close the tab?', 'Nothing is lost. Time is recorded on the server and your workspace autosaves, so you can sign in again and continue.'],
  ['When am I paid?', 'Approved earnings are paid on the last Tuesday of the month once the payment is approved and your US bank account is verified. The Earnings page shows the next payment date and the cutoff.'],
  ['Can I work on more than one project?', 'You can have several approved projects. The timer runs on one project at a time, and the badge in the top bar shows which.'],
  ['What if my work is rejected?', 'The reviewer leaves a note on the project. Read it, fix what was missing, and resubmit.'],
]

function Video({ v }) {
  const [playing, setPlaying] = useState(false)
  return (
    <article className="lr-video">
      <div className="lr-frame">
        {playing ? (
          <iframe src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`} title={v.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        ) : (
          <button type="button" className="lr-play" onClick={() => setPlaying(true)} aria-label={`Play video: ${v.title}`}>
            <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt="" loading="lazy" />
            <span><LIcon name="play" size={22} /></span>
            <em>{v.mins} min</em>
          </button>
        )}
      </div>
      <h3>{v.title}</h3>
      <p>{v.why}</p>
      <small>{v.by} · <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noreferrer">CC BY on YouTube</a></small>
    </article>
  )
}

export default function Learn() {
  return (
    <div className="lr">
      <PageHeader title="Learn Skills">How working on Outlier works, step by step.</PageHeader>

      <section className="lr-hero">
        <div className="lr-hero-text">
          <h2>How to work on Outlier</h2>
          <p>From signing up to getting paid, here is the whole journey. Read the steps, watch a few short videos, and you are ready to start.</p>
          <Link className="dx-cta" to="/marketplace">Browse projects <LIcon name="arrow" size={16} /></Link>
        </div>
        <div className="lr-hero-photo"><TaskPhoto image="photo-1542744173-8e7e53415bb0" w={720} h={440} alt="A team working together around a table" /></div>
      </section>

      <section>
        <h2 className="lr-h">Step by step</h2>
        <ol className="lr-steps">
          {STEPS.map(([t, d, img], i) => (
            <li key={t}>
              <div className="lr-step-photo"><TaskPhoto image={img} w={480} h={300} alt="" /><b>{i + 1}</b></div>
              <div className="lr-step-body"><h3>{t}</h3><p>{d}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="lr-h">Watch and learn</h2>
        <p className="lr-sub">Short, openly licensed videos (Creative Commons Attribution). They load from YouTube only when you press play.</p>
        <div className="lr-videos">{VIDEOS.map((v) => <Video key={v.id} v={v} />)}</div>
      </section>

      <section>
        <h2 className="lr-h">Tips for success</h2>
        <div className="lr-tips">
          {TIPS.map(([icon, t, d]) => <article key={t}><span><LIcon name={icon} size={20} /></span><h3>{t}</h3><p>{d}</p></article>)}
        </div>
      </section>

      <section>
        <h2 className="lr-h">Common questions</h2>
        <div className="lr-faq">
          {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
        </div>
      </section>

      <p className="lr-credit">Photos from <a href="https://unsplash.com" target="_blank" rel="noreferrer">Unsplash</a>. Videos belong to their creators and are shared under CC BY.</p>
    </div>
  )
}
