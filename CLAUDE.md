# CLAUDE AI ASSISTANT RULES

## MEMORY BANK — START PROCEDURE

Read `memory-bank/README.md` → `memory-bank/phases/current.md` on startup. Read additional docs as needed per task.

### Memory Bank Layout
```
memory-bank/
├── README.md              → project context, commands, env vars
├── architecture.md        → system design, API patterns, generation pipeline, business models
├── VISION.md              → business plan, pricing, GTM, competitive landscape
├── decisions.md           → key choices and rationale ("why")
├── seo-strategy.md        → SEO keyword research, content strategy
├── generation-reliability-playbook.md → prompt/cache troubleshooting
├── v1-product.md          → (historical) original V1 spec
├── research/              → builder prospect lists + outreach playbooks
└── phases/
    ├── current.md         → what to work on RIGHT NOW
    └── completed.md       → finished workstreams archive
```

### Startup Procedure
1. **Always read first**: `README.md` → `phases/current.md`
2. **When working on product/backend**: Also read `architecture.md`
3. **When you need business context**: Check `VISION.md`
4. **When you need "why"**: Check `decisions.md`

### Documentation Updates
Update the memory bank when:
- You complete a phase → update `phases/current.md` with next phase
- Architecture changes → update `architecture.md`
- New decision made → add to `decisions.md`

Keep docs lean. Intent over implementation.

## BEHAVIORAL RULES

### Project Context: Finch — Solo Developer Building a Product
**Finch is an AI-powered upgrade visualization tool for home builders.** The Stone Martin demo is the working proof-of-concept. Now building the real product: landing page, multi-tenant infrastructure, and repeatable builder demos.
- SM demo stays active — it's the sales tool shown to every prospect
- Landing page sells Finch to builders (revenue framing, not tech jargon)
- Builder demos are the repeatable unit — lighter than SM, same bones
- Speed matters but we're building real product now, not just a prototype
- Keep the "wow factor" of AI-generated room visualization front and center

### Communication & Decision Making
- Ask before making major feature or architecture changes
- Get approval before adding dependencies or altering core workflows
- Explain your reasoning when proposing changes

### Minimal First Implementation
1. Ask: "What is the smallest change that solves this?"
2. Implement only that minimum
3. Follow KISS and YAGNI

### Codebase Hygiene: Modify, Don't Multiply
1. Search before creating new files
2. Extend existing files rather than creating parallel structures
3. Clean as you go — remove dead code
4. No abandoned code

### Notion API Pagination — CRITICAL
Notion search returns max 25 results per call. NEVER draw conclusions from a single search. Paginate or qualify all findings as partial.

### LLM Model Usage — CRITICAL
**NEVER change LLM model names or configurations without explicit authorization.**

## SUBAGENTS & DELEGATION

### Available Specialized Subagents

**Engineering:**
- **code-reviewer**: Code quality, security, and maintainability reviews
- **code-architect**: Software architecture and folder structure design
- **frontend-developer**: Frontend specialist for React/Next.js components
- **ui-designer**: UI design for rapid, implementable interfaces
- **backend-architect**: Backend system design and API architecture
- **photo-architecture-specialist**: Image/photo pipeline specialist for scope backfills, spatial analysis, and data-driven prompt-rule migration

**Brand & Growth:**
- **brand-guardian**: Visual identity, voice, and design consistency — all other agents defer to brand guardian
- **copywriter**: Builder-facing copy — headlines, landing page, email, CTAs
- **growth-hacker**: Customer acquisition, builder outreach, demo optimization
- **lead-researcher**: Lead search, enrichment, qualification, builder research, and cold email drafting
- **cold-email-writer**: Fully custom founder-led cold emails for builder outreach. No templates. Every email unique.
- **legal-compliance-checker**: Privacy, ToS, AI disclosure, regulatory compliance

**Demo Operations:**
- **prospect-demo-builder**: End-to-end prospect demo creation. Takes builder name + kitchen photo, researches the builder, writes config, seeds DB, updates playbook. Can run multiple in parallel.

### Delegation Triggers
1. **ui-designer**: Use for new UI components and layout decisions
2. **frontend-developer**: Use for complex React components or performance
3. **code-architect**: Use when designing new feature modules
4. **backend-architect**: Use for API design and image generation pipeline
5. **brand-guardian**: Use for any brand/design/voice decisions
6. **copywriter**: Use for any customer-facing text
7. **growth-hacker**: Use for outreach strategy and acquisition experiments
8. **legal-compliance-checker**: Use for privacy policies, ToS, compliance review
9. **photo-architecture-specialist**: Use for photo scope setup, spatial hint workflows, and hardcoded-to-data-driven image architecture migrations
10. **lead-researcher**: Use for qualifying Apollo exports, researching builders, cross-referencing Notion pipeline, and drafting cold emails
11. **cold-email-writer**: Use for writing fully custom cold outreach emails. Takes research notes, produces ready-to-send emails in Rashaad's voice. Use AFTER lead-researcher has done the research.
12. **prospect-demo-builder**: Use to spin up a new `/for/` prospect demo page. Give it a builder name + kitchen/exterior photo paths. Can run multiple in parallel for different builders.

## SKILLS

### Available Skills
- **frontend-design**: Guidelines for creating distinctive, high-quality frontend UI
  - Use for all frontend work
