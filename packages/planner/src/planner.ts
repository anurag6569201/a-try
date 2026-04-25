import { RunMode, ParseOutcome } from '@preview-qa/domain';
import { createPlan, createTestCase } from '@preview-qa/db';
import type { Pool } from 'pg';
import type { AzureOpenAIConfig } from '@preview-qa/ai';
import type { ParsedStep } from '@preview-qa/parser';
import { buildSmokeSteps } from './smokeSteps.js';
import { normalizeSteps } from './normalizer.js';
import { mapChangedFilesToRoutes, buildHeuristicSteps } from './heuristics.js';
import type { PlannerInput, PlannerOutput, ResolvedTestCase } from './types.js';

const DEFAULT_MAX_TEST_CASES = 20;

export async function buildPlan(
  pool: Pool,
  input: PlannerInput,
  aiConfig?: AzureOpenAIConfig,
): Promise<PlannerOutput> {
  const { runId, mode, previewUrl, parsedSteps, rawYaml, useAiNormalization, changedFiles } = input;
  const maxTestCases = input.maxTestCases ?? DEFAULT_MAX_TEST_CASES;

  // Determine steps by mode
  const { parseOutcome, testCaseDefs } = resolveMode(mode, parsedSteps, previewUrl);

  // Append heuristic test cases for changed Next.js routes
  if (changedFiles && changedFiles.length > 0) {
    const routes = mapChangedFilesToRoutes(changedFiles);
    if (routes.length > 0) {
      const heuristicSteps = buildHeuristicSteps(routes, previewUrl);
      testCaseDefs.push({ name: 'Heuristic', steps: heuristicSteps, order: testCaseDefs.length });
    }
  }

  // Enforce max test cases cap
  const cappedDefs = testCaseDefs.slice(0, maxTestCases);

  // Optionally normalize ambiguous selectors via AI
  const normalizedDefs: ResolvedTestCase[] = await Promise.all(
    cappedDefs.map(async (tc) => {
      if (useAiNormalization && aiConfig) {
        const normalizedSteps = await normalizeSteps(pool, aiConfig, runId, tc.steps, previewUrl);
        return { ...tc, steps: normalizedSteps };
      }
      return tc;
    }),
  );

  // Persist plan record
  const plan = await createPlan(pool, {
    run_id: runId,
    parse_outcome: parseOutcome,
    ...(rawYaml !== null ? { raw_yaml: rawYaml } : {}),
  });

  // Persist test cases
  const testCases = await Promise.all(
    normalizedDefs.map((tc) =>
      createTestCase(pool, {
        plan_id: plan.id,
        run_id: runId,
        name: tc.name,
        steps: tc.steps,
        order: tc.order,
      }),
    ),
  );

  return {
    planId: plan.id,
    testCases: testCases.map((tc, i) => ({
      name: tc.name,
      steps: (tc.steps as unknown as ParsedStep[]),
      order: normalizedDefs[i]?.order ?? i,
    })),
  };
}

interface ModeResolution {
  parseOutcome: ParseOutcome;
  testCaseDefs: ResolvedTestCase[];
}

function resolveMode(
  mode: RunMode,
  parsedSteps: ParsedStep[] | null,
  previewUrl: string,
): ModeResolution {
  const smokeSteps = buildSmokeSteps(previewUrl);

  switch (mode) {
    case RunMode.Smoke:
      return {
        parseOutcome: ParseOutcome.NotFound,
        testCaseDefs: [{ name: 'Smoke', steps: smokeSteps, order: 0 }],
      };

    case RunMode.Instruction: {
      const steps = parsedSteps ?? smokeSteps;
      const outcome = parsedSteps ? ParseOutcome.Found : ParseOutcome.NotFound;
      return {
        parseOutcome: outcome,
        testCaseDefs: [{ name: 'Instruction', steps, order: 0 }],
      };
    }

    case RunMode.Hybrid: {
      const defs: ResolvedTestCase[] = [];
      if (parsedSteps && parsedSteps.length > 0) {
        defs.push({ name: 'Instruction', steps: parsedSteps, order: 0 });
      }
      defs.push({ name: 'Smoke', steps: smokeSteps, order: defs.length });
      return {
        parseOutcome: parsedSteps ? ParseOutcome.Found : ParseOutcome.NotFound,
        testCaseDefs: defs,
      };
    }
  }
}
