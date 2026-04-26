export function TestBlocks() {
  return (
    <>
      <h1>Test blocks (YAML)</h1>
      <p>
        Test blocks let you write structured Playwright steps directly in your PR description.
        PreviewQA parses, validates, and executes them against the Vercel preview URL.
      </p>

      <hr />

      <h2>Basic syntax</h2>
      <p>Wrap your YAML block between HTML comment markers in the PR body:</p>
      <pre>{`<!-- previewqa:start -->
version: 1

steps:
  - navigate: /dashboard
  - assert_visible:
      selector: '[data-testid="welcome-message"]'
  - screenshot: dashboard-loaded
<!-- previewqa:end -->`}</pre>

      <h2>Top-level fields</h2>
      <div className="prose-doc">
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Required</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>version</code></td><td>Yes</td><td>Schema version. Currently <code>1</code>.</td></tr>
            <tr><td><code>login</code></td><td>No</td><td>Name of a login profile to authenticate before running steps.</td></tr>
            <tr><td><code>steps</code></td><td>Yes</td><td>Array of step objects (see below).</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Step types</h2>

      <h3>navigate</h3>
      <p>Navigates to a path on the preview URL.</p>
      <pre>{`- navigate: /checkout/cart`}</pre>

      <h3>assert_visible</h3>
      <p>Asserts that a selector is visible on the page. Fails if not found within the step timeout.</p>
      <pre>{`- assert_visible:
    selector: '[data-testid="cart-total"]'`}</pre>

      <h3>assert_not_visible</h3>
      <p>Asserts that a selector is <strong>not</strong> present or not visible.</p>
      <pre>{`- assert_not_visible:
    selector: '[data-testid="error-banner"]'`}</pre>

      <h3>assert_title</h3>
      <p>Asserts that the page title contains a string.</p>
      <pre>{`- assert_title: "Shopping Cart | My Store"`}</pre>

      <h3>assert_200</h3>
      <p>Asserts that the last navigation returned a 200-series HTTP status.</p>
      <pre>{`- assert_200`}</pre>

      <h3>click</h3>
      <p>Clicks an element by selector.</p>
      <pre>{`- click:
    selector: '[data-testid="checkout-btn"]'`}</pre>

      <h3>fill</h3>
      <p>Types text into an input or textarea.</p>
      <pre>{`- fill:
    selector: '[data-testid="email-input"]'
    value: "test@example.com"`}</pre>

      <h3>screenshot</h3>
      <p>Takes a screenshot. The name is used as the artifact filename.</p>
      <pre>{`- screenshot: checkout-page`}</pre>

      <hr />

      <h2>Full example</h2>
      <pre>{`<!-- previewqa:start -->
version: 1
login: admin-user

steps:
  - navigate: /login
  - fill:
      selector: '[data-testid="email"]'
      value: "admin@example.com"
  - fill:
      selector: '[data-testid="password"]'
      value: "{{env:TEST_PASSWORD}}"
  - click:
      selector: '[data-testid="login-btn"]'
  - assert_visible:
      selector: '[data-testid="user-menu"]'
  - navigate: /admin/users
  - assert_200
  - assert_visible:
      selector: '[data-testid="users-table"]'
  - screenshot: admin-users-page
<!-- previewqa:end -->`}</pre>

      <h2>Parse errors</h2>
      <p>
        If your YAML block is invalid, PreviewQA posts a comment explaining exactly what's wrong:
      </p>
      <pre>{`⚠ PreviewQA — Parse error

The following issues were found in your test block:

  • steps[2].fill: required field "value" is missing
  • steps[4]: unknown step type "hover" (expected one of: navigate, fill, click, ...)

Please fix these and push a new commit, or remove the block to run smoke-only.`}</pre>

      <h2>Run modes</h2>
      <ul>
        <li><strong>smoke</strong> — No QA block found. Runs navigate + screenshot on the homepage.</li>
        <li><strong>instruction</strong> — QA block found and valid. Runs your steps exactly.</li>
        <li><strong>hybrid</strong> — QA block found, and PreviewQA appends heuristic smoke checks for changed routes.</li>
      </ul>
      <p>See <a href="/docs/modes">Run modes</a> for more detail.</p>
    </>
  );
}
