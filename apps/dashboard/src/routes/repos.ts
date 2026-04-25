import { Router } from 'express';
import type { Pool } from 'pg';
import {
  getInstallationById,
  getRepositoryById,
  updateRepositoryConfig,
  getRunsForRepository,
  getResultsForRun,
  getArtifactsForRun,
  getModelTracesForRun,
} from '@preview-qa/db';
import { layout, escapeHtml, badge, formatDate } from '../views/layout.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export function reposRouter(pool: Pool): Router {
  const router = Router({ mergeParams: true });

  router.get('/:repoId', asyncHandler(async (req, res) => {
    const params = req.params as Record<string, string>;
    const [installation, repo] = await Promise.all([
      getInstallationById(pool, params['installationId'] ?? ''),
      getRepositoryById(pool, params['repoId'] ?? ''),
    ]);
    if (!installation || !repo) { res.status(404).send(layout('Not Found', '<p>Not found.</p>')); return; }

    const runs = await getRunsForRepository(pool, repo.id);

    const runRows = runs
      .map((r) => `
        <tr>
          <td><a href="/installations/${escapeHtml(installation.id)}/repos/${escapeHtml(repo.id)}/runs/${escapeHtml(r.id)}">${escapeHtml(r.id.slice(0, 8))}</a></td>
          <td>${badge(r.state)}</td>
          <td>${badge(r.mode)}</td>
          <td class="meta">${escapeHtml(r.sha.slice(0, 7))}</td>
          <td class="meta">${escapeHtml(r.triggered_by)}</td>
          <td class="meta">${formatDate(r.created_at)}</td>
        </tr>`)
      .join('');

    const body = `
      <p class="meta"><a href="/installations/${escapeHtml(installation.id)}">${escapeHtml(installation.account_login)}</a></p>
      <h1>${escapeHtml(repo.full_name)}</h1>
      <div class="card">
        <h2>Run History <a href="/installations/${escapeHtml(installation.id)}/repos/${escapeHtml(repo.id)}/config" style="font-size:13px;font-weight:400;margin-left:12px">Edit config</a></h2>
        ${runs.length === 0
          ? '<p class="empty">No runs yet.</p>'
          : `<table>
              <thead><tr><th>Run</th><th>State</th><th>Mode</th><th>SHA</th><th>Triggered by</th><th>Created</th></tr></thead>
              <tbody>${runRows}</tbody>
            </table>`}
      </div>`;

    res.send(layout(repo.full_name, body));
  }));

  router.get('/:repoId/config', asyncHandler(async (req, res) => {
    const params = req.params as Record<string, string>;
    const [installation, repo] = await Promise.all([
      getInstallationById(pool, params['installationId'] ?? ''),
      getRepositoryById(pool, params['repoId'] ?? ''),
    ]);
    if (!installation || !repo) { res.status(404).send(layout('Not Found', '<p>Not found.</p>')); return; }

    const configJson = JSON.stringify(repo.config, null, 2);
    const body = `
      <p class="meta"><a href="/installations/${escapeHtml(installation.id)}">${escapeHtml(installation.account_login)}</a> / <a href="/installations/${escapeHtml(installation.id)}/repos/${escapeHtml(repo.id)}">${escapeHtml(repo.full_name)}</a></p>
      <h1>Repo Config</h1>
      <div class="card">
        <h2>${escapeHtml(repo.full_name)}</h2>
        <form method="POST" action="/installations/${escapeHtml(installation.id)}/repos/${escapeHtml(repo.id)}/config">
          <textarea name="config">${escapeHtml(configJson)}</textarea>
          <button type="submit">Save</button>
        </form>
      </div>`;

    res.send(layout('Config — ' + repo.full_name, body));
  }));

  router.post('/:repoId/config', asyncHandler(async (req, res) => {
    const params = req.params as Record<string, string>;
    const [installation, repo] = await Promise.all([
      getInstallationById(pool, params['installationId'] ?? ''),
      getRepositoryById(pool, params['repoId'] ?? ''),
    ]);
    if (!installation || !repo) { res.status(404).send(layout('Not Found', '<p>Not found.</p>')); return; }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse((req.body as Record<string, string>)['config'] ?? '{}') as Record<string, unknown>;
    } catch {
      res.status(400).send(layout('Bad Request', '<p>Invalid JSON.</p>'));
      return;
    }

    await updateRepositoryConfig(pool, repo.id, parsed);
    res.redirect(`/installations/${encodeURIComponent(installation.id)}/repos/${encodeURIComponent(repo.id)}`);
  }));

  router.get('/:repoId/runs/:runId', asyncHandler(async (req, res) => {
    const params = req.params as Record<string, string>;
    const [installation, repo] = await Promise.all([
      getInstallationById(pool, params['installationId'] ?? ''),
      getRepositoryById(pool, params['repoId'] ?? ''),
    ]);
    if (!installation || !repo) { res.status(404).send(layout('Not Found', '<p>Not found.</p>')); return; }

    const runId = params['runId'] ?? '';
    const [results, artifacts, traces] = await Promise.all([
      getResultsForRun(pool, runId),
      getArtifactsForRun(pool, runId),
      getModelTracesForRun(pool, runId),
    ]);

    const resultRows = results
      .map((r) => `
        <tr>
          <td>${escapeHtml(r.id.slice(0, 8))}</td>
          <td>${badge(r.outcome)}</td>
          <td class="meta">${escapeHtml(r.failure_category ?? '—')}</td>
          <td class="meta">${escapeHtml(r.summary ?? '—')}</td>
          <td class="meta">${r.duration_ms != null ? `${r.duration_ms}ms` : '—'}</td>
        </tr>`)
      .join('');

    const artifactRows = artifacts
      .map((a) => `
        <tr>
          <td>${badge(a.kind)}</td>
          <td><a href="${escapeHtml(a.blob_url)}" target="_blank">${escapeHtml(a.filename)}</a></td>
          <td class="meta">${a.size_bytes != null ? `${(a.size_bytes / 1024).toFixed(1)} KB` : '—'}</td>
          <td class="meta">${formatDate(a.expires_at)}</td>
        </tr>`)
      .join('');

    const traceRows = traces
      .map((t) => `
        <tr>
          <td class="meta">${escapeHtml(t.prompt_name)}</td>
          <td class="meta">${escapeHtml(t.model)}</td>
          <td class="meta">${t.input_tokens ?? '—'}</td>
          <td class="meta">${t.output_tokens ?? '—'}</td>
          <td class="meta">${t.latency_ms != null ? `${t.latency_ms}ms` : '—'}</td>
        </tr>`)
      .join('');

    const body = `
      <p class="meta">
        <a href="/installations/${escapeHtml(installation.id)}">${escapeHtml(installation.account_login)}</a> /
        <a href="/installations/${escapeHtml(installation.id)}/repos/${escapeHtml(repo.id)}">${escapeHtml(repo.full_name)}</a>
      </p>
      <h1>Run ${escapeHtml(runId.slice(0, 8))}</h1>
      <div class="card">
        <h2>Step Outcomes</h2>
        ${results.length === 0
          ? '<p class="empty">No results yet.</p>'
          : `<table>
              <thead><tr><th>ID</th><th>Outcome</th><th>Category</th><th>Summary</th><th>Duration</th></tr></thead>
              <tbody>${resultRows}</tbody>
            </table>`}
      </div>
      <div class="card">
        <h2>Artifacts</h2>
        ${artifacts.length === 0
          ? '<p class="empty">No artifacts.</p>'
          : `<table>
              <thead><tr><th>Kind</th><th>File</th><th>Size</th><th>Expires</th></tr></thead>
              <tbody>${artifactRows}</tbody>
            </table>`}
      </div>
      <div class="card">
        <h2>Model Traces</h2>
        ${traces.length === 0
          ? '<p class="empty">No model traces.</p>'
          : `<table>
              <thead><tr><th>Prompt</th><th>Model</th><th>In tokens</th><th>Out tokens</th><th>Latency</th></tr></thead>
              <tbody>${traceRows}</tbody>
            </table>`}
      </div>`;

    res.send(layout('Run ' + runId.slice(0, 8), body));
  }));

  return router;
}
