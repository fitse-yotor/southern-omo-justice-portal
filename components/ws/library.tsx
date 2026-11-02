'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronRight, Clock, Eye, Folder, FolderOpen, FolderPlus, Lock, Pencil, Plus, Search, Trash2, Upload, Wallet, XCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useWS } from '@/lib/ws/store';
import { ACCEPT_DOCS, detectType, fmtSize, saveFile, useFileUrl } from '@/lib/ws/files';
import type { LibDoc } from '@/lib/ws/types';
import { DataTable, DocIcon, DocViewer, Empty, F, Modal, PageHead, Panel, Pill, Sel, StatusPill, ago, fmtDate } from './ui';

export function useQueryParam(name: string) {
  const [v, setV] = useState<string | null>(null);
  useEffect(() => { setV(new URLSearchParams(window.location.search).get(name)); }, [name]);
  return v;
}

/* ---------------- Explorer (shared by public site and workspace) ---------------- */
export function LibraryExplorer({ fullAccess, initialDoc, publicMode }: { fullAccess: boolean; initialDoc?: string | null; publicMode?: boolean }) {
  const { data } = useWS();
  const [cat, setCat] = useState<string>('all'), [q, setQ] = useState(''), [type, setType] = useState('all'), [open, setOpen] = useState<LibDoc | null>(null);
  useEffect(() => { if (initialDoc) { const d = data.docs.find(x => x.id === initialDoc); if (d) setOpen(d); } }, [initialDoc]); // eslint-disable-line react-hooks/exhaustive-deps
  const roots = data.categories.filter(c => !c.parentId);
  const inCat = (d: LibDoc) => cat === 'all' || d.categoryId === cat || data.categories.find(c => c.id === d.categoryId)?.parentId === cat;
  const docs = data.docs.filter(d => d.status === 'published' && inCat(d) && (type === 'all' || d.type === type) && (d.title + ' ' + d.description + ' ' + d.author).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
  const count = (id: string) => data.docs.filter(d => d.status === 'published' && (d.categoryId === id || data.categories.find(c => c.id === d.categoryId)?.parentId === id)).length;
  const current = data.categories.find(c => c.id === cat);
  const locked = (d: LibDoc) => d.visibility === 'researchers' && !fullAccess;

  return <div className="lib-explorer">
    <aside className="lib-tree" aria-label="Library folders">
      <button className={cat === 'all' ? 'active' : ''} onClick={() => setCat('all')}><FolderOpen size={17} />All documents<em>{data.docs.filter(d => d.status === 'published').length}</em></button>
      {roots.map(r => <React.Fragment key={r.id}>
        <button className={cat === r.id ? 'active' : ''} onClick={() => setCat(r.id)}>{cat === r.id ? <FolderOpen size={17} /> : <Folder size={17} />}{r.name}<em>{count(r.id)}</em></button>
        {data.categories.filter(c => c.parentId === r.id).map(s => <button key={s.id} className={'sub ' + (cat === s.id ? 'active' : '')} onClick={() => setCat(s.id)}><ChevronRight size={14} />{s.name}<em>{count(s.id)}</em></button>)}
      </React.Fragment>)}
    </aside>
    <div className="lib-main">
      <div className="lib-toolbar">
        <div className="lib-search"><Search size={17} /><input placeholder="Search title, author or description" value={q} onChange={e => setQ(e.target.value)} aria-label="Search library" /></div>
        <Sel aria-label="File type" value={type} onChange={setType} options={[['all', 'All types'], ['pdf', 'PDF'], ['word', 'Word'], ['video', 'Video']]} />
        <select className="ws-input lib-cat-mobile" aria-label="Folder" value={cat} onChange={e => setCat(e.target.value)}><option value="all">All folders</option>{data.categories.map(c => <option key={c.id} value={c.id}>{c.parentId ? '— ' : ''}{c.name}</option>)}</select>
      </div>
      <div className="lib-crumb"><FolderOpen size={16} />{current ? <>{current.parentId && <>{data.categories.find(c => c.id === current.parentId)?.name}<ChevronRight size={13} /></>}<b>{current.name}</b></> : <b>All documents</b>}<span>{docs.length} item{docs.length === 1 ? '' : 's'}</span></div>
      {current?.description && <p className="lib-desc">{current.description}</p>}
      {docs.length ? <div className="lib-grid">{docs.map(d => <button key={d.id} className={'lib-card t-' + d.type + (locked(d) ? ' locked' : '')} onClick={() => setOpen(d)}>
        <div className="lib-card-top"><DocIcon type={d.type} size={26} /><span className="lib-type">{d.type === 'word' ? 'WORD' : d.type.toUpperCase()}</span>{locked(d) ? <Pill tone="gold"><Lock size={12} />Researchers</Pill> : d.visibility === 'researchers' ? <Pill tone="teal">Researchers</Pill> : <Pill tone="green">Public</Pill>}</div>
        <h3>{d.title}</h3><p>{d.description}</p>
        <div className="lib-meta"><span>{d.author}</span><span>{d.year} · {fmtSize(d.size)}</span>{d.source === 'researcher' && <span className="contrib">Researcher contribution</span>}</div>
        <div className="lib-stats"><span><Eye size={13} />{d.views}</span><span><Download size={13} />{d.downloads}</span></div>
      </button>)}</div> : <Empty title="No documents found">Try another folder or search term.</Empty>}
      {publicMode && !fullAccess && <div className="ws-banner"><Lock /><div><b>Researcher-only documents</b><p>Register as a researcher and pay a one-time {data.settings.libraryFee} ETB library fee via Telebirr to access all documents and contribute research.</p></div><Link className="ws-btn sm" href="/dashboard/register">Register</Link></div>}
    </div>
    <DocViewer doc={open} locked={open ? locked(open) : false} onClose={() => setOpen(null)} />
  </div>;
}

export function LibraryBrowse() {
  const { hasLibraryAccess, can } = useWS();
  const docParam = useQueryParam('doc');
  const access = hasLibraryAccess();
  return <>
    <PageHead eyebrow="DIGITAL LIBRARY" title="Browse the library" actions={can('library.manage') ? <Link className="ws-btn" href="/dashboard/library/manage"><Upload size={16} />Upload</Link> : can('library.contribute') && access ? <Link className="ws-btn" href="/dashboard/library/contribute?new=1"><Plus size={16} />Contribute research</Link> : undefined}>
      Laws, research, manuals, reports and training videos organized by folder.
    </PageHead>
    {!access && <div className="ws-banner warn"><Lock /><div><b>Limited access</b><p>You can open public documents. Researcher-only documents unlock after your Telebirr payment is approved.</p></div><Link className="ws-btn sm" href="/dashboard/library/access">Get full access</Link></div>}
    <LibraryExplorer fullAccess={access} initialDoc={docParam} />
  </>;
}

/* ---------------- Upload / edit document ---------------- */
function DocForm({ open, onClose, contribution, edit }: { open: boolean; onClose: () => void; contribution?: boolean; edit?: LibDoc | null }) {
  const { data, actions, user } = useWS();
  const [f, setF] = useState({ title: '', description: '', categoryId: data.categories[0]?.id || '', visibility: 'public' as LibDoc['visibility'], author: '', year: String(new Date().getFullYear()) });
  const [file, setFile] = useState<File | null>(null), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  useEffect(() => {
    if (!open) return;
    setErr(''); setFile(null);
    setF(edit ? { title: edit.title, description: edit.description, categoryId: edit.categoryId, visibility: edit.visibility, author: edit.author, year: edit.year }
      : { title: '', description: '', categoryId: contribution ? 'c-research' : data.categories[0]?.id || '', visibility: contribution ? 'researchers' : 'public', author: contribution ? user?.name || '' : data.settings.orgName, year: String(new Date().getFullYear()) });
  }, [open, edit]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (edit) { actions.updateDoc(edit.id, f); toast.success('Document updated'); onClose(); return; }
    if (!file) return setErr('Choose a PDF, Word or video file.');
    const type = detectType(file);
    if (!type) return setErr('Only PDF, Word (.doc/.docx) and video (.mp4/.webm/.mov) files are allowed.');
    if (file.size > 200 * 1048576) return setErr('Maximum file size is 200 MB in this demo.');
    setBusy(true);
    const url = await saveFile(file);
    actions.addDoc({ ...f, type, url, fileName: file.name, size: file.size }, contribution);
    setBusy(false);
    toast.success(contribution ? 'Submitted for review. You will be notified when it is published.' : 'Document uploaded and published');
    onClose();
  };
  return <Modal open={open} onClose={onClose} title={edit ? 'Edit document' : contribution ? 'Contribute research or a document' : 'Upload document'} description={contribution ? 'The Library Admin reviews every contribution before it is published for all users.' : 'PDF, Word and video files are supported.'}>
    <form onSubmit={submit} className="ws-form">
      <div className="ws-grid2">
        <F label="Title" wide><input className="ws-input" required value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></F>
        <F label="Description" wide><textarea className="ws-input" rows={3} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></F>
        <F label="Folder / category"><select className="ws-input" value={f.categoryId} onChange={e => setF({ ...f, categoryId: e.target.value })}>{data.categories.map(c => <option key={c.id} value={c.id}>{c.parentId ? '— ' : ''}{c.name}</option>)}</select></F>
        {!contribution && <F label="Who can open it"><Sel value={f.visibility} onChange={v => setF({ ...f, visibility: v as LibDoc['visibility'] })} options={[['public', 'Public – all visitors'], ['researchers', 'Researchers & staff only']]} /></F>}
        <F label="Author"><input className="ws-input" value={f.author} onChange={e => setF({ ...f, author: e.target.value })} /></F>
        <F label="Year"><input className="ws-input" inputMode="numeric" value={f.year} onChange={e => setF({ ...f, year: e.target.value })} /></F>
        {!edit && <F label="File" wide hint="PDF, Word (.doc, .docx) or video (.mp4, .webm, .mov)"><label className="ws-drop"><Upload size={20} /><span>{file ? `${file.name} · ${fmtSize(file.size)}` : 'Choose a file or drag it here'}</span><input type="file" accept={ACCEPT_DOCS} onChange={e => setFile(e.target.files?.[0] || null)} /></label></F>}
      </div>
      {err && <p className="ws-error">{err}</p>}
      <div className="ws-form-actions"><button type="button" className="ws-btn ghost" onClick={onClose}>Cancel</button><button className="ws-btn" disabled={busy}>{busy ? 'Uploading…' : edit ? 'Save changes' : contribution ? 'Submit for review' : 'Upload & publish'}</button></div>
    </form>
  </Modal>;
}

/* ---------------- Library admin: manage ---------------- */
export function LibraryManage() {
  const { data, actions, userName } = useWS();
  const [tab, setTab] = useState<'docs' | 'folders'>('docs');
  const [upload, setUpload] = useState(false), [edit, setEdit] = useState<LibDoc | null>(null), [view, setView] = useState<LibDoc | null>(null);
  const [q, setQ] = useState(''), [cat, setCat] = useState('all'), [status, setStatus] = useState('all');
  const [folder, setFolder] = useState<{ id?: string; name: string; parentId: string | null; description: string } | null>(null);
  const docs = data.docs.filter(d => (cat === 'all' || d.categoryId === cat) && (status === 'all' || d.status === status) && d.title.toLowerCase().includes(q.toLowerCase()));
  const catName = (id: string) => data.categories.find(c => c.id === id)?.name || '—';
  return <>
    <PageHead eyebrow="LIBRARY ADMIN" title="Manage the digital library" actions={<><button className="ws-btn ghost" onClick={() => setFolder({ name: '', parentId: null, description: '' })}><FolderPlus size={16} />New folder</button><button className="ws-btn" onClick={() => setUpload(true)}><Upload size={16} />Upload document</button></>}>
      Upload PDF, Word and video files into folders, and control who can open them.
    </PageHead>
    <div className="ws-tabs" role="tablist"><button role="tab" aria-selected={tab === 'docs'} onClick={() => setTab('docs')}>Documents <em>{data.docs.length}</em></button><button role="tab" aria-selected={tab === 'folders'} onClick={() => setTab('folders')}>Folders & categories <em>{data.categories.length}</em></button></div>
    {tab === 'docs' ? <Panel>
      <div className="ws-filters">
        <div className="lib-search"><Search size={16} /><input placeholder="Search documents" value={q} onChange={e => setQ(e.target.value)} /></div>
        <select className="ws-input" value={cat} onChange={e => setCat(e.target.value)}><option value="all">All folders</option>{data.categories.map(c => <option key={c.id} value={c.id}>{c.parentId ? '— ' : ''}{c.name}</option>)}</select>
        <Sel value={status} onChange={setStatus} options={[['all', 'All statuses'], ['published', 'Published'], ['pending', 'Pending review'], ['rejected', 'Rejected']]} />
      </div>
      <DataTable head={['Document', 'Folder', 'Visibility', 'Status', 'Uploaded', 'Views', '']} empty={!docs.length}>
        {docs.map(d => <tr key={d.id}>
          <td><button className="ws-doc-cell" onClick={() => setView(d)}><DocIcon type={d.type} /><span><b>{d.title}</b><small>{d.fileName} · {fmtSize(d.size)}</small></span></button></td>
          <td>{catName(d.categoryId)}</td>
          <td><button className="ws-toggle-vis" title="Toggle visibility" onClick={() => actions.updateDoc(d.id, { visibility: d.visibility === 'public' ? 'researchers' : 'public' })}>{d.visibility === 'public' ? <Pill tone="green">Public</Pill> : <Pill tone="teal"><Lock size={11} />Researchers</Pill>}</button></td>
          <td><StatusPill status={d.status} /></td>
          <td>{fmtDate(d.createdAt)}<small className="ws-sub">{userName(d.uploadedBy)}</small></td>
          <td>{d.views}</td>
          <td className="ws-row-actions"><button aria-label="Edit" onClick={() => setEdit(d)}><Pencil size={16} /></button><button aria-label="Delete" onClick={() => { if (confirm(`Delete “${d.title}”?`)) { actions.deleteDoc(d.id); toast.success('Deleted'); } }}><Trash2 size={16} /></button></td>
        </tr>)}
      </DataTable>
    </Panel> : <Panel>
      <ul className="ws-folders">{data.categories.filter(c => !c.parentId).map(r => <li key={r.id}>
        <FolderRow c={r} onEdit={() => setFolder({ ...r })} onAddSub={() => setFolder({ name: '', parentId: r.id, description: '' })} />
        <ul>{data.categories.filter(c => c.parentId === r.id).map(s => <li key={s.id}><FolderRow c={s} onEdit={() => setFolder({ ...s })} /></li>)}</ul>
      </li>)}</ul>
    </Panel>}
    <DocForm open={upload || !!edit} edit={edit} onClose={() => { setUpload(false); setEdit(null); }} />
    <DocViewer doc={view} onClose={() => setView(null)} />
    <Modal open={!!folder} onClose={() => setFolder(null)} title={folder?.id ? 'Edit folder' : 'New folder'}>
      {folder && <form className="ws-form" onSubmit={e => { e.preventDefault(); actions.saveCategory(folder); toast.success('Folder saved'); setFolder(null); }}>
        <F label="Folder name"><input className="ws-input" required value={folder.name} onChange={e => setFolder({ ...folder, name: e.target.value })} /></F>
        <F label="Parent folder"><select className="ws-input" value={folder.parentId || ''} onChange={e => setFolder({ ...folder, parentId: e.target.value || null })}><option value="">— Top level —</option>{data.categories.filter(c => !c.parentId && c.id !== folder.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F>
        <F label="Description"><textarea className="ws-input" rows={2} value={folder.description} onChange={e => setFolder({ ...folder, description: e.target.value })} /></F>
        <div className="ws-form-actions">{folder.id && <button type="button" className="ws-btn danger ghost" onClick={() => { const r = actions.deleteCategory(folder.id!); if (r.ok) { toast.success('Folder deleted'); setFolder(null); } else toast.error(r.error); }}>Delete</button>}<button className="ws-btn">Save folder</button></div>
      </form>}
    </Modal>
  </>;
}
function FolderRow({ c, onEdit, onAddSub }: { c: { id: string; name: string; description: string }; onEdit: () => void; onAddSub?: () => void }) {
  const { data } = useWS();
  const n = data.docs.filter(d => d.categoryId === c.id).length;
  return <div className="ws-folder-row"><Folder size={18} /><div><b>{c.name}</b><small>{c.description || 'No description'} · {n} document{n === 1 ? '' : 's'}</small></div><span>{onAddSub && <button className="ws-btn sm ghost" onClick={onAddSub}><Plus size={14} />Sub-folder</button>}<button className="ws-btn sm ghost" onClick={onEdit}><Pencil size={14} />Edit</button></span></div>;
}

/* ---------------- Library admin: approvals ---------------- */
export function LibraryApprovals() {
  const { data, actions, userName } = useWS();
  const tabParam = useQueryParam('tab');
  const [tab, setTab] = useState<'payments' | 'contributions' | 'history'>('payments');
  useEffect(() => { if (tabParam === 'contributions') setTab('contributions'); }, [tabParam]);
  const [review, setReview] = useState<{ kind: 'pay' | 'doc'; id: string; approve: boolean } | null>(null);
  const [note, setNote] = useState(''), [vis, setVis] = useState<LibDoc['visibility']>('researchers'), [view, setView] = useState<LibDoc | null>(null);
  const pays = data.payments.filter(p => p.status === 'pending'), docs = data.docs.filter(d => d.status === 'pending');
  const history = [
    ...data.payments.filter(p => p.status !== 'pending').map(p => ({ id: p.id, at: p.reviewedAt || p.createdAt, what: `Payment ${p.txnId} · ${userName(p.userId)}`, status: p.status, by: p.reviewedBy, note: p.note })),
    ...data.docs.filter(d => d.source === 'researcher' && d.status !== 'pending').map(d => ({ id: d.id, at: d.publishedAt || d.createdAt, what: `Contribution “${d.title}” · ${userName(d.uploadedBy)}`, status: d.status, by: d.reviewedBy, note: d.reviewNote })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return <>
    <PageHead eyebrow="LIBRARY ADMIN" title="Approvals">Verify researcher Telebirr receipts and review contributed research before publishing.</PageHead>
    <div className="ws-tabs" role="tablist">
      <button role="tab" aria-selected={tab === 'payments'} onClick={() => setTab('payments')}>Researcher payments <em className={pays.length ? 'hot' : ''}>{pays.length}</em></button>
      <button role="tab" aria-selected={tab === 'contributions'} onClick={() => setTab('contributions')}>Contributions <em className={docs.length ? 'hot' : ''}>{docs.length}</em></button>
      <button role="tab" aria-selected={tab === 'history'} onClick={() => setTab('history')}>History</button>
    </div>
    {tab === 'payments' && (pays.length ? <div className="ws-cards">{pays.map(p => { const u = data.users.find(x => x.id === p.userId); return <article key={p.id} className="ws-card">
      <header><Wallet size={20} /><div><b>{u?.name}</b><small>{u?.institution} · {u?.email}</small></div><Pill tone="gold">Pending</Pill></header>
      <dl className="ws-dl"><dt>Amount</dt><dd>{p.amount} ETB</dd><dt>Telebirr transaction</dt><dd className="mono">{p.txnId}</dd><dt>Paid on</dt><dd>{fmtDate(p.paidOn)}</dd><dt>Phone</dt><dd>{u?.phone}</dd><dt>Purpose</dt><dd>{u?.purpose}</dd><dt>Submitted</dt><dd>{ago(p.createdAt)}</dd></dl>
      <ReceiptLink url={p.receiptUrl} name={p.receiptName} />
      <footer><button className="ws-btn danger ghost" onClick={() => { setNote(''); setReview({ kind: 'pay', id: p.id, approve: false }); }}><XCircle size={16} />Reject</button><button className="ws-btn" onClick={() => { setNote('Receipt verified against Telebirr statement.'); setReview({ kind: 'pay', id: p.id, approve: true }); }}><CheckCircle2 size={16} />Approve access</button></footer>
    </article>; })}</div> : <Empty title="No payments waiting" icon={<CheckCircle2 size={30} />}>New Telebirr receipts will appear here.</Empty>)}
    {tab === 'contributions' && (docs.length ? <div className="ws-cards">{docs.map(d => <article key={d.id} className="ws-card">
      <header><DocIcon type={d.type} size={22} /><div><b>{d.title}</b><small>by {userName(d.uploadedBy)} · {ago(d.createdAt)}</small></div><Pill tone="gold">Pending</Pill></header>
      <p>{d.description}</p>
      <dl className="ws-dl"><dt>Proposed folder</dt><dd>{data.categories.find(c => c.id === d.categoryId)?.name}</dd><dt>File</dt><dd>{d.fileName} · {fmtSize(d.size)}</dd><dt>Author</dt><dd>{d.author}, {d.year}</dd></dl>
      <button className="ws-btn ghost sm" onClick={() => setView(d)}><Eye size={15} />Preview file</button>
      <footer><button className="ws-btn danger ghost" onClick={() => { setNote(''); setReview({ kind: 'doc', id: d.id, approve: false }); }}><XCircle size={16} />Reject</button><button className="ws-btn" onClick={() => { setNote('Approved for publication.'); setVis('public'); setReview({ kind: 'doc', id: d.id, approve: true }); }}><CheckCircle2 size={16} />Approve & publish</button></footer>
    </article>)}</div> : <Empty title="No contributions waiting" icon={<CheckCircle2 size={30} />} />)}
    {tab === 'history' && <Panel><DataTable head={['Date', 'Item', 'Decision', 'Reviewed by', 'Note']} empty={!history.length}>{history.map(h => <tr key={h.id}><td>{fmtDate(h.at)}</td><td>{h.what}</td><td><StatusPill status={h.status} /></td><td>{userName(h.by)}</td><td>{h.note}</td></tr>)}</DataTable></Panel>}
    <Modal open={!!review} onClose={() => setReview(null)} title={review?.approve ? (review.kind === 'pay' ? 'Approve payment & grant access' : 'Approve & publish contribution') : 'Reject'} description={review?.approve ? (review?.kind === 'pay' ? `The researcher gets full library access for ${data.settings.accessDays} days.` : 'The document becomes visible in the library.') : 'The researcher will see your reason.'}>
      {review && <form className="ws-form" onSubmit={e => {
        e.preventDefault();
        if (!review.approve && !note.trim()) return toast.error('Please give a reason.');
        if (review.kind === 'pay') actions.reviewPayment(review.id, review.approve, note); else actions.reviewDoc(review.id, review.approve, note, vis);
        toast.success(review.approve ? 'Approved' : 'Rejected'); setReview(null);
      }}>
        {review.kind === 'doc' && review.approve && <F label="Publish for"><Sel value={vis} onChange={v => setVis(v as LibDoc['visibility'])} options={[['public', 'All users (public)'], ['researchers', 'Researchers & staff only']]} /></F>}
        <F label={review.approve ? 'Note (optional)' : 'Reason for rejection'}><textarea className="ws-input" rows={3} value={note} onChange={e => setNote(e.target.value)} /></F>
        <div className="ws-form-actions"><button type="button" className="ws-btn ghost" onClick={() => setReview(null)}>Cancel</button><button className={'ws-btn' + (review.approve ? '' : ' danger')}>{review.approve ? 'Confirm approval' : 'Reject'}</button></div>
      </form>}
    </Modal>
    <DocViewer doc={view} onClose={() => setView(null)} />
  </>;
}
function ReceiptLink({ url, name }: { url: string; name: string }) {
  const u = useFileUrl(url);
  const img = /\.(png|jpe?g|webp|gif)$/i.test(name);
  return <div className="ws-receipt">{img && u ? <img src={u} alt="Telebirr receipt" /> : null}<a className="ws-btn ghost sm" href={u || '#'} target="_blank" rel="noreferrer"><Eye size={15} />Open receipt · {name}</a></div>;
}

/* ---------------- Researcher: access & payment ---------------- */
export function LibraryAccess() {
  const { data, user, actions, hasLibraryAccess } = useWS();
  const mine = data.payments.filter(p => p.userId === user!.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const last = mine[0];
  const access = hasLibraryAccess();
  const [txn, setTxn] = useState(''), [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10)), [file, setFile] = useState<File | null>(null), [busy, setBusy] = useState(false);
  const step = access ? 4 : last?.status === 'pending' ? 3 : 2;
  const canSubmit = !access && last?.status !== 'pending';
  return <>
    <PageHead eyebrow="DIGITAL LIBRARY" title="Library access & payment">Researchers pay a {data.settings.libraryFee} ETB access fee with Telebirr. Access is activated after the Library Admin verifies the receipt.</PageHead>
    <ol className="ws-progress">{['Account created', 'Pay with Telebirr', 'Receipt under review', 'Access granted'].map((s, i) => <li key={s} className={i + 1 < step ? 'done' : i + 1 === step ? 'current' : ''}><span>{i + 1 < step ? <CheckCircle2 size={16} /> : i + 1}</span>{s}</li>)}</ol>
    {access && last?.expiresAt && <div className="ws-banner ok"><CheckCircle2 /><div><b>Access active until {fmtDate(last.expiresAt)}</b><p>You can open every document and contribute your research.</p></div><Link className="ws-btn sm" href="/dashboard/library">Open library</Link></div>}
    {last?.status === 'pending' && <div className="ws-banner warn"><Clock /><div><b>Receipt {last.txnId} is under review</b><p>Submitted {ago(last.createdAt)}. Most reviews are completed within one working day.</p></div></div>}
    {last?.status === 'rejected' && <div className="ws-banner bad"><XCircle /><div><b>Your last receipt was rejected</b><p>{last.note} Please submit a valid receipt.</p></div></div>}
    <div className="ws-dash-grid">
      <Panel title="How to pay with Telebirr">
        <div className="telebirr-card"><div className="tb-logo">tele<b>birr</b></div><dl className="ws-dl"><dt>Amount</dt><dd><b>{data.settings.libraryFee}.00 ETB</b></dd><dt>Merchant / short code</dt><dd className="mono">{data.settings.telebirrCode}</dd><dt>Merchant name</dt><dd>{data.settings.telebirrName}</dd><dt>Reference</dt><dd className="mono">LIB-{user!.id.slice(-6).toUpperCase()}</dd></dl></div>
        <ol className="ws-howto"><li>Open the Telebirr app or dial <b>*127#</b>.</li><li>Choose <b>Pay with merchant</b> and enter the short code.</li><li>Pay <b>{data.settings.libraryFee} ETB</b> and enter your reference.</li><li>Save the SMS / screenshot receipt and upload it here.</li></ol>
      </Panel>
      <Panel title="Upload your receipt">
        {canSubmit ? <form className="ws-form" onSubmit={async e => {
          e.preventDefault();
          if (!file) return toast.error('Attach the receipt screenshot or PDF.');
          if (!/^[A-Z0-9]{8,12}$/i.test(txn.trim())) return toast.error('Enter the Telebirr transaction ID (8–12 letters/numbers).');
          setBusy(true); const url = await saveFile(file);
          actions.submitPayment({ txnId: txn.trim().toUpperCase(), receiptUrl: url, receiptName: file.name, paidOn: new Date(paidOn).toISOString() });
          setBusy(false); setTxn(''); setFile(null); toast.success('Receipt submitted. The Library Admin will review it.');
        }}>
          <F label="Telebirr transaction ID" hint="Shown in the confirmation SMS, e.g. TB8K2LQ91X"><input className="ws-input mono" required value={txn} onChange={e => setTxn(e.target.value)} placeholder="TB…" /></F>
          <F label="Payment date"><input className="ws-input" type="date" required value={paidOn} onChange={e => setPaidOn(e.target.value)} /></F>
          <F label="Receipt (image or PDF)"><label className="ws-drop"><Upload size={20} /><span>{file ? file.name : 'Choose receipt screenshot or PDF'}</span><input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files?.[0] || null)} /></label></F>
          <button className="ws-btn block" disabled={busy}>{busy ? 'Submitting…' : 'Submit receipt for approval'}</button>
        </form> : <Empty title={access ? 'No action needed' : 'Receipt submitted'} icon={<CheckCircle2 size={30} />}>{access ? 'Your access is active.' : 'Please wait for the review.'}</Empty>}
      </Panel>
    </div>
    <Panel title="Payment history"><DataTable head={['Submitted', 'Transaction', 'Amount', 'Status', 'Note', 'Access until']} empty={!mine.length}>{mine.map(p => <tr key={p.id}><td>{fmtDate(p.createdAt)}</td><td className="mono">{p.txnId}</td><td>{p.amount} ETB</td><td><StatusPill status={p.status} /></td><td>{p.note || '—'}</td><td>{fmtDate(p.expiresAt)}</td></tr>)}</DataTable></Panel>
  </>;
}

/* ---------------- Researcher: contributions ---------------- */
export function LibraryContribute() {
  const { data, user, hasLibraryAccess } = useWS();
  const newParam = useQueryParam('new');
  const [open, setOpen] = useState(false), [view, setView] = useState<LibDoc | null>(null);
  useEffect(() => { if (newParam) setOpen(true); }, [newParam]);
  const mine = useMemo(() => data.docs.filter(d => d.uploadedBy === user!.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [data.docs, user]);
  const access = hasLibraryAccess();
  return <>
    <PageHead eyebrow="DIGITAL LIBRARY" title="My contributions" actions={access ? <button className="ws-btn" onClick={() => setOpen(true)}><Plus size={16} />New contribution</button> : undefined}>
      Share research papers, theses and documents. Approved contributions are published for all users with your name as author.
    </PageHead>
    {!access && <div className="ws-banner warn"><Lock /><div><b>Contributions open after access approval</b><p>Pay the library fee and upload your receipt first.</p></div><Link className="ws-btn sm" href="/dashboard/library/access">Get access</Link></div>}
    {mine.length ? <div className="ws-cards">{mine.map(d => <article key={d.id} className="ws-card">
      <header><DocIcon type={d.type} size={22} /><div><b>{d.title}</b><small>{data.categories.find(c => c.id === d.categoryId)?.name} · submitted {fmtDate(d.createdAt)}</small></div><StatusPill status={d.status === 'pending' ? 'pending' : d.status} /></header>
      <p>{d.description}</p>
      {d.reviewNote && <p className="ws-note"><b>Library Admin:</b> {d.reviewNote}</p>}
      <footer><button className="ws-btn ghost sm" onClick={() => setView(d)}><Eye size={15} />Open</button>{d.status === 'published' && <span className="ws-sub">{d.views} views · {d.downloads} downloads</span>}</footer>
    </article>)}</div> : <Empty title="No contributions yet">{access ? 'Use “New contribution” to submit your first document.' : ''}</Empty>}
    <DocForm open={open} contribution onClose={() => setOpen(false)} />
    <DocViewer doc={view} onClose={() => setView(null)} />
  </>;
}
