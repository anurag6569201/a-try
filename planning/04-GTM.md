# Go-To-Market Strategy

## Positioning

### Category
Developer tooling / Automated preview QA

### Tagline options
- *"Your preview deployment, actually tested."*
- *"Browser QA that lives inside your PR."*
- *"Stop guessing if your preview works. Know."*

### One-paragraph positioning statement
Preview QA Agent is the missing quality layer for GitHub + Vercel teams. It reads structured test instructions from the PR description, waits for the Vercel preview deployment, runs deterministic Playwright browser checks, and posts a pass/fail report with screenshots and traces back to the PR — automatically, on every push. No test files to maintain. No separate QA tool. No manual preview testing.

### Frame for different audiences

| Audience | Frame |
|---|---|
| Developer | "Stop manually clicking through your preview before merge — the agent does it for you" |
| Eng lead | "Catch UI regressions in PRs before they reach main, without hiring a QA team" |
| CTO / Founder | "Ship faster with confidence — automated pre-merge browser verification on every PR" |

---

## Ideal Customer Profile (ICP)

### Primary ICP — Vercel-native startup

| Dimension | Criteria |
|---|---|
| Stack | GitHub + Vercel (non-negotiable for v1) |
| Company size | 5–150 engineers |
| Stage | Seed to Series B |
| Team structure | No dedicated QA, or < 1 QA engineer per 10 devs |
| Shipping cadence | ≥ 5 PR merges per day |
| Pain | Preview URLs exist, nobody checks them reliably |
| Budget | $29–$299/month is trivially approved by eng lead |

### Secondary ICP — Platform team at growth-stage company

| Dimension | Criteria |
|---|---|
| Stack | GitHub + Vercel or custom preview infra |
| Context | Building internal DX tooling for 50–500 engineers |
| Pain | Inconsistent preview verification across many teams |
| Budget | Internal tool budget, $299–$2,000/month range |

---

## Competitive differentiation

| Competitor | Their category | Our wedge |
|---|---|---|
| Chromatic / Percy | Visual regression (pixel diff) | We test behavioral flows, not pixels |
| Meticulous | Auto-recorded session replay | We are intent-driven — developer writes what matters |
| GitHub Actions + Playwright | CI-level testing on fixed URLs | We target the ephemeral Vercel preview, zero test files |
| QA Wolf | Managed human + automated QA service | We are async, automated, PR-native, fraction of the cost |
| Rainforest QA | No-code manual test automation | We have no separate UI — all inside GitHub |

**Single-sentence differentiation:** The only tool that reads your PR description, finds your Vercel preview, and posts back browser test results — with no test files to write or maintain.

---

## Distribution strategy by phase

### Phase 1: Founder-led, zero spend (Months 1–3, during M1–M2)

**Goal:** Find 5–10 design partners who will give weekly feedback.

| Channel | Specific action |
|---|---|
| Personal network | Reach out to eng leads at 20 Vercel-heavy startups in your network. Offer free early access in exchange for 30-min weekly feedback call |
| GitHub Marketplace | List the GitHub App free tier. This is where the ICP searches for developer tools |
| Twitter / X ship-in-public | Weekly thread: "Building a PR QA agent — here's what I learned this week." Show demos, share learnings. Build an audience before launch |
| Hacker News | "Show HN: I built a bot that browser-tests your Vercel previews when you open a PR" |
| Indie Hackers | Post progress updates. IH audience has high overlap with bootstrapped SaaS tools |

**Target:** 5 design partners by Week 8, feedback incorporated into M2.

---

### Phase 2: Content + community (Months 4–6, around M3)

**Goal:** Generate inbound, build awareness in the GitHub + Vercel developer community.

#### Content (SEO + brand)

| Asset | Target keyword / audience |
|---|---|
| "Why your Vercel preview deployment is a lie" | Developers frustrated with untested previews |
| "How we added automated QA to every PR in 10 minutes" | Eng leads at Vercel-heavy startups |
| "What Playwright tests can't tell you about your preview" | Developers who already have some testing |
| "The QA gap that code review doesn't cover" | Engineering managers |

All content should end with a demo GIF and a GitHub App install CTA.

#### Community

| Community | Action |
|---|---|
| Vercel community Discord (#tools, #show-and-tell) | Post demos, answer questions about preview testing |
| GitHub Discussions in popular Next.js / Vercel repos | Comment on issues that reference QA or preview testing pain |
| Dev.to / Hashnode | Cross-post blog content |
| Reddit r/ExperiencedDevs, r/webdev | Share "Show HN"-style posts |

#### YouTube
- 5-minute demo video: "PR opens → Preview QA bot runs → Fails → Developer fixes → Bot reruns → Passes"
- Keep it raw and real — screen recording of actual PR flow

---

### Phase 3: Partnerships (Months 6–12, after M4)

| Partner | Angle | Action |
|---|---|---|
| Vercel | Native integration, co-marketing | Reach out to Vercel ecosystem team. Pursue Vercel Marketplace listing |
| Linear | QA run linked to Linear issue automatically | Build integration, pitch to Linear partnerships |
| Slack | Post QA result to PR author's Slack DM | Build Slack app, include in onboarding |
| Dev agencies | Resell or white-label | Agency partner program: revenue share or fixed fee |
| Developer newsletters | Sponsored posts | Bytes.dev, TLDR Tech — small buys to test ROI |

---

## Launch sequence

| Milestone | Activity | Goal |
|---|---|---|
| M1 (Week 6) | Start ship-in-public Twitter/X thread | Build audience |
| M1 (Week 6) | GitHub App listed on Marketplace (free tier) | ICP discoverability |
| M2 (Week 10) | Product Hunt launch | Spike in installs, early adopters |
| M2 (Week 10) | "Show HN" post | Dev community awareness |
| M3 (Week 14) | Waitlist landing page live | Capture demand before paid launch |
| M3 (Week 14) | 3–5 design partners on private beta | Real feedback loop |
| M4 (Week 24) | Paid tiers live | First revenue |
| M4 (Week 24) | Email launch to waitlist | Convert waitlist to paying |
| +2 months | Newsletter sponsored post (Bytes.dev or TLDR Tech) | Growth push |
| +3 months | Vercel partnership outreach | Distribution multiplier |

---

## Product Hunt launch playbook

**When:** At M2 — the product works, has a demo, and has early social proof.

**Preparation (2 weeks before):**
- Record a clean 60-second demo video showing the full PR → bot → result flow
- Write the tagline, description, and first comment (founder story)
- Get 10–20 supporters ready to upvote on launch day
- Prepare 3 screenshots: PR before QA, bot running, PR after (pass/fail)

**Day of launch:**
- Post at 12:01 AM PST on a Tuesday or Wednesday
- Share on Twitter/X, LinkedIn, personal Slack communities
- Respond to every comment within the first 4 hours

**Success target:** Top 5 in Developer Tools category. 200+ upvotes. 50+ GitHub App installs on launch day.

---

## Messaging framework

### For developers (writing the PR)
**Problem:** You open a PR, Vercel deploys a preview, and nobody actually tests it before merge.
**Solution:** Preview QA Agent reads your test instructions from the PR description and runs them on your preview automatically.
**Proof:** Screenshot of the bot comment showing pass/fail with step-level detail.

### For reviewers (approving the PR)
**Problem:** You're asked to approve a PR but you have no idea if the preview actually works.
**Solution:** Before you even open the PR, there's already a QA run result with screenshots and a trace link.
**Proof:** Screenshot of the GitHub Check summary showing all steps passed.

### For eng leads (buying the product)
**Problem:** Your team ships UI regressions to main that Vercel previews would have caught — if anyone tested them.
**Solution:** Every PR gets automatic browser verification against the actual preview deployment.
**Proof:** A graph of "pre-merge defects caught" trending up month over month.

---

## Sales motion (early stage)

No sales team in Phase 0–3. Founder-led only.

**For inbound leads (from Marketplace, HN, PH):**
1. User installs the GitHub App free tier
2. Bot runs on their first PR automatically
3. If they hit the free tier limit, they see an upgrade prompt in the PR comment
4. Stripe checkout — no sales call needed

**For outbound design partners:**
1. Direct message eng lead or CTO via Twitter/LinkedIn/email
2. "Hi, I built a bot that browser-tests your Vercel previews — I'm looking for 5 teams to try it free for 60 days in exchange for weekly 30-min feedback calls. Would you be open to a quick demo?"
3. If yes → 30-min Loom walkthrough or live demo
4. If they want it → free access, weekly check-in
5. After 60 days → offer Starter or Growth plan at 50% off for first 3 months

**When to hire a sales person:**
After $10K MRR. Not before.
