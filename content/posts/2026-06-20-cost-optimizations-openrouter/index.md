<!-- TODO: Title candidates if you want to punch it up:
  - "$60 Before Lunch: Benching Fusion-by-Default"
  - "Don't Send the Whole Bullpen to Field a Bunt" (most baseball-punny)
  - "Stop Paying Starting-Pitcher Money for Batting-Practice Work"
  - "My OpenRouter Bill Struck Out (So I Rebuilt the Lineup)"
  - "Small Ball: How I Cut My AI Coding Bill 70–90%"
-->
---
title: "Playing Moneyball with My LLM Bill"
date: 2026-06-20T00:00:00Z
draft: true
tags:
  - llm
  - opencode
  - openrouter
  - cost
categories:
  - AI
summary: "How a $60 morning and an observability rabbit hole convinced me to stop using Fusion as my default model and build a cheaper, smarter lineup."
---

There are moments in life that clarify your values. Watching your kid's first steps. The first coffee of the morning. Opening your OpenRouter activity dashboard mid-afternoon and realising you've spent **$60 in a single morning** because you had Fusion set as your default model.

I had been using [OpenRouter Fusion](https://openrouter.ai/docs/guides/features/plugins/fusion) to help me reason through a gnarly observability stack — deprecated vs current architectures, ClickHouse configs, collector wiring, Tailscale bindings, the usual archaeology. Genuinely hard work. Fusion is brilliant for that kind of thing. The problem is I also had it running for every trivial tool-call cycle in between: reading files, grepping the repo, writing one-liner edits. Fusion doesn't know the difference. It convenes the panel every time the model decides to deliberate, and the meter runs on all of them simultaneously.

By lunch, I had a bill and a policy change.

This is the playbook that came out of it. It's my actual OpenCode config, the reasoning behind it, and a migration checklist if you want to copy it. All prices are **USD per 1M tokens** (input / output) from `https://openrouter.ai/api/v1/models` — run `curl -s https://openrouter.ai/api/v1/models | jq` if the numbers feel stale.

> _The cheapest token is the one you don't send. The second cheapest is the one sent by the wrong model._

<!-- TODO: could call this "The Lineup Card" — like a baseball manager's card with each position and who's playing it -->
## The Starting Lineup — If You Only Read One Section

If you only read one section, here's the roster I run:

| Role | Model | $/1M in | $/1M out | Why |
|---|---|---|---|---|
| **Planner / architect** (you, in TUI) | `openrouter/anthropic/claude-opus-4.8` or `openrouter/openai/gpt-5.1-codex` | 5.00 / 1.25 | 25.00 / 10.00 | Best reasoning per dollar at the frontier tier; both have huge cache discounts |
| **Builder** (default `build` agent) | `openrouter/anthropic/claude-sonnet-4.6` | 3.00 | 15.00 | Sonnet 4.6 is the sweet-spot for agentic editing; 90% cache read discount |
| **Cheap executor** (subagents, bulk edits) | `openrouter/qwen/qwen3-coder` or `openrouter/z-ai/glm-4.6` | 0.22 / 0.43 | 1.80 / 1.74 | 5–10× cheaper than Sonnet for grunt work; both are strong on code |
| **Search / explore subagent** | `openrouter/google/gemini-2.5-flash` | 0.30 | 2.50 | 1M context + fast; ideal for read-only repo grepping |
| **Trivial work** (titles, summaries, simple edits) | `openrouter/google/gemini-2.5-flash-lite` or `openrouter/openai/gpt-5-nano` | 0.10 / 0.05 | 0.40 / 0.40 | Effectively free; use for `small_model` |
| **Wildcard cheap powerhouse** | `openrouter/x-ai/grok-4.20` | 1.25 | 2.50 | Frontier-class reasoning at mid-tier pricing, 2M context |

**Expected savings vs Fusion**: Fusion runs a panel of up to 8 models plus a judge per request (each with their own web search/fetch loops). Replacing it with this stack typically yields **60–85% cost reduction** for daily coding while keeping (or improving) execution quality. Fusion remains useful — but as an explicit, on-demand tool, not the default.

<!-- TODO: could call this "Don't Pinch-Hit Your Whole Bench to Bunt" — but that might be too inside baseball even for this post -->
## 1. Why Fusion Isn't Your Everyday Starter

[Fusion](https://openrouter.ai/docs/guides/features/plugins/fusion) is genuinely elegant. You send a request, your model decides whether to invoke the `openrouter:fusion` tool, and when it does, a configurable panel of up to 8 models (default Quality preset: 3) answers your prompt in parallel — each with web search and web fetch available. A judge model then compares their responses and returns structured analysis: consensus points, contradictions, partial coverage, unique insights, blind spots. Your model reads that analysis and writes the final answer. There's even recursion protection — the panel and judge can't re-invoke Fusion, so it stays bounded to a single deliberation cycle.

It's brilliant for:
- High-stakes architectural decisions
- Research questions where being wrong is expensive
- Debugging a bug that has resisted normal models
- "Is this approach actually correct?" sanity checks on complex output

It's wasteful for:
- "Rename this variable across the repo"
- "Add a try/catch around this block"
- "What does this function do?"
- "Write a test for this"
- The dozens of file-read and grep tool calls that happen inside any agentic coding loop

The billing reality: every request where your model chooses to deliberate pays for the full panel (up to 8 models, each potentially running tool-call loops up to `max_tool_calls` iterations) plus the judge. For a five-model panel with web search enabled, you're paying for six models' worth of completions and tool loops — on that single request. Set it as your default model and it makes that call every time it feels uncertain. Which, during messy config archaeology, is often.

**The shift**: stop using Fusion as your default; invoke it as a ~~crutch~~ second opinion when you actually need a panel.

<!-- TODO: could call this "Two Pitchers, One Game" — the starter (plan) and the closer (build) -->
## 2. The Eight Patterns

### Pattern A — Plan/Execute Split

This one is the reason I ended up with a bill. Once you separate *reasoning through the problem* from *executing the solution*, the cost math gets obvious. Planning is short, high-quality, expensive-per-token but low-volume. Execution is long, mechanical, high-volume. You want to pay frontier prices for the former and bargain prices for the latter. (Revolutionary, I know.)

**Why it works**: Planning is reasoning-heavy and short (low token volume, high quality bar). Execution is mechanical and long (high token volume, lower quality bar). You're optimizing where the dollars actually go.

**Pairings**:

| Plan model | Build model | Rationale |
|---|---|---|
| `openrouter/anthropic/claude-opus-4.8` | `openrouter/anthropic/claude-sonnet-4.6` | Same family → consistent style, smooth handoff |
| `openrouter/openai/gpt-5.1-codex` | `openrouter/openai/gpt-5.1-codex-mini` | Same family, codex-tuned both ends |
| `openrouter/anthropic/claude-opus-4.8` | `openrouter/qwen/qwen3-coder` | Max savings (~$0.22/1M in vs $3) when Qwen can handle it |
| `openrouter/google/gemini-2.5-pro` | `openrouter/google/gemini-2.5-flash` | 1M context on both; cheap planner ($1.25/1M in) |

**OpenCode config** (`~/.config/opencode/opencode.json` excerpt):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "model": "openrouter/anthropic/claude-sonnet-4.6",
  "small_model": "openrouter/google/gemini-2.5-flash-lite",
  "agent": {
    "plan": {
      "model": "openrouter/anthropic/claude-opus-4.8",
      "reasoningEffort": "high"
    },
    "build": {
      "model": "openrouter/anthropic/claude-sonnet-4.6"
    }
  }
}
```

**Workflow**: start in `plan` (Tab key in TUI), iterate on the plan, switch to `build` to execute. Opus is only billed during planning.

<!-- TODO: could call this "The Farm System" — expensive closer manages cheap minor-leaguers who do the fieldwork -->
### Pattern B — Orchestrator + Cheap Subagents

The primary agent (Sonnet/Opus class) acts as a router. It dispatches well-scoped tasks to cheap subagents, then reviews and integrates the results. The expensive model only holds the high-level conversation. The bulk-token work — reading files, grepping, drafting edits — happens in subagent contexts using 5–10× cheaper models. The orchestrator only sees the **summary** the subagent returns, not the full tool-call transcript. (This is the same principle OpenCode's Task tool is built on. You're just being intentional about which models fill the cheap seats.)

**OpenCode config**:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "model": "openrouter/anthropic/claude-sonnet-4.6",
  "small_model": "openrouter/google/gemini-2.5-flash-lite",
  "agent": {
    "explore": {
      "model": "openrouter/google/gemini-2.5-flash",
      "description": "Fast read-only codebase exploration"
    },
    "general": {
      "model": "openrouter/qwen/qwen3-coder",
      "description": "Multi-step implementation tasks with full tool access"
    },
    "scout": {
      "model": "openrouter/google/gemini-2.5-flash",
      "description": "Dependency research and upstream code inspection"
    },
    "bulk-editor": {
      "mode": "subagent",
      "model": "openrouter/qwen/qwen3-coder-flash",
      "description": "Mechanical refactors, find/replace, formatting fixes across many files",
      "prompt": "You make small, mechanical edits across a codebase. Do not redesign anything. Apply the requested change exactly. Report what you changed."
    },
    "test-writer": {
      "mode": "subagent",
      "model": "openrouter/deepseek/deepseek-v3.2",
      "description": "Writes unit tests for functions specified by the orchestrator",
      "prompt": "Write tests for the given function. Match the project's existing test style. Do not modify implementation code."
    },
    "doc-writer": {
      "mode": "subagent",
      "model": "openrouter/z-ai/glm-4.6",
      "description": "Writes or updates docstrings, READMEs, and code comments",
      "permission": { "bash": "deny" }
    }
  }
}
```

**Invocation**: `@bulk-editor rename all calls to getCwd → getCurrentWorkingDirectory` or let the orchestrator route automatically.

<!-- TODO: could call this "The Batting Order" — you send up your weakest hitter first, escalate to your cleanup if needed -->
### Pattern C — Escalation Ladder

Start cheap. Escalate only when the cheap model fumbles. Most of the time it won't. (I continue to be surprised by how much heavy lifting Qwen3 handles without complaint — unlike certain children I know who refuse to put their shoes on without a full production.)

**Ladder**:
1. **Tier 3** (`openrouter/google/gemini-2.5-flash-lite`, `openrouter/openai/gpt-5-nano`): Trivial — formatting, renames, single-line edits
2. **Tier 2** (`openrouter/qwen/qwen3-coder`, `openrouter/z-ai/glm-4.6`, `openrouter/deepseek/deepseek-v3.2`): Standard implementation, refactors, tests
3. **Tier 1** (`openrouter/anthropic/claude-sonnet-4.6`, `openrouter/openai/gpt-5.1-codex`): Cross-file logic, debugging, design judgment
4. **Frontier** (`openrouter/anthropic/claude-opus-4.8`, `openrouter/openai/gpt-5.2-pro`, Fusion): Architecture, hairy concurrency, security-critical code

**Trigger to escalate**:
- Cheap model hits its max steps without resolving
- It produces code that fails tests twice in a row
- It explicitly says "I'm unsure" or asks the same clarifying question repeatedly
- You catch a hallucinated API in its output

**Implementation**: keep three primary agents (`cheap`, `build`, `deep`). Cycle them with **Tab**.

```jsonc
{
  "agent": {
    "cheap": {
      "mode": "primary",
      "model": "openrouter/qwen/qwen3-coder",
      "description": "First-pass executor for routine coding tasks"
    },
    "build": {
      "mode": "primary",
      "model": "openrouter/anthropic/claude-sonnet-4.6",
      "description": "Standard agent for non-trivial implementation"
    },
    "deep": {
      "mode": "primary",
      "model": "openrouter/anthropic/claude-opus-4.8",
      "reasoningEffort": "high",
      "description": "Escalation tier for hard reasoning and architecture"
    }
  }
}
```

<!-- TODO: could call this "The Home Field Advantage" — familiar context = cheaper tokens, like playing in a ballpark your pitchers know -->
### Pattern D — Aggressive Prompt Caching

This is the single biggest lever that isn't a model swap. OpenRouter passes through cache discounts from upstream providers automatically when you reuse prefixes. The key: all your traffic routes through OpenRouter, so `setCacheKey` goes under `provider.openrouter` — not `provider.anthropic` as you might expect from the Anthropic docs.

**Cache read discounts** (from the model data):

| Provider family | Cache read price | Discount vs input |
|---|---|---|
| Anthropic Sonnet/Opus | 10% of input | **90% off** |
| Anthropic Haiku | 10% of input | **90% off** |
| OpenAI GPT-5.x | 10% of input | **90% off** |
| Google Gemini 2.5 | 10% of input | **90% off** |
| z-ai GLM 4.6 | ~19% of input | ~80% off |
| Qwen3 Coder Plus | 20% of input | 80% off |
| DeepSeek V3.1 | ~60% of input | ~40% off |
| Most Mistral / Llama / Kimi | No cache pricing exposed | none |

**How to maximize cache hits**:
1. **Stable system prompts**: Keep `instructions` and agent `prompt` files unchanged across a session. Edit them and the cache gets invalidated.
2. **Front-load static context**: Put project rules, file trees, and "always read" files at the start of the conversation. Dynamic content (your latest question) goes last.
3. **Long sessions > many short sessions**: Each new session rebuilds the cache. Compaction preserves it.
4. **Enable `setCacheKey`** for OpenRouter:

```jsonc
{
  "provider": {
    "openrouter": {
      "options": { "setCacheKey": true }
    }
  }
}
```

5. **Reuse agents** instead of rewriting prompts inline.

A coding session that bounces between `@explore` (Gemini Flash) and `build` (Sonnet 4.6) can easily hit **80%+ cache rates** after the first few turns, making effective input cost drop to ~$0.30/1M for Sonnet.

<!-- TODO: could call this "Calling In the Closer" — you don't bring Mariano Rivera in the third inning -->
### Pattern E — Fusion as a Tool, Not a Default

Keep Fusion in the ~~panic button~~ toolbox, but only call it explicitly.

**When to invoke Fusion**:
- Design decisions where you'd want three senior engineers to weigh in
- Debugging a bug that has resisted normal models
- Security-sensitive code review
- "Is this approach actually correct?" sanity checks

**Configure a dedicated Fusion agent** that you `@`-mention deliberately:

```jsonc
{
  "agent": {
    "panel": {
      "mode": "subagent",
      "model": "openrouter/openrouter/fusion",
      "description": "Multi-model deliberation panel. Use only for high-stakes decisions where being wrong is expensive — architecture choices, security review, persistent bug diagnosis. NOT for routine coding.",
      "permission": { "edit": "deny", "bash": "deny" }
    }
  }
}
```

Usage: `@panel should this service use Postgres LISTEN/NOTIFY or a separate message queue?`

You can also pick a cheaper panel by using the `general-budget` preset — see [Fusion docs](https://openrouter.ai/docs/guides/features/plugins/fusion).

<!-- TODO: could call this "Small Ball" — manufacturing runs with what you have, not swinging for the fences on every pitch -->
### Pattern F — Context Discipline

The cheapest token is the one you don't send. This compounds with every pattern above.

**Tactics**:
- **Use `rtk` proxies** — they cut bash output by 80–95%. `rtk ls`, `rtk grep`, `rtk read`, `rtk git diff`. The permission block in my config (see §4) gates raw bash behind `ask` permissions specifically to nudge toward `rtk`.
- **Delegate file reads to subagents**. The orchestrator sees the agent's 200-token summary, not the 50K-token file dump.
- **Use the `explore` subagent for searches** rather than running grep in the main session.
- **Enable compaction with pruning** for long sessions:

```jsonc
{
  "compaction": {
    "auto": true,
    "prune": true,
    "reserved": 10000
  }
}
```

- **Cap step counts** on cheap-tier agents so a confused model can't burn 50 tool calls:

```jsonc
{
  "agent": {
    "bulk-editor": { "steps": 15 },
    "test-writer": { "steps": 10 }
  }
}
```

- **Restrict tools per agent**. A `doc-writer` doesn't need bash. A `code-reviewer` doesn't need edit. Fewer tools = shorter tool definitions in every prompt = fewer cached-prefix tokens.

<!-- TODO: could call this "Match the Pitcher to the Batter" — or "Scouting the Opposition" -->
### Pattern G — Model-as-a-Specialist

Different models have genuinely different strengths. Match them to task type.

| Task type | Best fit | Backup |
|---|---|---|
| Long-context refactor (>200K tokens of code) | `openrouter/google/gemini-2.5-pro` (1M ctx, $1.25 in) | `openrouter/qwen/qwen3-coder` (1M ctx, $0.22 in) |
| Mechanical bulk edits | `openrouter/qwen/qwen3-coder-flash` ($0.20 in) | `openrouter/deepseek/deepseek-v3.2` |
| Test writing | `openrouter/deepseek/deepseek-v3.2` (reasoning, cheap) | `openrouter/anthropic/claude-haiku-4.5` |
| Code review / read-only critique | `openrouter/anthropic/claude-sonnet-4.6` | `openrouter/z-ai/glm-4.6` |
| Tool-calling chains (lots of tools) | Anthropic Claude family | OpenAI GPT-5.x |
| Reasoning-heavy debugging | `openrouter/anthropic/claude-opus-4.8` | `openrouter/openai/gpt-5.1-codex-max` |
| Documentation prose | `openrouter/z-ai/glm-4.6` ($0.43 in) | `openrouter/google/gemini-2.5-flash` |
| Title/summary generation | `openrouter/google/gemini-2.5-flash-lite` ($0.10 in) | `openrouter/openai/gpt-5-nano` ($0.05 in) |

<!-- TODO: could call this "Adjusting the Pitch Count" — same arm, different effort level -->
### Pattern H — Variants for Effort Control

Instead of swapping models, swap reasoning effort. A single model can serve 3 tiers. (This is the pitching equivalent of choosing between a fastball and a changeup — same arm, different energy expenditure.)

```jsonc
{
  "provider": {
    "openrouter": {
      "models": {
        "openrouter/anthropic/claude-sonnet-4.6": {
          "variants": {
            "fast": { "thinking": { "type": "disabled" } },
            "med":  { "thinking": { "type": "enabled", "budgetTokens": 4000 } },
            "deep": { "thinking": { "type": "enabled", "budgetTokens": 16000 } }
          }
        },
        "openrouter/openai/gpt-5.1-codex": {
          "variants": {
            "fast": { "reasoningEffort": "minimal" },
            "med":  { "reasoningEffort": "medium" },
            "deep": { "reasoningEffort": "high" }
          }
        }
      }
    }
  }
}
```

Cycle variants with the `variant_cycle` keybind. Most prompts work fine on `fast` — bump to `deep` only when you hit a problem.

<!-- TODO: could call this "Playing on the Road" — no home-field subagent advantages in the chat UI -->
## 3. The Chat UI (When You Can't Use the Bullpen)

You don't get subagents or model routing in the chat UI, but you can still cut costs without suffering through inferior output. Think of it as playing away games — you work with what you've got.

1. **Default model**: set it to Sonnet 4.6 or Gemini 2.5 Pro instead of Fusion.
2. **Use presets**: save a "Cheap" preset (Qwen3 Coder) and a "Deep" preset (Opus 4.8). Toggle per conversation.
3. **Manual escalation**: when a Qwen3/GLM answer feels off, paste it into a new chat with Opus and ask "Is this right?". Much cheaper than running Opus from the start.
4. **Use the Fusion `general-budget` preset** when you do want a panel.
5. **Keep system prompts short** — they're part of the cached prefix; long ones cost on every turn until cached.

<!-- TODO: could call this "The Full Scorecard" or "The Complete Roster" -->
## 4. The Full Roster (Drop-In Config)

This is my actual `~/.config/opencode/opencode.json` — the whole thing, nothing trimmed. It combines Patterns A + B + D + F and is the config I've been running since the $60 incident. The `permission` block might look excessive, but it's doing real work: gating destructive bash behind `ask` while allowing all the `rtk` proxy commands freely. Paste it, review the permission entries for your own comfort level, and adjust the model IDs if you have different provider access.

Save to `~/.config/opencode/opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",

  "instructions": ["AGENTS.md"],

  "plugin": ["superpowers@git+https://github.com/obra/superpowers.git"],

  "model": "openrouter/anthropic/claude-sonnet-4.6",
  "small_model": "openrouter/google/gemini-2.5-flash-lite",

  "provider": {
    "openrouter": {
      "options": { "setCacheKey": true }
    }
  },

  "compaction": {
    "auto": true,
    "prune": true,
    "reserved": 10000
  },

  "permission": {
    "bash": {
      "*": "ask",

      "curl *": "ask",
      "wget *": "ask",
      "sed *": "ask",
      "kill *": "ask",
      "npm install": "ask",

      "cat *": "allow",
      "find *": "allow",
      "grep *": "allow",
      "head *": "allow",
      "tail *": "allow",
      "ls *": "allow",
      "echo *": "allow",
      "pwd": "allow",
      "sleep *": "allow",
      "true *": "allow",
      "jq *": "allow",
      "wc *": "allow",

      "git diff *": "ask",
      "git log": "ask",
      "git status": "ask",

      "terraform output *": "allow",
      "terraform plan *": "allow",

      "rtk *": "allow",
      "rtk ls *": "allow",
      "rtk tree *": "allow",
      "rtk read *": "allow",
      "rtk find *": "allow",
      "rtk grep *": "allow",
      "rtk wc *": "allow",
      "rtk json *": "allow",
      "rtk diff *": "allow",
      "rtk log *": "allow",
      "rtk smart *": "allow",
      "rtk summary *": "allow",
      "rtk env": "allow",
      "rtk deps *": "allow",
      "rtk err *": "allow",
      "rtk test *": "allow",

      "rtk git diff *": "allow",
      "rtk git log *": "allow",
      "rtk git status": "allow",
      "rtk git *": "allow",
      "rtk gh *": "allow",
      "rtk gt *": "allow",

      "rtk go build *": "allow",
      "rtk go run *": "allow",
      "rtk go test *": "allow",
      "rtk go *": "allow",
      "rtk cargo *": "allow",
      "rtk dotnet *": "allow",

      "rtk tsc *": "allow",
      "rtk lint *": "allow",
      "rtk prettier *": "allow",
      "rtk format *": "allow",
      "rtk next *": "allow",
      "rtk vitest *": "allow",
      "rtk playwright *": "allow",
      "rtk prisma *": "allow",
      "rtk npm *": "allow",
      "rtk npx *": "allow",
      "rtk pnpm *": "allow",

      "rtk ruff *": "allow",
      "rtk pytest *": "allow",
      "rtk mypy *": "allow",
      "rtk pip *": "allow",

      "rtk docker *": "allow",
      "rtk kubectl *": "allow",
      "rtk aws *": "allow",
      "rtk psql *": "allow",
      "rtk curl *": "allow",
      "rtk wget *": "allow",

      "rtk gain": "allow",
      "rtk gain *": "allow",
      "rtk cc-economics *": "allow",
      "rtk session *": "allow",
      "rtk config": "allow"
    },
    "edit": {
      "*": "ask",
      "*.md": "allow",
      "*.txt": "allow"
    },
    "write": {
      "*": "ask",
      "README.md": "allow"
    },
    "read": "allow",
    "glob": "allow",
    "list": "allow",
    "task": "allow",
    "webfetch": "allow",
    "websearch": "allow",
    "codesearch": "allow"
  },

  "agent": {
    "plan": {
      "model": "openrouter/anthropic/claude-opus-4.8",
      "reasoningEffort": "high",
      "description": "Architecture, design, and planning. No edits."
    },
    "build": {
      "model": "openrouter/anthropic/claude-sonnet-4.6",
      "description": "Default agent for implementation."
    },
    "cheap": {
      "mode": "primary",
      "model": "openrouter/qwen/qwen3-coder",
      "description": "First-pass executor for routine coding tasks. Escalate to build if stuck.",
      "steps": 30
    },
    "explore": {
      "model": "openrouter/google/gemini-2.5-flash",
      "description": "Fast read-only codebase exploration with 1M context"
    },
    "general": {
      "model": "openrouter/qwen/qwen3-coder",
      "description": "Multi-step implementation tasks in an isolated subagent context"
    },
    "scout": {
      "model": "openrouter/google/gemini-2.5-flash",
      "description": "Dependency research and upstream code inspection"
    },
    "bulk-editor": {
      "mode": "subagent",
      "model": "openrouter/qwen/qwen3-coder-flash",
      "description": "Mechanical refactors and find/replace across many files",
      "prompt": "You make small, mechanical edits. Do not redesign. Apply the requested change exactly. Report what changed.",
      "steps": 15
    },
    "test-writer": {
      "mode": "subagent",
      "model": "openrouter/deepseek/deepseek-v3.2",
      "description": "Writes unit tests matching the project's existing style",
      "prompt": "Write tests for the given function. Match existing test conventions. Do not modify implementation code.",
      "steps": 10,
      "permission": { "bash": { "*": "ask", "npm test*": "allow", "pytest*": "allow", "go test*": "allow" } }
    },
    "doc-writer": {
      "mode": "subagent",
      "model": "openrouter/z-ai/glm-4.6",
      "description": "Docstrings, comments, READMEs",
      "permission": { "bash": "deny" }
    },
    "panel": {
      "mode": "subagent",
      "model": "openrouter/openrouter/fusion",
      "description": "Multi-model deliberation. Use ONLY for high-stakes decisions where cost of being wrong outweighs a few extra dollars in completion costs.",
      "permission": { "edit": "deny", "bash": "deny" }
    },
    "deep": {
      "mode": "primary",
      "model": "openrouter/anthropic/claude-opus-4.8",
      "reasoningEffort": "high",
      "description": "Escalation tier for hard reasoning and architecture decisions"
    }
  }
}
```

**Daily flow with this config**:
1. New task → start in `build` (Sonnet 4.6 — solid default).
2. Big or unfamiliar task → Tab to `plan` first, then Tab to `build`.
3. Routine refactor or boilerplate → Tab to `cheap` (Qwen3 Coder).
4. Build will auto-route to `explore`, `general`, `bulk-editor`, `test-writer`, `doc-writer` as appropriate.
5. Stuck on a hard problem → Tab to `deep` (Opus 4.8).
6. Need a panel → `@panel <question>`.

<!-- TODO: could call this "Checking the Scoreboard" or "Box Score" -->
## 5. The Scoreboard (Cost Math)

Numbers, because otherwise this is just vibes-based frugality. Assume a typical coding session: ~300K input tokens, ~30K output tokens (real-world ratios for agentic loops with caching).

| Setup | Effective $/session* | Notes |
|---|---|---|
| Fusion (Quality preset, ~3 models × judge, each with tool loops) | ~$8–15 | Pays for every panel member and the judge, each potentially running web search/fetch loops |
| Pure Opus 4.8 | ~$2.25 | $5 × 0.3M + $25 × 0.03M |
| Pure Sonnet 4.6 | ~$1.35 | $3 × 0.3M + $15 × 0.03M |
| Sonnet 4.6 with 80% cache hit | **~$0.51** | Cache reads at $0.30/1M |
| Qwen3 Coder (no cache) | **~$0.12** | $0.22 × 0.3M + $1.80 × 0.03M |
| Hybrid: Sonnet orchestrator + Qwen3 subagents (typical 70/30 split) | **~$0.55–0.85** | Best quality/cost ratio |

\* Rough order-of-magnitude. Real numbers vary with task complexity, cache behaviour, and how often you escalate.

**Realistic expectation**: replacing Fusion-default with the recommended stack saves **70–90% on routine coding** while preserving quality for the work that matters. My $60 morning would have cost roughly $4–7 with this config. (The observability archaeology probably warranted a panel. The file-reading in between did not.)

<!-- TODO: could call this "The Farm System Rankings" or "Scouting Report" -->
## 6. The Cheapest Batters by Tier (Quick Reference)

From OpenRouter live API, sorted by blended `3×input + 1×output` cost per 1M tokens. Verify with `curl -s https://openrouter.ai/api/v1/models | jq` — model availability and pricing shifts.

### Frontier (planning, architecture)
1. `openrouter/x-ai/grok-4.20` — $1.25 / $2.50, 2M ctx ⭐ underrated
2. `openrouter/x-ai/grok-4.3` — $1.25 / $2.50, 1M ctx
3. `openrouter/google/gemini-2.5-pro` — $1.25 / $10.00, 1M ctx
4. `openrouter/openai/gpt-5.1-codex` — $1.25 / $10.00, 400K ctx
5. `openrouter/openai/gpt-5.1-codex-max` — $1.25 / $10.00, 400K ctx
6. `openrouter/anthropic/claude-sonnet-4.6` — $3.00 / $15.00, 1M ctx
7. `openrouter/anthropic/claude-opus-4.8` — $5.00 / $25.00, 1M ctx

### Mid-tier (execution)
1. `openrouter/qwen/qwen3-235b-a22b-thinking-2507` — $0.10 / $0.10, 262K ctx (reasoning!)
2. `openrouter/openai/gpt-5-nano` — $0.05 / $0.40, 400K ctx
3. `openrouter/qwen/qwen3-coder-flash` — $0.195 / $0.975, 1M ctx
4. `openrouter/deepseek/deepseek-v3.2` — $0.23 / $0.34, 131K ctx (reasoning)
5. `openrouter/qwen/qwen3-coder` — $0.22 / $1.80, 1M ctx
6. `openrouter/z-ai/glm-4.6` — $0.43 / $1.74, 203K ctx (reasoning)
7. `openrouter/openai/gpt-5.1-codex-mini` — $0.25 / $2.00, 400K ctx
8. `openrouter/google/gemini-2.5-flash` — $0.30 / $2.50, 1M ctx

### Cheap (small edits, lookups, `small_model`)
1. `openrouter/mistralai/mistral-nemo` — $0.02 / $0.03, 131K ctx
2. `openrouter/openai/gpt-5-nano` — $0.05 / $0.40, 400K ctx
3. `openrouter/google/gemini-2.5-flash-lite` — $0.10 / $0.40, 1M ctx
4. `openrouter/openai/gpt-4.1-nano` — $0.10 / $0.40, 1M ctx
5. `openrouter/qwen/qwen3-coder-30b-a3b-instruct` — $0.07 / $0.27, 160K ctx

### Hidden gems (≥200K ctx, dirt cheap, tool-capable)
- `openrouter/meta-llama/llama-4-scout` — $0.10 / $0.30, **10M ctx** (yes, ten million)
- `openrouter/qwen/qwen3-coder-next` — $0.11 / $0.80, 262K ctx
- `openrouter/qwen/qwen3-235b-a22b-2507` — $0.09 / $0.10, 262K ctx
- `openrouter/nvidia/nemotron-3-nano-30b-a3b` — $0.05 / $0.20, 262K ctx

<!-- TODO: could call this "Spring Training" or "The Scouting Trip" — getting your roster ready -->
## 7. Migrate Off Fusion-Default in 15 Minutes (The Game Plan)

- [ ] Drop the config from §4 into `~/.config/opencode/opencode.json`
- [ ] Confirm `provider.openrouter.options.setCacheKey: true` is set (already in the config — but double-check it's under `openrouter`, not `anthropic`)
- [ ] Enable compaction pruning (already in the config)
- [ ] Test with a routine task in `build` — verify Sonnet 4.6 works as expected
- [ ] Try `@bulk-editor` on a real refactor — see if Qwen3 Coder Flash holds up
- [ ] Save your old Fusion preset in the OpenRouter UI for the rare cases you want it
- [ ] After a week, check `https://openrouter.ai/activity` and compare spend vs the prior week
- [ ] Adjust: if Qwen3 fumbles too often, swap `cheap`/`general` to `openrouter/z-ai/glm-4.6` or `openrouter/anthropic/claude-haiku-4.5`

<!-- TODO: could call this "The Blooper Reel" or "Wild Pitches" -->
## 8. The Blooper Reel (Things to Watch)

A few wild pitches to watch for:

- **Quality drift on cheap models**: Qwen3 / DeepSeek / GLM are excellent in 2026 but still occasionally hallucinate APIs in less common languages or frameworks. If you work in something niche, keep a frontier model as the default.
- **Tool-calling reliability**: Anthropic and OpenAI models are still the gold standard for long tool-call chains. If a cheap model gets stuck in tool loops, escalate.
- **Context window ≠ effective context**: A 1M-token model gets dumber past ~200K. Don't dump the entire repo unless you actually need to.
- **Cache invalidation is silent**: changing an `instructions` file or agent `prompt` mid-session voids the cache. Settle your prompts before long sessions.
- **Free tier (`:free` models)**: tempting, but typically log/train on your prompts. Avoid for proprietary code.

---

## Further Reading

- OpenRouter live models API: `https://openrouter.ai/api/v1/models`
- OpenRouter activity dashboard: `https://openrouter.ai/activity`
- OpenCode agents docs: `https://opencode.ai/docs/agents`
- OpenCode models docs: `https://opencode.ai/docs/models`
- Fusion plugin docs: `https://openrouter.ai/docs/guides/features/plugins/fusion`

*Play ball.*