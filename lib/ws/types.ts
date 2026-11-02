export type Permission =
  | 'users.manage' | 'roles.manage' | 'settings.manage' | 'audit.view'
  | 'library.view' | 'library.manage' | 'library.approve' | 'library.contribute'
  | 'cases.create' | 'cases.viewAll' | 'cases.viewOwn' | 'cases.update' | 'cases.comment' | 'cases.extend' | 'sla.manage'
  | 'preports.submit' | 'preports.review'
  | 'cms.access'
  | 'reports.system' | 'reports.library' | 'reports.cases' | 'reports.own';

export type Role = { id: string; name: string; description: string; permissions: Permission[]; system?: boolean };

export type UserStatus = 'active' | 'inactive';
export type User = {
  id: string; name: string; email: string; password: string; phone: string; roleId: string;
  office: string; status: UserStatus; createdAt: string; institution?: string; purpose?: string; lastLogin?: string;
};

export type LibCategory = { id: string; name: string; parentId: string | null; description: string };
export type DocType = 'pdf' | 'word' | 'video';
export type LibDoc = {
  id: string; title: string; description: string; categoryId: string; type: DocType; url: string; fileName: string;
  size: number; visibility: 'public' | 'researchers'; status: 'published' | 'pending' | 'rejected';
  uploadedBy: string; source: 'admin' | 'researcher'; author: string; year: string; reviewNote?: string;
  reviewedBy?: string; createdAt: string; publishedAt?: string; views: number; downloads: number;
};

export type Payment = {
  id: string; userId: string; amount: number; txnId: string; receiptUrl: string; receiptName: string; paidOn: string;
  status: 'pending' | 'approved' | 'rejected'; note?: string; createdAt: string; reviewedBy?: string; reviewedAt?: string; expiresAt?: string;
};

export type CaseCategory = { id: string; name: string; slaDays: number; updatedAt: string; updatedBy: string };
export type CaseStatus = 'Registered' | 'Under investigation' | 'Charge filed' | 'In court' | 'Adjourned' | 'Judgment delivered' | 'Closed';
export type Case = {
  id: string; caseNo: string; title: string; categoryId: string; prosecutorId: string; createdBy: string; office: string;
  parties: string; description: string; priority: 'Normal' | 'High' | 'Urgent'; openedAt: string; dueAt: string;
  status: CaseStatus; closedAt?: string; updatedAt: string;
};
export type StatusChange = { id: string; caseId: string; from: CaseStatus | null; to: CaseStatus; note: string; by: string; at: string };
export type CaseComment = { id: string; caseId: string; by: string; body: string; at: string };
export type Extension = { id: string; caseId: string; by: string; days: number; reason: string; at: string; oldDue: string; newDue: string };

export type Period = 'Daily' | 'Weekly' | 'Monthly';
export type PReport = {
  id: string; prosecutorId: string; period: Period; periodLabel: string; periodStart: string; newCases: number; closedCases: number;
  hearings: number; summary: string; challenges: string; nextPlan: string; submittedAt: string; status: 'Submitted' | 'Reviewed';
};
export type Feedback = { id: string; reportId: string; by: string; body: string; at: string };

export type Notification = { id: string; userId: string; text: string; link: string; at: string; read: boolean };
export type Audit = { id: string; by: string; action: string; at: string };
export type Settings = { libraryFee: number; telebirrCode: string; telebirrName: string; accessDays: number; dueSoonDays: number; orgName: string };

export type WSData = {
  version: number; roles: Role[]; users: User[]; categories: LibCategory[]; docs: LibDoc[]; payments: Payment[];
  caseCategories: CaseCategory[]; cases: Case[]; statusChanges: StatusChange[]; comments: CaseComment[]; extensions: Extension[];
  preports: PReport[]; feedback: Feedback[]; notifications: Notification[]; audit: Audit[]; settings: Settings;
};

export const CASE_STATUSES: CaseStatus[] = ['Registered', 'Under investigation', 'Charge filed', 'In court', 'Adjourned', 'Judgment delivered', 'Closed'];
export const OFFICES = ['Zone office (Jinka)', 'Jinka Town', 'South Ari', 'North Ari', 'Bena-Tsemay', 'Hamer', 'Male', 'Dasenech', 'Nyangatom', 'Selamago'];

export const PERMISSIONS: { key: Permission; label: string; group: string }[] = [
  { key: 'users.manage', label: 'Create & manage users', group: 'Administration' },
  { key: 'roles.manage', label: 'Manage roles & permissions', group: 'Administration' },
  { key: 'settings.manage', label: 'System settings', group: 'Administration' },
  { key: 'audit.view', label: 'View audit log', group: 'Administration' },
  { key: 'cms.access', label: 'Website content & complaints', group: 'Administration' },
  { key: 'library.view', label: 'Access full digital library', group: 'Digital library' },
  { key: 'library.manage', label: 'Upload & organize documents', group: 'Digital library' },
  { key: 'library.approve', label: 'Approve payments & contributions', group: 'Digital library' },
  { key: 'library.contribute', label: 'Contribute documents', group: 'Digital library' },
  { key: 'cases.create', label: 'Create cases', group: 'Prosecution' },
  { key: 'cases.viewAll', label: 'View all cases', group: 'Prosecution' },
  { key: 'cases.viewOwn', label: 'View own cases', group: 'Prosecution' },
  { key: 'cases.update', label: 'Update case status', group: 'Prosecution' },
  { key: 'cases.comment', label: 'Comment on cases', group: 'Prosecution' },
  { key: 'cases.extend', label: 'Extend overdue SLA', group: 'Prosecution' },
  { key: 'sla.manage', label: 'Set SLA per case category', group: 'Prosecution' },
  { key: 'preports.submit', label: 'Submit daily/weekly/monthly reports', group: 'Prosecution' },
  { key: 'preports.review', label: 'Review reports & give feedback', group: 'Prosecution' },
  { key: 'reports.system', label: 'System & user reports', group: 'Reports & export' },
  { key: 'reports.library', label: 'Library reports', group: 'Reports & export' },
  { key: 'reports.cases', label: 'Case & SLA reports', group: 'Reports & export' },
  { key: 'reports.own', label: 'My own activity reports', group: 'Reports & export' },
];
