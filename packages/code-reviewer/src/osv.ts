export interface OsvVulnerability {
  id: string;
  summary: string;
  severity: string;
}

/** Queries the OSV.dev API for known CVEs affecting an npm package. */
export async function fetchCVEs(packageName: string): Promise<OsvVulnerability[]> {
  try {
    const body = JSON.stringify({
      package: { name: packageName, ecosystem: 'npm' },
    });
    const res = await fetch('https://api.osv.dev/v1/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];

    const data = await res.json() as { vulns?: Array<{ id: string; summary?: string; database_specific?: { severity?: string } }> };
    if (!Array.isArray(data.vulns)) return [];

    return data.vulns.slice(0, 5).map((v) => ({
      id: v.id,
      summary: v.summary ?? '',
      severity: v.database_specific?.severity ?? 'unknown',
    }));
  } catch {
    return [];
  }
}
