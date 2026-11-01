import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { useToast } from '../context/ToastContext'
import * as payoutApi from '../services/payout'
import { abaValid } from '../utils/validation'
import { fmtDate } from '../utils/format'
import { Icon, Loaded, PageHeader, StatusPill } from '../components/ui'
import FormDialog from '../components/FormDialog'

export default function PaymentSettings() {
  const { user } = useAuth()
  const toast = useToast()
  const [dialog, setDialog] = useState(null) // 'bank' | 'tax'
  const query = useAsync(async () => ({ bank: await payoutApi.getMine(user.id), tax: await payoutApi.getTax(user.id) }), [user.id], { refreshOnFocus: true })

  return (
    <>
      <PageHeader title="Payment Settings">Payments are processed on the last Tuesday of every month to an eligible United States bank account or an eligible United States AirTM account.</PageHeader>
      <Loaded query={query}>
        {({ bank, tax }) => (
          <>
            <section>
              <h2>Payout account</h2>
              <div className="row-card">
                <span className="tile"><Icon name="fa-building-columns" /></span>
                <div className="grow">
                  {bank ? (
                    <>
                      {bank.method === 'airtm'
                        ? <><h3>AirTM (United States) · {bank.displayMask}</h3><p>{bank.accountHolder} · Added {fmtDate(bank.createdAt)}</p></>
                        : <><h3>{bank.bankName} · {bank.accountType === 'checking' ? 'Checking' : 'Savings'} ••••{bank.accountLast4}</h3><p>{bank.accountHolder} · Routing ••••{bank.routingLast4} · Added {fmtDate(bank.createdAt)}</p></>}
                      <p><StatusPill kind="bank" value={bank.status} />{bank.status === 'pending' && ' An administrator will verify this account before your first payout.'}{bank.reviewNote && ` Note: ${bank.reviewNote}`}</p>
                    </>
                  ) : <><h3>No payout account</h3><p>Add an eligible US bank account or US AirTM account to receive payments.</p></>}
                </div>
                <div className="inline-actions"><button className="btn" onClick={() => setDialog('bank')}>{bank?.method === 'bank' ? 'Replace bank account' : 'Add US bank account'}</button><button className="btn secondary" onClick={() => setDialog('airtm')}>{bank?.method === 'airtm' ? 'Replace AirTM account' : 'Add US AirTM account'}</button></div>
              </div>
              <div className="callout info">
                Your routing and account numbers are sent over an encrypted connection straight to our secure server and stored encrypted. They are never kept in your browser, and only the last 4 digits are ever shown here. Changing the account requires verification again.
              </div>
            </section>
            <section>
              <h2>Tax information</h2>
              <div className="row-card">
                <span className="tile"><Icon name="fa-file-invoice" /></span>
                <div className="grow">
                  {tax ? <><h3>{tax.formType === 'w9' ? 'W-9' : 'General tax form'} on file</h3><p>{tax.legalName} · ID ••••{tax.tinLast4} · Submitted {fmtDate(tax.submittedAt)}</p></>
                    : <><h3>Tax form not submitted</h3><p>US taskers submit a W-9. International taskers submit a general tax form.</p></>}
                </div>
                <button className={`btn${tax ? ' secondary' : ''}`} onClick={() => setDialog('tax')}>{tax ? 'Update' : 'Submit tax form'}</button>
              </div>
            </section>

            {dialog === 'bank' && (
              <FormDialog title="US bank account" intro="Enter the details exactly as they appear on your bank account." confirmLabel="Save bank account" onClose={() => setDialog(null)}
                fields={[
                  { name: 'holder', label: 'Account holder name', required: true, maxLength: 100, autoComplete: 'name' },
                  { name: 'bank', label: 'Bank name', required: true, maxLength: 100 },
                  { name: 'type', label: 'Account type', type: 'select', options: [{ value: 'checking', label: 'Checking' }, { value: 'savings', label: 'Savings' }] },
                  { name: 'routing', label: 'Routing number (9 digits)', required: true, inputMode: 'numeric', maxLength: 9 },
                  { name: 'account', label: 'Account number', required: true, inputMode: 'numeric', maxLength: 17 },
                  { name: 'account2', label: 'Confirm account number', required: true, inputMode: 'numeric', maxLength: 17 },
                ]}
                validate={(d) => ({
                  holder: d.holder.length < 2 ? 'Enter the name on the account.' : '',
                  bank: d.bank.length < 2 ? 'Enter the bank name.' : '',
                  routing: abaValid(d.routing) ? '' : 'Enter a valid 9-digit US routing number.',
                  account: /^\d{4,17}$/.test(d.account) ? '' : 'Account numbers are 4–17 digits.',
                  account2: d.account !== d.account2 ? 'Account numbers do not match.' : '',
                })}
                onSubmit={async (d) => { await payoutApi.save(d); toast.success('Bank account saved. It is now pending verification.'); query.reload() }} />
            )}
            {dialog === 'airtm' && (
              <FormDialog title="US AirTM account" intro="Only eligible United States AirTM accounts can receive payments. The email is stored encrypted and only a masked version is shown." confirmLabel="Save AirTM account" onClose={() => setDialog(null)}
                fields={[{ name: 'name', label: 'Account holder name', required: true, maxLength: 100, autoComplete: 'name' }, { name: 'email', label: 'Email address of your AirTM account', type: 'email', required: true }, { name: 'us', label: 'This is a United States AirTM account that is in my name.', type: 'checkbox', required: true, requiredMessage: 'Only eligible United States AirTM accounts are supported.' }]}
                validate={(d) => ({ name: d.name.length < 2 ? 'Enter the account holder name.' : '', email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email) ? '' : 'Enter a valid email address.' })}
                onSubmit={async (d) => { await payoutApi.saveAirtm(d); toast.success('AirTM account saved. It is now pending verification.'); query.reload() }} />
            )}
            {dialog === 'tax' && (
              <FormDialog title="Tax information" intro="Only the last 4 characters of your tax ID are stored." confirmLabel="Save" onClose={() => setDialog(null)}
                initial={{ legalName: tax?.legalName || '', formType: tax?.formType || 'w9', classification: tax?.classification || '' }}
                fields={[
                  { name: 'formType', label: 'Form', type: 'select', options: [{ value: 'w9', label: 'W-9 (US taxpayers)' }, { value: 'general', label: 'General tax form (international)' }] },
                  { name: 'legalName', label: 'Legal name', required: true, maxLength: 120, autoComplete: 'name' },
                  { name: 'classification', label: 'Tax classification or country of residence', required: true, maxLength: 80 },
                  { name: 'tinLast4', label: 'Last 4 characters of your tax ID', required: true, maxLength: 4 },
                  { name: 'cert', label: 'I certify that this information is correct.', type: 'checkbox', required: true, requiredMessage: 'You must certify before submitting.' },
                ]}
                validate={(d) => ({ legalName: d.legalName.length < 2 ? 'Enter your legal name.' : '', tinLast4: /^[A-Za-z0-9]{4}$/.test(d.tinLast4) ? '' : 'Enter exactly 4 letters or digits.' })}
                onSubmit={async (d) => { await payoutApi.saveTax(user.id, d); toast.success('Tax information saved.'); query.reload() }} />
            )}
          </>
        )}
      </Loaded>
    </>
  )
}
