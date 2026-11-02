'use client';
import { isOverdue, slaState } from './store';
import type { Permission, User, WSData } from './types';

export type Table = { columns: string[]; rows: (string | number)[][]; summary?: [string, string | number][] };
export type ReportDef = { id: string; title: string; description: string; perm: Permission; scope: string; build: (d: WSData, me: User, from?: string, to?: string) => Table };

const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const inRange = (iso: string, from?: string, to?: string) => (!from || iso.slice(0, 10) >= from) && (!to || iso.slice(0, 10) <= to);
const nm = (d: WSData, id?: string) => d.users.find(u => u.id === id)?.name || '—';
const cat = (d: WSData, id: string) => d.caseCategories.find(c => c.id === id)?.name || '—';
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) + '%' : '—');

export const REPORTS: ReportDef[] = [
  {
    id: 'users-by-role', title: 'Users by role', scope: 'System', perm: 'reports.system', description: 'Number of active and inactive accounts per role.',
    build: d => {
      const rows = d.roles.map(r => { const us = d.users.filter(u => u.roleId === r.id); return [r.name, us.length, us.filter(u => u.status === 'active').length, us.filter(u => u.status !== 'active').length]; });
      return { columns: ['Role', 'Total users', 'Active', 'Inactive'], rows, summary: [['Total accounts', d.users.length], ['Roles', d.roles.length]] };
    },
  },
  {
    id: 'user-directory', title: 'User directory & login activity', scope: 'System', perm: 'reports.system', description: 'All accounts with role, office, status and last login.',
    build: (d, _m, f, t) => ({ columns: ['Name', 'Email', 'Role', 'Office', 'Status', 'Created', 'Last login'], rows: d.users.filter(u => inRange(u.createdAt, f, t)).map(u => [u.name, u.email, d.roles.find(r => r.id === u.roleId)?.name || '—', u.office, u.status, day(u.createdAt), day(u.lastLogin)]) }),
  },
  {
    id: 'audit', title: 'Audit log', scope: 'System', perm: 'audit.view', description: 'Every recorded action with user and time.',
    build: (d, _m, f, t) => ({ columns: ['Date & time', 'User', 'Action'], rows: d.audit.filter(a => inRange(a.at, f, t)).map(a => [new Date(a.at).toLocaleString('en-GB'), nm(d, a.by), a.action]) }),
  },
  {
    id: 'lib-docs', title: 'Library documents by category', scope: 'Library', perm: 'reports.library', description: 'Published documents with views and downloads.',
    build: (d, _m, f, t) => {
      const docs = d.docs.filter(x => x.status === 'published' && inRange(x.createdAt, f, t));
      return {
        columns: ['Title', 'Category', 'Type', 'Visibility', 'Source', 'Published', 'Views', 'Downloads'],
        rows: docs.map(x => [x.title, d.categories.find(c => c.id === x.categoryId)?.name || '—', x.type.toUpperCase(), x.visibility === 'public' ? 'Public' : 'Researchers', x.source === 'admin' ? 'Library' : 'Researcher', day(x.publishedAt), x.views, x.downloads]),
        summary: [['Documents', docs.length], ['Total views', docs.reduce((s, x) => s + x.views, 0)], ['Total downloads', docs.reduce((s, x) => s + x.downloads, 0)]],
      };
    },
  },
  {
    id: 'lib-payments', title: 'Researcher payments (Telebirr)', scope: 'Library', perm: 'reports.library', description: 'Receipts submitted, approved and rejected with revenue.',
    build: (d, _m, f, t) => {
      const ps = d.payments.filter(p => inRange(p.createdAt, f, t));
      const ok = ps.filter(p => p.status === 'approved');
      return {
        columns: ['Researcher', 'Institution', 'Transaction ID', 'Amount (ETB)', 'Submitted', 'Status', 'Reviewed by', 'Access until'],
        rows: ps.map(p => { const u = d.users.find(x => x.id === p.userId); return [u?.name || '—', u?.institution || '—', p.txnId, p.amount, day(p.createdAt), p.status, nm(d, p.reviewedBy), day(p.expiresAt)]; }),
        summary: [['Receipts', ps.length], ['Approved', ok.length], ['Pending', ps.filter(p => p.status === 'pending').length], ['Revenue (ETB)', ok.reduce((s, p) => s + p.amount, 0)]],
      };
    },
  },
  {
    id: 'lib-contrib', title: 'Researcher contributions', scope: 'Library', perm: 'reports.library', description: 'Contributions by status and reviewer.',
    build: (d, _m, f, t) => ({ columns: ['Title', 'Researcher', 'Submitted', 'Status', 'Reviewed by', 'Note'], rows: d.docs.filter(x => x.source === 'researcher' && inRange(x.createdAt, f, t)).map(x => [x.title, nm(d, x.uploadedBy), day(x.createdAt), x.status, nm(d, x.reviewedBy), x.reviewNote || '']) }),
  },
  {
    id: 'case-register', title: 'Case register', scope: 'Cases', perm: 'reports.cases', description: 'All cases with category, prosecutor, status and SLA state.',
    build: (d, _m, f, t) => {
      const cs = d.cases.filter(c => inRange(c.openedAt, f, t));
      return {
        columns: ['Case no.', 'Title', 'Category', 'Prosecutor', 'Office', 'Opened', 'Due', 'Status', 'SLA'],
        rows: cs.map(c => [c.caseNo, c.title, cat(d, c.categoryId), nm(d, c.prosecutorId), c.office, day(c.openedAt), day(c.dueAt), c.status, slaState(c, d.settings.dueSoonDays)]),
        summary: [['Cases', cs.length], ['Open', cs.filter(c => c.status !== 'Closed').length], ['Overdue', cs.filter(c => isOverdue(c)).length]],
      };
    },
  },
  {
    id: 'sla-compliance', title: 'SLA compliance by category', scope: 'Cases', perm: 'reports.cases', description: 'SLA days, open, overdue and compliance per case category.',
    build: (d, _m, f, t) => ({
      columns: ['Category', 'SLA (days)', 'Cases', 'Open', 'Overdue', 'Compliance'],
      rows: d.caseCategories.map(cc => { const cs = d.cases.filter(c => c.categoryId === cc.id && inRange(c.openedAt, f, t)); const od = cs.filter(c => isOverdue(c)).length; return [cc.name, cc.slaDays, cs.length, cs.filter(c => c.status !== 'Closed').length, od, pct(cs.length - od, cs.length)]; }),
    }),
  },
  {
    id: 'prosecutor-performance', title: 'Prosecutor performance', scope: 'Cases', perm: 'reports.cases', description: 'Caseload, closures, overdue cases and report submissions per prosecutor.',
    build: (d, _m, f, t) => ({
      columns: ['Prosecutor', 'Office', 'Cases', 'Open', 'Closed / judged', 'Overdue', 'Reports submitted', 'Reports reviewed'],
      rows: d.users.filter(u => u.roleId === 'prosecutor').map(u => {
        const cs = d.cases.filter(c => c.prosecutorId === u.id && inRange(c.openedAt, f, t)); const rs = d.preports.filter(r => r.prosecutorId === u.id && inRange(r.submittedAt, f, t));
        return [u.name, u.office, cs.length, cs.filter(c => c.status !== 'Closed').length, cs.filter(c => ['Closed', 'Judgment delivered'].includes(c.status)).length, cs.filter(c => isOverdue(c)).length, rs.length, rs.filter(r => r.status === 'Reviewed').length];
      }),
    }),
  },
  {
    id: 'report-submissions', title: 'Prosecutor report submissions', scope: 'Cases', perm: 'preports.review', description: 'Daily, weekly and monthly reports with feedback status.',
    build: (d, _m, f, t) => ({ columns: ['Prosecutor', 'Period', 'Covering', 'Submitted', 'New cases', 'Closed', 'Hearings', 'Status'], rows: d.preports.filter(r => inRange(r.submittedAt, f, t)).map(r => [nm(d, r.prosecutorId), r.period, r.periodLabel, day(r.submittedAt), r.newCases, r.closedCases, r.hearings, r.status]) }),
  },
  {
    id: 'my-cases', title: 'My cases', scope: 'My activity', perm: 'cases.viewOwn', description: 'Cases assigned to me with SLA status.',
    build: (d, me, f, t) => ({ columns: ['Case no.', 'Title', 'Category', 'Opened', 'Due', 'Status', 'SLA'], rows: d.cases.filter(c => c.prosecutorId === me.id && inRange(c.openedAt, f, t)).map(c => [c.caseNo, c.title, cat(d, c.categoryId), day(c.openedAt), day(c.dueAt), c.status, slaState(c, d.settings.dueSoonDays)]) }),
  },
  {
    id: 'my-reports', title: 'My submitted reports & feedback', scope: 'My activity', perm: 'preports.submit', description: 'My daily, weekly and monthly reports with director feedback.',
    build: (d, me, f, t) => ({ columns: ['Period', 'Covering', 'Submitted', 'Status', 'Feedback'], rows: d.preports.filter(r => r.prosecutorId === me.id && inRange(r.submittedAt, f, t)).map(r => [r.period, r.periodLabel, day(r.submittedAt), r.status, d.feedback.filter(x => x.reportId === r.id).map(x => x.body).join(' | ')]) }),
  },
  {
    id: 'my-contrib', title: 'My contributions & library access', scope: 'My activity', perm: 'library.contribute', description: 'My submitted documents and payment history.',
    build: (d, me) => ({
      columns: ['Item', 'Detail', 'Date', 'Status'],
      rows: [...d.payments.filter(p => p.userId === me.id).map(p => ['Payment', `${p.amount} ETB · ${p.txnId}`, day(p.createdAt), p.status]), ...d.docs.filter(x => x.uploadedBy === me.id).map(x => ['Contribution', x.title, day(x.createdAt), x.status])],
    }),
  },
  {
    id: 'my-activity', title: 'My activity log', scope: 'My activity', perm: 'reports.own', description: 'Actions I performed in the system.',
    build: (d, me, f, t) => ({ columns: ['Date & time', 'Action'], rows: d.audit.filter(a => a.by === me.id && inRange(a.at, f, t)).map(a => [new Date(a.at).toLocaleString('en-GB'), a.action]) }),
  },
];

export function exportCSV(name: string, t: Table) {
  const esc = (v: string | number) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csv = '﻿' + [t.columns, ...t.rows].map(r => r.map(esc).join(',')).join('\r\n');
  download(name + '.csv', new Blob([csv], { type: 'text/csv;charset=utf-8' }));
}

export async function exportPDF(name: string, title: string, t: Table, meta: { by: string; role: string; range?: string; org: string }) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: t.columns.length > 5 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(31, 86, 70); doc.rect(0, 0, w, 64, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(15); doc.text(meta.org, 36, 30);
  doc.setFontSize(10); doc.text('Justice Portal · Role-based report', 36, 48);
  doc.setTextColor(20, 20, 20); doc.setFontSize(16); doc.text(title, 36, 96);
  doc.setFontSize(9); doc.setTextColor(90, 90, 90);
  doc.text(`Generated ${new Date().toLocaleString('en-GB')} by ${meta.by} (${meta.role})${meta.range ? ' · Period: ' + meta.range : ''}`, 36, 114);
  let y = 128;
  if (t.summary?.length) { doc.setTextColor(20, 20, 20); doc.text(t.summary.map(([k, v]) => `${k}: ${v}`).join('    '), 36, y); y += 14; }
  autoTable(doc, {
    startY: y, head: [t.columns], body: t.rows.map(r => r.map(String)), styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [31, 86, 70], textColor: 255 }, alternateRowStyles: { fillColor: [244, 242, 239] }, margin: { left: 36, right: 36 },
    didDrawPage: () => { doc.setFontSize(8); doc.setTextColor(120); doc.text(`Page ${doc.getNumberOfPages()}`, w - 70, doc.internal.pageSize.getHeight() - 18); },
  });
  doc.save(name + '.pdf');
}

function download(name: string, blob: Blob) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
