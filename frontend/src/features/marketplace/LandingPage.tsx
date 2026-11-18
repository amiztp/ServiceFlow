import { Link } from 'react-router-dom'
import { ArrowRight, Building2, CalendarCheck, ClipboardCheck, Wrench } from 'lucide-react'
import { SurfaceCard } from '../../components'

export function LandingPage() {
  return <>
    <section className="sf-landing-hero">
      <div>
        <p className="sf-eyebrow">LOCAL EXPERTISE. CLEAR NEXT STEPS.</p>
        <h1 className="sf-display text-4xl font-bold md:text-6xl">Your home needs help.<br />We keep it simple.</h1>
        <p className="my-6 max-w-xl text-lg text-text-secondary">Discover service companies, agree the price and follow your work from the first request to the final invoice.</p>
        <div className="flex flex-wrap gap-4">
          <Link className="sf-primary-link" to="/services">Explore services <ArrowRight size={18} /></Link>
          <Link className="sf-secondary-link" to="/register">Create an account</Link>
        </div>
      </div>
      <SurfaceCard className="space-y-6 p-7">
        <Wrench size={36} aria-hidden="true" />
        <h2 className="sf-display text-2xl font-semibold">Every detail, together.</h2>
        <ol className="space-y-5">
          {['Choose a company and send a request', 'Review your quotation and appointment', 'Track progress and view your invoice'].map((step, index) => (
            <li key={step} className="flex gap-4"><span className="sf-mono">0{index + 1}</span>{step}</li>
          ))}
        </ol>
        <p className="border-t border-line pt-5 text-sm text-text-secondary">You approve the price and proposed time before work begins.</p>
      </SurfaceCard>
    </section>
    <section id="how-it-works" className="my-12">
      <h2 className="sf-display mb-6 text-3xl font-bold">A clear path to getting it done</h2>
      <div className="grid gap-5 md:grid-cols-3">
        {[
          { icon: Building2, title: 'Find your team', text: 'Compare services, locations and public starting prices.' },
          { icon: CalendarCheck, title: 'Make the decisions', text: 'Approve the quotation and the company’s proposed appointment.' },
          { icon: ClipboardCheck, title: 'Follow every step', text: 'Keep requests, jobs, invoices and feedback in your client dashboard.' },
        ].map(({ icon: Icon, title, text }) => <SurfaceCard key={title} className="space-y-4 p-6">
          <Icon size={26} aria-hidden="true" /><h3 className="sf-display text-xl font-semibold">{title}</h3><p className="text-text-secondary">{text}</p>
        </SurfaceCard>)}
      </div>
    </section>
  </>
}
