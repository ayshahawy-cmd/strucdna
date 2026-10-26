/** Parse explicit thesis status without turning missing data into a success. */
export function parseThesisCheck(markdown) {
  const match = markdown.match(/<!--\s*THESIS_CHECK([\s\S]*?)-->/);
  if (!match)
    throw new Error(
      'Thesis check returned no status; keeping the previous status.',
    );

  const block = match[1];
  const status = block.match(/^\s*status:\s*(HOLDING|WATCH|BROKEN)\s*$/im);
  if (!status) throw new Error('Thesis check returned an invalid status.');
  const bracketedSummary = block.match(/summary:\s*\[([\s\S]*?)\]/);
  const summaryLine = block.match(/summary:[ \t]*(.*)/);

  return {
    status: status[1].toUpperCase(),
    summary: (
      bracketedSummary?.[1] ??
      summaryLine?.[1] ??
      'No summary provided.'
    ).trim(),
  };
}
