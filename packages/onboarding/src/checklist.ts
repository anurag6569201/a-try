import type { Octokit } from '@octokit/rest';
import { fileExistsInRepo, getFileContent } from '@preview-qa/github-adapter';

export interface OnboardingChecklistResult {
  hasPRTemplate: boolean;
  hasPreviewQAConfig: boolean;
  hasDataTestIds: boolean;
  hasLoginProfile: boolean;
  prTemplateBody: string | null;
}

const PR_TEMPLATE_PATHS = [
  '.github/pull_request_template.md',
  '.github/PULL_REQUEST_TEMPLATE.md',
  'docs/pull_request_template.md',
  'pull_request_template.md',
];

const DATA_TESTID_PATTERN = /data-testid=/;
const LOGIN_PROFILE_PATTERN = /login:/;

export async function runOnboardingChecklist(
  octokit: Octokit,
  owner: string,
  repo: string,
  ref?: string,
): Promise<OnboardingChecklistResult> {
  // Check for PR template (try each path)
  let prTemplateBody: string | null = null;
  for (const path of PR_TEMPLATE_PATHS) {
    const content = await getFileContent(octokit, owner, repo, path, ref);
    if (content !== null) {
      prTemplateBody = content;
      break;
    }
  }

  const hasPreviewQAConfig = await fileExistsInRepo(octokit, owner, repo, '.previewqa/config.yaml', ref);

  const hasDataTestIds = prTemplateBody !== null
    ? DATA_TESTID_PATTERN.test(prTemplateBody)
    : false;

  const hasLoginProfile = prTemplateBody !== null
    ? LOGIN_PROFILE_PATTERN.test(prTemplateBody)
    : false;

  return {
    hasPRTemplate: prTemplateBody !== null,
    hasPreviewQAConfig,
    hasDataTestIds,
    hasLoginProfile,
    prTemplateBody,
  };
}
