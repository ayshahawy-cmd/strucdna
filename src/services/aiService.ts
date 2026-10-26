import { SCOUT_PROMPT, ANALYST_PROMPT } from '../constants';
import { EvidenceBundle, ReportScores } from '../types';

interface AIRequest {
  max_tokens: number;
  messages: { role: 'user' | 'assistant'; content: string }[];
}

const requestAI = async (
  agent: 'A' | 'B',
  request: AIRequest,
): Promise<string> => {
  const response = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent, ...request }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'AI request failed.');
  if (typeof result.text !== 'string') throw new Error('Invalid AI response.');
  return result.text;
};

// Helper to extract JSON from markdown/text
const extractJSON = (text: string): any => {
  try {
    return JSON.parse(text);
  } catch (e) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      const jsonStr = text.substring(start, end + 1);
      try {
        return JSON.parse(jsonStr);
      } catch (innerE) {
        console.error('Failed to parse extracted JSON string:', jsonStr);
        throw new Error('Invalid JSON format in response');
      }
    }
    throw new Error('No JSON object found in response');
  }
};

const stripMachineBlocks = (markdown: string): string => {
  let cleaned = markdown;
  cleaned = cleaned.replace(/<!--\s*SCORES[\s\S]*?-->/g, '');
  cleaned = cleaned.replace(/<!--\s*MODULE_DATA[\s\S]*?-->/g, '');
  cleaned = cleaned.replace(/<!--\s*THESIS_CHECK[\s\S]*?-->/g, '');
  cleaned = cleaned.replace(/<!--\s*BLUE_OCEAN[\s\S]*?-->/g, ''); // Ensure blue ocean block stripped
  cleaned = cleaned.replace(/═+/g, '');
  cleaned = cleaned.replace(/(MODULE [A-D] —[^\n]*)\n/gi, '');
  cleaned = cleaned.replace(/════+[\s\S]*?════+/g, '');
  return cleaned.trim();
};

export const runScout = async (ticker: string): Promise<EvidenceBundle> => {
  const agent = 'A';

  const prompt = `
    Analyze the company with ticker: ${ticker}.
    ${SCOUT_PROMPT}

    IMPORTANT: You do not have access to live tools in this environment.
    Simulate the extraction of this data based on your internal knowledge cutoff.
    Ensure the output is valid JSON strictly following the schema.
  `;

  console.log(
    `[Scout] Starting extraction for ${ticker} with agent ${agent}...`,
  );

  try {
    const text = await requestAI(agent, {
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    if (!text) throw new Error('Empty response from Scout');

    console.log('[Scout] Raw response received.');
    const bundle = extractJSON(text) as EvidenceBundle;

    if (!bundle.ticker) bundle.ticker = ticker;
    if (!bundle.sources) bundle.sources = [];

    return bundle;
  } catch (error: any) {
    console.error('[Scout] Error:', error);
    throw new Error(`Scout failed: ${error.message}`);
  }
};

export const runAnalyst = async (
  bundle: EvidenceBundle,
  mode: 'MODE_1' | 'MODE_3' = 'MODE_1',
  extraContext?: any,
): Promise<{
  markdown: string;
  scores: ReportScores;
  classification: string;
}> => {
  const agent = 'B';

  let instruction = '';
  if (mode === 'MODE_1') {
    instruction = `
        EXECUTE MODE 1 — FULL REPORT.
        Here is the evidence bundle:
        ${JSON.stringify(bundle)}
      `;
  } else if (mode === 'MODE_3') {
    instruction = `
        EXECUTE MODE 3 — THESIS CHECK.

        Here is the evidence bundle:
        ${JSON.stringify(bundle)}

        Here is the LOCKED THESIS CONTEXT:
        ${JSON.stringify(extraContext)}
      `;
  }

  const prompt = `
    ${ANALYST_PROMPT}
    ${instruction}
  `;

  console.log(
    `[Analyst] Starting synthesis for ${bundle.ticker} (Mode: ${mode}) with agent ${agent}...`,
  );

  try {
    const text = await requestAI(agent, {
      max_tokens: 8192, // High limit for full report
      messages: [{ role: 'user', content: prompt }],
    });

    const markdown = text;
    if (!markdown) throw new Error('Empty response from Analyst');

    console.log('[Analyst] Synthesis complete.');

    const scores = parseScores(markdown);
    const classification = scores.classification;
    const cleanMarkdown = stripMachineBlocks(markdown);

    return {
      markdown: mode === 'MODE_3' ? markdown : cleanMarkdown,
      scores: {
        credibility_score: scores.credibility_score || 0,
        fragility_score: scores.fragility_score || 0,
        integrity_score: scores.integrity_score || 0,
        moat_score: scores.moat_score || 0,
        business_model_score: scores.business_model_score || 0,
      },
      classification: classification || 'UNKNOWN',
    };
  } catch (error: any) {
    console.error('[Analyst] Error:', error);
    throw new Error(`Analyst failed: ${error.message}`);
  }
};

export const runMoatStressTest = async (
  bundle: EvidenceBundle,
): Promise<string> => {
  const agent = 'B';
  const prompt = `
        ${ANALYST_PROMPT}

        EXECUTE MODE 2 — CHAT FOLLOW-UP (STRESS TEST SPECIAL).

        Bundle: ${JSON.stringify(bundle)}

        User Question: What is the single most credible scenario in which this moat collapses within 36 months? Name the exact mechanism, the trigger event, and which revenue line breaks first. Use bundle evidence only.
    `;

  try {
    const text = await requestAI(agent, {
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });
    return text || 'Could not generate stress test.';
  } catch (e) {
    throw new Error('Failed to run stress test');
  }
};

export const runAnalystChecklist = async (
  bundle: EvidenceBundle,
  message: string,
  history: any[],
) => {
  const agent = 'B';

  const prompt = `
      ${ANALYST_PROMPT}

      EXECUTE MODE 2 — CHAT FOLLOW-UP.

      Bundle: ${JSON.stringify(bundle)}

      User Question: ${message}

      Previous Context (last 3): ${JSON.stringify(history.slice(-3))}
    `;

  try {
    const text = await requestAI(agent, {
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });
    return text;
  } catch (e) {
    console.error(e);
    return 'Not in bundle.';
  }
};

function parseScores(markdown: string): any {
  const match = markdown.match(/<!-- SCORES([\s\S]*?)-->/);
  if (!match) {
    console.warn('Could not find SCORES block in markdown response.');
    return { classification: 'PENDING' };
  }

  const block = match[1];
  const result: any = {};

  block.split('\n').forEach((line) => {
    const [key, value] = line.split(':').map((s) => s.trim());
    if (key && value) {
      if (key === 'classification') {
        result[key] = value;
      } else {
        result[key] = parseInt(value, 10);
      }
    }
  });

  return result;
}
