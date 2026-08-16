# OpenRouter Cost-Reduction Patterns for Coding Workflows

A practical playbook for cutting OpenRouter spend while maintaining quality on coding tasks, with concrete model pairings and copy-pasteable config for **OpenCode** and the **OpenRouter Chat UI**.

All prices below are **USD per 1M tokens** (input / output), pulled live from `https://openrouter.ai/api/v1/models`. Verify with `curl -s https://openrouter.ai/api/v1/models | jq` if numbers feel stale.

---

## TL;DR — The Recommended Stack

If you only read one section, do this:

| Role | Model | $/1M in | $/1M out | Why |
|---|---|---|---|---|
| **Planner / architect** (you, in TUI) | `anthropic/claude-opus-4.8` or `openai/gpt-5.1-codex` | 5.00 / 1.25 | 25.00 / 10.00 | Best reasoning per dollar at the frontier tier; both have huge cache discounts |
| **Builder** (default `build` agent) | `anthropic/claude-sonnet-4.6` | 3.00 | 15.00 | Sonnet 4.6 is the sweet-spot for agentic editing; 90% cache read discount |
| **Cheap executor** (subagents, bulk edits) | `qwen/qwen3-coder` or `z-ai/glm-4.6` | 0.22 / 0.43 | 1.80 / 1.74 | 5–10× cheaper than Sonnet for grunt work; both are strong on code |
| **Search / explore subagent** | `google/gemini-2.5-flash` | 0.30 | 2.50 | 1M context + fast; ideal for read-only repo grepping |
| **Trivial work** (titles, summaries, simple edits) | `google/gemini-2.5-flash-lite` or `openai/gpt-5-nano` | 0.10 / 0.05 | 0.40 / 0.40 | Effectively free; use for `small_model` |
| **Wildcard cheap powerhouse** | `x-ai/grok-4.20` | 1.25 | 2.50 | Frontier-class reasoning at mid-tier pricing, 2M context |

**Expected savings vs Fusion**: Fusion runs N panel models + a judge per request. Replacing it with this stack typically yields **60–85% cost reduction** for daily coding while keeping (or improving) execution quality. Fusion remains useful — but as an explicit, on-demand tool, not the default.

---

## 1. Why Fusion Is Probably Overkill for Most Work

[Fusion](https://openrouter.ai/openrouter/fusion) runs your prompt through 3–6 expert models in parallel, then a judge synthesizes the answer. Every request pays for **all panel members plus the judge**.

That's brilliant for:
- High-stakes architectural decisions
- Research questions where being wrong is expensive
- Cross-checking suspect output from a cheaper model

It's wasteful for:
- "Rename this variable across the repo"
- "Add a try/catch around this block"
- "What does this function do?"
- "Write a test for this"
- Tool-loop iterations during agentic coding (you pay the Fusion premium on every tool call cycle)

**The shift**: stop using Fusion as your default; invoke it as a "second opinion" tool when you actually need a panel.

---

## 2. The Core Patterns

### Pattern A — Plan/Execute Split (Your Stated Goal)

Use a frontier model in **Plan mode** to design the change, then a cheaper model in **Build mode** to execute the diff.

**Why it works**: Planning is reasoning-heavy and short (low token volume, high quality bar). Execution is mechanical and long (high token volume, lower quality bar). You're optimizing where the dollars actually go.

**Pairings**:

| Plan model | Build model | Rationale |
|---|---|---|
| `anthropic/claude-opus-4.8` | `anthropic/claude-sonnet-4.6` | Same family → consistent style, smooth handoff |
| `openai/gpt-5.1-codex` | `openai/gpt-5.1-codex-mini` | Same family, codex-tuned both ends |
| `anthropic/claude-opus-4.8` | `qwen/qwen3-coder` | Max savings (~$0.22/1M in vs $3) when Qwen can handle it |
| `google/gemini-2.5-pro` | `google/gemini-2.5-flash` | 1M context on both; cheap planner ($1.25/1M in) |

**OpenCode config** (`~/.config/opencode/opencode.json`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4.6",
  "small_model": "google/gemini-2.5-flash-lite",
  "agent": {
    "plan": {
      "model": "anthropic/claude-opus-4.8",
      "reasoningEffort": "high"
    },
    "build": {
      "model": "anthropic/claude-sonnet-4.6"
    }
  }
}
```

**Workflow**: start in `plan` (Tab key in TUI), iterate on the plan, switch to `build` to execute. Opus is only billed during planning.

---

### Pattern B — Orchestrator + Cheap Subagents

The primary agent (Sonnet/Opus class) acts as a router. It dispatches well-scoped tasks to cheap subagents, then reviews and integrates the results.

**Why it works**: The expensive model only holds the high-level conversation. The bulk-token work (reading files, grepping, drafting edits) happens in subagent contexts using 5–10× cheaper models. The orchestrator only sees the **summary** the subagent returns — not the full tool-call transcript.

This is the same principle as how Claude Code's Task tool / OpenCode's subagents are designed. You're just choosing cheaper models for the leaves.

**OpenCode config**:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4.6",
  "small_model": "google/gemini-2.5-flash-lite",
  "agent": {
    "explore": {
      "model": "google/gemini-2.5-flash",
      "description": "Fast read-only codebase exploration"
    },
    "general": {
      "model": "qwen/qwen3-coder",
      "description": "Multi-step implementation tasks with full tool access"
    },
    "scout": {
      "model": "google/gemini-2.5-flash",
      "description": "Dependency research and upstream code inspection"
    },
    "bulk-editor": {
      "mode": "subagent",
      "model": "qwen/qwen3-coder-flash",
      "description": "Mechanical refactors, find/replace, formatting fixes across many files",
      "prompt": "You make small, mechanical edits across a codebase. Do not redesign anything. Apply the requested change exactly. Report what you changed."
    },
    "test-writer": {
      "mode": "subagent",
      "model": "deepseek/deepseek-v3.2",
      "description": "Writes unit tests for functions specified by the orchestrator",
      "prompt": "Write tests for the given function. Match the project's existing test style. Do not modify implementation code."
    },
    "doc-writer": {
      "mode": "subagent",
      "model": "z-ai/glm-4.6",
      "description": "Writes or updates docstrings, READMEs, and code comments",
      "permission": { "bash": "deny" }
    }
  }
}
```

**Invocation**: `@bulk-editor rename all calls to getCwd → getCurrentWorkingDirectory` or let the orchestrator route automatically.

---

### Pattern C — Escalation Ladder

Start cheap. Escalate only when the cheap model fails or expresses low confidence.

**Ladder**:
1. **Tier 3** (`gemini-2.5-flash-lite`, `gpt-5-nano`): Trivial — formatting, renames, single-line edits
2. **Tier 2** (`qwen3-coder`, `glm-4.6`, `deepseek-v3.2`): Standard implementation, refactors, tests
3. **Tier 1** (`sonnet-4.6`, `gpt-5.1-codex`): Cross-file logic, debugging, design judgment
4. **Frontier** (`opus-4.8`, `gpt-5.2-pro`, Fusion): Architecture, hairy concurrency, security-critical code

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
      "model": "qwen/qwen3-coder",
      "description": "First-pass executor for routine coding tasks"
    },
    "build": {
      "mode": "primary",
      "model": "anthropic/claude-sonnet-4.6",
      "description": "Standard agent for non-trivial implementation"
    },
    "deep": {
      "mode": "primary",
      "model": "anthropic/claude-opus-4.8",
      "reasoningEffort": "high",
      "description": "Escalation tier for hard reasoning and architecture"
    }
  }
}
```

---

### Pattern D — Aggressive Prompt Caching

This is the single biggest lever that isn't a model swap. OpenRouter passes through cache discounts from upstream providers automatically when you reuse prefixes.

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
4. **Enable `setCacheKey`** for Anthropic:

```jsonc
{
  "provider": {
    "anthropic": {
      "options": { "setCacheKey": true }
    }
  }
}
```

5. **Reuse agents** instead of rewriting prompts inline.

A coding session that bounces between `@explore` (Gemini Flash) and `build` (Sonnet 4.6) can easily hit **80%+ cache rates** after the first few turns, making effective input cost drop to ~$0.30/1M for Sonnet.

---

### Pattern E — Fusion as a Tool, Not a Default

Keep Fusion in the toolbox, but only call it explicitly.

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
      "model": "openrouter/fusion",
      "description": "Multi-model deliberation panel. Use only for high-stakes decisions where being wrong is expensive — architecture choices, security review, persistent bug diagnosis. NOT for routine coding.",
      "permission": { "edit": "deny", "bash": "deny" }
    }
  }
}
```

Usage: `@panel should this service use Postgres LISTEN/NOTIFY or a separate message queue?`

You can also pick a cheaper Fusion preset by using the `Budget` panel — see [Fusion docs](https://openrouter.ai/docs/guides/features/plugins/fusion).

---

### Pattern F — Context Discipline

The cheapest token is the one you don't send. This compounds with every pattern above.

**Tactics**:
- **Use `rtk` proxies** (already in your `AGENTS.md`) — they cut bash output by 80–95%. `rtk ls`, `rtk grep`, `rtk read`, `rtk git diff`.
- **Delegate file reads to subagents**. The orchestrator sees the agent's 200-token summary, not the 50K-token file dump. Your current `general` agent does this — keep using it.
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

---

### Pattern G — Model-as-a-Specialist

Different models have genuinely different strengths. Match them to task type.

| Task type | Best fit | Backup |
|---|---|---|
| Long-context refactor (>200K tokens of code) | `google/gemini-2.5-pro` (1M ctx, $1.25 in) | `qwen/qwen3-coder` (1M ctx, $0.22 in) |
| Mechanical bulk edits | `qwen/qwen3-coder-flash` ($0.20 in) | `deepseek/deepseek-v3.2` |
| Test writing | `deepseek/deepseek-v3.2` (reasoning, cheap) | `anthropic/claude-haiku-4.5` |
| Code review / read-only critique | `anthropic/claude-sonnet-4.6` | `z-ai/glm-4.6` |
| Tool-calling chains (lots of tools) | Anthropic Claude family | OpenAI GPT-5.x |
| Reasoning-heavy debugging | `anthropic/claude-opus-4.8` | `openai/gpt-5.1-codex-max` |
| Documentation prose | `z-ai/glm-4.6` ($0.43 in) | `google/gemini-2.5-flash` |
| Title/summary generation | `google/gemini-2.5-flash-lite` ($0.10 in) | `openai/gpt-5-nano` ($0.05 in) |

---

### Pattern H — Variants for Effort Control

Instead of swapping models, swap reasoning effort. A single model can serve 3 tiers.

```jsonc
{
  "provider": {
    "openrouter": {
      "models": {
        "anthropic/claude-sonnet-4.6": {
          "variants": {
            "fast": { "thinking": { "type": "disabled" } },
            "med":  { "thinking": { "type": "enabled", "budgetTokens": 4000 } },
            "deep": { "thinking": { "type": "enabled", "budgetTokens": 16000 } }
          }
        },
        "openai/gpt-5.1-codex": {
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

---

## 3. The OpenRouter Chat UI Strategy

You don't get subagents or model routing in the chat UI, but you can still cut costs:

1. **Default model**: set it to Sonnet 4.6 or Gemini 2.5 Pro instead of Fusion.
2. **Use presets**: save a "Cheap" preset (Qwen3 Coder) and a "Deep" preset (Opus 4.8). Toggle per conversation.
3. **Manual escalation**: when a Qwen3/GLM answer feels off, just paste it into a new chat with Opus and ask "Is this right?". Much cheaper than running Opus from the start.
4. **Use the Fusion plugin's `Budget` preset** when you do want a panel.
5. **Keep system prompts short** — they're part of the cached prefix; long ones cost on every turn until cached.

---

## 4. Concrete OpenCode Config (Drop-in)

Save as `~/.config/opencode/opencode.json`. Combines patterns A + B + D + F.

```jsonc
{
  "$schema": "https://opencode.ai/config.json",

  "model": "anthropic/claude-sonnet-4.6",
  "small_model": "google/gemini-2.5-flash-lite",

  "provider": {
    "anthropic": {
      "options": { "setCacheKey": true }
    }
  },

  "compaction": {
    "auto": true,
    "prune": true,
    "reserved": 10000
  },

  "agent": {
    "plan": {
      "model": "anthropic/claude-opus-4.8",
      "reasoningEffort": "high",
      "description": "Architecture, design, and planning. No edits."
    },
    "build": {
      "model": "anthropic/claude-sonnet-4.6",
      "description": "Default agent for implementation."
    },
    "cheap": {
      "mode": "primary",
      "model": "qwen/qwen3-coder",
      "description": "First-pass executor for routine coding tasks. Escalate to build if stuck.",
      "steps": 30
    },
    "explore": {
      "model": "google/gemini-2.5-flash",
      "description": "Fast read-only codebase exploration with 1M context"
    },
    "general": {
      "model": "qwen/qwen3-coder",
      "description": "Multi-step implementation tasks in an isolated subagent context"
    },
    "scout": {
      "model": "google/gemini-2.5-flash",
      "description": "Dependency research and upstream code inspection"
    },
    "bulk-editor": {
      "mode": "subagent",
      "model": "qwen/qwen3-coder-flash",
      "description": "Mechanical refactors and find/replace across many files",
      "prompt": "You make small, mechanical edits. Do not redesign. Apply the requested change exactly. Report what changed.",
      "steps": 15
    },
    "test-writer": {
      "mode": "subagent",
      "model": "deepseek/deepseek-v3.2",
      "description": "Writes unit tests matching the project's existing style",
      "prompt": "Write tests for the given function. Match existing test conventions. Do not modify implementation code.",
      "steps": 10,
      "permission": { "bash": { "*": "ask", "npm test*": "allow", "pytest*": "allow", "go test*": "allow" } }
    },
    "doc-writer": {
      "mode": "subagent",
      "model": "z-ai/glm-4.6",
      "description": "Docstrings, comments, READMEs",
      "permission": { "bash": "deny" }
    },
    "panel": {
      "mode": "subagent",
      "model": "openrouter/fusion",
      "description": "Multi-model deliberation. Use ONLY for high-stakes decisions where cost of being wrong outweighs a few extra dollars in completion costs.",
      "permission": { "edit": "deny", "bash": "deny" }
    },
    "deep": {
      "mode": "primary",
      "model": "anthropic/claude-opus-4.8",
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

---

## 5. Cost Math: What You're Actually Saving

Assume a typical coding session: ~300K input tokens, ~30K output tokens (real-world ratios for agentic loops with caching).

| Setup | Effective $/session* | Notes |
|---|---|---|
| Fusion (Quality preset, ~5 models × judge) | ~$8–15 | Pays for every panel member every call |
| Pure Opus 4.8 | ~$2.25 | $5 × 0.3M + $25 × 0.03M |
| Pure Sonnet 4.6 | ~$1.35 | $3 × 0.3M + $15 × 0.03M |
| Sonnet 4.6 with 80% cache hit | **~$0.51** | Cache reads at $0.30/1M |
| Qwen3 Coder (no cache) | **~$0.12** | $0.22 × 0.3M + $1.80 × 0.03M |
| Hybrid: Sonnet orchestrator + Qwen3 subagents (typical 70/30 split) | **~$0.55–0.85** | Best quality/cost ratio |

\* Rough order-of-magnitude. Real numbers vary with task complexity, cache behavior, and how often you escalate.

**Realistic expectation**: replacing Fusion-default with the recommended stack saves **70–90% on routine coding** while preserving quality for the work that matters.

---

## 6. Quick Reference — Cheapest Tool-Calling Models by Tier

(From OpenRouter live API, sorted by blended `3×input + 1×output` cost per 1M tokens.)

### Frontier (planning, architecture)
1. `x-ai/grok-4.20` — $1.25 / $2.50, 2M ctx ⭐ underrated
2. `x-ai/grok-4.3` — $1.25 / $2.50, 1M ctx
3. `google/gemini-2.5-pro` — $1.25 / $10.00, 1M ctx
4. `openai/gpt-5.1-codex` — $1.25 / $10.00, 400K ctx
5. `openai/gpt-5.1-codex-max` — $1.25 / $10.00, 400K ctx
6. `anthropic/claude-sonnet-4.6` — $3.00 / $15.00, 1M ctx
7. `anthropic/claude-opus-4.8` — $5.00 / $25.00, 1M ctx

### Mid-tier (execution)
1. `qwen/qwen3-235b-a22b-thinking-2507` — $0.10 / $0.10, 262K ctx (reasoning!)
2. `openai/gpt-5-nano` — $0.05 / $0.40, 400K ctx
3. `qwen/qwen3-coder-flash` — $0.195 / $0.975, 1M ctx
4. `deepseek/deepseek-v3.2` — $0.23 / $0.34, 131K ctx (reasoning)
5. `qwen/qwen3-coder` — $0.22 / $1.80, 1M ctx
6. `z-ai/glm-4.6` — $0.43 / $1.74, 203K ctx (reasoning)
7. `openai/gpt-5.1-codex-mini` — $0.25 / $2.00, 400K ctx
8. `google/gemini-2.5-flash` — $0.30 / $2.50, 1M ctx

### Cheap (small edits, lookups, `small_model`)
1. `mistralai/mistral-nemo` — $0.02 / $0.03, 131K ctx
2. `openai/gpt-5-nano` — $0.05 / $0.40, 400K ctx
3. `google/gemini-2.5-flash-lite` — $0.10 / $0.40, 1M ctx
4. `openai/gpt-4.1-nano` — $0.10 / $0.40, 1M ctx
5. `qwen/qwen3-coder-30b-a3b-instruct` — $0.07 / $0.27, 160K ctx

### Hidden gems (≥200K ctx, dirt cheap, tool-capable)
- `meta-llama/llama-4-scout` — $0.10 / $0.30, **10M ctx** (yes, ten million)
- `qwen/qwen3-coder-next` — $0.11 / $0.80, 262K ctx
- `qwen/qwen3-235b-a22b-2507` — $0.09 / $0.10, 262K ctx
- `nvidia/nemotron-3-nano-30b-a3b` — $0.05 / $0.20, 262K ctx

---

## 7. Checklist: Migrate Off Fusion-Default in 15 Minutes

- [ ] Drop the config from §4 into `~/.config/opencode/opencode.json`
- [ ] Set `provider.anthropic.options.setCacheKey: true` (already in the config)
- [ ] Enable compaction pruning (already in the config)
- [ ] Test with a routine task in `build` — verify Sonnet 4.6 works as expected
- [ ] Try `@bulk-editor` on a real refactor — see if Qwen3 Coder Flash holds up
- [ ] Save your old Fusion preset in the OpenRouter UI for the rare cases you want it
- [ ] After a week, check `https://openrouter.ai/activity` and compare spend vs the prior week
- [ ] Adjust: if Qwen3 fumbles too often, swap `cheap`/`general` to `z-ai/glm-4.6` or `anthropic/claude-haiku-4.5`

---

## 8. Things to Watch

- **Quality drift on cheap models**: Qwen3 / DeepSeek / GLM are excellent in 2026 but still sometimes hallucinate APIs in less common languages/frameworks. If you work in something niche, keep a frontier model as the default.
- **Tool-calling reliability**: Anthropic and OpenAI models are still the gold standard for long tool-call chains. If a cheap model gets stuck in tool loops, escalate.
- **Context window ≠ effective context**: A 1M-token model gets dumber past ~200K. Don't dump the entire repo unless you need to.
- **Cache invalidation is silent**: changing an `instructions` file or agent `prompt` mid-session voids the cache. Settle prompts before long sessions.
- **Free tier (`:free` models)**: tempting but typically log/train on your prompts. Avoid for proprietary code.

---

## Further Reading

- OpenRouter live models API: `https://openrouter.ai/api/v1/models`
- OpenRouter activity dashboard: `https://openrouter.ai/activity`
- OpenCode agents docs: `https://opencode.ai/docs/agents`
- OpenCode models docs: `https://opencode.ai/docs/models`
- Fusion plugin docs: `https://openrouter.ai/docs/guides/features/plugins/fusion`
