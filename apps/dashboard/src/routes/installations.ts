import { Router } from 'express';
import type { Pool } from 'pg';
import { getInstallationById, getRepositoriesForInstallation, countRunsForInstallationInMonth } from '@preview-qa/db';
import { TIER_LIMITS } from '@preview-qa/domain';
import { layout, escapeHtml, badge, formatDate } from '../views/layout.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export function installationsRouter(pool: Pool): Router {
  const router = Router();

  router.get('/', asyncHandler(async (_req, res) => {
    const { rows: installations } = await pool.query(
      'SELECT * FROM installation ORDER BY created_at DESC',
    );

    const rows = (installations as Record<string, unknown>[])
      .map((inst) => `
        <tr>
          <td><a href="/installations/${escapeHtml(String(inst['id']))}">${escapeHtml(String(inst['account_login']))}</a></td>
          <td>${escapeHtml(String(inst['account_type']))}</td>
          <td>${badge(String(inst['tier']))}</td>
          <td class="meta">${formatDate(inst['created_at'] as Date)}</td>
        </tr>`)
      .join('');

    const body = `
      <h1>Installations</h1>
      <div class="card">
        ${installations.length === 0
          ? '<p class="empty">No installations yet.</p>'
          : `<table>
              <thead><tr><th>Account</th><th>Type</th><th>Tier</th><th>Installed</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>`}
      </div>`;

    res.send(layout('Installations', body));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const installation = await getInstallationById(pool, req.params['id'] ?? '');
    if (!installation) { res.status(404).send(layout('Not Found', '<p>Installation not found.</p>')); return; }

    const [repos, monthlyRuns] = await Promise.all([
      getRepositoriesForInstallation(pool, installation.id),
      countRunsForInstallationInMonth(pool, installation.id),
    ]);

    const limits = TIER_LIMITS[installation.tier];
    const runPct = limits ? Math.min(100, Math.round((monthlyRuns / limits.runsPerMonth) * 100)) : 0;
    const repoPct = limits ? Math.min(100, Math.round((repos.length / limits.reposPerInstallation) * 100)) : 0;
    const runFillClass = runPct >= 90 ? 'danger' : runPct >= 70 ? 'warn' : '';
    const repoFillClass = repoPct >= 90 ? 'danger' : repoPct >= 70 ? 'warn' : '';

    const repoRows = repos
      .map((r) => `
        <tr>
          <td><a href="/installations/${escapeHtml(installation.id)}/repos/${escapeHtml(r.id)}">${escapeHtml(r.full_name)}</a></td>
          <td class="meta">${escapeHtml(r.default_branch)}</td>
          <td><a href="/installations/${escapeHtml(installation.id)}/repos/${escapeHtml(r.id)}/config">Edit config</a></td>
        </tr>`)
      .join('');

    const body = `
      <h1>${escapeHtml(installation.account_login)}</h1>
      <div class="grid-2">
        <div class="card">
          <h2>Details</h2>
          <table>
            <tbody>
              <tr><td>Tier</td><td>${badge(installation.tier)}</td></tr>
              <tr><td>Type</td><td>${escapeHtml(installation.account_type)}</td></tr>
              <tr><td>Stripe customer</td><td class="meta">${escapeHtml(installation.stripe_customer_id ?? '—')}</td></tr>
              <tr><td>Installed</td><td class="meta">${formatDate(installation.created_at)}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="card">
          <h2>Usage</h2>
          <p>Runs this month: <strong>${monthlyRuns} / ${limits?.runsPerMonth ?? '?'}</strong></p>
          <div class="usage-bar"><div class="usage-bar-fill ${runFillClass}" style="width:${runPct}%"></div></div>
          <br>
          <p>Active repos: <strong>${repos.length} / ${limits?.reposPerInstallation ?? '?'}</strong></p>
          <div class="usage-bar"><div class="usage-bar-fill ${repoFillClass}" style="width:${repoPct}%"></div></div>
        </div>
      </div>
      <div class="card">
        <h2>Repositories</h2>
        ${repos.length === 0
          ? '<p class="empty">No repositories.</p>'
          : `<table>
              <thead><tr><th>Repo</th><th>Default branch</th><th></th></tr></thead>
              <tbody>${repoRows}</tbody>
            </table>`}
      </div>`;

    res.send(layout(installation.account_login, body));
  }));

  return router;
}
