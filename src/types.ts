export interface Report {
  id: string;
  ticker: string;
  created_at: string;
  bundle: EvidenceBundle;
  markdown: string;
  scores: ReportScores;
  classification: string;
  evidence_window: string;
  // Thesis Lock Fields
  thesis_for?: string;
  thesis_risk_accepted?: string;
  thesis_exit_condition?: string;
  thesis_locked_at?: string;
  thesis_status?: 'HOLDING' | 'WATCH' | 'BROKEN';
  thesis_last_checked?: string;
  scores_at_lock?: ReportScores;
  // Caching Fields
  user_id?: string;
  cache_expires_at?: string;
  // New Features
  exit_is_structural?: boolean;
  share_token?: string;
  is_shared?: boolean;
  // Parsed Blue Ocean Data
  blue_ocean_data?: BlueOceanData;
}

export interface BlueOceanData {
  spectrum_pct: number;
  market_space: 'CONTESTED' | 'PARTIALLY_UNCONTESTED' | 'UNCONTESTED';
  competitive_intensity: 'HIGH' | 'MODERATE' | 'LOW';
  value_innovation: 'PRESENT' | 'PARTIAL' | 'ABSENT';
  non_consumption: 'HIGH' | 'MODERATE' | 'LOW';
  verdict: string;
}

export interface ReportScores {
  credibility_score: number;
  fragility_score: number;
  integrity_score: number;
  moat_score: number;
  business_model_score: number;
}

// PRD defined JSON Bundle Structure
export interface EvidenceBundle {
  ticker: string;
  extracted_at: string;
  evidence_window: string;
  business_basics: {
    description: string | null;
    who_pays: string | null;
    gross_margin_pct: number | null;
    operating_margin_ttm: number | null;
  };
  sources: Source[];
  // Simplified for this demo/MVP, full structure is extensive
  risk_factors: string[];
  key_metrics: Record<string, any>;
}

export interface Source {
  url: string;
  title: string | null;
  source_type: string;
  published_date: string | null;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  type?: 'text' | 'tool_response';
  metadata?: any;
}

export enum LensType {
  FULL = 'Full Report',
  RISKS = 'Risks',
  MOAT = 'Moat',
  MANAGEMENT = 'Management',
  CHECKLIST = 'Checklist',
}

export interface BacktestQuarter {
  ticker: string;
  quarter: string;
  revenue_guided_low?: number;
  revenue_guided_high?: number;
  revenue_actual?: number;
  beat_miss: 'BEAT' | 'MISS' | 'INLINE' | 'UNKNOWN';
  beat_margin_pct: number;
  guidance_tone: string;
  management_quote: string;
}

export interface StressTestResult {
  report_id: string;
  ticker: string;
  answer: string;
  created_at: string;
}

export interface ThesisSnapshot {
  report_id: string; // The specific report ID this snapshot was taken from
  lead_id: string;
  ticker: string;
  date: string;
  integrity_score: number;
  classification: string;
  top_risk: string;
}
