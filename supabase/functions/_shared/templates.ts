// Email templates. Every template returns { subject, html, text }. Pure functions: no network, no secrets.
export interface Cfg { appUrl: string; supportEmail: string; brand: string; logoUrl: string; otpMinutes: number }
type P = Record<string, any>

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const usd = (n: unknown) => `$${Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const date = (v: unknown) => (v ? new Date(String(v)).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : '—')
const hrs = (n: unknown) => `${Number(n ?? 0).toFixed(2)} h`
const abs = (c: Cfg, link?: string) => (link ? (link.startsWith('http') ? link : c.appUrl.replace(/\/$/, '') + link) : c.appUrl)

export const PAYMENT_POLICY = [
  'Payments are processed on the last Tuesday of every month.',
  'Available payout methods: (1) eligible United States bank accounts and (2) eligible United States AirTM accounts.',
  'You must provide and verify an eligible payout account before you can receive payments.',
  'Payments are subject to approved work, verified working hours, and administrative payment approval.',
  'Earnings shown in your dashboard are not necessarily payments that have already been processed.',
]

interface Block { html: string; text: string }
const para = (t: string): Block => ({ html: `<p style="margin:0 0 14px">${esc(t)}</p>`, text: t })
const list = (items: string[]): Block => ({ html: `<ul style="margin:0 0 14px;padding-left:20px">${items.map((i) => `<li style="margin:4px 0">${esc(i)}</li>`).join('')}</ul>`, text: items.map((i) => `- ${i}`).join('\n') })
const table = (rows: [string, string][]): Block => ({
  html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border:1px solid #e5e7eb;border-radius:8px;border-collapse:separate">${rows
    .map(([k, v]) => `<tr><td style="padding:9px 12px;color:#6b7280;font-size:14px;border-bottom:1px solid #f1f5f9">${esc(k)}</td><td style="padding:9px 12px;font-weight:600;text-align:right;font-size:14px;border-bottom:1px solid #f1f5f9">${esc(v)}</td></tr>`).join('')}</table>`,
  text: rows.map(([k, v]) => `${k}: ${v}`).join('\n'),
})
const callout = (t: string, tone: 'info' | 'warn' = 'info'): Block => ({
  html: `<div style="margin:0 0 16px;padding:12px 14px;border-radius:8px;font-size:14px;background:${tone === 'warn' ? '#fff7e0' : '#eef6ff'};border:1px solid ${tone === 'warn' ? '#f3d27a' : '#bcd9ff'}">${esc(t)}</div>`,
  text: t,
})
const code = (c: string): Block => ({ html: `<div style="margin:6px 0 18px;text-align:center"><span style="display:inline-block;font-family:'SFMono-Regular',Consolas,monospace;font-size:34px;letter-spacing:8px;font-weight:700;background:#f1f5ff;border:1px dashed #93b4ff;border-radius:10px;padding:14px 22px;color:#1d4ed8">${esc(c)}</span></div>`, text: `Your code: ${c}` })

function layout(c: Cfg, o: { title: string; preheader?: string; blocks: Block[]; button?: { label: string; url: string }; note?: string; promo?: { unsubscribeUrl: string; address: string } }) {
  const btn = o.button ? `<div style="text-align:center;margin:22px 0 8px"><a href="${esc(o.button.url)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;padding:13px 28px;border-radius:99px;font-size:15px">${esc(o.button.label)}</a></div>` : ''
  const support = c.supportEmail ? `Questions? Contact us at <a href="mailto:${esc(c.supportEmail)}" style="color:#2563eb">${esc(c.supportEmail)}</a>.` : ''
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(o.title)}</title></head>
<body style="margin:0;background:#f4f6fb;font-family:Inter,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1f2937">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(o.preheader || o.title)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
<tr><td style="padding:22px 28px;background:linear-gradient(120deg,#e0d4ff,#cfe6ff)"><img src="${esc(c.logoUrl)}" alt="${esc(c.brand)}" height="26" style="display:block;border:0"></td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.6"><h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111827">${esc(o.title)}</h1>${o.blocks.map((b) => b.html).join('')}${btn}${o.note ? `<p style="margin:18px 0 0;font-size:13px;color:#6b7280">${esc(o.note)}</p>` : ''}</td></tr>
<tr><td style="padding:18px 28px;background:#f8fafc;font-size:12px;color:#6b7280;line-height:1.6">${support}<br>${esc(c.brand)} · Remote work, tracked fairly and paid on approved hours.<br>${o.promo ? `You are receiving this promotional email because you have an ${esc(c.brand)} account. <a href="${esc(o.promo.unsubscribeUrl)}" style="color:#2563eb">Unsubscribe from promotional emails</a>.<br>${esc(o.promo.address)}` : `You are receiving this email because of activity on your ${esc(c.brand)} account.`}</td></tr>
</table></td></tr></table></body></html>`
  const text = [o.title, '', ...o.blocks.map((b) => b.text), ...(o.button ? ['', `${o.button.label}: ${o.button.url}`] : []), ...(o.note ? ['', o.note] : []), ...(o.promo ? ['', `Unsubscribe from promotional emails: ${o.promo.unsubscribeUrl}`, o.promo.address] : []), '', '--', c.supportEmail ? `Support: ${c.supportEmail}` : '', c.brand].join('\n')
  return { html, text }
}

const hi = (p: P) => `Hi ${p.name || 'there'},`
const out = (subject: string, c: Cfg, o: Parameters<typeof layout>[1]) => ({ subject, ...layout(c, o) })

function statementBlocks(p: P): Block[] {
  const s = p.statement || {}
  const t = s.totals || {}
  const blocks: Block[] = [
    table([
      ['Period', String(p.period || '')], ['Hours worked', hrs((t.seconds || 0) / 3600)], ['Tracked earnings', usd(t.tracked)],
      ['Pending approval', usd(t.pending)], ['Approved for payment', usd(t.approved)], ['Paid', usd(t.paid)],
    ]),
  ]
  if (Array.isArray(s.projects) && s.projects.length) {
    blocks.push({
      html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;font-size:13px;border-collapse:collapse"><tr style="background:#f1f5ff"><th align="left" style="padding:8px">Project</th><th align="right" style="padding:8px">Hours</th><th align="right" style="padding:8px">Rate</th><th align="right" style="padding:8px">Earnings</th></tr>${s.projects
        .map((r: P) => `<tr><td style="padding:8px;border-bottom:1px solid #eef2f7">${esc(r.title)}</td><td align="right" style="padding:8px;border-bottom:1px solid #eef2f7">${(r.seconds / 3600).toFixed(2)}</td><td align="right" style="padding:8px;border-bottom:1px solid #eef2f7">${usd(r.rate)}/hr</td><td align="right" style="padding:8px;border-bottom:1px solid #eef2f7">${usd(r.tracked)}</td></tr>`).join('')}</table>`,
      text: s.projects.map((r: P) => `${r.title}: ${(r.seconds / 3600).toFixed(2)} h @ ${usd(r.rate)}/hr = ${usd(r.tracked)}`).join('\n'),
    })
  }
  blocks.push(callout('Approved earnings are not payments that have already been made. Payments are processed on the last Tuesday of each month after payment approval.'))
  return blocks
}

export const TEMPLATES: Record<string, (p: P, c: Cfg) => { subject: string; html: string; text: string; headers?: Record<string, string> }> = {
  promo_projects: (p, c) => {
    const projects: P[] = Array.isArray(p.projects) ? p.projects : []
    const total = Number(p.total || projects.length)
    const intro = p.approved
      ? `There are ${total} open projects on ${c.brand} right now, and new ones are added regularly. Here are some you can apply for today:`
      : `There are ${total} open projects on ${c.brand}. Your account is still awaiting approval; once an administrator approves it you can apply to projects like these:`
    const rows = projects.map((x) => `<tr><td style="padding:12px 0;border-bottom:1px solid #eef2f7"><a href="${esc(abs(c, `/marketplace/${x.id}`))}" style="color:#111827;font-weight:600;text-decoration:none">${esc(x.title)}</a><br><span style="color:#6b7280;font-size:13px">${esc(x.category)} · ${esc(x.difficulty)} · about ${esc(x.hours)} h</span><br><span style="color:#374151;font-size:13px">${esc(x.summary)}</span></td><td align="right" style="padding:12px 0 12px 12px;border-bottom:1px solid #eef2f7;white-space:nowrap;font-weight:700;color:#2563eb">${usd(x.rate)}/hr</td></tr>`).join('')
    const list = { html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px">${rows}</table>`, text: projects.map((x) => `- ${x.title} (${x.category}, ${x.difficulty}): ${usd(x.rate)}/hr, about ${x.hours} h\n  ${abs(c, `/marketplace/${x.id}`)}`).join('\n') }
    const mail = out(`${p.subject || ''}` || 'New projects are open for you', c, {
      title: 'Projects are open for you', preheader: `${total} open projects, from ${usd(Math.min(...projects.map((x) => Number(x.rate))))} to ${usd(Math.max(...projects.map((x) => Number(x.rate))))} per hour`,
      blocks: [para(hi(p)), para(intro), list,
        para(p.approved ? 'Our advice: open the projects that match your skills, read the full brief (it lists the scope, input materials, deliverables and acceptance criteria), and apply with a short note about your relevant experience and availability. Applying early gives an administrator more time to review you.' : 'In the meantime you can read each project brief to see what the work involves.'),
        para('Pay is your agreed hourly rate multiplied by approved working time, paid on the last Tuesday of each month once your payment details are verified.')],
      button: { label: p.approved ? 'Browse all projects and apply' : 'See the projects', url: abs(c, p.approved ? '/marketplace' : '/dashboard') },
      promo: { unsubscribeUrl: String(p.unsubscribeUrl || ''), address: String(p.address || '') },
    })
    return { ...mail, headers: { 'List-Unsubscribe': `<${p.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } }
  },
  otp_signup: (p, c) => out(`Your ${c.brand} verification code`, c, { title: 'Verify your email', preheader: `Your code is ${p.token}`,
    blocks: [para(hi(p)), para(`Welcome to ${c.brand}! Enter this one-time code to verify your email and finish creating your account.`), code(p.token),
      para(`The code expires in ${c.otpMinutes} minutes and can only be used once. Your account stays inactive until you verify it.`)],
    note: 'If you did not create an account, you can safely ignore this email. Never share this code with anyone.' }),
  otp_recovery: (p, c) => out(`Your ${c.brand} password reset code`, c, { title: 'Reset your password', preheader: `Your code is ${p.token}`,
    blocks: [para(hi(p)), para('We received a request to reset your password. Enter this one-time code on the reset screen to choose a new one.'), code(p.token),
      para(`The code expires in ${c.otpMinutes} minutes and works once.`), callout('If you did not request this, do not share the code. Your password stays unchanged unless the code is used.', 'warn')] }),
  welcome: (p, c) => out(`Welcome to ${c.brand}, ${p.name}`, c, { title: `Welcome, ${p.name}!`, preheader: 'Your account was created. Here is how everything works.',
    blocks: [para(hi(p)), para('Your email is verified and your account was created. Here is what happens next:'),
      list(['An administrator reviews and approves your account. We email you as soon as that is done.', 'Once approved, browse available projects and apply, or wait for an administrator to assign one. An application must be approved before you can start.',
        'Before your first session on a project you complete a short onboarding: overview, instructions, deliverables and pay.', 'Your working time is tracked by the server while the timer runs. Paused or idle time never counts.',
        'Earnings are approved working hours multiplied by your agreed hourly rate. Administrators review your work, then approve the payment.', 'Your dashboard shows projects, hours and earnings. Earnings shown there are not necessarily payments already processed.']),
      { html: `<h3 style="margin:18px 0 8px">Payment policy</h3>`, text: '\nPAYMENT POLICY' }, list(PAYMENT_POLICY), para(c.supportEmail ? `Need help? Email ${c.supportEmail}.` : 'Need help? Reply to this email or contact our support team.')],
    button: { label: 'Open your dashboard', url: abs(c, '/dashboard') } }),
  account_approved: (p, c) => out('Your account is approved', c, { title: 'You are approved!', preheader: 'You can now browse and apply for projects.',
    blocks: [para(hi(p)), para('Good news: an administrator approved your account. You now have full access.'),
      list(['Open the Marketplace to see available projects.', 'Apply to projects that match your skills, or wait to be assigned one directly.', 'After an application is approved, complete the project onboarding and start working.', 'Add and verify a US bank or AirTM payout account in Payment Settings so you can be paid.'])],
    button: { label: 'View available projects', url: abs(c, '/marketplace') } }),
  account_rejected: (p, c) => out('An update on your registration', c, { title: 'Registration not approved', blocks: [para(hi(p)), para('Thank you for registering. After review, we were unable to approve your account at this time.'),
    ...(p.reason ? [callout(`Reason: ${p.reason}`)] : []), para(c.supportEmail ? `If you believe this is a mistake, contact ${c.supportEmail}.` : 'If you believe this is a mistake, please contact our support team.')] }),
  project_assigned: (p, c) => out(`New project assigned: ${p.projectTitle}`, c, { title: 'A project was assigned to you', preheader: p.projectTitle,
    blocks: [para(hi(p)), para('An administrator assigned you the following project.'), table([['Project', p.projectTitle], ['Hourly rate', `${usd(p.rate)}/hr`], ['Estimated hours', String(p.hours ?? '—')], ['Deadline', p.deadline ? date(p.deadline) : 'No fixed deadline']]),
      para(p.summary || ''), para('Next step: open the project and complete the onboarding. After that you can start working and the timer begins.')],
    button: { label: 'Open the project', url: abs(c, p.link) } }),
  submission_received: (p, c) => out(`Work submitted: ${p.projectTitle}`, c, { title: 'We received your work', blocks: [para(hi(p)), para('Your submission was recorded and your timer stopped.'),
    table([['Project', p.projectTitle], ['Submitted', date(p.submittedAt)], ['Recorded working time', hrs(p.trackedHours)], ['Review status', p.status || 'Awaiting review']]),
    ...(Array.isArray(p.deliverables) && p.deliverables.length ? [para('Deliverables:'), list(p.deliverables)] : []), para('An administrator will review it. You will be told if changes are needed or when it is approved.')],
    button: { label: 'View submission', url: abs(c, p.link) } }),
  submission_admin: (p, c) => out(`Review needed: ${p.projectTitle} (${p.taskerName})`, c, { title: 'New work to review', blocks: [para(`${p.taskerName || 'A tasker'} submitted work.`),
    table([['Tasker', p.taskerName || '—'], ['Project', p.projectTitle], ['Submitted', date(p.submittedAt)], ['Recorded working time', hrs(p.trackedHours)], ['Round', String(p.round ?? 1)], ['Review status', 'Awaiting review']]),
    ...(Array.isArray(p.deliverables) && p.deliverables.length ? [para('Deliverables:'), list(p.deliverables)] : [])], button: { label: 'Review submissions', url: abs(c, '/admin/work') } }),
  application_approved: (p, c) => out(`Application approved: ${p.projectTitle}`, c, { title: 'Your application was approved', preheader: p.projectTitle,
    blocks: [para(hi(p)), para('Good news: an administrator approved your application.'), table([['Project', p.projectTitle], ['Hourly rate', `${usd(p.rate)}/hr`], ['Estimated hours', String(p.hours ?? '—')], ['Deadline', p.deadline ? date(p.deadline) : 'No fixed deadline']]),
      ...(p.comment ? [callout(`Note from the reviewer: ${p.comment}`)] : []), para('Next step: complete the short onboarding, then start working. Your timer begins when you press Start Working.')],
    button: { label: 'Start onboarding', url: abs(c, p.link) } }),
  application_rejected: (p, c) => out(`Application update: ${p.projectTitle}`, c, { title: 'Your application was not selected', preheader: p.projectTitle,
    blocks: [para(hi(p)), para(`Thank you for applying to “${p.projectTitle}”. This time the administrator chose a different applicant.`), ...(p.comment ? [callout(`Note from the reviewer: ${p.comment}`)] : []),
      para('There are many other projects. Browse the marketplace and apply to those that fit your skills.')], button: { label: 'Browse projects', url: abs(c, '/marketplace') } }),
  work_approved: (p, c) => out(`Work approved: ${p.projectTitle}`, c, { title: 'Your work was approved', blocks: [para(hi(p)), para('An administrator approved your work.'),
    table([['Project', p.projectTitle], ['Approved hours', hrs(p.approvedHours ?? p.hours)], ['Hourly rate', `${usd(p.rate)}/hr`], ['Approved earnings', usd(p.amount)]]),
    callout('Next: an administrator approves the payment for the next payment cycle (last Tuesday of the month). Approved earnings are not yet paid.')], button: { label: 'View earnings', url: abs(c, '/earnings') } }),
  revision_requested: (p, c) => out(`Changes requested: ${p.projectTitle}`, c, { title: 'Revisions requested', blocks: [para(hi(p)), para('An administrator reviewed your work and asked for changes.'), callout(`Comment: ${p.comment}`, 'warn'),
    para('Your previous submission is kept. Continue working: the timer starts a new tracked session, then submit again.')], button: { label: 'Continue working', url: abs(c, p.link) } }),
  work_rejected: (p, c) => out(`Work not approved: ${p.projectTitle}`, c, { title: 'Work not approved', blocks: [para(hi(p)), para('After review, an administrator did not approve this work.'), callout(`Comment: ${p.comment}`), para(c.supportEmail ? `Questions? Contact ${c.supportEmail}.` : '')] }),
  payment_approved: (p, c) => out(`Payment approved: ${usd(p.amount)}`, c, { title: 'Payment approved', blocks: [para(hi(p)), para('Your payment was approved and scheduled. This is not yet a completed payment.'),
    table([['Reference', p.reference], ['Project', p.projectTitle], ['Approved hours', hrs(p.hours)], ['Approved amount', usd(p.amount)], ['Payment method', p.method], ['Expected payment date', date(p.paymentDate)], ['Status', 'Approved for payment']]),
    callout('Payments are processed on the last Tuesday of each month. You will get another email when processing starts and when the payment is completed. You need a verified payout account.')], button: { label: 'View payment', url: abs(c, '/earnings') } }),
  payment_carried: (p, c) => out('Earnings carried to the next payment cycle', c, { title: 'Moved to the next payment cycle', blocks: [para(hi(p)), para(`This payment was approved after the deadline for its cycle, so it moves to the next one.`),
    table([['Reference', p.reference], ['Amount', usd(p.amount)], ['New payment date', date(p.paymentDate)], ['Status', 'Carried forward']])], button: { label: 'View earnings', url: abs(c, '/earnings') } }),
  payment_processing: (p, c) => out(`Payment processing: ${usd(p.amount)}`, c, { title: 'Your payment is processing', blocks: [para(hi(p)), para('We started sending your payment. It is not complete until you receive a completion email.'),
    table([['Reference', p.reference], ['Amount', usd(p.amount)], ['Payment method', p.method], ['Status', 'Processing']])], button: { label: 'View payment', url: abs(c, '/earnings') } }),
  payment_completed: (p, c) => out(`Payment completed: ${usd(p.amount)}`, c, { title: 'Payment completed', blocks: [para(hi(p)), para('Your payment was sent and recorded as completed.'),
    table([['Reference', p.reference], ['Transfer reference', p.transferReference || '—'], ['Project', p.projectTitle], ['Approved hours', hrs(p.hours)], ['Amount paid', usd(p.amount)], ['Payment method', p.method], ['Status', 'Paid']])],
    button: { label: 'View receipt', url: abs(c, '/earnings') } }),
  payment_failed: (p, c) => out(`Payment failed: ${usd(p.amount)}`, c, { title: 'We could not complete your payment', blocks: [para(hi(p)), para('Your payment did not go through.'),
    callout(`Reason: ${p.reason || 'Not provided'}`, 'warn'), para('What to do: check that your payout account details are correct and verified, then contact support. We will retry once it is fixed.'),
    table([['Reference', p.reference], ['Amount', usd(p.amount)], ['Status', 'Failed']])], button: { label: 'Check payment settings', url: abs(c, '/payout') } }),
  reminder: (p, c) => out(`Reminder: ${p.projectTitle}`, c, { title: 'You have unfinished work', preheader: p.projectTitle,
    blocks: [para(hi(p)), para({ deadline: 'A project deadline is coming up.', unstarted: 'A project was assigned to you but has not been started.', inactive: 'There has been no recent activity on one of your projects.', continue: 'Your work on this project is still open. Your notes, files and progress are saved, and the project brief is waiting in the workspace, so you can pick up where you left off.' }[p.reason as string] || 'You have unfinished work.'),
      table([['Project', p.projectTitle], ['Status', String(p.status || '').replace('_', ' ')], ['Last saved', p.lastSaved ? date(p.lastSaved) : 'Nothing saved yet'], ['Progress', p.progressPercent == null ? '—' : `${p.progressPercent}%`],
        ['Deadline', p.deadline ? `${date(p.deadline)}${p.remainingDays != null ? ` (${p.remainingDays} days left)` : ''}` : 'No fixed deadline']])], button: { label: 'Continue working', url: abs(c, p.link) } }),
  weekly_statement: (p, c) => out(`Your weekly earnings statement (${p.period})`, c, { title: 'Weekly earnings statement', blocks: [para(hi(p)), para('Your weekly statement is ready.'), ...statementBlocks(p)],
    button: { label: 'View full statement', url: abs(c, p.link) } }),
  monthly_statement: (p, c) => out(`Your monthly earnings statement (${p.period})`, c, { title: 'Monthly earnings statement', blocks: [para(hi(p)), para('Your monthly statement is ready.'), ...statementBlocks(p)],
    button: { label: 'View full statement', url: abs(c, p.link) } }),
}

export function render(type: string, payload: P, c: Cfg) {
  const t = TEMPLATES[type]
  if (!t) throw new Error(`No email template for type "${type}"`)
  return t(payload, c)
}
