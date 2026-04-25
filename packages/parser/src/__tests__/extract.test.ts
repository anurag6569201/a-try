import { describe, it, expect } from 'vitest';
import { extractYamlBlock } from '../extract.js';

describe('extractYamlBlock', () => {
  it('returns found:false for null body', () => {
    expect(extractYamlBlock(null)).toEqual({ found: false });
  });

  it('returns found:false when no markers present', () => {
    expect(extractYamlBlock('Just a normal PR description')).toEqual({ found: false });
  });

  it('returns found:false when only start marker present', () => {
    const body = '<!-- previewqa:start -->\nversion: 1';
    expect(extractYamlBlock(body)).toEqual({ found: false });
  });

  it('returns found:false when only end marker present', () => {
    const body = 'some text\n<!-- previewqa:end -->';
    expect(extractYamlBlock(body)).toEqual({ found: false });
  });

  it('returns found:false when block content is empty', () => {
    const body = '<!-- previewqa:start -->\n   \n<!-- previewqa:end -->';
    expect(extractYamlBlock(body)).toEqual({ found: false });
  });

  it('extracts yaml between markers', () => {
    const body = [
      'PR description here.',
      '<!-- previewqa:start -->',
      'version: 1',
      'steps:',
      '  - type: navigate',
      '    url: https://example.com',
      '<!-- previewqa:end -->',
      'More text after.',
    ].join('\n');

    const result = extractYamlBlock(body);
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.yaml).toContain('version: 1');
      expect(result.yaml).toContain('navigate');
    }
  });

  it('ignores content outside markers', () => {
    const body = 'before\n<!-- previewqa:start -->\nversion: 1\n<!-- previewqa:end -->\nafter';
    const result = extractYamlBlock(body);
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.yaml).not.toContain('before');
      expect(result.yaml).not.toContain('after');
    }
  });
});
