import {
  getThesesDueForPulse,
  updateThesisStatus,
  saveThesisPulse,
} from './dbService';
import { runScout, runAnalyst } from './aiService';
import { Report } from '../types';

import { parseThesisCheck } from './thesisCheck.mjs';

export const runPulseCheck = async (user: any) => {
  if (user.tier !== 'paid') return;

  // Use a timeout to not block the main thread immediately
  setTimeout(async () => {
    try {
      console.log('[Pulse] Starting background check...');
      const dueTheses = getThesesDueForPulse(24); // Check every 24 hours

      if (dueTheses.length === 0) {
        console.log('[Pulse] No theses due for check.');
        return;
      }

      console.log(`[Pulse] Checking ${dueTheses.length} theses...`);

      for (const thesis of dueTheses) {
        await checkOneThesis(thesis, user);
      }
    } catch (e) {
      console.error('[Pulse] Error in background loop', e);
    }
  }, 2000);
};

const checkOneThesis = async (thesis: Report, user: any) => {
  try {
    console.log(`[Pulse] Checking ${thesis.ticker}...`);

    // 1. Force fresh bundle (simulate or real)
    const bundle = await runScout(thesis.ticker);

    // 2. Compare the new bundle with the locked thesis.

    const thesisContext = {
      thesis_for: thesis.thesis_for,
      thesis_risk_accepted: thesis.thesis_risk_accepted,
      thesis_exit_condition: thesis.thesis_exit_condition,
      scores_at_lock: thesis.scores_at_lock,
    };

    const { markdown: result } = await runAnalyst(
      bundle,
      'MODE_3',
      thesisContext,
    );

    const check = parseThesisCheck(result);

    // 3. Update DB
    updateThesisStatus(
      thesis.id,
      check.status as NonNullable<Report['thesis_status']>,
      check.summary,
    );

    saveThesisPulse({
      lead_id: user.id,
      report_id: thesis.id,
      ticker: thesis.ticker,
      prior_status: thesis.thesis_status,
      new_status: check.status,
      status_changed: thesis.thesis_status !== check.status,
      summary: check.summary,
    });

    console.log(`[Pulse] Finished ${thesis.ticker}: ${check.status}`);
  } catch (e) {
    console.error(`[Pulse] Failed to check ${thesis.ticker}`, e);
  }
};
