import {
  Report,
  BacktestQuarter,
  StressTestResult,
  ThesisSnapshot,
} from '../types';

const DB_KEY = 'strucdna_reports';
const PULSE_KEY = 'strucdna_pulses';
const BACKTEST_KEY = 'strucdna_backtests';
const STRESS_KEY = 'strucdna_stresstests';
const SNAPSHOT_KEY = 'strucdna_snapshots';

export const saveReport = (report: Report) => {
  const existing = getReports();
  // We allow multiple reports for same ticker if they are from different users or expired
  // But usually we just push to the list.
  // For the demo simple logic: Remove previous reports for THIS user and THIS ticker to avoid clutter
  const filtered = existing.filter(
    (r) => !(r.ticker === report.ticker && r.user_id === report.user_id),
  );
  const updated = [report, ...filtered];
  localStorage.setItem(DB_KEY, JSON.stringify(updated));

  // Feature 7: Auto-save snapshot if locked thesis exists
  const lockedThesis = getTheses().find(
    (t) => t.ticker === report.ticker && t.user_id === report.user_id,
  );
  if (lockedThesis) {
    saveThesisSnapshot(report);
  }
};

export const getReports = (): Report[] => {
  const raw = localStorage.getItem(DB_KEY);
  return raw ? JSON.parse(raw) : [];
};

export const getReportByTicker = (ticker: string): Report | undefined => {
  const reports = getReports();
  // Basic fallback
  return reports.find((r) => r.ticker.toUpperCase() === ticker.toUpperCase());
};

export const getCachedReport = (ticker: string): Report | undefined => {
  const user = getUser();
  const reports = getReports();
  const now = new Date();
  const upperTicker = ticker.toUpperCase().trim();

  // Find reports matching ticker, current user, and not expired
  const valid = reports.filter(
    (r) =>
      r.ticker === upperTicker &&
      r.user_id === user.id &&
      r.cache_expires_at &&
      new Date(r.cache_expires_at) > now,
  );

  // Return the newest one
  valid.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return valid[0];
};

export const getReportById = (id: string): Report | undefined => {
  const reports = getReports();
  return reports.find((r) => r.id === id);
};

export const saveThesisLock = (
  reportId: string,
  data: {
    thesis_for: string;
    thesis_risk_accepted: string;
    thesis_exit_condition: string;
    scores_at_lock: any;
    exit_is_structural?: boolean;
  },
) => {
  const reports = getReports();
  const index = reports.findIndex((r) => r.id === reportId);
  if (index !== -1) {
    reports[index] = {
      ...reports[index],
      ...data,
      thesis_locked_at: new Date().toISOString(),
      thesis_status: 'HOLDING',
      thesis_last_checked: new Date().toISOString(),
    };
    localStorage.setItem(DB_KEY, JSON.stringify(reports));
  }
};

export const updateThesisStatus = (
  reportId: string,
  status: 'HOLDING' | 'WATCH' | 'BROKEN',
  summary?: string,
) => {
  const reports = getReports();
  const index = reports.findIndex((r) => r.id === reportId);
  if (index !== -1) {
    reports[index] = {
      ...reports[index],
      thesis_status: status,
      thesis_last_checked: new Date().toISOString(),
    };
    // Store the check summary in the report for the banner
    (reports[index] as any).last_check_summary = summary;

    localStorage.setItem(DB_KEY, JSON.stringify(reports));
  }
};

export const getTheses = (): Report[] => {
  return getReports().filter((r) => !!r.thesis_locked_at);
};

// --- Pulse & Track Record ---

export const getThesesDueForPulse = (minHours: number = 24): Report[] => {
  const reports = getTheses();
  const now = new Date();
  return reports.filter((r) => {
    if (!r.thesis_last_checked) return true;
    const last = new Date(r.thesis_last_checked);
    const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
    return diffHours >= minHours;
  });
};

export const saveThesisPulse = (pulseData: any) => {
  const raw = localStorage.getItem(PULSE_KEY);
  const pulses = raw ? JSON.parse(raw) : [];
  pulses.push({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...pulseData,
  });
  localStorage.setItem(PULSE_KEY, JSON.stringify(pulses));
};

export const getTrackRecord = () => {
  const theses = getTheses();
  const broken = theses.filter((t) => t.thesis_status === 'BROKEN').length;
  const watch = theses.filter((t) => t.thesis_status === 'WATCH').length;
  const holding = theses.filter((t) => t.thesis_status === 'HOLDING').length;

  // Mock avg days to break calculation
  const avgDays = broken > 0 ? 42 : 0;

  return {
    total: theses.length,
    broken,
    watch,
    holding,
    avgDays,
  };
};

// --- Management Backtest ---

export const upsertBacktestQuarter = (data: BacktestQuarter) => {
  const raw = localStorage.getItem(BACKTEST_KEY);
  let all: BacktestQuarter[] = raw ? JSON.parse(raw) : [];

  // Remove existing entry for same ticker + quarter
  all = all.filter(
    (q) => !(q.ticker === data.ticker && q.quarter === data.quarter),
  );

  all.push(data);
  localStorage.setItem(BACKTEST_KEY, JSON.stringify(all));
};

export const getManagementBacktest = (ticker: string): BacktestQuarter[] => {
  const raw = localStorage.getItem(BACKTEST_KEY);
  const all: BacktestQuarter[] = raw ? JSON.parse(raw) : [];
  return all.filter((q) => q.ticker === ticker); // Sort order should be handled by caller or here
};

// --- Stress Tests ---

export const saveStressTest = (result: StressTestResult) => {
  const raw = localStorage.getItem(STRESS_KEY);
  let all: StressTestResult[] = raw ? JSON.parse(raw) : [];

  // Upsert
  all = all.filter((s) => s.report_id !== result.report_id);
  all.push(result);

  localStorage.setItem(STRESS_KEY, JSON.stringify(all));
};

export const getStressTest = (
  reportId: string,
): StressTestResult | undefined => {
  const raw = localStorage.getItem(STRESS_KEY);
  const all: StressTestResult[] = raw ? JSON.parse(raw) : [];
  return all.find((s) => s.report_id === reportId);
};

// --- Snapshots ---

export const saveThesisSnapshot = (report: Report) => {
  // Determine top risk (simplistic extraction for demo)
  // Extract "Rank 1 — [RISK NAME]" from markdown
  const riskMatch = report.markdown.match(/### Rank 1 — (.*?)\n/);
  const topRisk = riskMatch ? riskMatch[1].trim() : 'Unknown Risk';

  const snapshot: ThesisSnapshot = {
    report_id: report.id,
    lead_id: report.user_id || 'unknown',
    ticker: report.ticker,
    date: new Date().toISOString(),
    integrity_score: report.scores.integrity_score,
    classification: report.classification,
    top_risk: topRisk,
  };

  const raw = localStorage.getItem(SNAPSHOT_KEY);
  const all: ThesisSnapshot[] = raw ? JSON.parse(raw) : [];
  all.push(snapshot);
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(all));
};

export const getThesisSnapshots = (ticker: string): ThesisSnapshot[] => {
  const raw = localStorage.getItem(SNAPSHOT_KEY);
  const all: ThesisSnapshot[] = raw ? JSON.parse(raw) : [];
  // Filter by ticker and current user
  const user = getUser();
  return all
    .filter((s) => s.ticker === ticker && s.lead_id === user.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// --- Sharing ---

export const generateShareToken = (reportId: string): string => {
  const token = Math.random().toString(36).substring(2, 15);
  const reports = getReports();
  const idx = reports.findIndex((r) => r.id === reportId);
  if (idx !== -1) {
    reports[idx].share_token = token;
    reports[idx].is_shared = true;
    localStorage.setItem(DB_KEY, JSON.stringify(reports));
  }
  return token;
};

export const getReportByShareToken = (token: string): Report | undefined => {
  const reports = getReports();
  return reports.find((r) => r.share_token === token && r.is_shared);
};

// --- Subscription / User Mocking ---

export const getUser = () => {
  // Mock user data for the frontend demo
  return {
    id: 'usr_demo_001',
    email: 'investor@strucdna.com',
    tier: 'paid', // 'paid' or 'free'
    subscription_status: 'active', // 'active', 'past_due', 'canceled'
    created_at: '2026-02-22T10:00:00Z',
    stripe_customer_id: 'cus_demo123456',
  };
};

export const createBillingPortalSession = async (
  customerId: string,
): Promise<string> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (!customerId) {
    throw new Error('No billing account found. Contact support.');
  }

  // In a real application, this would call your backend API which interacts with Stripe.
  // We return a generic Stripe login URL for the demo.
  return 'https://billing.stripe.com/p/login/demo';
};

// Placeholder for backend logic mentioned in prompt
export const downgradeToFree = async (email: string) => {
  console.log(`[Mock DB] Downgrading ${email} to free tier.`);
};

export const setSubscriptionStatus = async (email: string, status: string) => {
  console.log(`[Mock DB] Setting status for ${email} to ${status}.`);
};
