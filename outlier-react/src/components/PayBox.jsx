import { money, rateTier } from '../utils/format'

export default function PayBox({ task }) {
  return (
    <div className="pay-box">
      <div className="pay-rate"><strong>{money(task.hourlyRate)}/hr</strong><small>USD · {rateTier(task.hourlyRate)} tier</small></div>
      <dl>
        <div><dt>Estimated hours</dt><dd>{task.estimatedHours} hours</dd></div>
        <div><dt>Estimated total</dt><dd>{money(task.hourlyRate * task.estimatedHours)}</dd></div>
        <div><dt>Rate</dt><dd>{task.rateType === 'negotiable' ? 'Negotiable' : 'Fixed'}</dd></div>
      </dl>
    </div>
  )
}
