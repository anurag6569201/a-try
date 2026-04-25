export function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — PreviewQA</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #1a1a1a; background: #f5f5f5; }
    a { color: #0070f3; text-decoration: none; }
    a:hover { text-decoration: underline; }
    nav { background: #fff; border-bottom: 1px solid #e5e5e5; padding: 12px 24px; display: flex; align-items: center; gap: 16px; }
    nav .logo { font-weight: 700; font-size: 16px; color: #1a1a1a; }
    main { max-width: 1100px; margin: 32px auto; padding: 0 24px; }
    h1 { font-size: 22px; font-weight: 600; margin-bottom: 20px; }
    h2 { font-size: 17px; font-weight: 600; margin-bottom: 12px; }
    .card { background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-weight: 600; font-size: 12px; text-transform: uppercase; color: #666; padding: 8px 12px; border-bottom: 1px solid #e5e5e5; }
    td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
    .badge-completed { background: #d4edda; color: #155724; }
    .badge-failed { background: #f8d7da; color: #721c24; }
    .badge-running { background: #cce5ff; color: #004085; }
    .badge-queued { background: #e2e3e5; color: #383d41; }
    .badge-canceled { background: #e2e3e5; color: #6c757d; }
    .badge-waiting_for_preview { background: #fff3cd; color: #856404; }
    .badge-planning { background: #cce5ff; color: #004085; }
    .badge-analyzing { background: #cce5ff; color: #004085; }
    .badge-reporting { background: #cce5ff; color: #004085; }
    .badge-blocked_environment { background: #f8d7da; color: #721c24; }
    .badge-needs_human { background: #fff3cd; color: #856404; }
    .badge-pass { background: #d4edda; color: #155724; }
    .badge-fail { background: #f8d7da; color: #721c24; }
    .badge-blocked { background: #f8d7da; color: #721c24; }
    .badge-skipped { background: #e2e3e5; color: #6c757d; }
    .badge-free { background: #e2e3e5; color: #383d41; }
    .badge-starter { background: #cce5ff; color: #004085; }
    .badge-growth { background: #d4edda; color: #155724; }
    .badge-team { background: #e8d4f0; color: #4a1a6e; }
    .usage-bar { background: #e5e5e5; border-radius: 4px; height: 8px; overflow: hidden; margin-top: 6px; }
    .usage-bar-fill { background: #0070f3; height: 100%; border-radius: 4px; transition: width 0.3s; }
    .usage-bar-fill.warn { background: #f59e0b; }
    .usage-bar-fill.danger { background: #ef4444; }
    .meta { font-size: 12px; color: #666; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    textarea { width: 100%; font-family: monospace; font-size: 13px; border: 1px solid #e5e5e5; border-radius: 6px; padding: 10px; min-height: 180px; }
    button[type=submit] { background: #0070f3; color: #fff; border: none; border-radius: 6px; padding: 8px 20px; font-size: 14px; cursor: pointer; margin-top: 12px; }
    button[type=submit]:hover { background: #005ed3; }
    .empty { color: #999; font-style: italic; padding: 20px 12px; }
  </style>
</head>
<body>
  <nav>
    <span class="logo">PreviewQA</span>
    <a href="/">Installations</a>
  </nav>
  <main>${body}</main>
</body>
</html>`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function badge(value: string): string {
  return `<span class="badge badge-${escapeHtml(value)}">${escapeHtml(value)}</span>`;
}

export function formatDate(d: Date | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
