# CLAUDE AI ASSISTANT RULES

## MEMORY BANK — START PROCEDURE

Read `memory-bank/README.md` → `memory-bank/phases/current.md` on startup. Read additional docs as needed per task.

### Memory Bank Layout
```
memory-bank/
├── README.md           → project context, commands, env vars
├── product.md          → user flows, data schema, features
├── architecture.md     → system design, API patterns, tech details
├── decisions.md        → key choices and rationale ("why")
└── phases/
    ├── current.md      → what to work on RIGHT NOW
    └── roadmap.md      → future phases overview
```

### Startup Procedure
1. **Always read first**: `README.md` → `phases/current.md`
2. **When building features**: Also read `product.md`
3. **When building backend/infra**: Also read `architecture.md`
4. **When you need "why"**: Check `decisions.md`

### Documentation Updates
Update the memory bank when:
- You complete a phase → update `phases/current.md` with next phase
- Architecture changes → update `architecture.md`
- New decision made → add to `decisions.md`

Keep docs lean. Intent over implementation.

## BEHAVIORAL RULES

### Project Context: Solo Developer Demo
**This is a demo/prototype for Stone Martin Builders. Speed and visual impact over production polish.**
- Prioritize working visuals over perfect architecture
- This is a sales tool — make it impressive and easy to understand
- Focus on the "wow factor" of AI-generated room visualization
- Keep it simple enough to demo in a meeting

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

- **code-reviewer**: Code quality, security, and maintainability reviews
- **code-architect**: Software architecture and folder structure design
- **frontend-developer**: Frontend specialist for React/Next.js components
- **ui-designer**: UI design for rapid, implementable interfaces
- **backend-architect**: Backend system design and API architecture

### Delegation Triggers
1. **ui-designer**: Use for new UI components and layout decisions
2. **frontend-developer**: Use for complex React components or performance
3. **code-architect**: Use when designing new feature modules
4. **backend-architect**: Use for API design and image generation pipeline

## SKILLS

### Available Skills
- **frontend-design**: Guidelines for creating distinctive, high-quality frontend UI
  - Use for all frontend work
