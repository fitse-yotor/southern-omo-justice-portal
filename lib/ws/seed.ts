import { CASE_STATUSES, PERMISSIONS, type Case, type CaseStatus, type Permission, type WSData } from './types';

const DAY = 86400000;
export const SEED_VERSION = 5;

export function seedData(now = Date.now()): WSData {
  const ago = (d: number, h = 9) => { const t = new Date(now - d * DAY); t.setHours(h, (d * 7) % 60, 0, 0); return t.toISOString(); };
  const addDays = (iso: string, d: number) => new Date(new Date(iso).getTime() + d * DAY).toISOString();
  const all = PERMISSIONS.map(p => p.key);
  const P = (...p: Permission[]) => p;

  const roles: WSData['roles'] = [
    { id: 'super-admin', name: 'Super Admin', description: 'Full access to every module, user, role and report.', permissions: all, system: true },
    { id: 'library-admin', name: 'Library Admin', description: 'Uploads and organizes the digital library, approves researcher payments and contributions.', permissions: P('library.view', 'library.manage', 'library.approve', 'reports.library', 'reports.own'), system: true },
    { id: 'researcher', name: 'Researcher', description: 'Registered researcher. Pays the library fee, accesses the full library after approval and contributes research.', permissions: P('library.contribute', 'reports.own'), system: true },
    { id: 'director', name: 'Director', description: 'Oversees prosecution: creates and assigns cases, comments, sets SLAs and reviews prosecutor reports.', permissions: P('cases.create', 'cases.viewAll', 'cases.comment', 'cases.extend', 'cases.update', 'sla.manage', 'preports.review', 'reports.cases', 'library.view', 'reports.own'), system: true },
    { id: 'prosecutor', name: 'Prosecutor', description: 'Registers own cases, updates status within SLA and submits daily, weekly and monthly reports.', permissions: P('cases.create', 'cases.viewOwn', 'cases.update', 'preports.submit', 'library.view', 'reports.own'), system: true },
    { id: 'content-editor', name: 'Content Editor', description: 'Manages public website news, notices, gallery and legal documents.', permissions: P('cms.access', 'reports.own'), system: true },
    { id: 'complaint-officer', name: 'Complaint Officer', description: 'Handles citizen complaints received through the public portal.', permissions: P('cms.access', 'reports.own'), system: true },
  ];

  const u = (id: string, name: string, email: string, roleId: string, office: string, d: number, extra: Partial<WSData['users'][number]> = {}) =>
    ({ id, name, email, password: 'Demo@123', phone: '+251 9' + (11000000 + d * 13791).toString().slice(0, 8), roleId, office, status: 'active' as const, createdAt: ago(d), lastLogin: ago(Math.max(0, d % 3)), ...extra });
  const users: WSData['users'] = [
    u('u-super', 'System Administrator', 'superadmin@southomo.gov.et', 'super-admin', 'Zone office (Jinka)', 300, { password: 'Admin@123' }),
    u('u-lib', 'Meron Tesfaye', 'library@southomo.gov.et', 'library-admin', 'Zone office (Jinka)', 240),
    u('u-dir', 'Abebe Kebede', 'director@southomo.gov.et', 'director', 'Zone office (Jinka)', 260),
    u('u-p1', 'Hana Girma', 'prosecutor@southomo.gov.et', 'prosecutor', 'Jinka Town', 200),
    u('u-p2', 'Dawit Alemu', 'dawit.alemu@southomo.gov.et', 'prosecutor', 'Hamer', 190),
    u('u-p3', 'Selam Tadesse', 'selam.tadesse@southomo.gov.et', 'prosecutor', 'Bena-Tsemay', 150),
    u('u-r1', 'Dr. Yonas Bekele', 'researcher@example.com', 'researcher', '—', 90, { institution: 'Jinka University', purpose: 'Customary law and formal justice research' }),
    u('u-r2', 'Lidya Haile', 'lidya.haile@example.com', 'researcher', '—', 4, { institution: 'Arba Minch University', purpose: 'MA thesis on juvenile justice' }),
    u('u-r3', 'Samuel Ayele', 'samuel.ayele@example.com', 'researcher', '—', 1, { institution: 'Independent researcher', purpose: 'Land dispute resolution study' }),
    u('u-r4', 'Mekdes Alemayehu', 'mekdes.alemayehu@example.com', 'researcher', '—', 2, { institution: 'Addis Ababa University', purpose: 'PhD research on pastoralist land rights' }),
    u('u-r5', 'Biruk Tesfaye', 'biruk.tesfaye@example.com', 'researcher', '—', 14, { institution: 'Wolaita Sodo University', purpose: 'Comparative study of legal aid services' }),
    u('u-cms', 'Tigist Worku', 'editor@southomo.gov.et', 'content-editor', 'Zone office (Jinka)', 210),
    u('u-co', 'Mulugeta Asfaw', 'complaints@southomo.gov.et', 'complaint-officer', 'Zone office (Jinka)', 205),
    u('u-p4', 'Kebede Lemma', 'kebede.lemma@southomo.gov.et', 'prosecutor', 'Male', 400, { status: 'inactive' }),
  ];

  const categories: WSData['categories'] = [
    { id: 'c-laws', name: 'Laws & Proclamations', parentId: null, description: 'Federal and regional legislation, regulations and directives.' },
    { id: 'c-research', name: 'Research Papers', parentId: null, description: 'Peer and researcher contributions on justice in South Omo.' },
    { id: 'c-research-cust', name: 'Customary Law', parentId: 'c-research', description: 'Customary dispute resolution and legal pluralism.' },
    { id: 'c-research-crim', name: 'Criminal Justice', parentId: 'c-research', description: 'Prosecution, juvenile justice and crime prevention.' },
    { id: 'c-manuals', name: 'Manuals & Guidelines', parentId: null, description: 'Practice manuals, guidelines and standard procedures.' },
    { id: 'c-videos', name: 'Training Videos', parentId: null, description: 'Recorded trainings and awareness videos.' },
    { id: 'c-reports', name: 'Annual Reports', parentId: null, description: 'Institutional performance reports.' },
    { id: 'c-forms', name: 'Forms & Templates', parentId: null, description: 'Downloadable forms for citizens and staff.' },
  ];

  let dn = 0;
  const doc = (title: string, categoryId: string, type: 'pdf' | 'word' | 'video', url: string, size: number, visibility: 'public' | 'researchers', d: number, extra: Partial<WSData['docs'][number]> = {}) => ({
    id: 'd-' + (++dn), title, description: '', categoryId, type, url, fileName: url.split('/').pop()!, size, visibility, status: 'published' as const,
    uploadedBy: 'u-lib', source: 'admin' as const, author: 'South Omo Zone Justice Department', year: new Date(now - d * DAY).getFullYear().toString(),
    createdAt: ago(d), publishedAt: ago(d), views: 40 + ((dn * 37) % 260), downloads: 8 + ((dn * 23) % 90), ...extra,
  });
  const docs: WSData['docs'] = [
    doc("Citizens' Charter", 'c-laws', 'pdf', '/samples/citizens-charter.pdf', 2596, 'public', 120, { description: 'Service standards, citizen rights and complaint channels.' }),
    doc('Administrative Justice Guideline', 'c-laws', 'pdf', '/samples/administrative-justice.pdf', 2464, 'public', 100, { description: 'Checklist for recording a concern and communicating outcomes.' }),
    doc('Crime Prevention Strategy', 'c-laws', 'pdf', '/samples/crime-prevention.pdf', 2447, 'researchers', 80, { description: 'Community awareness and coordination framework.' }),
    doc('Prosecution Practice Manual', 'c-manuals', 'word', '/library/prosecution-manual.docx', 3100, 'researchers', 70, { description: 'Case intake, charging standards, court representation and reporting obligations.' }),
    doc('Legal Aid Service Guideline', 'c-manuals', 'word', '/library/legal-aid-guideline.docx', 2600, 'public', 65, { description: 'Eligibility, intake and referral for legal aid.' }),
    doc('Prosecution procedure orientation', 'c-videos', 'video', '/library/video-1.mp4', 113066, 'researchers', 40, { description: 'Orientation video for new prosecutors (sample).' }),
    doc('Customary dispute resolution in South Omo', 'c-videos', 'video', '/library/video-2.mp4', 113735, 'public', 35, { description: 'Awareness video on elders’ reconciliation practices (sample).' }),
    doc('Annual Performance Report 2025', 'c-reports', 'word', '/library/annual-report-2025.docx', 2900, 'public', 30, { description: 'Summary of case handling and service delivery indicators.' }),
    doc('Complaint Form', 'c-forms', 'pdf', '/samples/complaint-form.pdf', 2428, 'public', 150, { description: 'Printable complaint submission form.' }),
    doc('Information Request Form', 'c-forms', 'pdf', '/samples/information-request.pdf', 2319, 'public', 140, { description: 'Request access to public information.' }),
    doc('Customary Law and Formal Justice in South Omo', 'c-research-cust', 'word', '/library/research-customary-law.docx', 3400, 'researchers', 20, { description: 'Interaction between elders’ councils and woreda justice offices.', source: 'researcher', uploadedBy: 'u-r1', author: 'Dr. Yonas Bekele', reviewedBy: 'u-lib' }),
    doc('Juvenile Justice Practice in South Omo: A Field Survey', 'c-research-crim', 'word', '/library/research-customary-law.docx', 3400, 'researchers', 1, { description: 'Field survey of juvenile case handling in four woredas, with recommendations.', source: 'researcher', uploadedBy: 'u-r1', author: 'Dr. Yonas Bekele', status: 'pending', publishedAt: undefined, views: 0, downloads: 0 }),
    doc('Notes on Court Fees (draft)', 'c-research-crim', 'pdf', '/samples/information-request.pdf', 2319, 'researchers', 25, { description: 'Short draft note on court fee practice.', source: 'researcher', uploadedBy: 'u-r1', author: 'Dr. Yonas Bekele', status: 'rejected', publishedAt: undefined, reviewedBy: 'u-lib', reviewNote: 'Too short for publication. Please expand with sources and resubmit.', views: 0, downloads: 0 }),
    doc('Public Legal Awareness in Pastoralist Communities', 'c-research-crim', 'pdf', '/samples/legal-awareness.pdf', 2485, 'researchers', 3, { description: 'Survey of legal awareness campaigns in Hamer and Dasenech.', source: 'researcher', uploadedBy: 'u-r1', author: 'Dr. Yonas Bekele', status: 'pending', publishedAt: undefined, views: 0, downloads: 0 }),
  ];

  const payments: WSData['payments'] = [
    { id: 'pay-1', userId: 'u-r1', amount: 200, txnId: 'TB8K2LQ91X', receiptUrl: '/receipts/receipt-TB8K2LQ91X.pdf', receiptName: 'receipt-TB8K2LQ91X.pdf', paidOn: ago(89), status: 'approved', createdAt: ago(89), reviewedBy: 'u-lib', reviewedAt: ago(88), expiresAt: addDays(ago(88), 365), note: 'Receipt verified against the merchant statement.' },
    { id: 'pay-2', userId: 'u-r2', amount: 200, txnId: 'TB9P4MZ27Q', receiptUrl: '/receipts/receipt-TB9P4MZ27Q.png', receiptName: 'receipt-TB9P4MZ27Q.png', paidOn: ago(2), status: 'pending', createdAt: ago(2) },
    { id: 'pay-3', userId: 'u-r4', amount: 200, txnId: 'TC1R7KD55W', receiptUrl: '/receipts/receipt-TC1R7KD55W.pdf', receiptName: 'receipt-TC1R7KD55W.pdf', paidOn: ago(1), status: 'pending', createdAt: ago(1, 10) },
    { id: 'pay-4', userId: 'u-r5', amount: 200, txnId: 'TA00BAD1', receiptUrl: '/receipts/receipt-TA00BAD1.jpg', receiptName: 'receipt-TA00BAD1.jpg', paidOn: ago(13), status: 'rejected', createdAt: ago(13), reviewedBy: 'u-lib', reviewedAt: ago(12), note: 'Transaction ID was not found in the merchant statement. Please upload the correct receipt.' },
  ];

  const caseCategories: WSData['caseCategories'] = [
    ['cc-hom', 'Homicide', 120], ['cc-theft', 'Theft & robbery', 60], ['cc-gbv', 'Gender-based violence', 45], ['cc-fraud', 'Fraud & corruption', 90],
    ['cc-land', 'Land & property dispute', 75], ['cc-traffic', 'Traffic offence', 30], ['cc-juv', 'Juvenile cases', 30],
  ].map(([id, name, slaDays]) => ({ id: id as string, name: name as string, slaDays: slaDays as number, updatedAt: ago(60), updatedBy: 'u-dir' }));
  const sla = Object.fromEntries(caseCategories.map(c => [c.id, c.slaDays]));

  const statusChanges: WSData['statusChanges'] = [];
  const caseSpec: [string, string, string, number, CaseStatus, Case['priority'], string][] = [
    ['Murder investigation – Turmi market incident', 'cc-hom', 'u-p2', 95, 'In court', 'Urgent', 'Public Prosecutor v. A. Bero'],
    ['Livestock theft – 14 cattle, Dimeka', 'cc-theft', 'u-p2', 72, 'Charge filed', 'High', 'Public Prosecutor v. K. Lale and 2 others'],
    ['Domestic violence complaint – Jinka kebele 02', 'cc-gbv', 'u-p1', 52, 'Under investigation', 'High', 'Public Prosecutor v. T. Mesele'],
    ['Embezzlement of cooperative funds', 'cc-fraud', 'u-p1', 40, 'Under investigation', 'Normal', 'Public Prosecutor v. Cooperative cashier'],
    ['Boundary dispute over farmland – South Ari', 'cc-land', 'u-p1', 30, 'Adjourned', 'Normal', 'Ayele family v. Gebre family'],
    ['Hit-and-run on Jinka–Key Afer road', 'cc-traffic', 'u-p1', 34, 'In court', 'High', 'Public Prosecutor v. Unknown driver'],
    ['Juvenile theft case – Key Afer', 'cc-juv', 'u-p3', 26, 'Registered', 'Normal', 'Public Prosecutor v. Minor (sealed)'],
    ['Assault at Key Afer weekly market', 'cc-gbv', 'u-p3', 40, 'Charge filed', 'Normal', 'Public Prosecutor v. B. Ayke'],
    ['Robbery of mobile money agent', 'cc-theft', 'u-p3', 66, 'Under investigation', 'Urgent', 'Public Prosecutor v. Unknown'],
    ['Forgery of land certificate', 'cc-fraud', 'u-p2', 25, 'Under investigation', 'Normal', 'Public Prosecutor v. M. Dore'],
    ['Motorcycle theft – Jinka Town', 'cc-theft', 'u-p1', 70, 'Closed', 'Normal', 'Public Prosecutor v. S. Haile'],
    ['Traffic collision – Weyto bridge', 'cc-traffic', 'u-p2', 25, 'Registered', 'Normal', 'Public Prosecutor v. Truck driver'],
    ['Child labour exploitation report', 'cc-juv', 'u-p1', 6, 'Under investigation', 'High', 'Public Prosecutor v. Employer'],
    ['Attempted homicide – Omorate', 'cc-hom', 'u-p3', 45, 'Judgment delivered', 'Urgent', 'Public Prosecutor v. L. Nakwa'],
    ['Inheritance property dispute – Male', 'cc-land', 'u-p2', 80, 'In court', 'Normal', 'Ergo family v. Shano family'],
    ['Abduction complaint – Hamer', 'cc-gbv', 'u-p2', 15, 'Under investigation', 'Urgent', 'Public Prosecutor v. Unknown'],
  ];
  const offices: Record<string, string> = { 'u-p1': 'Jinka Town', 'u-p2': 'Hamer', 'u-p3': 'Bena-Tsemay' };
  const cases: Case[] = caseSpec.map(([title, cat, pros, d, status, priority, parties], i) => {
    const openedAt = ago(d, 8);
    const path: CaseStatus[] = status === 'Adjourned'
      ? ['Registered', 'Under investigation', 'Charge filed', 'In court', 'Adjourned']
      : CASE_STATUSES.slice(0, CASE_STATUSES.indexOf(status) + 1).filter(s => s !== 'Adjourned');
    path.forEach((s, k) => statusChanges.push({
      id: `sc-${i}-${k}`, caseId: 'case-' + (i + 1), from: k ? path[k - 1] : null, to: s,
      note: k === 0 ? 'Case registered and assigned.' : ['Investigation file opened with police.', 'Charge prepared and filed with the court.', 'First hearing attended.', 'Hearing adjourned at defence request.', 'Judgment delivered by the woreda court.', 'File closed and archived.'][Math.min(k - 1, 5)],
      by: k === 0 && i % 4 === 0 ? 'u-dir' : pros, at: ago(Math.max(0, d - k * Math.max(1, Math.floor(d / (path.length + 1)))), 10),
    }));
    return {
      id: 'case-' + (i + 1), caseNo: `SOZ/${(i % 3 === 0 ? 'CR' : i % 3 === 1 ? 'PR' : 'GN')}/${String(140 + i).padStart(4, '0')}/${new Date(openedAt).getFullYear()}`,
      title, categoryId: cat, prosecutorId: pros, createdBy: i % 4 === 0 ? 'u-dir' : pros, office: offices[pros], parties,
      description: 'Sample case record for demonstration. Facts summarised for the case register; no real personal data.',
      priority, openedAt, dueAt: addDays(openedAt, sla[cat]), status, closedAt: status === 'Closed' ? ago(5) : undefined, updatedAt: statusChanges[statusChanges.length - 1].at,
    };
  });

  const comments: WSData['comments'] = [
    { id: 'cm-1', caseId: 'case-3', by: 'u-dir', body: 'Please prioritise the medical report and victim protection measures. Update me before the SLA date.', at: ago(10) },
    { id: 'cm-2', caseId: 'case-3', by: 'u-p1', body: 'Medical report requested from Jinka hospital; expected this week.', at: ago(9) },
    { id: 'cm-3', caseId: 'case-9', by: 'u-dir', body: 'This case is overdue. Explain the delay and submit an extension request with justification.', at: ago(3) },
    { id: 'cm-4', caseId: 'case-1', by: 'u-dir', body: 'Good progress. Coordinate witness protection for the next hearing.', at: ago(6) },
    { id: 'cm-5', caseId: 'case-2', by: 'u-dir', body: 'Confirm that seized cattle were returned to owners and documented.', at: ago(4) },
  ];
  const extensions: WSData['extensions'] = [];

  const preports: WSData['preports'] = [];
  const fb: WSData['feedback'] = [];
  const pros = ['u-p1', 'u-p2', 'u-p3'];
  let rn = 0;
  const mk = (p: string, period: 'Daily' | 'Weekly' | 'Monthly', d: number, label: string, reviewed: boolean, feedback?: string) => {
    const id = 'pr-' + (++rn);
    preports.push({
      id, prosecutorId: p, period, periodLabel: label, periodStart: ago(d), newCases: period === 'Daily' ? rn % 3 : period === 'Weekly' ? 3 + (rn % 4) : 9 + (rn % 6),
      closedCases: period === 'Daily' ? rn % 2 : period === 'Weekly' ? 1 + (rn % 3) : 5 + (rn % 4), hearings: period === 'Daily' ? 1 : period === 'Weekly' ? 4 : 14,
      summary: period === 'Daily' ? 'Attended hearings, reviewed police investigation files and met complainants.' : period === 'Weekly' ? 'Filed charges in two cases, attended court sessions and followed up on pending investigations.' : 'Monthly summary of case flow, court outcomes and coordination with police and courts.',
      challenges: ['Delay in forensic/medical reports.', 'Witnesses travelling long distances to court.', 'Limited transport for field visits.'][rn % 3],
      nextPlan: 'Follow up overdue files, prepare charges and attend scheduled hearings.', submittedAt: ago(d, 17), status: reviewed ? 'Reviewed' : 'Submitted',
    });
    if (feedback) fb.push({ id: 'fb-' + rn, reportId: id, by: 'u-dir', body: feedback, at: ago(Math.max(0, d - 1), 11) });
  };
  const fmt = (d: number) => new Date(now - d * DAY).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  pros.forEach((p, i) => {
    [1, 2, 3, 4, 5].forEach(d => { if (!(i === 2 && d === 1)) mk(p, 'Daily', d, fmt(d), d > 2, d === 3 && i === 0 ? 'Well documented. Please attach hearing minutes next time.' : undefined); });
    mk(p, 'Weekly', 3 + i, 'Week ending ' + fmt(3 + i), i !== 1, i === 0 ? 'Good weekly progress. Focus on the overdue GBV file.' : i === 2 ? 'Please include the number of pending investigations.' : undefined);
    mk(p, 'Weekly', 10 + i, 'Week ending ' + fmt(10 + i), true, 'Noted. Keep coordinating with the police.');
    const m = new Date(now); m.setMonth(m.getMonth() - 1);
    mk(p, 'Monthly', 2 + i, m.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), i === 0, i === 0 ? 'Monthly figures received. Clearance rate improved — well done.' : undefined);
  });

  const notifications: WSData['notifications'] = [
    { id: 'n-0', userId: 'u-lib', text: 'Mekdes Alemayehu uploaded a Telebirr receipt for review.', link: '/dashboard/library/approvals', at: ago(1, 10), read: false },
    { id: 'n-1', userId: 'u-lib', text: 'Lidya Haile uploaded a Telebirr receipt for review.', link: '/dashboard/library/approvals', at: ago(2), read: false },
    { id: 'n-2', userId: 'u-lib', text: 'Dr. Yonas Bekele submitted a contribution: “Public Legal Awareness in Pastoralist Communities”.', link: '/dashboard/library/approvals', at: ago(3), read: false },
    { id: 'n-3', userId: 'u-p1', text: 'Director commented on SOZ/PR/0142 (Domestic violence complaint).', link: '/dashboard/cases/case-3', at: ago(10), read: false },
    { id: 'n-4', userId: 'u-p1', text: 'Feedback received on your weekly report.', link: '/dashboard/periodic-reports', at: ago(2), read: false },
    { id: 'n-5', userId: 'u-dir', text: 'Several cases are past their SLA due date and need your review.', link: '/dashboard/cases?filter=overdue', at: ago(1), read: false },
    { id: 'n-6', userId: 'u-dir', text: 'Dawit Alemu submitted a weekly report.', link: '/dashboard/periodic-reports', at: ago(4), read: false },
    { id: 'n-7', userId: 'u-r1', text: 'Your library access payment was approved. Access valid for 12 months.', link: '/dashboard/library', at: ago(88), read: true },
    { id: 'n-8', userId: 'u-r2', text: 'Your receipt was received and is awaiting review by the Library Admin.', link: '/dashboard/library/access', at: ago(2), read: false },
    { id: 'n-9', userId: 'u-super', text: '2 new researcher accounts registered this week.', link: '/dashboard/users', at: ago(1), read: false },
  ];

  const audit: WSData['audit'] = [
    ['u-super', 'Seeded demonstration data', 30], ['u-lib', 'Approved payment TB8K2LQ91X for Dr. Yonas Bekele', 88], ['u-dir', 'Updated SLA for Gender-based violence to 45 days', 60],
    ['u-dir', 'Created case SOZ/CR/0140/… and assigned to Dawit Alemu', 95], ['u-p1', 'Updated status of SOZ/PR/0142 to Under investigation', 40],
    ['u-r2', 'Submitted Telebirr receipt TB9P4MZ27Q', 2], ['u-r1', 'Submitted contribution “Public Legal Awareness in Pastoralist Communities”', 3], ['u-dir', 'Gave feedback on weekly report of Hana Girma', 2],
  ].map(([by, action, d], i) => ({ id: 'a-' + i, by: by as string, action: action as string, at: ago(d as number, 12) })).sort((a, b) => b.at.localeCompare(a.at));

  return {
    version: SEED_VERSION, roles, users, categories, docs, payments, caseCategories, cases, statusChanges, comments, extensions,
    preports, feedback: fb, notifications, audit,
    settings: { libraryFee: 200, telebirrCode: '5 1 7 6 2 0', telebirrName: 'South Omo Zone Justice Department', accessDays: 365, dueSoonDays: 7, orgName: 'South Omo Zone Justice Department' },
  };
}
