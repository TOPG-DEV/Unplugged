# Unplugged // OPERATOR

This repo is managed via the GSD (Get Shit Done) workflow. Planning, requirements, and execution state live in `.planning/`. Read those docs first before writing or editing code.

## Always read first

When opening this repo in a new Claude Code session:

1. `.planning/STATE.md` — current position, active phase, recent decisions, open blockers
2. `.planning/PROJECT.md` — project context, core value, requirements, constraints, key decisions
3. `.planning/ROADMAP.md` — phase structure and success criteria
4. `.planning/codebase/` — stack, architecture, structure, conventions, concerns (existing code map)

If you're starting a phase, also read `.planning/REQUIREMENTS.md` for the REQ-IDs assigned to that phase.

## Project summary

**What this is:** The private terminal for the Unplugged community — a wallet-gated Solana tools hub where King Cobra makes on-chain calls and members get the tools to follow them. Next.js 15 + React 19 + TypeScript + Solana wallet-adapter + MongoDB + Helius + Vercel Blob.

**Core value:** Give dormant Unplugged members a reason to show up daily and a reason to put money back in — by delivering working tools with real on-chain receipts, starting from day one and before any token is sold.

**Current milestone:** v1 (Phases 1–5). See `.planning/ROADMAP.md`.

## Workflow commands

- `/gsd-progress` — show where the project is, route to next action
- `/gsd-plan-phase N` — plan phase N before executing
- `/gsd-execute-phase N` — execute all plans in phase N
- `/gsd-transition` — close the active phase and advance
- `/gsd-status` / `/gsd-stats` — metrics
- Full list: `/gsd-help`

## Constraints every contributor (human or agent) must respect

- **Solo operator.** No features requiring a second admin to operate.
- **Ship-fast priority.** Prefer simpler solutions that ship. Don't over-engineer.
- **Tech stack is locked.** Next.js 15 + React 19 + TS + Tailwind v4 + MongoDB + Solana wallet-adapter. No framework migration.
- **Single-signer treasury for v1.** Squads multisig deferred to v2+.

## Security non-negotiables

Before ANY code lands on `main`:

- `.env` MUST NOT be committed. `.env.example` documents variable names only.
- Helius key MUST NOT be exposed to the browser. No `NEXT_PUBLIC_HELIUS_*`.
- Old wallet addresses `5ion3SqJHxr8wZkDF3qbKgBE2QCVQtHWYTyFAJ73R6Qm` and `6XeKc1F6pp44ti7DHe2AfeGpLe8fnSLLVnSKBJtouYZn` are retired. Do not reference in code, docs, or configs for new work.
- `$TOPG` token mint `9HSMssrVecFSs494Zw1QBZL5m3Wjtnic4o1nX6u7pump` is brand-retired. Do not reference.
- Admin-viewer pages (`/admin/*`, `/entries`) MUST have an auth guard before any future deploy.
- Presale / snipe endpoints MUST verify the on-chain signature server-side (signature, recipient, lamports). Never trust client-supplied amounts.

Phase 1 (Foundation) addresses the existing leaks. No other phase's code may ship to `main` while OPS-01 and OPS-02 are incomplete.

## Fuel Prime bot rules (FUEL-01)

Fuel has its own persona — sharp, lowercase, meme-fluent, operator-tone. Disclosure rules are permanent and baked into the system prompt. Out of scope permanently:

- Fuel claiming to be human
- Sockpuppet accounts posting as organic retail
- Framing automated signals as Fuel's own opinions
- Multiple "member-like" bots simulating community consensus

Fuel is openly a bot. `KING COBRA` stays pseudonymous (operator identity not disclosed) but Fuel never impersonates a human member.

## Coding conventions

See `.planning/codebase/CONVENTIONS.md` for detail. Highlights:

- TypeScript strict, `@/*` → `src/*` path alias
- React components: `PascalCase.tsx`; Next.js conventional files lowercase
- API routes: `export async function GET|POST(req)` + `NextResponse.json(...)`
- Use `clientPromise` from `src/lib/mongo.ts` for all Mongo access — **never** `new MongoClient(uri)` in a route (existing anti-pattern to fix)
- One MongoDB database name going forward (migration is part of Phase 1/2 cleanup — current code has both `unpluggedDB` and `unplugged`)
- Scoring logic lives in one place: `src/lib/scoring.ts` (Phase 2). Dashboard and leaderboard must agree.

## Known concerns (inherited from v1)

Full list in `.planning/codebase/CONCERNS.md`. Top ones:

- Committed `.env` with live secrets (Phase 1 OPS-02)
- `NEXT_PUBLIC_HELIUS_API_KEY` leaks to browser (Phase 1 OPS-02)
- Hardcoded QuikNode RPC URL with API key in `src/app/providers.tsx` (Phase 1 OPS-02)
- Unauthenticated `/admin/*` and `/entries` pages
- `CountdownTimer` targets a past date with a zero-indexed month bug
- `/api/save-telegram` destructures `name` but client sends `username` — fields silently dropped
- Three API routes open fresh MongoClient per request instead of pooling
- Two MongoDB database names used simultaneously (`unpluggedDB` vs `unplugged`)

## Commit conventions

- Planning docs: commit locally via `gsd-sdk query commit "message" <files>` or manual `git commit` with the same message style
- Message prefix: `docs:` for planning, `chore:` for config, `feat:` for new features, `fix:` for bugs, `refactor:` for cleanups
- Include a trailer on Claude-authored commits:
  ```
  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```
- Each phase plan is atomic — commit after each plan completes so rollback works

## Don't push `.planning/` to GitHub without a decision

`.planning/` contains strategic playbook, past-failure context, and operator detail that's safe in a local repo but sensitive on a remote. Treat pushes to `origin` as a separate decision from local commits. Confirm with the operator before pushing planning docs.

## Project code name

None set (`project_code: null` in `.planning/config.json`). Commit messages and branch names use plain text until one is set.
