'use client';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { seedData, SEED_VERSION } from './seed';
import type { Appointment, Case, CaseDoc, CaseStatus, Hearing, LibCategory, LibDoc, Payment, Permission, PReport, PublicEvent, Role, Settings, User, UserPrefs, WSData } from './types';
import { NOTIFY_EVENTS } from './types';

const KEY = 'sojp-workspace', SESSION = 'sojp-session';
const DAY = 86400000;
const uid = (p: string) => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const nowIso = () => new Date().toISOString();
type Result = { ok: true; id?: string } | { ok: false; error: string };

export function defaultPrefs(): UserPrefs { return { lang: 'en', theme: 'light', textSize: 100, notify: Object.fromEntries(NOTIFY_EVENTS.map(e => [e, { app: true, email: e !== 'Library approvals', sms: e === 'SLA due soon / overdue' || e === 'Hearing reminders' }])) }; }

export function isOverdue(c: Case, at = Date.now()) { return c.status !== 'Closed' && new Date(c.dueAt).getTime() < at; }
export function daysLeft(c: Case, at = Date.now()) { return Math.ceil((new Date(c.dueAt).getTime() - at) / DAY); }
export function slaState(c: Case, dueSoon = 7): 'closed' | 'overdue' | 'due-soon' | 'on-track' {
  if (c.status === 'Closed') return 'closed';
  const d = daysLeft(c);
  return d < 0 ? 'overdue' : d <= dueSoon ? 'due-soon' : 'on-track';
}

function useWorkspaceState() {
  const [data, setData] = useState<WSData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    let d: WSData | null = null;
    try { const raw = localStorage.getItem(KEY); if (raw) { const parsed = JSON.parse(raw); if (parsed.version === SEED_VERSION) d = parsed; } } catch { /* storage unavailable */ }
    setData(d || seedData());
    try { setUserId(localStorage.getItem(SESSION)); } catch { /* ignore */ }
    loaded.current = true;
  }, []);
  useEffect(() => { if (loaded.current && data) try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* quota */ } }, [data]);
  useEffect(() => { if (!loaded.current) return; try { if (userId) localStorage.setItem(SESSION, userId); else localStorage.removeItem(SESSION); } catch { /* ignore */ } }, [userId]);

  const user = data && userId ? data.users.find(u => u.id === userId && u.status === 'active') || null : null;
  const role = user && data ? data.roles.find(r => r.id === user.roleId) || null : null;
  const can = useCallback((p: Permission) => !!role?.permissions.includes(p), [role]);

  const mutate = useCallback((fn: (d: WSData) => WSData) => setData(d => (d ? fn(d) : d)), []);
  const withAudit = (d: WSData, by: string, action: string): WSData => ({ ...d, audit: [{ id: uid('a'), by, action, at: nowIso() }, ...d.audit].slice(0, 500) });
  const notify = (d: WSData, userIds: string[], text: string, link: string): WSData => ({
    ...d, notifications: [...userIds.map(u => ({ id: uid('n'), userId: u, text, link, at: nowIso(), read: false })), ...d.notifications],
  });
  const usersWith = (d: WSData, p: Permission) => d.users.filter(u => u.status === 'active' && d.roles.find(r => r.id === u.roleId)?.permissions.includes(p)).map(u => u.id);
  const me = user?.id || 'system';

  const hasLibraryAccess = useCallback((u: User | null = user) => {
    if (!u || !data) return false;
    const r = data.roles.find(x => x.id === u.roleId);
    if (r?.permissions.includes('library.view') || r?.permissions.includes('library.manage')) return true;
    return data.payments.some(p => p.userId === u.id && p.status === 'approved' && (!p.expiresAt || new Date(p.expiresAt).getTime() > Date.now()));
  }, [data, user]);

  const actions = {
    login(email: string, password: string): Result {
      const u = data?.users.find(x => x.email.toLowerCase() === email.trim().toLowerCase());
      if (!u || u.password !== password) { mutate(d => withAudit(d, 'system', `Failed sign-in attempt for ${email.trim().toLowerCase().slice(0, 80)}`)); return { ok: false, error: 'Incorrect email or password.' }; }
      if (u.status !== 'active') return { ok: false, error: 'This account is deactivated. Contact the administrator.' };
      setUserId(u.id);
      mutate(d => withAudit({ ...d, users: d.users.map(x => x.id === u.id ? { ...x, lastLogin: nowIso() } : x) }, u.id, 'Signed in'));
      return { ok: true, id: u.id };
    },
    logout() { setUserId(null); },
    register(f: { name: string; email: string; phone: string; password: string; institution: string; purpose: string }): Result {
      if (data?.users.some(u => u.email.toLowerCase() === f.email.toLowerCase())) return { ok: false, error: 'An account with this email already exists.' };
      const id = uid('u');
      mutate(d => notify(withAudit({ ...d, users: [...d.users, { id, ...f, roleId: 'researcher', office: '—', status: 'active', createdAt: nowIso(), lastLogin: nowIso() }] }, id, 'Registered as researcher'),
        usersWith(d, 'library.approve'), `New researcher registered: ${f.name}`, '/dashboard/users'));
      setUserId(id);
      return { ok: true, id };
    },
    // Users & roles
    saveUser(u: Partial<User> & { id?: string }): Result {
      if (!data) return { ok: false, error: 'Not ready' };
      if (data.users.some(x => x.email.toLowerCase() === (u.email || '').toLowerCase() && x.id !== u.id)) return { ok: false, error: 'Email already used by another account.' };
      if (u.id) mutate(d => withAudit({ ...d, users: d.users.map(x => x.id === u.id ? { ...x, ...u } as User : x) }, me, `Updated user ${u.name}`));
      else mutate(d => withAudit({ ...d, users: [...d.users, { phone: '', office: '—', status: 'active', password: 'Demo@123', ...u, id: uid('u'), createdAt: nowIso() } as User] }, me, `Created user ${u.name} (${d.roles.find(r => r.id === u.roleId)?.name})`));
      return { ok: true };
    },
    setUserStatus(id: string, status: User['status']) { mutate(d => withAudit({ ...d, users: d.users.map(x => x.id === id ? { ...x, status } : x) }, me, `${status === 'active' ? 'Activated' : 'Deactivated'} ${d.users.find(x => x.id === id)?.name}`)); },
    resetPassword(id: string) { mutate(d => withAudit({ ...d, users: d.users.map(x => x.id === id ? { ...x, password: 'Demo@123' } : x) }, me, `Reset password for ${d.users.find(x => x.id === id)?.name}`)); },
    saveRole(r: Role): Result {
      mutate(d => withAudit({ ...d, roles: d.roles.some(x => x.id === r.id) ? d.roles.map(x => x.id === r.id ? r : x) : [...d.roles, r] }, me, `Saved role ${r.name} (${r.permissions.length} permissions)`));
      return { ok: true };
    },
    deleteRole(id: string): Result {
      if (data?.users.some(u => u.roleId === id)) return { ok: false, error: 'Reassign users before deleting this role.' };
      mutate(d => withAudit({ ...d, roles: d.roles.filter(r => r.id !== id) }, me, `Deleted role ${d.roles.find(r => r.id === id)?.name}`));
      return { ok: true };
    },
    updateProfile(p: { name: string; phone: string }) { mutate(d => ({ ...d, users: d.users.map(x => x.id === me ? { ...x, ...p } : x) })); },
    changePassword(current: string, next: string): Result {
      if (user?.password !== current) return { ok: false, error: 'Current password is incorrect.' };
      if (next.length < 8) return { ok: false, error: 'New password must be at least 8 characters.' };
      mutate(d => withAudit({ ...d, users: d.users.map(x => x.id === me ? { ...x, password: next } : x) }, me, 'Changed password'));
      return { ok: true };
    },
    saveSettings(s: Settings) { mutate(d => withAudit({ ...d, settings: s }, me, 'Updated system settings')); },
    markRead(id?: string) { mutate(d => ({ ...d, notifications: d.notifications.map(n => n.userId === me && (!id || n.id === id) ? { ...n, read: true } : n) })); },
    resetDemo() { const s = seedData(); setData(s); },

    // Library
    saveCategory(c: Partial<LibCategory> & { name: string }) {
      mutate(d => withAudit({ ...d, categories: c.id ? d.categories.map(x => x.id === c.id ? { ...x, ...c } : x) : [...d.categories, { description: '', parentId: null, ...c, id: uid('c') }] }, me, `${c.id ? 'Updated' : 'Created'} library category ${c.name}`));
    },
    deleteCategory(id: string): Result {
      if (data?.docs.some(x => x.categoryId === id) || data?.categories.some(x => x.parentId === id)) return { ok: false, error: 'Move or delete the documents and sub-folders first.' };
      mutate(d => withAudit({ ...d, categories: d.categories.filter(x => x.id !== id) }, me, 'Deleted library category'));
      return { ok: true };
    },
    addDoc(doc: Omit<LibDoc, 'id' | 'createdAt' | 'views' | 'downloads' | 'uploadedBy' | 'status' | 'source'>, asContribution = false) {
      const id = uid('d');
      mutate(d => {
        const nd: LibDoc = { ...doc, id, createdAt: nowIso(), views: 0, downloads: 0, uploadedBy: me, source: asContribution ? 'researcher' : 'admin', status: asContribution ? 'pending' : 'published', publishedAt: asContribution ? undefined : nowIso() };
        let x = withAudit({ ...d, docs: [nd, ...d.docs] }, me, asContribution ? `Submitted contribution “${doc.title}”` : `Uploaded “${doc.title}”`);
        if (asContribution) x = notify(x, usersWith(d, 'library.approve'), `${user?.name} submitted a contribution: “${doc.title}”.`, '/dashboard/library/approvals');
        return x;
      });
      return id;
    },
    updateDoc(id: string, p: Partial<LibDoc>) { mutate(d => withAudit({ ...d, docs: d.docs.map(x => x.id === id ? { ...x, ...p } : x) }, me, `Edited document “${d.docs.find(x => x.id === id)?.title}”`)); },
    deleteDoc(id: string) { mutate(d => withAudit({ ...d, docs: d.docs.filter(x => x.id !== id) }, me, `Deleted document “${d.docs.find(x => x.id === id)?.title}”`)); },
    reviewDoc(id: string, approve: boolean, note: string, visibility?: LibDoc['visibility']) {
      mutate(d => {
        const doc = d.docs.find(x => x.id === id)!;
        const x = withAudit({ ...d, docs: d.docs.map(z => z.id === id ? { ...z, status: approve ? 'published' : 'rejected', reviewNote: note, reviewedBy: me, publishedAt: approve ? nowIso() : undefined, visibility: visibility || z.visibility } : z) }, me, `${approve ? 'Approved & published' : 'Rejected'} contribution “${doc.title}”`);
        return notify(x, [doc.uploadedBy], approve ? `Your contribution “${doc.title}” was approved and published.` : `Your contribution “${doc.title}” was not accepted. ${note}`, '/dashboard/library/contribute');
      });
    },
    trackDoc(id: string, kind: 'views' | 'downloads') { mutate(d => ({ ...d, docs: d.docs.map(x => x.id === id ? { ...x, [kind]: x[kind] + 1 } : x) })); },
    submitPayment(p: Pick<Payment, 'txnId' | 'receiptUrl' | 'receiptName' | 'paidOn'>) {
      mutate(d => notify(withAudit({ ...d, payments: [{ ...p, id: uid('pay'), userId: me, amount: d.settings.libraryFee, status: 'pending', createdAt: nowIso() }, ...d.payments] }, me, `Submitted Telebirr receipt ${p.txnId}`),
        usersWith(d, 'library.approve'), `${user?.name} uploaded a Telebirr receipt (${p.txnId}) for review.`, '/dashboard/library/approvals'));
    },
    reviewPayment(id: string, approve: boolean, note: string) {
      mutate(d => {
        const p = d.payments.find(x => x.id === id)!;
        const who = d.users.find(u => u.id === p.userId);
        const x = withAudit({ ...d, payments: d.payments.map(z => z.id === id ? { ...z, status: approve ? 'approved' : 'rejected', note, reviewedBy: me, reviewedAt: nowIso(), expiresAt: approve ? new Date(Date.now() + d.settings.accessDays * DAY).toISOString() : undefined } : z) }, me, `${approve ? 'Approved' : 'Rejected'} payment ${p.txnId} for ${who?.name}`);
        return notify(x, [p.userId], approve ? 'Your library payment was approved. You now have full access to the digital library.' : `Your payment receipt was rejected: ${note}`, approve ? '/dashboard/library' : '/dashboard/library/access');
      });
    },

    // Cases
    createCase(c: Pick<Case, 'title' | 'categoryId' | 'prosecutorId' | 'office' | 'parties' | 'description' | 'priority'> & { openedAt?: string }): Result {
      if (!data) return { ok: false, error: 'Not ready' };
      const cat = data.caseCategories.find(x => x.id === c.categoryId)!;
      const openedAt = c.openedAt ? new Date(c.openedAt).toISOString() : nowIso();
      const id = uid('case');
      const n = data.cases.length + 141;
      const caseNo = `SOZ/${cat.name.slice(0, 2).toUpperCase()}/${String(n).padStart(4, '0')}/${new Date(openedAt).getFullYear()}`;
      mutate(d => {
        let x = withAudit({
          ...d,
          cases: [{ ...c, id, caseNo, openedAt, dueAt: new Date(new Date(openedAt).getTime() + cat.slaDays * DAY).toISOString(), status: 'Registered', createdBy: me, updatedAt: nowIso() }, ...d.cases],
          statusChanges: [...d.statusChanges, { id: uid('sc'), caseId: id, from: null, to: 'Registered', note: 'Case registered' + (c.prosecutorId !== me ? ' and assigned.' : '.'), by: me, at: nowIso() }],
        }, me, `Created case ${caseNo}`);
        if (c.prosecutorId !== me) x = notify(x, [c.prosecutorId], `New case assigned to you: ${caseNo} – ${c.title}`, '/dashboard/cases/' + id);
        return x;
      });
      return { ok: true, id };
    },
    updateCaseStatus(caseId: string, to: CaseStatus, note: string): Result {
      const c = data?.cases.find(x => x.id === caseId);
      if (!c) return { ok: false, error: 'Case not found' };
      // SLA lock: prosecutors cannot change status once the SLA is overdue. (Server-side check in production.)
      if (isOverdue(c) && !can('cases.extend')) return { ok: false, error: 'SLA overdue — status updates are locked. Ask the Director to review and extend the SLA.' };
      if (to === c.status) return { ok: false, error: 'Choose a different status.' };
      mutate(d => {
        let x = withAudit({
          ...d,
          cases: d.cases.map(z => z.id === caseId ? { ...z, status: to, updatedAt: nowIso(), closedAt: to === 'Closed' ? nowIso() : undefined } : z),
          statusChanges: [...d.statusChanges, { id: uid('sc'), caseId, from: c.status, to, note, by: me, at: nowIso() }],
        }, me, `Changed ${c.caseNo} status: ${c.status} → ${to}`);
        const watchers = Array.from(new Set([...usersWith(d, 'cases.viewAll'), c.prosecutorId])).filter(u => u !== me);
        x = notify(x, watchers, `${c.caseNo} status updated to “${to}” by ${user?.name}.`, '/dashboard/cases/' + caseId);
        return x;
      });
      return { ok: true };
    },
    addComment(caseId: string, body: string) {
      const c = data!.cases.find(x => x.id === caseId)!;
      mutate(d => notify(withAudit({ ...d, comments: [...d.comments, { id: uid('cm'), caseId, by: me, body, at: nowIso() }] }, me, `Commented on ${c.caseNo}`),
        Array.from(new Set([c.prosecutorId, ...usersWith(d, 'cases.viewAll')])).filter(u => u !== me), `${user?.name} commented on ${c.caseNo}.`, '/dashboard/cases/' + caseId));
    },
    extendSla(caseId: string, days: number, reason: string) {
      const c = data!.cases.find(x => x.id === caseId)!;
      const base = Math.max(Date.now(), new Date(c.dueAt).getTime());
      const newDue = new Date(base + days * DAY).toISOString();
      mutate(d => notify(withAudit({ ...d, cases: d.cases.map(z => z.id === caseId ? { ...z, dueAt: newDue } : z), extensions: [...d.extensions, { id: uid('ex'), caseId, by: me, days, reason, at: nowIso(), oldDue: c.dueAt, newDue }] }, me, `Extended SLA of ${c.caseNo} by ${days} days`),
        [c.prosecutorId], `SLA for ${c.caseNo} extended by ${days} days. Status updates are unlocked.`, '/dashboard/cases/' + caseId));
    },
    reassignCase(caseId: string, prosecutorId: string) {
      mutate(d => notify(withAudit({ ...d, cases: d.cases.map(z => z.id === caseId ? { ...z, prosecutorId } : z) }, me, `Reassigned case to ${d.users.find(u => u.id === prosecutorId)?.name}`), [prosecutorId], 'A case was assigned to you.', '/dashboard/cases/' + caseId));
    },
    setSla(categoryId: string, slaDays: number, applyToOpen: boolean) {
      mutate(d => {
        const cat = d.caseCategories.find(c => c.id === categoryId)!;
        return withAudit({
          ...d,
          caseCategories: d.caseCategories.map(c => c.id === categoryId ? { ...c, slaDays, updatedAt: nowIso(), updatedBy: me } : c),
          cases: applyToOpen ? d.cases.map(c => c.categoryId === categoryId && c.status !== 'Closed' ? { ...c, dueAt: new Date(new Date(c.openedAt).getTime() + slaDays * DAY).toISOString() } : c) : d.cases,
        }, me, `Set SLA for ${cat.name}: ${cat.slaDays} → ${slaDays} days${applyToOpen ? ' (applied to open cases)' : ''}`);
      });
    },
    addCaseCategory(name: string, slaDays: number) { mutate(d => withAudit({ ...d, caseCategories: [...d.caseCategories, { id: uid('cc'), name, slaDays, updatedAt: nowIso(), updatedBy: me }] }, me, `Added case category ${name} (SLA ${slaDays} days)`)); },


    // ---------- v6 features ----------
    bookAppointment(a: Omit<Appointment, 'id' | 'code' | 'status' | 'createdAt'>): string {
      const code = 'LA-' + Math.floor(1000 + Math.random() * 9000);
      mutate(d => notify(withAudit({ ...d, appointments: [...d.appointments, { ...a, id: uid('ap'), code, status: 'booked', createdAt: nowIso() }] }, 'system', `Legal aid appointment ${code} booked for ${a.office}`),
        usersWith(d, 'appointments.manage'), `New legal aid appointment ${code}: ${a.office}, ${a.date} ${a.time}.`, '/dashboard/appointments'));
      return code;
    },
    updateAppointment(id: string, p: Partial<Appointment>) { mutate(d => withAudit({ ...d, appointments: d.appointments.map(x => x.id === id ? { ...x, ...p } : x) }, me, `Updated appointment ${d.appointments.find(x => x.id === id)?.code}${p.status ? ' → ' + p.status : ''}`)); },
    addRating(r: { service: string; office: string; stars: number; comment: string }) { mutate(d => ({ ...d, ratings: [{ ...r, id: uid('rt'), at: nowIso() }, ...d.ratings] })); },
    saveEvent(e: Omit<PublicEvent, 'id'> & { id?: string }) { mutate(d => withAudit({ ...d, events: e.id ? d.events.map(x => x.id === e.id ? { ...x, ...e } as PublicEvent : x) : [...d.events, { ...e, id: uid('ev') }] }, me, `${e.id ? 'Updated' : 'Added'} event “${e.title}”`)); },
    deleteEvent(id: string) { mutate(d => withAudit({ ...d, events: d.events.filter(x => x.id !== id) }, me, 'Deleted public event')); },
    saveHearing(h: Omit<Hearing, 'id' | 'createdBy'> & { id?: string }) {
      const c = data?.cases.find(x => x.id === h.caseId);
      mutate(d => {
        let x = withAudit({ ...d, hearings: h.id ? d.hearings.map(z => z.id === h.id ? { ...z, ...h } as Hearing : z) : [...d.hearings, { ...h, id: uid('hr'), createdBy: me }] }, me, `${h.id ? 'Updated' : 'Scheduled'} hearing for ${c?.caseNo} on ${h.date}`);
        if (!h.id && c && c.prosecutorId !== me) x = notify(x, [c.prosecutorId], `Hearing scheduled for ${c.caseNo} on ${h.date} ${h.time}.`, '/dashboard/calendar');
        return x;
      });
    },
    deleteHearing(id: string) { mutate(d => withAudit({ ...d, hearings: d.hearings.filter(x => x.id !== id) }, me, 'Removed a hearing')); },
    addCaseDoc(caseId: string, f: { docType: CaseDoc['docType']; title: string; url: string; fileName: string; size: number; note: string }, existingId?: string) {
      mutate(d => {
        const c = d.cases.find(x => x.id === caseId);
        if (existingId) return withAudit({ ...d, caseDocs: d.caseDocs.map(x => x.id === existingId ? { ...x, versions: [...x.versions, { v: x.versions.length + 1, url: f.url, fileName: f.fileName, size: f.size, by: me, at: nowIso(), note: f.note || 'New version' }] } : x) }, me, `Uploaded new version of “${f.title}” to ${c?.caseNo}`);
        return withAudit({ ...d, caseDocs: [...d.caseDocs, { id: uid('cd'), caseId, docType: f.docType, title: f.title, versions: [{ v: 1, url: f.url, fileName: f.fileName, size: f.size, by: me, at: nowIso(), note: f.note || 'Initial upload' }] }] }, me, `Uploaded ${f.docType.toLowerCase()} to ${c?.caseNo}`);
      });
    },
    addTask(title: string, due?: string) { mutate(d => ({ ...d, tasks: [{ id: uid('tk'), userId: me, title, due, done: false, createdAt: nowIso() }, ...d.tasks] })); },
    toggleTask(id: string) { mutate(d => ({ ...d, tasks: d.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) })); },
    deleteTask(id: string) { mutate(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== id) })); },
    requestChanges(docId: string, body: string) {
      mutate(d => {
        const doc = d.docs.find(x => x.id === docId)!;
        const x = withAudit({ ...d, docs: d.docs.map(z => z.id === docId ? { ...z, status: 'changes_requested', reviewNote: body, reviewedBy: me } : z), reviewComments: [...d.reviewComments, { id: uid('rc'), docId, by: me, body, at: nowIso() }] }, me, `Requested changes on “${doc.title}”`);
        return notify(x, [doc.uploadedBy], `Changes requested on “${doc.title}”: ${body.slice(0, 80)}`, '/dashboard/library/contribute');
      });
    },
    addReviewComment(docId: string, body: string) {
      mutate(d => {
        const doc = d.docs.find(x => x.id === docId)!;
        const to = me === doc.uploadedBy ? usersWith(d, 'library.approve') : [doc.uploadedBy];
        return notify({ ...d, reviewComments: [...d.reviewComments, { id: uid('rc'), docId, by: me, body, at: nowIso() }] }, to, `New comment on “${doc.title}”.`, me === doc.uploadedBy ? '/dashboard/library/approvals?tab=contributions' : '/dashboard/library/contribute');
      });
    },
    resubmitDoc(docId: string, f: { url: string; fileName: string; size: number } | null, note: string) {
      mutate(d => {
        const doc = d.docs.find(x => x.id === docId)!;
        let x = withAudit({ ...d, docs: d.docs.map(z => z.id === docId ? { ...z, ...(f || {}), status: 'pending', version: (z.version || 1) + 1, createdAt: nowIso() } : z), reviewComments: note ? [...d.reviewComments, { id: uid('rc'), docId, by: me, body: note, at: nowIso() }] : d.reviewComments }, me, `Resubmitted “${doc.title}” (version ${(doc.version || 1) + 1})`);
        x = notify(x, usersWith(d, 'library.approve'), `${user?.name} resubmitted “${doc.title}”.`, '/dashboard/library/approvals?tab=contributions');
        return x;
      });
    },
    updatePrefs(p: Partial<UserPrefs>) { mutate(d => ({ ...d, users: d.users.map(u => u.id === me ? { ...u, prefs: { ...defaultPrefs(), ...(u.prefs || {}), ...p } } : u) })); },
    updateProfileExtra(p: { researchArea?: string; bio?: string }) { mutate(d => ({ ...d, users: d.users.map(u => u.id === me ? { ...u, ...p } : u) })); },
    exportBackup(): string { mutate(d => withAudit({ ...d, lastBackupAt: nowIso() }, me, 'Exported a full data backup')); return JSON.stringify({ ...data, lastBackupAt: nowIso() }, null, 1); },
    importBackup(json: string): Result {
      try {
        const d = JSON.parse(json) as WSData;
        if (d.version !== SEED_VERSION || !Array.isArray(d.users) || !Array.isArray(d.cases)) return { ok: false, error: 'This file is not a backup from this portal version.' };
        setData(withAudit(d, me, 'Restored data from a backup file'));
        return { ok: true };
      } catch { return { ok: false, error: 'Could not read the backup file.' }; }
    },

    // Periodic reports
    submitReport(r: Omit<PReport, 'id' | 'prosecutorId' | 'submittedAt' | 'status'>) {
      mutate(d => notify(withAudit({ ...d, preports: [{ ...r, id: uid('pr'), prosecutorId: me, submittedAt: nowIso(), status: 'Submitted' }, ...d.preports] }, me, `Submitted ${r.period.toLowerCase()} report (${r.periodLabel})`),
        usersWith(d, 'preports.review'), `${user?.name} submitted a ${r.period.toLowerCase()} report: ${r.periodLabel}.`, '/dashboard/periodic-reports'));
    },
    addFeedback(reportId: string, body: string) {
      const r = data!.preports.find(x => x.id === reportId)!;
      mutate(d => notify(withAudit({ ...d, preports: d.preports.map(x => x.id === reportId ? { ...x, status: 'Reviewed' } : x), feedback: [...d.feedback, { id: uid('fb'), reportId, by: me, body, at: nowIso() }] }, me, `Gave feedback on ${r.period.toLowerCase()} report of ${d.users.find(u => u.id === r.prosecutorId)?.name}`),
        [r.prosecutorId], `Director feedback on your ${r.period.toLowerCase()} report (${r.periodLabel}).`, '/dashboard/periodic-reports/' + reportId));
    },
  };

  const prefs: UserPrefs = { ...defaultPrefs(), ...(user?.prefs || {}) };
  return { ready: !!data, data: data!, user, role, can, hasLibraryAccess, actions, prefs, userName: (id?: string) => id === 'system' ? 'System' : data?.users.find(u => u.id === id)?.name || '—' };
}

type WS = ReturnType<typeof useWorkspaceState>;
const Ctx = createContext<WS | null>(null);
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const ws = useWorkspaceState();
  return <Ctx.Provider value={ws}>{children}</Ctx.Provider>;
}
export function useWS() { return useContext(Ctx)!; }
