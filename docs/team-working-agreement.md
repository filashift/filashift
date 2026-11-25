# FilaShift team working agreement

The Product Manager sets the outcome and its priority. Product Development turns that direction into small, testable changes. Ops decides when and how a change can safely go live. The Product Manager does not have to relay results, approve routine handoffs, or chase releases.

## Decision rights

| Owner | Decisions and work |
|---|---|
| Product Manager | Owns product direction, backlog order, desired outcomes and material scope tradeoffs. Reviews working results and can change priorities. |
| Product Development (development conversation) | Maintains the product backlog on the Product Manager’s behalf. Refines requests into acceptance criteria, experiments, designs, implements, tests the changed behavior, and sends evidence directly to Ops. Owns application defects returned by Ops. Does not deploy. |
| FilaShift Ops | Owns integration, sitewide regression, release timing and go/no-go, deployments, rollback, production monitoring, infrastructure, routine maintenance, security and vulnerability posture, and the official release summary. Can hold a release and return a reproducible defect directly to Development. |

## How work moves

1. **Backlog and planning:** Capture the user problem, intended outcome, priority, and how we will know it works. For each sprint, choose one outcome and a small set of items that support it. Development handles task breakdown; a new idea goes into the backlog unless the Product Manager changes the current priority.
2. **Build and inspect:** Work in small increments on a `dev/<topic>` branch from current master. Compare behavior with the acceptance criteria. For compatibility claims, test in the destination slicer; do not equate slicing with physical printing or a modified test case with an original pass.
3. **Send results as they arise:** Development sends Ops passes, failures, blocked or inconclusive checks, verified workarounds, and follow-ups, even for an experiment with no code change. An interim result is not a release request. Keep user project uploads local.
4. **Ready for Ops:** When a change meets its acceptance criteria, send the branch, base and tip commits, what changed for users, functional evidence, limitations, and any release considerations. Give localized user-facing notes when relevant. Use the existing Ops handoff ledger, not a second release tracker.
5. **Release or return:** Ops runs its checks and either releases or sends the blocker directly to Development. Development fixes and retests application defects. A passed development test means **ready for Ops**, not **live**. Mark a release item live only after Ops confirms production verification and records the release.
6. **Review and improve:** At sprint close, show the user-facing outcome against the sprint goal. Distinguish shipped work from release-ready work and experiments that ended without a release. Put feedback into the backlog and carry one concrete improvement into the next sprint when useful.

## Communication

Work asynchronously by default; this agreement schedules no meetings. Development and Ops resolve routine questions directly. Involve the Product Manager only for a product decision, material priority or scope tradeoff, or an authorization only the Product Manager can give. When escalating, state the decision needed, the options, and a recommendation.
