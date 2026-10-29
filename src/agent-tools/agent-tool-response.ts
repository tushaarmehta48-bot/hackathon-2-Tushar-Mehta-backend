export function agentToolResult(summary: string, data?: Record<string, unknown>) {
  return {
    result: summary,
    ...(data ? { data } : {}),
  };
}

export function formatInrMinor(minor: number): string {
  return `₹${(minor / 100).toFixed(2)}`;
}
