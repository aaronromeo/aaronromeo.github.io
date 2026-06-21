# OpenRouter Cost Optimization Post — Design Spec

**Date:** 2026-06-20
**Status:** Approved

---

## Goal

Convert `content/posts/2026-06-20-cost-optimizations-openrouter/openrouter-cost-patterns.md`
(a dense reference playbook) into a full-length blog post at
`content/posts/2026-06-20-cost-optimizations-openrouter/index.md` written in
Aaron's personal voice, preserving all technical content verbatim (configs, tables,
checklists) with voiced narrative wrappers.

---

## Output File

- **Create:** `content/posts/2026-06-20-cost-optimizations-openrouter/index.md`
- **Keep untouched:** `content/posts/2026-06-20-cost-optimizations-openrouter/openrouter-cost-patterns.md`
- **Draft state:** `draft: true`

---

## Voice Profile

Aaron's blog voice is **practical substance wrapped in self-deprecating wit**. Specific
techniques to embed throughout:

1. **Parenthetical asides** — self-deprecation, dad-joke punchlines, e.g. `(I realize this
   might be obvious to some of you)`.
2. **Song-lyric / cultural-riff section headers** — baseball theme (see below), restrained
   in rendered text.
3. **Inline TODO pun comments** — where a header or line *could* be punnier, leave an HTML
   comment: `<!-- TODO: could call this "Bottom of the Ninth" / rationale -->`. These are
   invisible when rendered; visible in source as a "director's commentary" track.
4. **Domestic/money/family metaphors** — frugal-dad energy, household analogies.
5. **The deadpan reframe beat** — state an obvious-in-hindsight insight, follow with a
   one-word or short deadpan sentence. E.g. "Revolutionary."
6. **Strikethrough humor** — at least one instance, e.g. `~~neuroses~~ workflow`.
7. **Pull-quote for the key principle** — one `>` blockquote capturing a core takeaway.
8. **Shameless plug flag** — if linking own work: `[!!!shameless plug warning!!!]`.
9. **Substance intact** — humor is the wrapper, not a substitute. Every config and table
   stays verbatim and useful.

---

## Theme

**Baseball**, restrained in rendered headers. Light touches only — "lineup," "bench,"
"bullpen," "small ball," etc. No forced puns in technical sections. Punnier alternatives
live only in TODO comments.

---

## Front Matter Template

```yaml
---
title: "<title from candidate list — see below>"
date: 2026-06-20T00:00:00Z
draft: true
tags:
  - llm
  - opencode
  - openrouter
  - cost
categories:
  - AI
summary: "<one-liner in Aaron's voice — frugal-dad burns $60, rebuilds the lineup>"
---
```

### Title Candidates (builder picks first, notes rest in TODO comment)

1. Playing Moneyball with My LLM Bill *(recommended rendered title)*
2. $60 Before Lunch: Benching Fusion-by-Default
3. Don't Send the Whole Bullpen to Field a Bunt *(recommended TODO alternate)*
4. Stop Paying Starting-Pitcher Money for Batting-Practice Work
5. My OpenRouter Bill Struck Out (So I Rebuilt the Lineup)
6. Small Ball: How I Cut My AI Coding Bill 70–90%

---

## Personal Backstory (Cold Open)

The hook: burned **$60 USD in a single morning** leaning on OpenRouter Fusion to help
reason through a gnarly observability stack (ClickHouse, OTEL collectors, Tailscale,
deprecated-vs-current SigNoz architecture corrections). By the time sanity returned, the
tab was open and so was a new attitude toward model selection.

**Anonymized:** Do NOT link to or name the specific repo or PR. Reference it only as
"an observability stack" or "an observability rabbit hole." The $60 figure and the
character of the work (gnarly config archaeology, lots of tool-call cycles) are fair game.

---

## Mandatory Accuracy Corrections (Fusion Docs Verified 2026-06-20)

Source: https://openrouter.ai/docs/guides/features/plugins/fusion

| What the source .md says | What to write instead |
|---|---|
| "runs 3–6 expert models in parallel" | "up to 8 models (1–8 configurable, default Quality preset is 3)" |
| "a judge synthesizes the answer" | "a judge **compares** the panel responses and returns structured analysis (consensus, contradictions, blind spots); **your model** then writes the final answer using that analysis" |
| "you pay the Fusion premium on every tool call cycle" | "you pay the panel+judge cost on every request where the model chooses to deliberate" (soften — the model decides per-request, not per tool-call step; recursion is blocked) |
| "Budget panel" (Pattern E) | "`general-budget` preset" |
| (missing) | ADD: panel and judge models each run web_search/web_fetch tool loops (up to `max_tool_calls`, default 8) — this is a cost multiplier beyond just N completions |
| (missing) | ADD: single-level recursion protection — panel/judge cannot re-invoke Fusion |

---

## Config Accuracy Corrections (Verified Against ~/.config/opencode/opencode.json)

The source .md has **illustrative** configs that differ from what Aaron actually runs.
All configs in the post must be corrected as follows:

1. **Model IDs are `openrouter/`-prefixed.** Use `openrouter/anthropic/claude-sonnet-4.6`,
   `openrouter/qwen/qwen3-coder`, etc. throughout.

2. **`setCacheKey` goes under `provider.openrouter`, NOT `provider.anthropic`.**
   Aaron routes all traffic through OpenRouter. The Pattern D config and §4 drop-in
   must reflect:
   ```jsonc
   "provider": {
     "openrouter": {
       "options": { "setCacheKey": true }
     }
   }
   ```

3. **`panel` agent model is `openrouter/openrouter/fusion`** (double-prefix — that is
   how the OpenRouter provider namespaces the `openrouter/fusion` alias).

4. **§4 "drop-in" config = Aaron's actual `~/.config/opencode/opencode.json` verbatim.**
   Use the full 194-line file including: `instructions`, `plugin`, the complete `permission`
   block (rtk allow-list, edit/write gating, bash `ask` defaults), and the full agent roster.
   Do not trim or summarize the permission block.

5. **Inline Pattern configs (Patterns A–H)** should use corrected prefixes and
   cache-key placement for internal consistency, even if not every field is shown.

---

## Structure Map (Source → Post)

Each row is one voiced section. Configs and tables inside each section stay verbatim.
Voiced content = the prose intro/outro around them.

| Post section | Maps from source | Key voiced treatment |
|---|---|---|
| **Cold open / intro** | TL;DR table | $60 backstory hook → "here's the lineup I run now" → recommended-stack table verbatim. Pull-quote here. |
| **§1: Why Fusion Isn't Your Everyday Starter** | §1 "Why Fusion Is Probably Overkill" | "Bullpen / starting pitcher" baseball framing. Keep good-for/wasteful-for lists. Corrected Fusion description (judge compares, model answers; per-request cost, not per tool-call). |
| **§2: The Eight Patterns (Patterns A–H)** | §2 Core Patterns | Each pattern: 1–2 sentence voiced intro, verbatim config/table, brief voiced kicker. TODO comment on each header for punnier baseball alternate. Corrected prefixes. |
| **§3: The Chat UI (When You Can't Use the Bullpen)** | §3 Chat UI Strategy | Light voiced wrapper, list kept verbatim. |
| **§4: The Full Roster (Drop-In Config)** | §4 Concrete Config | Short voiced intro, then the **full real `opencode.json` verbatim** (194 lines). Voiced daily-flow walkthrough after. |
| **§5: The Scoreboard (Cost Math)** | §5 Cost Math | Voiced "what I'm actually saving" framing; table verbatim; frugal-dad payoff line. |
| **§6: Cheapest Batters by Tier (Quick Reference)** | §6 Quick Reference | Voiced intro, tables verbatim. |
| **§7: Migrating Off Fusion in 15 Minutes (The Game Plan)** | §7 Checklist | Voiced wrapper, checklist verbatim. |
| **§8: The Blooper Reel (Things to Watch)** | §8 Things to Watch | Voiced "bloopers / wild pitches" framing, points kept. |
| **Closing / Further Reading** | §Further Reading | Sign-off in Aaron's voice — baseball-flavored equivalent of his "*That's all folks.*" Links kept. |

---

## Spec Self-Review Notes

- No TBDs or incomplete sections in this spec.
- All Fusion corrections sourced from official docs (verified 2026-06-20).
- All config corrections sourced from Aaron's actual `~/.config/opencode/opencode.json` (read 2026-06-20).
- Backstory is anonymized per user decision.
- Title candidates provided; builder uses #1 as rendered, parks others in a TODO comment.
- Full permission block explicitly required in §4 — no ambiguity.
