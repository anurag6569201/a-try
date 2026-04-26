import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, getToken } from '../lib/api.js';
import type { Run } from '../types/index.js';

const ACTIVE_STATES = new Set([
  'queued', 'waiting_for_preview', 'planning', 'running', 'analyzing', 'reporting',
]);

export function useRunStream(iid: string, rid: string, runId: string, runState: string) {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!ACTIVE_STATES.has(runState)) return;

    const token = getToken();
    const base = api.streamRunUrl(iid, rid, runId);
    const url = token ? `${base}?token=${encodeURIComponent(token)}` : base;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('run', (e) => {
      try {
        const run = JSON.parse((e as MessageEvent<string>).data) as Run;
        queryClient.setQueryData(['run', iid, rid, runId], run);
      } catch { /* ignore parse errors */ }
    });

    es.addEventListener('done', () => {
      es.close();
      // Refetch once after terminal state to get final data
      void queryClient.invalidateQueries({ queryKey: ['run', iid, rid, runId] });
      void queryClient.invalidateQueries({ queryKey: ['runs', iid, rid] });
    });

    es.addEventListener('error', () => {
      es.close();
    });

    return () => { es.close(); };
  }, [iid, rid, runId, runState, queryClient]);
}
