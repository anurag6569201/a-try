import { z } from 'zod';
import { StepType } from '@preview-qa/domain';

// ── Individual step schemas ──────────────────────────────────────────────────

const NavigateStepSchema = z.object({
  type: z.literal(StepType.Navigate),
  url: z.string().url({ message: 'navigate.url must be a valid URL' }),
});

const FillStepSchema = z.object({
  type: z.literal(StepType.Fill),
  selector: z.string().min(1, 'fill.selector is required'),
  value: z.string(),
});

const ClickStepSchema = z.object({
  type: z.literal(StepType.Click),
  selector: z.string().min(1, 'click.selector is required'),
});

const AssertVisibleStepSchema = z.object({
  type: z.literal(StepType.AssertVisible),
  selector: z.string().min(1, 'assert_visible.selector is required'),
});

const AssertNotVisibleStepSchema = z.object({
  type: z.literal(StepType.AssertNotVisible),
  selector: z.string().min(1, 'assert_not_visible.selector is required'),
});

const AssertTitleStepSchema = z.object({
  type: z.literal(StepType.AssertTitle),
  value: z.string().min(1, 'assert_title.value is required'),
});

const ScreenshotStepSchema = z.object({
  type: z.literal(StepType.Screenshot),
  label: z.string().optional(),
});

// ── Discriminated union of all steps ────────────────────────────────────────

export const StepSchema = z.discriminatedUnion('type', [
  NavigateStepSchema,
  FillStepSchema,
  ClickStepSchema,
  AssertVisibleStepSchema,
  AssertNotVisibleStepSchema,
  AssertTitleStepSchema,
  ScreenshotStepSchema,
]);

// ── Top-level QA block schema ────────────────────────────────────────────────

export const QABlockSchema = z.object({
  version: z.literal(1).default(1),
  login: z.string().optional(),
  steps: z.array(StepSchema).min(1, 'steps must contain at least one step'),
});

export type ParsedStep = z.infer<typeof StepSchema>;
export type QABlock = z.infer<typeof QABlockSchema>;
