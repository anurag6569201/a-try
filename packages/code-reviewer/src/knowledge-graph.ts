import { Project, SyntaxKind } from 'ts-morph';
import type { KnowledgeGraphSummary, KnowledgeGraphSymbol, KnowledgeGraphEdge } from './types.js';

/**
 * Builds a lightweight knowledge graph from TypeScript source files.
 * Only processes changed files + one hop of their imports — not the whole repo.
 * Falls back to empty graph if ts-morph parsing fails (e.g. non-TS files).
 */
export function buildKnowledgeGraph(
  fileContents: Map<string, string>,
): KnowledgeGraphSummary {
  const symbols: KnowledgeGraphSymbol[] = [];
  const edges: KnowledgeGraphEdge[] = [];

  const tsFiles = [...fileContents.entries()].filter(([f]) =>
    f.endsWith('.ts') || f.endsWith('.tsx'),
  );

  if (tsFiles.length === 0) {
    return { symbols, edges };
  }

  try {
    const project = new Project({ useInMemoryFileSystem: true, skipAddingFilesFromTsConfig: true });

    for (const [filename, content] of tsFiles) {
      project.createSourceFile(filename, content, { overwrite: true });
    }

    for (const sourceFile of project.getSourceFiles()) {
      const filepath = sourceFile.getFilePath();

      // Extract exported functions
      for (const fn of sourceFile.getFunctions()) {
        const name = fn.getName();
        if (!name) continue;
        const sym: KnowledgeGraphSymbol = {
          name,
          kind: 'function',
          file: filepath,
          line: fn.getStartLineNumber(),
          exported: fn.isExported(),
        };
        symbols.push(sym);

        // Extract call expressions inside this function → "calls" edges
        fn.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((call) => {
          const expr = call.getExpression().getText().split('(')[0] ?? '';
          const calleeName = expr.includes('.') ? expr.split('.').pop() ?? expr : expr;
          if (calleeName && calleeName !== name) {
            edges.push({ from: `${filepath}:${name}`, to: calleeName, kind: 'calls' });
          }
        });
      }

      // Extract classes
      for (const cls of sourceFile.getClasses()) {
        const name = cls.getName();
        if (!name) continue;
        symbols.push({
          name,
          kind: 'class',
          file: filepath,
          line: cls.getStartLineNumber(),
          exported: cls.isExported(),
        });

        // extends / implements edges
        const base = cls.getBaseClass();
        if (base) {
          const baseName = base.getName();
          if (baseName) edges.push({ from: `${filepath}:${name}`, to: baseName, kind: 'extends' });
        }
        for (const iface of cls.getImplements()) {
          edges.push({ from: `${filepath}:${name}`, to: iface.getExpression().getText(), kind: 'implements' });
        }
      }

      // Extract interfaces and type aliases
      for (const iface of sourceFile.getInterfaces()) {
        const name = iface.getName();
        symbols.push({ name, kind: 'interface', file: filepath, line: iface.getStartLineNumber(), exported: iface.isExported() });
      }

      // Import edges
      for (const importDecl of sourceFile.getImportDeclarations()) {
        const moduleSpec = importDecl.getModuleSpecifierValue();
        // Only track local imports (relative paths)
        if (!moduleSpec.startsWith('.')) continue;
        for (const named of importDecl.getNamedImports()) {
          edges.push({ from: filepath, to: named.getName(), kind: 'imports' });
        }
      }
    }
  } catch {
    // Non-fatal: if ts-morph fails, return empty graph
  }

  // Cap to prevent blowing context window
  return {
    symbols: symbols.slice(0, 200),
    edges: edges.slice(0, 400),
  };
}

/** Serializes the graph into a compact string for LLM context */
export function serializeGraphForPrompt(graph: KnowledgeGraphSummary): string {
  if (graph.symbols.length === 0) return '(no symbol graph available)';

  const exportedSymbols = graph.symbols
    .filter((s) => s.exported)
    .map((s) => `  ${s.kind} ${s.name} @ ${s.file}:${s.line}`)
    .join('\n');

  const callEdges = graph.edges
    .filter((e) => e.kind === 'calls')
    .slice(0, 60)
    .map((e) => `  ${e.from} → calls → ${e.to}`)
    .join('\n');

  return [
    '## Exported Symbols',
    exportedSymbols || '  (none)',
    '',
    '## Call Graph (sampled)',
    callEdges || '  (none)',
  ].join('\n');
}
