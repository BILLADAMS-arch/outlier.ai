import { Link } from 'react-router-dom'
import { Icon } from '../ui'

const BENEFITS = [
  ['fa-bolt', 'Flexible remote opportunities.'],
  ['fa-microchip', 'Work on exciting AI projects.'],
  ['fa-trophy', 'Get rewarded for your expertise.'],
]

/** Split-screen shell: marketing panel on the left, the form card on the right (stacked on tablet and phone). */
export default function AuthLayout({ children }) {
  return (
    <div className="au-page">
      <div className="au-bg" aria-hidden="true"><i className="au-blob b1" /><i className="au-blob b2" /><i className="au-wave" /></div>
      <section className="au-brand" aria-label="About Outlier">
        <Link to="/" className="au-logo" aria-label="Outlier home"><img src="/images/outlier.png" alt="Outlier" width="119" height="26" /></Link>
        <h1 className="au-headline">Your next opportunity <span>starts here.</span></h1>
        <p className="au-lead">Join Outlier and help improve the next generation of AI while earning rewards.</p>
        <ul className="au-benefits">
          {BENEFITS.map(([ic, text]) => <li key={text}><span className="au-bicon"><Icon name={ic} /></span>{text}</li>)}
        </ul>
      </section>
      <main className="au-panel" id="main">{children}</main>
    </div>
  )
}
