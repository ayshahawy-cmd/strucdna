import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LensType, Report } from '../types';
import { runScout, runAnalyst } from '../services/aiService';
import { getCachedReport, saveReport, getUser } from '../services/dbService';
import SearchBar from '../components/SearchBar';
import LensTabs from '../components/LensTabs';
import ReportRender from '../components/ReportRender';
import FollowUpPanel from '../components/FollowUpPanel';
import toast from 'react-hot-toast';
import { Loader2, AlertCircle } from 'lucide-react';

const ReportPage: React.FC = () => {
  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [activeLens, setActiveLens] = useState<LensType>(LensType.FULL);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    if (!ticker) return;
    loadReport(ticker);
  }, [ticker]);

  const loadReport = async (t: string) => {
    setError(null);
    setReport(null);
    setIsCached(false);

    // 1. Check Cache (24h per user per ticker)
    const normalizedTicker = t.toUpperCase().trim();
    const cached = getCachedReport(normalizedTicker);

    if (cached) {
      console.log(
        `[Cache Hit] Returning cached report for ${normalizedTicker}`,
      );
      setReport(cached);
      setIsCached(true);
      // Ensure UI state matches
      setActiveLens(LensType.FULL);
      return;
    }

    console.log(`[Cache Miss] Generating new report for ${normalizedTicker}`);

    // 2. Start Generation Pipeline
    try {
      setActiveLens(LensType.FULL); // Only reset lens if starting new generation
      setLoadingStep('Scout: Preparing a model-generated evidence bundle...');
      const bundle = await runScout(normalizedTicker);

      setLoadingStep('Analyst: Synthesizing structural report...');
      const { markdown, scores, classification } = await runAnalyst(bundle);

      const now = new Date();
      // Cache for 24 hours
      const expiresAt = new Date(
        now.getTime() + 24 * 60 * 60 * 1000,
      ).toISOString();
      const user = getUser();

      const newReport: Report = {
        id: crypto.randomUUID(),
        ticker: normalizedTicker,
        created_at: now.toISOString(),
        bundle,
        markdown,
        scores,
        classification,
        evidence_window:
          bundle.evidence_window || 'Model knowledge (unverified)',
        user_id: user.id,
        cache_expires_at: expiresAt,
      };

      saveReport(newReport);
      setReport(newReport);
      setLoadingStep(null);
    } catch (e: any) {
      console.error('Full pipeline error:', e);
      setError(e.message || 'Failed to generate report');
      setLoadingStep(null);
      toast.error('Analysis failed. Please check console for details.');
    }
  };

  const handleRefresh = () => {
    if (ticker) {
      // Just reload the data from DB/Cache
      const cached = getCachedReport(ticker);
      if (cached) {
        setReport(cached);
        setIsCached(true);
      }
    }
  };

  const handleNewSearch = (t: string) => {
    setActiveLens(LensType.FULL);
    navigate(`/report/${t}`);
  };

  if (loadingStep) {
    return (
      <div className="flex-1 flex flex-col">
        <SearchBar
          onSearch={handleNewSearch}
          isLoading={true}
          variant="persistent"
          initialValue={ticker}
        />
        <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-in fade-in duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full animate-pulse"></div>
            <Loader2 className="w-12 h-12 text-accent animate-spin relative z-10" />
          </div>
          <div className="text-center space-y-3 max-w-md px-4">
            <h2 className="text-xl font-medium text-text">{loadingStep}</h2>
            <p className="text-sm text-muted leading-relaxed">
              Generating a prototype report from model knowledge. Live public
              records are not retrieved; verify all claims and citations.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col">
        <SearchBar
          onSearch={handleNewSearch}
          variant="persistent"
          initialValue={ticker}
        />
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
          <div className="bg-critical/10 p-4 rounded-full">
            <AlertCircle className="w-12 h-12 text-critical" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-text">Analysis Failed</h2>
            <p className="text-muted max-w-md">{error}</p>
          </div>
          <button
            onClick={() => ticker && loadReport(ticker)}
            className="px-6 py-2.5 bg-surface-2 border border-border rounded-lg hover:bg-surface-3 hover:border-accent transition-all font-medium flex items-center gap-2"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="flex-1 flex flex-col">
      <SearchBar
        onSearch={handleNewSearch}
        variant="persistent"
        initialValue={report.ticker}
      />
      <LensTabs activeLens={activeLens} onChange={setActiveLens} />

      <div className="flex-1 bg-bg relative">
        <ReportRender
          report={report}
          activeLens={activeLens}
          onRefresh={handleRefresh}
          isCached={isCached}
        />
      </div>

      <FollowUpPanel bundle={report.bundle} />
    </div>
  );
};

export default ReportPage;
