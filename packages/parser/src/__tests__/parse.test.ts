import { describe, it, expect } from 'vitest';
import { ParseOutcome, StepType } from '@preview-qa/domain';
import { parsePRBody, formatParseErrors } from '../parse.js';

function wrap(yaml: string): string {
  return `<!-- previewqa:start -->\n${yaml}\n<!-- previewqa:end -->`;
}

// ── 10 valid inputs ──────────────────────────────────────────────────────────

describe('parsePRBody — valid inputs', () => {
  it('V1: navigate + assert_title + screenshot', () => {
    const body = wrap(`
version: 1
steps:
  - type: navigate
    url: https://preview.example.com
  - type: assert_title
    value: My App
  - type: screenshot
    label: home
`);
    const result = parsePRBody(body);
    expect(result.outcome).toBe(ParseOutcome.Found);
    if (result.outcome === ParseOutcome.Found) {
      expect(result.block.steps).toHaveLength(3);
      expect(result.block.steps[0]?.type).toBe(StepType.Navigate);
    }
  });

  it('V2: navigate + fill + click', () => {
    const body = wrap(`
version: 1
steps:
  - type: navigate
    url: https://preview.example.com/login
  - type: fill
    selector: "#email"
    value: user@example.com
  - type: click
    selector: "#submit"
`);
    const result = parsePRBody(body);
    expect(result.outcome).toBe(ParseOutcome.Found);
    if (result.outcome === ParseOutcome.Found) {
      expect(result.block.steps[1]?.type).toBe(StepType.Fill);
      expect(result.block.steps[2]?.type).toBe(StepType.Click);
    }
  });

  it('V3: assert_visible and assert_not_visible', () => {
    const body = wrap(`
version: 1
steps:
  - type: navigate
    url: https://preview.example.com
  - type: assert_visible
    selector: ".hero-banner"
  - type: assert_not_visible
    selector: ".loading-spinner"
`);
    const result = parsePRBody(body);
    expect(result.outcome).toBe(ParseOutcome.Found);
    if (result.outcome === ParseOutcome.Found) {
      expect(result.block.steps[1]?.type).toBe(StepType.AssertVisible);
      expect(result.block.steps[2]?.type).toBe(StepType.AssertNotVisible);
    }
  });

  it('V4: version defaults to 1 when omitted', () => {
    const body = wrap(`
steps:
  - type: navigate
    url: https://preview.example.com
`);
    const result = parsePRBody(body);
    expect(result.outcome).toBe(ParseOutcome.Found);
    if (result.outcome === ParseOutcome.Found) {
      expect(result.block.version).toBe(1);
    }
  });

  it('V5: screenshot without label is valid', () => {
    const body = wrap(`
version: 1
steps:
  - type: navigate
    url: https://preview.example.com
  - type: screenshot
`);
    const result = parsePRBody(body);
    expect(result.outcome).toBe(ParseOutcome.Found);
  });

  it('V6: many steps in sequence', () => {
    const body = wrap(`
version: 1
steps:
  - type: navigate
    url: https://preview.example.com
  - type: assert_visible
    selector: nav
  - type: click
    selector: nav a
  - type: assert_title
    value: About
  - type: screenshot
    label: about-page
`);
    const result = parsePRBody(body);
    expect(result.outcome).toBe(ParseOutcome.Found);
    if (result.outcome === ParseOutcome.Found) {
      expect(result.block.steps).toHaveLength(5);
    }
  });

  it('V7: PR body has content before and after the block', () => {
    const body = [
      '## What changed',
      'Refactored the login flow.',
      '<!-- previewqa:start -->',
      'version: 1',
      'steps:',
      '  - type: navigate',
      '    url: https://preview.example.com',
      '  - type: assert_visible',
      '    selector: .login-form',
      '<!-- previewqa:end -->',
      'Closes #42',
    ].join('\n');
    const result = parsePRBody(body);
    expect(result.outcome).toBe(ParseOutcome.Found);
  });

  it('V8: fill with empty string value is valid', () => {
    const body = wrap(`
version: 1
steps:
  - type: navigate
    url: https://preview.example.com
  - type: fill
    selector: input[name="search"]
    value: ""
`);
    const result = parsePRBody(body);
    expect(result.outcome).toBe(ParseOutcome.Found);
  });

  it('V9: single navigate step is the minimum valid block', () => {
    const body = wrap(`
version: 1
steps:
  - type: navigate
    url: https://preview.example.com/dashboard
`);
    const result = parsePRBody(body);
    expect(result.outcome).toBe(ParseOutcome.Found);
    if (result.outcome === ParseOutcome.Found) {
      expect(result.block.steps).toHaveLength(1);
    }
  });

  it('V10: returns not_found when PR body is null', () => {
    const result = parsePRBody(null);
    expect(result.outcome).toBe(ParseOutcome.NotFound);
  });
});

// ── 10 invalid inputs ────────────────────────────────────────────────────────

describe('parsePRBody — invalid inputs', () => {
  it('I1: no previewqa block → not_found', () => {
    const result = parsePRBody('Just a normal PR, no QA block.');
    expect(result.outcome).toBe(ParseOutcome.NotFound);
  });

  it('I2: empty steps array → error', () => {
    const body = wrap(`
version: 1
steps: []
`);
    const result = parsePRBody(body);
    expect(result.outcome).toBe(ParseOutcome.Error);
    if (result.outcome === ParseOutcome.Error) {
      expect(result.errors.some((e) => e.toLowerCase().includes('step'))).toBe(true);
    }
  });

  it('I3: steps key missing entirely → error', () => {
    const body = wrap(`version: 1`);
    const result = parsePRBody(body);
    expect(result.outcome).toBe(ParseOutcome.Error);
    if (result.outcome === ParseOutcome.Error) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it('I4: unknown step type → error', () => {
    const body = wrap(`
version: 1
steps:
  - type: hover
    selector: .button
`);
    const result = parsePRBody(body);
    expect(result.outcome).toBe(ParseOutcome.Error);
  });

  it('I5: navigate missing url → error', () => {
    const body = wrap(`
version: 1
steps:
  - type: navigate
`);
    const result = parsePRBody(body);
    expect(result.outcome).toBe(ParseOutcome.Error);
    if (result.outcome === ParseOutcome.Error) {
      expect(result.errors.some((e) => e.includes('url'))).toBe(true);
    }
  });

  it('I6: navigate url not a valid URL → error', () => {
    const body = wrap(`
version: 1
steps:
  - type: navigate
    url: not-a-url
`);
    const result = parsePRBody(body);
    expect(result.outcome).toBe(ParseOutcome.Error);
    if (result.outcome === ParseOutcome.Error) {
      expect(result.errors.some((e) => e.includes('url'))).toBe(true);
    }
  });

  it('I7: fill missing selector → error', () => {
    const body = wrap(`
version: 1
steps:
  - type: fill
    value: hello
`);
    const result = parsePRBody(body);
    expect(result.outcome).toBe(ParseOutcome.Error);
    if (result.outcome === ParseOutcome.Error) {
      expect(result.errors.some((e) => e.includes('selector'))).toBe(true);
    }
  });

  it('I8: assert_title missing value → error', () => {
    const body = wrap(`
version: 1
steps:
  - type: assert_title
`);
    const result = parsePRBody(body);
    expect(result.outcome).toBe(ParseOutcome.Error);
    if (result.outcome === ParseOutcome.Error) {
      expect(result.errors.some((e) => e.includes('value'))).toBe(true);
    }
  });

  it('I9: malformed YAML syntax → error', () => {
    const body = wrap(`
version: 1
steps:
  - type: navigate
    url: [unclosed bracket
`);
    const result = parsePRBody(body);
    expect(result.outcome).toBe(ParseOutcome.Error);
    if (result.outcome === ParseOutcome.Error) {
      expect(result.errors[0]).toMatch(/YAML syntax error/i);
    }
  });

  it('I10: steps is a string not an array → error', () => {
    const body = wrap(`
version: 1
steps: "not an array"
`);
    const result = parsePRBody(body);
    expect(result.outcome).toBe(ParseOutcome.Error);
  });
});

// ── formatParseErrors ────────────────────────────────────────────────────────

describe('formatParseErrors', () => {
  it('includes all errors as bullet points', () => {
    const errors = ['steps.0.url: Invalid url', 'steps.1.selector: required'];
    const formatted = formatParseErrors(errors);
    expect(formatted).toContain('- steps.0.url: Invalid url');
    expect(formatted).toContain('- steps.1.selector: required');
  });

  it('includes an example block', () => {
    const formatted = formatParseErrors(['some error']);
    expect(formatted).toContain('previewqa:start');
    expect(formatted).toContain('navigate');
  });

  it('includes the error heading', () => {
    const formatted = formatParseErrors(['some error']);
    expect(formatted).toContain('Configuration Error');
  });
});
