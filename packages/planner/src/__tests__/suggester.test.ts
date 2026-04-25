import { describe, it, expect } from 'vitest';
import { formatSuggestionComment } from '../suggester.js';
import type { PlanSuggestion } from '@preview-qa/ai';

describe('formatSuggestionComment', () => {
  it('returns empty string when there are no suggestions', () => {
    expect(formatSuggestionComment([])).toBe('');
  });

  it('includes the route in the comment', () => {
    const suggestions: PlanSuggestion[] = [
      { route: '/dashboard', reason: 'Page was modified', stepType: 'navigate' },
    ];
    const comment = formatSuggestionComment(suggestions);
    expect(comment).toContain('/dashboard');
    expect(comment).toContain('Page was modified');
    expect(comment).toContain('navigate');
  });

  it('includes the informational disclaimer', () => {
    const suggestions: PlanSuggestion[] = [
      { route: '/about', reason: 'New page', stepType: 'navigate' },
    ];
    expect(formatSuggestionComment(suggestions)).toContain('informational suggestions only');
  });

  it('renders a row for each suggestion', () => {
    const suggestions: PlanSuggestion[] = [
      { route: '/a', reason: 'reason a', stepType: 'navigate' },
      { route: '/b', reason: 'reason b', stepType: 'assert_visible' },
      { route: '/c', reason: 'reason c', stepType: 'screenshot' },
    ];
    const comment = formatSuggestionComment(suggestions);
    expect(comment).toContain('/a');
    expect(comment).toContain('/b');
    expect(comment).toContain('/c');
    expect(comment).toContain('assert_visible');
  });

  it('includes the heading', () => {
    const suggestions: PlanSuggestion[] = [
      { route: '/x', reason: 'test', stepType: 'navigate' },
    ];
    expect(formatSuggestionComment(suggestions)).toContain('Coverage Suggestions');
  });
});
