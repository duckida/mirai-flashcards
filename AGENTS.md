# Agent Instructions

## Project Specs

All product requirements, system design, and implementation tasks live in `.kiro/specs/ai-flashcard-quizzer/`:

- **Requirements**: `.kiro/specs/ai-flashcard-quizzer/requirements.md` — feature requirements and acceptance criteria
- **Design**: `.kiro/specs/ai-flashcard-quizzer/design.md` — architecture, data models, API routes, correctness properties
- **Tasks**: `.kiro/specs/ai-flashcard-quizzer/tasks.md` — phased implementation checklist with dependencies

## Steering Documents

Context and conventions live in `.kiro/steering/`:

- **Product**: `.kiro/steering/product.md` — product overview, user flows, value proposition
- **Tech**: `.kiro/steering/tech.md` — stack, build commands, environment variables, external services
- **Structure**: `.kiro/steering/structure.md` — folder layout, file naming, import conventions
- **Next.js**: `.kiro/steering/nextjs.md` — breaking changes warning for this Next.js version

## Rules

1. Read the relevant spec and steering docs before writing any code
2. Follow the task list in `tasks.md` — respect dependencies and phase ordering
3. Use JavaScript only (no TypeScript)
4. Backend uses ES Modules (`import/export`), frontend uses CommonJS (`require/module.exports`)
5. All UI must use React Native + Tamagui — no custom or third-party styling
6. Check `backend/AGENTS.md` for Next.js-specific caveats
7. After completing tasks, tick them off on the tasks md file, and commit all to github.
