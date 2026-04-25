import { describe, it, expect } from 'vitest';
import { formatOnboardingComment } from '../comment.js';
import type { OnboardingChecklistResult } from '../checklist.js';

const fullChecklist: OnboardingChecklistResult = {
  hasPRTemplate: true,
  hasPreviewQAConfig: true,
  hasDataTestIds: true,
  hasLoginProfile: true,
  prTemplateBody: '# PR Template',
};

const emptyChecklist: OnboardingChecklistResult = {
  hasPRTemplate: false,
  hasPreviewQAConfig: false,
  hasDataTestIds: false,
  hasLoginProfile: false,
  prTemplateBody: null,
};

describe('formatOnboardingComment', () => {
  it('contains the onboarding heading', () => {
    expect(formatOnboardingComment(emptyChecklist)).toContain('Onboarding Checklist');
  });

  it('shows checked boxes for all passing items', () => {
    const comment = formatOnboardingComment(fullChecklist);
    const checkedCount = (comment.match(/- \[x\]/g) ?? []).length;
    expect(checkedCount).toBe(4);
  });

  it('shows unchecked boxes for missing items', () => {
    const comment = formatOnboardingComment(emptyChecklist);
    const uncheckedCount = (comment.match(/- \[ \]/g) ?? []).length;
    expect(uncheckedCount).toBe(4);
  });

  it('includes config template when config file is missing', () => {
    const comment = formatOnboardingComment({ ...emptyChecklist });
    expect(comment).toContain('.previewqa/config.yaml');
    expect(comment).toContain('```yaml');
  });

  it('omits config template when config file is present', () => {
    const comment = formatOnboardingComment({ ...emptyChecklist, hasPreviewQAConfig: true });
    expect(comment).not.toContain('```yaml');
  });

  it('includes next steps section', () => {
    const comment = formatOnboardingComment(emptyChecklist);
    expect(comment).toContain('Next Steps');
    expect(comment).toContain('/qa rerun');
  });

  it('mentions data-testid guidance when missing', () => {
    const comment = formatOnboardingComment(emptyChecklist);
    expect(comment).toContain('data-testid');
  });

  it('includes documentation link', () => {
    const comment = formatOnboardingComment(emptyChecklist);
    expect(comment).toContain('preview-qa.dev/docs');
  });
});
