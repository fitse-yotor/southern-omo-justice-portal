'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell, BookOpen, BookUp, Briefcase, ChartColumn, CheckSquare, ClipboardList, FilePlus2, FolderCog, Globe, KeyRound, LayoutDashboard,
  LogOut, Scale, ScrollText, Settings2, ShieldCheck, Timer, UserCircle2, Users, Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger, SidebarFooter, useSidebar } from '@/components/ui/sidebar';
import { useWS } from '@/lib/ws/store';
import type { Permission } from '@/lib/ws/types';
import { Avatar, F } from './ui';
import { Dashboard } from './dashboards';
import { LibraryBrowse, LibraryManage, LibraryApprovals, LibraryAccess, LibraryContribute } from './library';
import { CaseList, CaseNew, CaseDetail, SlaSettings } from './cases';
import { PeriodicReports, PeriodicReportDetail } from './preports';
import { UsersPage, RolesPage, AuditPage, SettingsPage, ProfilePage, NotificationsPage } from './admin';
import { ReportsPage } from './analytics';

type NavItem = { href: string; label: string; icon: React.ReactNode; show: boolean; badge?: number };

export default function Workspace() {
  const ws = useWS();
  const path = usePathname() || '/dashboard';
  const router = useRouter();
  const parts = path.split('/').filter(Boolean).slice(1);
  const page = parts[0] || '';
  const isPublicAuth = page === 'login' || page === 'register';

  useEffect(() => { if (ws.ready && !ws.user && !isPublicAuth) router.replace('/dashboard/login?next=' + encodeURIComponent(path)); }, [ws.ready, ws.user, isPublicAuth, path, router]);

  if (!ws.ready) return <div className="ws-loading"><Scale size={36} /><span>Loading workspace…</span></div>;
  if (page === 'login') return <Login />;
  if (page === 'register') return <Register />;
  if (!ws.user) return <div className="ws-loading"><Scale size={36} /><span>Redirecting to sign in…</span></div>;

  const { can, data, user } = ws;
  const isResearcher = can('library.contribute');
  const pendingApprovals = data.payments.filter(p => p.status === 'pending').length + data.docs.filter(d => d.status === 'pending').length;
  const unread = data.notifications.filter(n => n.userId === user.id && !n.read).length;
  const anyReport = (['reports.system', 'reports.library', 'reports.cases', 'reports.own'] as Permission[]).some(can);
  const pendingReview = data.preports.filter(r => r.status === 'Submitted').length;

  const groups: [string, NavItem[]][] = [
    ['Overview', [
      { href: '/dashboard', label: 'My dashboard', icon: <LayoutDashboard />, show: true },
      { href: '/dashboard/notifications', label: 'Notifications', icon: <Bell />, show: true, badge: unread },
    ]],
    ['Digital library', [
      { href: '/dashboard/library', label: 'Browse library', icon: <BookOpen />, show: true },
      { href: '/dashboard/library/access', label: 'Library access & payment', icon: <Wallet />, show: isResearcher },
      { href: '/dashboard/library/contribute', label: 'My contributions', icon: <BookUp />, show: isResearcher },
      { href: '/dashboard/library/manage', label: 'Manage library', icon: <FolderCog />, show: can('library.manage') },
      { href: '/dashboard/library/approvals', label: 'Approvals', icon: <CheckSquare />, show: can('library.approve'), badge: pendingApprovals },
    ]],
    ['Prosecution', [
      { href: '/dashboard/cases', label: can('cases.viewAll') ? 'All cases' : 'My cases', icon: <Briefcase />, show: can('cases.viewAll') || can('cases.viewOwn') },
      { href: '/dashboard/cases/new', label: 'New case', icon: <FilePlus2 />, show: can('cases.create') },
      { href: '/dashboard/sla', label: 'SLA by category', icon: <Timer />, show: can('sla.manage') },
      { href: '/dashboard/periodic-reports', label: can('preports.review') ? 'Prosecutor reports' : 'My reports', icon: <ClipboardList />, show: can('preports.submit') || can('preports.review'), badge: can('preports.review') ? pendingReview : 0 },
    ]],
    ['Reports', [{ href: '/dashboard/reports', label: 'Reports & export', icon: <ChartColumn />, show: anyReport }]],
    ['Administration', [
      { href: '/dashboard/users', label: 'Users', icon: <Users />, show: can('users.manage') },
      { href: '/dashboard/roles', label: 'Roles & permissions', icon: <KeyRound />, show: can('roles.manage') },
      { href: '/dashboard/audit', label: 'Audit log', icon: <ScrollText />, show: can('audit.view') },
      { href: '/dashboard/settings', label: 'Settings', icon: <Settings2 />, show: can('settings.manage') },
      { href: '/admin', label: 'Website CMS & complaints', icon: <Globe />, show: can('cms.access') },
    ]],
    ['Account', [{ href: '/dashboard/profile', label: 'My profile', icon: <UserCircle2 />, show: true }]],
  ];
  const flat = groups.flatMap(g => g[1]).filter(i => i.show);
  const active = flat.filter(i => path === i.href || (i.href !== '/dashboard' && path.startsWith(i.href + '/'))).sort((a, b) => b.href.length - a.href.length)[0] || flat.find(i => i.href === path);

  const deny = (ok: boolean, el: React.ReactNode) => (ok ? el : <Denied />);
  let content: React.ReactNode;
  switch (page) {
    case '': content = <Dashboard />; break;
    case 'notifications': content = <NotificationsPage />; break;
    case 'profile': content = <ProfilePage />; break;
    case 'library':
      content = parts[1] === 'manage' ? deny(can('library.manage'), <LibraryManage />) : parts[1] === 'approvals' ? deny(can('library.approve'), <LibraryApprovals />)
        : parts[1] === 'access' ? <LibraryAccess /> : parts[1] === 'contribute' ? deny(isResearcher, <LibraryContribute />) : <LibraryBrowse />;
      break;
    case 'cases':
      content = !(can('cases.viewAll') || can('cases.viewOwn')) ? <Denied /> : parts[1] === 'new' ? deny(can('cases.create'), <CaseNew />) : parts[1] ? <CaseDetail id={parts[1]} /> : <CaseList />;
      break;
    case 'sla': content = deny(can('sla.manage'), <SlaSettings />); break;
    case 'periodic-reports': content = deny(can('preports.submit') || can('preports.review'), parts[1] ? <PeriodicReportDetail id={parts[1]} /> : <PeriodicReports />); break;
    case 'reports': content = deny(anyReport, <ReportsPage />); break;
    case 'users': content = deny(can('users.manage'), <UsersPage />); break;
    case 'roles': content = deny(can('roles.manage'), <RolesPage />); break;
    case 'audit': content = deny(can('audit.view'), <AuditPage />); break;
    case 'settings': content = deny(can('settings.manage'), <SettingsPage />); break;
    default: content = <Denied notFound />;
  }

  return <SidebarProvider>
    <Sidebar className="justice-sidebar ws-sidebar">
      <SidebarHeader><Link className="admin-brand" href="/dashboard"><img src="/justice-logo.png" alt="" width={34} height={34} /><span>South Omo Justice<small>Staff & researcher portal</small></span></Link></SidebarHeader>
      <SidebarContent>
        {groups.map(([g, items]) => { const vis = items.filter(i => i.show); if (!vis.length) return null; return <div key={g} className="ws-nav-group"><div className="sidebar-caption">{g}</div><SidebarMenu>{vis.map(i => <SidebarMenuItem key={i.href}><NavLink item={i} active={active?.href === i.href} /></SidebarMenuItem>)}</SidebarMenu></div>; })}
      </SidebarContent>
      <SidebarFooter><div className="ws-sidebar-user"><Avatar name={user.name} /><div><b>{user.name}</b><small>{ws.role?.name}</small></div></div><Link href="/" className="ws-sidebar-link"><Globe size={15} />Public website</Link></SidebarFooter>
    </Sidebar>
    <SidebarInset className="ws-inset">
      <header className="ws-topbar">
        <SidebarTrigger className="ws-trigger" />
        <span className="ws-crumb">{active?.label || 'Workspace'}</span>
        <div className="ws-topbar-right">
          <span className="ws-role-chip"><ShieldCheck size={14} />{ws.role?.name}</span>
          <Link href="/dashboard/notifications" className="ws-bell" aria-label={`Notifications (${unread} unread)`}><Bell size={19} />{unread > 0 && <i>{unread}</i>}</Link>
          <Link href="/dashboard/profile" aria-label="My profile"><Avatar name={user.name} size={32} /></Link>
          <button className="ws-icon-btn" aria-label="Sign out" title="Sign out" onClick={() => { ws.actions.logout(); router.push('/dashboard/login'); }}><LogOut size={18} /></button>
        </div>
      </header>
      <main className="ws-main">{content}</main>
      <div className="ws-foot">Demonstration build · sample data is stored in this browser only · <button onClick={() => { if (confirm('Reset all demo data to the original sample data?')) { ws.actions.resetDemo(); toast.success('Demo data reset'); } }}>Reset demo data</button></div>
    </SidebarInset>

  </SidebarProvider>;
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const { setOpenMobile } = useSidebar();
  return <SidebarMenuButton asChild isActive={active}><Link href={item.href} onClick={() => setOpenMobile(false)}>{item.icon}<span>{item.label}</span>{!!item.badge && <em className="ws-nav-badge">{item.badge}</em>}</Link></SidebarMenuButton>;
}

function Denied({ notFound }: { notFound?: boolean }) {
  return <div className="ws-empty big"><ShieldCheck size={40} /><h3>{notFound ? 'Page not found' : 'You do not have access to this page'}</h3><p>{notFound ? 'Check the address or use the menu.' : 'Your role does not include the permission required. Contact the Super Admin if you need access.'}</p><Link className="ws-btn" href="/dashboard">Back to my dashboard</Link></div>;
}

const DEMO = [
  ['Super Admin', 'superadmin@southomo.gov.et', 'Admin@123'], ['Director', 'director@southomo.gov.et', 'Demo@123'], ['Prosecutor', 'prosecutor@southomo.gov.et', 'Demo@123'],
  ['Library Admin', 'library@southomo.gov.et', 'Demo@123'], ['Researcher (approved)', 'researcher@example.com', 'Demo@123'], ['Researcher (pending)', 'lidya.haile@example.com', 'Demo@123'],
  ['Content Editor', 'editor@southomo.gov.et', 'Demo@123'],
];

function AuthFrame({ children, side }: { children: React.ReactNode; side?: React.ReactNode }) {
  return <main className="ws-auth">
    <section className="ws-auth-brand">
      <Link href="/" className="ws-auth-logo"><img src="/justice-logo.png" alt="" width={56} height={56} /><span><b lang="am">የደቡብ ኦሞ ዞን ፍትሕ መምሪያ</b>South Omo Zone Justice Department</span></Link>
      <div><h2>One portal for justice services, prosecution and research.</h2><p>Staff manage cases and reports. Researchers access the digital library and contribute research.</p></div>
      {side}
    </section>
    <section className="ws-auth-form">{children}</section>
  </main>;
}

function Login() {
  const { actions } = useWS();
  const router = useRouter();
  const [email, setEmail] = useState(''), [pw, setPw] = useState(''), [err, setErr] = useState('');
  const submit = (e?: React.FormEvent, em = email, p = pw) => {
    e?.preventDefault();
    const r = actions.login(em, p);
    if (!r.ok) { setErr(r.error); return; }
    const next = new URLSearchParams(window.location.search).get('next');
    router.push(next && next.startsWith('/dashboard') ? next : '/dashboard');
  };
  return <AuthFrame side={<div className="ws-demo-accounts"><b>Demo accounts</b><p>Tap an account to sign in instantly.</p>{DEMO.map(([r, e, p]) => <button key={e} onClick={() => { setEmail(e); setPw(p); submit(undefined, e, p); }}><span>{r}</span><small>{e}</small></button>)}</div>}>
    <form onSubmit={submit} className="ws-auth-card">
      <div className="ws-eyebrow">SECURE SIGN IN</div>
      <h1>Sign in</h1>
      <p>Staff, prosecutors, directors and registered researchers.</p>
      <F label="Email"><input className="ws-input" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></F>
      <F label="Password"><input className="ws-input" type="password" autoComplete="current-password" required value={pw} onChange={e => setPw(e.target.value)} /></F>
      {err && <p className="ws-error" role="alert">{err}</p>}
      <button className="ws-btn block">Sign in</button>
      <div className="ws-auth-alt">Researcher? <Link href="/dashboard/register">Create an account</Link> · <Link href="/">Back to website</Link></div>
    </form>
  </AuthFrame>;
}

function Register() {
  const { actions, data } = useWS();
  const router = useRouter();
  const [f, setF] = useState({ name: '', email: '', phone: '', institution: '', purpose: '', password: '', confirm: '' });
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return <AuthFrame side={<ol className="ws-steps-side"><li><b>Create your account</b>Tell us about your institution and research purpose.</li><li><b>Pay {data.settings.libraryFee} ETB with Telebirr</b>Use merchant code {data.settings.telebirrCode}.</li><li><b>Upload the receipt</b>The Library Admin verifies your payment.</li><li><b>Access & contribute</b>Read the full library and submit your research for publication.</li></ol>}>
    <form className="ws-auth-card" onSubmit={e => {
      e.preventDefault();
      if (f.password.length < 8) return setErr('Password must be at least 8 characters.');
      if (f.password !== f.confirm) return setErr('Passwords do not match.');
      const r = actions.register({ name: f.name, email: f.email, phone: f.phone, institution: f.institution, purpose: f.purpose, password: f.password });
      if (!r.ok) return setErr(r.error);
      toast.success('Account created. Next: pay the library fee and upload your receipt.');
      router.push('/dashboard/library/access');
    }}>
      <div className="ws-eyebrow">DIGITAL LIBRARY</div>
      <h1>Researcher registration</h1>
      <p>Access fee: <b>{data.settings.libraryFee} ETB</b> via Telebirr, valid {Math.round(data.settings.accessDays / 30)} months.</p>
      <div className="ws-grid2">
        <F label="Full name"><input className="ws-input" required value={f.name} onChange={set('name')} /></F>
        <F label="Phone (Telebirr)"><input className="ws-input" required inputMode="tel" placeholder="+251 9…" value={f.phone} onChange={set('phone')} /></F>
        <F label="Email" wide><input className="ws-input" type="email" required value={f.email} onChange={set('email')} /></F>
        <F label="Institution / organization" wide><input className="ws-input" required value={f.institution} onChange={set('institution')} /></F>
        <F label="Research purpose" wide><textarea className="ws-input" rows={2} required value={f.purpose} onChange={set('purpose')} /></F>
        <F label="Password"><input className="ws-input" type="password" required value={f.password} onChange={set('password')} /></F>
        <F label="Confirm password"><input className="ws-input" type="password" required value={f.confirm} onChange={set('confirm')} /></F>
      </div>
      {err && <p className="ws-error" role="alert">{err}</p>}
      <button className="ws-btn block">Create account</button>
      <div className="ws-auth-alt">Already registered? <Link href="/dashboard/login">Sign in</Link></div>
    </form>
  </AuthFrame>;
}


