import type { PlanNormalizerInput, PlanNormalizerOutput } from '../types.js';

export interface PlanNormalizerFixture {
  id: string;
  input: PlanNormalizerInput;
  expect: {
    hasSelector?: boolean;
    selectorContains?: string;
    hasUrl?: boolean;
    urlContains?: string;
    hasValue?: boolean;
  };
  mockOutput: PlanNormalizerOutput;
}

export const planNormalizerFixtures: PlanNormalizerFixture[] = [
  {
    id: 'PN-01',
    input: { stepType: 'fill', rawInstruction: 'type email into the email input field', previewUrl: 'https://preview.example.com' },
    expect: { hasSelector: true, selectorContains: 'email' },
    mockOutput: { selector: '[name="email"]', reasoning: 'Email input by name attribute' },
  },
  {
    id: 'PN-02',
    input: { stepType: 'fill', rawInstruction: 'enter password in the password field', previewUrl: 'https://preview.example.com' },
    expect: { hasSelector: true, selectorContains: 'password' },
    mockOutput: { selector: '[name="password"]', reasoning: 'Password input by name attribute' },
  },
  {
    id: 'PN-03',
    input: { stepType: 'click', rawInstruction: 'click the submit button', previewUrl: 'https://preview.example.com' },
    expect: { hasSelector: true, selectorContains: 'submit' },
    mockOutput: { selector: 'button[type="submit"]', reasoning: 'Submit button by type attribute' },
  },
  {
    id: 'PN-04',
    input: { stepType: 'click', rawInstruction: 'press the sign in button', previewUrl: 'https://preview.example.com' },
    expect: { hasSelector: true },
    mockOutput: { selector: '[data-testid="sign-in-btn"]', reasoning: 'Sign in button by test ID' },
  },
  {
    id: 'PN-05',
    input: { stepType: 'navigate', rawInstruction: 'go to the dashboard page', previewUrl: 'https://preview.example.com' },
    expect: { hasUrl: true, urlContains: 'dashboard' },
    mockOutput: { url: 'https://preview.example.com/dashboard', reasoning: 'Dashboard page URL' },
  },
  {
    id: 'PN-06',
    input: { stepType: 'navigate', rawInstruction: 'open the settings page', previewUrl: 'https://preview.example.com' },
    expect: { hasUrl: true, urlContains: 'settings' },
    mockOutput: { url: 'https://preview.example.com/settings', reasoning: 'Settings route' },
  },
  {
    id: 'PN-07',
    input: { stepType: 'assert_visible', rawInstruction: 'check that the hero banner is visible', previewUrl: 'https://preview.example.com' },
    expect: { hasSelector: true },
    mockOutput: { selector: '.hero-banner', reasoning: 'Hero banner by class name' },
  },
  {
    id: 'PN-08',
    input: { stepType: 'assert_visible', rawInstruction: 'verify the nav menu appears', previewUrl: 'https://preview.example.com' },
    expect: { hasSelector: true },
    mockOutput: { selector: 'nav', reasoning: 'Navigation element by tag' },
  },
  {
    id: 'PN-09',
    input: { stepType: 'assert_not_visible', rawInstruction: 'confirm the loading spinner is gone', previewUrl: 'https://preview.example.com' },
    expect: { hasSelector: true },
    mockOutput: { selector: '[data-testid="loading-spinner"]', reasoning: 'Loading spinner by test ID' },
  },
  {
    id: 'PN-10',
    input: { stepType: 'assert_title', rawInstruction: 'verify the page title says Welcome', previewUrl: 'https://preview.example.com' },
    expect: { hasValue: true },
    mockOutput: { value: 'Welcome', reasoning: 'Expected title text' },
  },
];
