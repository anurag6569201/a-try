import type { OnboardingChecklistResult } from './checklist.js';

const CONFIG_TEMPLATE = `\`\`\`yaml
# .previewqa/config.yaml
version: 1

# Optional: restrict which PRs trigger runs
# branches:
#   - main
#   - develop

# Optional: named login profiles (credentials stored in Azure Key Vault)
# profiles:
#   admin:
#     keyVaultSecret: previewqa-admin-session
\`\`\``;

function checkItem(checked: boolean, label: string, detail?: string): string {
  const box = checked ? '- [x]' : '- [ ]';
  return detail ? `${box} ${label} — ${detail}` : `${box} ${label}`;
}

export function formatOnboardingComment(result: OnboardingChecklistResult): string {
  const lines: string[] = [
    '## preview-qa: Onboarding Checklist',
    '',
    'Thanks for installing Preview QA! Here\'s your repo\'s setup status:',
    '',
    '### Setup Checklist',
    '',
    checkItem(
      result.hasPRTemplate,
      '**PR template found**',
      result.hasPRTemplate ? undefined : 'Add `.github/pull_request_template.md` with a `<!-- previewqa:start -->` block to drive test plans from PR descriptions.',
    ),
    checkItem(
      result.hasDataTestIds,
      '**`data-testid` selectors in PR template**',
      result.hasDataTestIds ? undefined : 'Add `data-testid` attributes to your components so Preview QA can target elements reliably.',
    ),
    checkItem(
      result.hasPreviewQAConfig,
      '**`.previewqa/config.yaml` present**',
      result.hasPreviewQAConfig ? undefined : 'Optional but recommended. See the template below.',
    ),
    checkItem(
      result.hasLoginProfile,
      '**Login profile configured**',
      result.hasLoginProfile ? undefined : 'Optional. Add a `login:` profile in your QA block to test authenticated flows.',
    ),
    '',
    '### Next Steps',
    '',
    '1. Open a PR — Preview QA will automatically run a smoke test on your preview deployment.',
    '2. Add a `<!-- previewqa:start -->` block to your PR description to specify custom steps.',
    '3. Use `/qa rerun` in a PR comment to re-trigger a run at any time.',
    '',
  ];

  if (!result.hasPreviewQAConfig) {
    lines.push(
      '### Optional: `.previewqa/config.yaml` Template',
      '',
      CONFIG_TEMPLATE,
      '',
    );
  }

  lines.push(
    '---',
    '_[Preview QA Documentation](https://preview-qa.dev/docs)_',
  );

  return lines.join('\n');
}

export function formatFirstRunComment(repoFullName: string, prNumber: number): string {
  return [
    '## preview-qa: First Run Triggered',
    '',
    `I've automatically triggered a smoke run on PR #${prNumber} in **${repoFullName}**.`,
    '',
    'Watch for the GitHub Check to appear on the PR shortly.',
  ].join('\n');
}
