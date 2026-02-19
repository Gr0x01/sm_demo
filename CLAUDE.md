# CLAUDE AI ASSISTANT RULES

## MEMORY BANK — START PROCEDURE

Read `memory-bank/README.md` → `memory-bank/phases/current.md` on startup. Read additional docs as needed per task.

### Memory Bank Layout
```
memory-bank/
├── README.md              → project context, commands, env vars
├── product.md             → SM demo: user flows, data schema, features
├── architecture.md        → SM demo: system design, API patterns, tech details
├── product-architecture.md → Finch product: multi-tenant schema, migration path
├── landing-page.md        → Finch marketing site design doc
├── VISION.md              → business plan, pricing, GTM, competitive landscape
├── decisions.md           → key choices and rationale ("why")
├── research/              → builder prospect lists for sales
└── phases/
    ├── current.md         → what to work on RIGHT NOW
    └── roadmap.md         → future phases overview
```

### Startup Procedure
1. **Always read first**: `README.md` → `phases/current.md`
2. **When working on SM demo**: Also read `product.md` + `architecture.md`
3. **When building Finch product infra**: Also read `product-architecture.md`
4. **When building landing page**: Also read `landing-page.md`
5. **When you need business context**: Check `VISION.md`
6. **When you need "why"**: Check `decisions.md`

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

**Brand & Growth:**
- **brand-guardian**: Visual identity, voice, and design consistency — all other agents defer to brand guardian
- **copywriter**: Builder-facing copy — headlines, landing page, email, CTAs
- **growth-hacker**: Customer acquisition, builder outreach, demo optimization
- **legal-compliance-checker**: Privacy, ToS, AI disclosure, regulatory compliance

### Delegation Triggers
1. **ui-designer**: Use for new UI components and layout decisions
2. **frontend-developer**: Use for complex React components or performance
3. **code-architect**: Use when designing new feature modules
4. **backend-architect**: Use for API design and image generation pipeline
5. **brand-guardian**: Use for any brand/design/voice decisions
6. **copywriter**: Use for any customer-facing text
7. **growth-hacker**: Use for outreach strategy and acquisition experiments
8. **legal-compliance-checker**: Use for privacy policies, ToS, compliance review

## SKILLS

### Available Skills
- **frontend-design**: Guidelines for creating distinctive, high-quality frontend UI
  - Use for all frontend work
