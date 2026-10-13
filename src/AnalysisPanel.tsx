import { useEffect, useState } from 'react'
import { Download, ExternalLink, ChevronDown } from 'lucide-react'
import type { Report, Status } from './engine/types'
import { StatusDot } from './ui'

const LABELS: Record<Status, string> = { fail: 'Warning', caution: 'Caution', pass: 'No issue found', info: 'Context', not_checked: 'Not checked' }
const STYLES: Record<Status, string> = { fail: 'text-red', caution: 'text-amber', pass: 'text-ink', info: 'text-mute', not_checked: 'text-mute' }
type Filter = 'all' | 'attention' | 'unavailable'

function downloadReport(report: Report) {
  // Exclude image contents and extracted raw payment URLs; the analysed URL is redacted.
  const { screenshot: _screenshot, ...safe } = report
  const blob = new Blob([JSON.stringify(safe, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `beforepay-${report.id}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function AnalysisPanel({ report }: { report: Report }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [tab, setTab] = useState<'checks' | 'details'>('checks')
  useEffect(() => { setFilter('all'); setTab('checks') }, [report.id])
  const warnings = report.criteria.filter(c => c.status === 'fail').length
  const cautions = report.criteria.filter(c => c.status === 'caution').length
  const unavailable = report.criteria.filter(c => c.status === 'not_checked').length
  const complete = report.criteria.length - unavailable
  const rows = report.criteria.filter(c => filter === 'all' || (filter === 'attention' ? c.status === 'fail' || c.status === 'caution' : c.status === 'not_checked'))
  const host = report.url.hostname
  const domain = report.url.isIp || /\.(local|internal|example|invalid|test)$/.test(host) || host === 'localhost' ? null : report.url.registrableDomain ?? host

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-card" aria-labelledby="analysis-title">
      <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-7">
        <div>
          <h2 id="analysis-title" className="text-[24px] font-bold tracking-[-0.03em]">Payment analysis</h2>
          <p className="mt-1 text-[15px] text-mute">{complete} of {report.criteria.length} criteria completed. Each result has a reason and a limit.</p>
        </div>
        <button onClick={() => downloadReport(report)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-[14px] font-semibold hover:border-ink"><Download size={16} /> Export report</button>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-line bg-paper px-5 py-4 text-[15px] sm:px-7" aria-label="Analysis coverage">
        <span className="font-semibold text-red">{warnings} warning{warnings === 1 ? '' : 's'}</span>
        <span className="font-semibold text-amber">{cautions} caution{cautions === 1 ? '' : 's'}</span>
        <span className="text-mute">{unavailable} not checked</span>
        <span className="ml-auto text-[14px] text-mute">Rules v{report.engineVersion}</span>
      </div>
      <div className="flex gap-5 border-b border-line px-5 sm:px-7" role="group" aria-label="Report sections">
        <button aria-pressed={tab === 'checks'} onClick={() => setTab('checks')} className={`min-h-12 border-b-2 text-[15px] font-semibold ${tab === 'checks' ? 'border-ink' : 'border-transparent text-mute'}`}>Interpretable checks</button>
        <button aria-pressed={tab === 'details'} onClick={() => setTab('details')} className={`min-h-12 border-b-2 text-[15px] font-semibold ${tab === 'details' ? 'border-ink' : 'border-transparent text-mute'}`}>Technical details</button>
      </div>
      {tab === 'checks' ? (
        <>
          <div className="flex flex-wrap gap-2 px-5 py-4 sm:px-7" role="group" aria-label="Filter criteria">
            {([['all', `All (${report.criteria.length})`], ['attention', `Needs attention (${warnings + cautions})`], ['unavailable', `Not checked (${unavailable})`]] as const).map(([value, label]) => (
              <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-11 rounded-full px-4 text-[14px] font-semibold ${filter === value ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-paper-2'}`}>{label}</button>
            ))}
          </div>
          <div className="hidden grid-cols-[minmax(180px,1fr)_135px_minmax(0,2fr)] gap-5 border-y border-line bg-paper px-7 py-2 text-[13px] font-semibold text-mute md:grid" aria-hidden="true"><span>Criterion</span><span>Result</span><span>Evidence</span></div>
          <ul aria-label="Interpretable criteria">
            {rows.map(c => (
              <li key={c.id} className="border-b border-line last:border-b-0">
                <details>
                  <summary className="group grid cursor-pointer gap-2 px-5 py-4 hover:bg-paper/60 sm:px-7 md:grid-cols-[minmax(180px,1fr)_135px_minmax(0,2fr)] md:gap-5">
                    <div className="flex min-w-0 items-start gap-3"><StatusDot status={c.status} /><div className="min-w-0"><p className="text-[16px] font-semibold leading-snug">{c.title}</p><p className="mt-1 text-[12px] text-mute">{c.basis}</p></div></div>
                    <span className={`pl-10 text-[14px] font-semibold md:pl-0 ${STYLES[c.status]}`}>{LABELS[c.status]}</span>
                    <div className="flex min-w-0 gap-3 pl-10 md:pl-0"><p className="min-w-0 flex-1 text-[15px] leading-snug break-words">{c.summary}</p><ChevronDown size={16} className="mt-1 shrink-0 text-mute transition-transform group-open:rotate-180" /></div>
                  </summary>
                  <div className="border-t border-line bg-paper/60 px-5 py-4 text-[15px] leading-relaxed sm:px-7">
                    <p className="max-w-[85ch] break-words">{c.detail}</p>
                    {c.source && <p className="mt-2 text-[14px] text-mute">Source: {c.source.url ? <a href={c.source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{c.source.label}</a> : c.source.label}</p>}
                  </div>
                </details>
              </li>
            ))}
          </ul>
          {!rows.length && <p className="px-5 py-8 text-[16px] text-mute sm:px-7">No criteria in this group. Unchecked criteria still limit the result.</p>}
        </>
      ) : (
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-2">
          <dl className="grid content-start gap-4 text-[15px]">
            {[
              ['Analysed address', report.url.href], ['Actual hostname', host], ['Registrable domain', report.url.registrableDomain ?? 'None (IP or local address)'], ['ASCII hostname', report.url.hostname], ['Checked at (UTC)', new Date(report.checkedAt).toISOString()], ['Data redacted', `${report.url.redactions} sensitive field${report.url.redactions === 1 ? '' : 's'}`],
            ].map(([label, value]) => <div key={label}><dt className="text-[13px] font-semibold text-mute">{label}</dt><dd className="mt-1 break-all font-mono text-[14px]">{value}</dd></div>)}
          </dl>
          <div className="text-[16px] leading-relaxed">
            <h3 className="font-bold">How the decision is made</h3>
            <p className="mt-2">Strong address deception, a threat-feed listing or a confirmed expected-brand mismatch triggers a warning. Young domains, similar spellings, personal payments and hidden destinations call for further checks.</p>
            <p className="mt-3">An old domain, HTTPS or a name match cannot establish merchant identity. Criteria are separate rules from one engine; they are not independent scanner votes or a fraud probability.</p>
            <p className="mt-3 text-mute">No page, certificate or arbitrary redirect is visited. The final recipient is never inferred from a provider logo.</p>
            {domain && <a href={`https://www.virustotal.com/gui/domain/${encodeURIComponent(domain)}`} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold underline underline-offset-4">View domain in VirusTotal <ExternalLink size={16} /></a>}
            {domain && <p className="mt-1 text-[13px] text-mute">Opens an external domain report. Your payment path and session tokens are not included. VirusTotal data is not part of this result.</p>}
          </div>
        </div>
      )}
      <p className="border-t border-line px-5 py-4 text-[13px] text-mute sm:px-7">Coverage is a count of completed criteria, not a safety score. Missing checks never count as a pass.</p>
    </section>
  )
}
