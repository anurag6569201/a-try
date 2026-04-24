export enum RunState {
  Queued = 'queued',
  WaitingForPreview = 'waiting_for_preview',
  Planning = 'planning',
  Running = 'running',
  Analyzing = 'analyzing',
  Reporting = 'reporting',
  Completed = 'completed',
  Failed = 'failed',
  BlockedEnvironment = 'blocked_environment',
  NeedsHuman = 'needs_human',
  Canceled = 'canceled',
}

export enum FailureCategory {
  ProductBug = 'product_bug',
  TestBug = 'test_bug',
  EnvironmentIssue = 'environment_issue',
  Flaky = 'flaky',
  NeedsClarification = 'needs_clarification',
}

export enum RunMode {
  Smoke = 'smoke',
  Instruction = 'instruction',
  Hybrid = 'hybrid',
}

export enum EventType {
  PullRequestOpened = 'pull_request.opened',
  PullRequestSynchronize = 'pull_request.synchronize',
  PullRequestReopened = 'pull_request.reopened',
  PullRequestClosed = 'pull_request.closed',
  DeploymentStatusCreated = 'deployment_status.created',
  IssueCommentCreated = 'issue_comment.created',
  CheckRunRerequested = 'check_run.rerequested',
}

export enum ParseOutcome {
  Found = 'parse.found',
  NotFound = 'parse.not_found',
  Error = 'parse.error',
}

export enum StepType {
  Navigate = 'navigate',
  Fill = 'fill',
  Click = 'click',
  AssertVisible = 'assert_visible',
  AssertNotVisible = 'assert_not_visible',
  AssertTitle = 'assert_title',
  Assert200 = 'assert_200',
  Screenshot = 'screenshot',
}

export enum ArtifactKind {
  Screenshot = 'screenshot',
  Trace = 'trace',
  Video = 'video',
  Log = 'log',
}
