'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Briefcase, CalendarDays, FileText, Gavel, HandHeart, Landmark, Megaphone, Scale, ScrollText, ShieldCheck, Users } from 'lucide-react';
import { useWS } from '@/lib/ws/store';
import { LibraryExplorer } from '@/components/ws/library';
import { DocIcon, DocViewer } from '@/components/ws/ui';
import type { LibDoc } from '@/lib/ws/types';

type T = (en: string, am: string) => string;
function Intro({ eyebrow = 'SOUTH OMO JUSTICE', title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return <div className="page-intro"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{children && <p>{children}</p>}</div>;
}
function Go({ href, children }: { href: string; children: React.ReactNode }) { return <Link className="sp-go" href={href}>{children}<ArrowRight size={16} /></Link>; }
const Sample = () => <span className="badge">Sample content · requires official verification</span>;

export const SITE_PAGES = ['library', 'mission-vision', 'powers-duties', 'prosecution', 'legal-aid', 'advocates', 'press-releases', 'videos', 'publications', 'vacancies', 'tenders'];

export function SitePage({ kind, t }: { kind: string; t: T }) {
  switch (kind) {
    case 'library': return <PublicLibrary t={t} />;
    case 'mission-vision': return <>
      <Intro title={t('Mission, vision & values', 'ተልዕኮ፣ ራዕይ እና እሴቶች')}>What guides the South Omo Zone Justice Department.</Intro>
      <div className="sp-grid3">
        <article className="panel sp-card"><Landmark /><h2>Vision</h2><p>To see a zone where the rule of law prevails, justice is accessible to all and human rights are respected.</p></article>
        <article className="panel sp-card"><Scale /><h2>Mission</h2><p>Provide efficient prosecution, legal aid and legal awareness services; coordinate justice institutions; and support customary dispute resolution in line with the constitution.</p></article>
        <article className="panel sp-card"><ShieldCheck /><h2>Values</h2><ul className="sp-list">{['Rule of law', 'Integrity & impartiality', 'Transparency & accountability', 'Respect for human rights', 'Service excellence', 'Respect for cultural diversity'].map(v => <li key={v}>{v}</li>)}</ul></article>
      </div><Sample />
    </>;
    case 'powers-duties': return <>
      <Intro title={t('Powers & duties', 'ስልጣንና ተግባር')}>Summary of the department’s mandate, based on regional proclamations (for verification).</Intro>
      <div className="sp-grid2">{[
        ['Prosecution', 'Investigate-led prosecution of criminal cases on behalf of the public and the regional state.'],
        ['Legal advice', 'Provide legal advice to zone and woreda government offices and review draft directives.'],
        ['Legal aid', 'Coordinate free legal aid for women, children, persons with disabilities and indigent people.'],
        ['Advocates', 'Register and license advocates practising before zone and woreda courts.'],
        ['Legal awareness', 'Conduct public legal education, including in pastoralist communities.'],
        ['Customary justice', 'Support and document customary dispute resolution consistent with human rights.'],
        ['Crime prevention', 'Coordinate crime prevention with police, courts and community structures.'],
        ['Public property & interest', 'Represent the government in civil cases and protect public property.'],
      ].map(([h, p]) => <article key={h} className="panel sp-duty"><BadgeCheck /><div><h3>{h}</h3><p>{p}</p></div></article>)}</div><Sample />
    </>;
    case 'prosecution': return <ServicePage t={t} icon={<Gavel />} title={t('Public prosecution', 'የዐቃቤ ሕግ አገልግሎት')} intro="Public prosecutors handle criminal cases from investigation to judgment, within service level agreements set for each case category."
      steps={['Police investigation file is received and registered.', 'Prosecutor reviews evidence and decides to charge or close.', 'Charge is filed and the case is followed in court.', 'Judgment, appeal and closure are recorded.']}
      extra={<p>Prosecutors report daily, weekly and monthly to the Director. Staff can <Link href="/dashboard/login">sign in to the prosecution portal</Link>.</p>} />;
    case 'legal-aid': return <ServicePage t={t} icon={<HandHeart />} title={t('Free legal aid', 'ነጻ የሕግ ድጋፍ')} intro="Free legal advice and representation for people who cannot afford a lawyer, with priority for women, children, elderly people and persons with disabilities."
      steps={['Visit the zone office or your woreda justice office.', 'Explain your case and bring available documents.', 'An officer assesses eligibility.', 'You receive advice, document drafting or referral to representation.']} />;
    case 'advocates': return <ServicePage t={t} icon={<Briefcase />} title={t('Advocates licensing', 'የጥብቅና ፈቃድ')} intro="Registration, licensing and annual renewal for advocates practising before zone and woreda courts."
      steps={['Prepare your LLB/degree, ID, photos and experience letters.', 'Submit the application form to the zone office.', 'Sit the qualification exam where required.', 'Pay the fee and collect the licence. Renew annually.']} />;
    case 'press-releases': return <Listing t={t} title={t('Press releases', 'ጋዜጣዊ መግለጫ')} intro="Official statements from the department." icon={<Megaphone />} items={[
      ['Department launches digital library for researchers', 'The new digital library gives researchers access to laws, manuals and research after a simple Telebirr payment.', 3],
      ['Prosecution portal introduces SLA monitoring', 'Each case category now has a service level agreement monitored by the Director.', 12],
      ['Legal awareness campaign reaches Hamer and Dasenech', 'Community dialogue sessions held in partnership with elders and woreda offices.', 30],
    ]} />;
    case 'vacancies': return <Listing t={t} title={t('Vacancies', 'ክፍት የስራ ቦታ')} intro="Open positions at the zone department and woreda offices." icon={<Users />} items={[
      ['Public Prosecutor II – Hamer woreda (2 posts)', 'LLB with 2 years of experience. Deadline in 10 days.', 2],
      ['Legal Aid Officer – Jinka', 'LLB, good communication in Amharic and a local language. Deadline in 14 days.', 5],
      ['Records & ICT Assistant', 'Diploma in IT or records management. Deadline in 7 days.', 8],
    ]} />;
    case 'tenders': return <Listing t={t} title={t('Tenders', 'ጨረታ')} intro="Procurement notices." icon={<ScrollText />} items={[
      ['Supply of office furniture for woreda offices', 'National open tender. Bid documents available at the zone finance office.', 4],
      ['Printing of legal awareness materials', 'Request for quotation. Submission within 10 working days.', 9],
    ]} />;
    case 'videos': return <MediaDocs t={t} title={t('Videos', 'ቪዲዮዎች')} intro="Training and awareness videos from the digital library." filter={d => d.type === 'video'} />;
    case 'publications': return <MediaDocs t={t} title={t('Publications', 'ህትመቶች')} intro="Reports, research and manuals published by the department and contributed by researchers." filter={d => d.type !== 'video' && !['c-forms'].includes(d.categoryId)} />;
  }
  return null;
}

function ServicePage({ title, intro, steps, icon, extra }: { t: T; title: string; intro: string; steps: string[]; icon: React.ReactNode; extra?: React.ReactNode }) {
  return <>
    <Intro eyebrow="SERVICES" title={title}>{intro}</Intro>
    <div className="two-col"><article className="panel prose"><h2>How it works</h2><ol className="sp-steps">{steps.map((s, i) => <li key={i}><span>{i + 1}</span>{s}</li>)}</ol>{extra}</article>
      <aside className="panel sp-help">{icon}<h3>Need help?</h3><p>Visit the South Omo Zone Justice Department in Jinka or your woreda justice office during working hours.</p><Go href="/offices">Find an office</Go><Go href="/contact">Contact us</Go></aside></div>
    <Sample />
  </>;
}
function Listing({ title, intro, items, icon }: { t: T; title: string; intro: string; icon: React.ReactNode; items: [string, string, number][] }) {
  return <>
    <Intro eyebrow="MEDIA & NOTICES" title={title}>{intro}</Intro>
    <div className="sp-listing">{items.map(([h, p, d]) => <article key={h} className="panel">{icon}<div><small><CalendarDays size={13} />{new Date(Date.now() - d * 86400000).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</small><h3>{h}</h3><p>{p}</p></div></article>)}</div>
    <Sample />
  </>;
}
function MediaDocs({ title, intro, filter }: { t: T; title: string; intro: string; filter: (d: LibDoc) => boolean }) {
  const { ready, data } = useWS();
  const [open, setOpen] = useState<LibDoc | null>(null);
  if (!ready) return <Intro title={title}>{intro}</Intro>;
  const docs = data.docs.filter(d => d.status === 'published' && d.visibility === 'public' && filter(d));
  const locked = data.docs.filter(d => d.status === 'published' && d.visibility === 'researchers' && filter(d)).length;
  return <>
    <Intro eyebrow="DIGITAL LIBRARY" title={title}>{intro}</Intro>
    <div className="lib-grid public">{docs.map(d => <button key={d.id} className={'lib-card t-' + d.type} onClick={() => setOpen(d)}>
      {d.type === 'video' ? <video className="lib-thumb" src={d.url + '#t=2'} muted preload="metadata" /> : <div className="lib-card-top"><DocIcon type={d.type} size={26} /><span className="lib-type">{d.type.toUpperCase()}</span></div>}
      <h3>{d.title}</h3><p>{d.description}</p><div className="lib-meta"><span>{d.author}</span><span>{d.year}</span></div></button>)}</div>
    {locked > 0 && <p className="sp-more"><FileText size={16} />{locked} more item{locked > 1 ? 's are' : ' is'} available to registered researchers in the <Link href="/library">digital library</Link>.</p>}
    <DocViewer doc={open} onClose={() => setOpen(null)} />
  </>;
}

function PublicLibrary({ t }: { t: T }) {
  const { ready, data, hasLibraryAccess, user } = useWS();
  return <>
    <Intro eyebrow="DIGITAL LIBRARY" title={t('Digital Library', 'ዲጂታል ቤተ መጻሕፍት')}>Laws, research papers, manuals, annual reports and training videos. Public documents are open to everyone; researcher-only documents require a researcher account.</Intro>
    {ready ? <>
      <div className="sp-lib-cta">
        <div><b>{data.docs.filter(d => d.status === 'published').length}</b><span>documents</span></div>
        <div><b>{data.categories.filter(c => !c.parentId).length}</b><span>folders</span></div>
        <div><b>{data.docs.filter(d => d.source === 'researcher' && d.status === 'published').length}</b><span>researcher contributions</span></div>
        {user ? <Link className="ws-btn" href="/dashboard/library">Open in my dashboard</Link> : <><Link className="ws-btn" href="/dashboard/register">Register as researcher ({data.settings.libraryFee} ETB)</Link><Link className="ws-btn ghost" href="/dashboard/login">Sign in</Link></>}
      </div>
      <LibraryExplorer fullAccess={hasLibraryAccess()} publicMode />
    </> : <p>Loading library…</p>}
  </>;
}
