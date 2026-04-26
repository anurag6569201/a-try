import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, ChevronDown, ChevronRight, FileCode2, Bot } from 'lucide-react';
import { api } from '../../lib/api.js';
import {
  REVIEW_SCORE_META, REVIEW_SEVERITY_META, REVIEW_AGENT_META,
  type ReviewFinding, type ReviewAgent, type ReviewSeverity,
} from '../../types/index.js';
import { Badge } from './Badge.js';
import { Card, CardHeader, CardBody } from './Card.js';
import { EmptyState } from './EmptyState.js';

interface Props {
  installationId: string;
  repoId: string;
  pullRequestId: string;
}

export function CodeReviewPanel({ installationId, repoId, pullRequestId }: Props) {
  const { data: review, isLoading } = useQuery({
    queryKey: ['review', pullRequestId],
    queryFn: () => api.review.getByPR(installationId, repoId, pullRequestId),
    staleTime: 60_000,
  });

  const { data: findings } = useQuery({
    queryKey: ['review-findings', review?.id],
    queryFn: () => api.review.findings(review!.id),
    enabled: !!review?.id,
    staleTime: 60_000,
  });

  if (isLoading) return null;
  if (!review) return null;

  const scoreMeta = REVIEW_SCORE_META[review.score];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-purple-500" />
            <h2 className="text-sm font-semibold text-gray-900">AI Code Review</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{scoreMeta.icon}</span>
            <Badge className={scoreMeta.color}>{scoreMeta.label}</Badge>
            <Badge className="bg-gray-100 text-gray-500">{review.agents_run} agents</Badge>
            <Badge className="bg-gray-100 text-gray-500">{review.findings_count} findings</Badge>
          </div>
        </div>
      </CardHeader>

      {!findings || findings.length === 0 ? (
        <CardBody>
          <EmptyState icon={<ShieldCheck className="w-8 h-8 text-green-400" />} title="No findings — code looks good" />
        </CardBody>
      ) : (
        <FindingsList findings={findings} />
      )}
    </Card>
  );
}

function FindingsList({ findings }: { findings: ReviewFinding[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const s = new Set(prev);
      if (s.has(id)) { s.delete(id); } else { s.add(id); }
      return s;
    });

  const byAgent = groupBy(findings ?? [], (f) => f.agent);
  const agentOrder: ReviewAgent[] = ['security', 'logic', 'type_safety', 'performance', 'test_coverage', 'architecture', 'documentation'];

  return (
    <div className="divide-y divide-gray-50">
      {agentOrder.map((agent) => {
        const agentFindings = byAgent[agent];
        if (!agentFindings || agentFindings.length === 0) return null;
        const meta = REVIEW_AGENT_META[agent];
        return (
          <div key={agent} className="px-6 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={meta.color}>{meta.label}</Badge>
              <span className="text-xs text-gray-400">{agentFindings.length} finding{agentFindings.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-2">
              {agentFindings.map((f) => {
                const sevMeta = REVIEW_SEVERITY_META[f.severity as ReviewSeverity] ?? REVIEW_SEVERITY_META.info;
                const isOpen = expanded.has(f.id);
                return (
                  <div key={f.id} className="border border-gray-100 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggle(f.id)}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <Badge className={`${sevMeta.color} shrink-0 mt-0.5`}>{sevMeta.label}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{f.title}</p>
                        {f.file && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <FileCode2 className="w-3 h-3" />
                            {f.file}{f.line ? `:${f.line}` : ''}
                          </p>
                        )}
                      </div>
                      <span className="text-gray-400 shrink-0">
                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 bg-gray-50 border-t border-gray-100 space-y-3">
                        <p className="text-sm text-gray-700 leading-relaxed">{f.body}</p>
                        {f.suggestion && (
                          <div className="bg-white border border-gray-200 rounded-md p-3">
                            <p className="text-xs font-medium text-gray-500 mb-1">Suggestion</p>
                            <p className="text-sm text-gray-700">{f.suggestion}</p>
                          </div>
                        )}
                        <p className="text-xs text-gray-400">Confidence: {f.confidence}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item);
    (acc[k] ??= []).push(item);
    return acc;
  }, {});
}
