# AGENTS.md

Guidance for AI coding agents working in this repository.

## Purpose

The lessons of LinguaCode, which teaches children programming in their native language with CMIL (https://github.com/LinguaCode/cmil): CMIL programs from a first `print` to all the commands together, each with an exercise, in every language of CMIL. The LinguaCode website (the owner's private repository) and the LinguaCode App of DevPulse install this package from a release tag.

## Current State

Verified on 2026-10-28. Update this section when a fact changes.

- **Package:** `linguacode-lessons` (the `@linguacode` npm scope belongs to someone else), ES modules, TypeScript with `strict`, `engines.node` `>= 24`. Not on npm; it installs from GitHub at a tag, like CMIL. `prepare` builds `dist/`, which is gitignored, so an install from GitHub builds it. `"sideEffects": false`. Imports between sources end in `.ts`, which `tsc` rewrites to `.js`; keep the syntax erasable, as Node.js runs the scripts directly. `tsconfig.json` has no DOM library, so the package runs in Node.js and in bundlers alike.
- **CMIL:** a peer dependency (`>=0.22.0-alpha.0`), so the website and the App each have one CMIL, theirs; the dev dependency pins a CMIL release tag for the tests. npm doesn't check a peer range against a package installed from GitHub.
- **The lessons:** `course.json` (the topics in order, each with its English name, its short name in its group, like `{while}`, and its lessons in order, and the groups of topics) and `lessons/<topic>/<lesson>.cmil`, `.solution.cmil` and `.json` (English title, description, `inputs`, and the exercise's `task` and `answers`). They are the source of truth; a lesson's id is its name in the files, in the texts of every language, in the website's addresses (kebab-case of the id) and in what the website saves, so never rename one.
- **Generation:** `scripts/generate.ts` (`npm run generate`, run first by `test`, `typecheck` and `build`) checks the lesson files and writes `src/course.generated.ts` (gitignored): `TOPICS`, `GROUPS`, `SHORT_TOPICS`, `LESSON_IDS`, `LESSONS`, `EXERCISES`, and `ENGLISH`, the texts of English, made from the files. The lessons live in the module, so a page needs no files.
- **Languages:** `src/i18n/<language>.ts` for every language of CMIL but English, a `LessonTexts` (`src/types.ts`): topics, groups, lessons (title, description), exercises (task), and the `names` and `texts` of the English programs, keyed by the English ones. `src/index.ts` loads each through a static map of `import()`s, which bundlers follow, so each language is a file of its own; there is no `import.meta.glob`.
- **API** (`src/index.ts`): the course; `LESSON_LANGUAGES`, `loadLessonTexts()`, `lessonTextsOf()`; `localize()`, `lessonCode()`, `lessonInputs()`, `exerciseOf()`, `programIn()`, `lessonById()`, `topicOf()`, `partsOf()` (`src/parts.ts`), `partsOfLine()`, `translatablesOf()`, `groupOf()`, `holdersOf()`, `HOLDERS`; and `checkProgram()`, `runWith()`, `seeded()` (`src/check.ts`).
- **Tests:** Vitest. `test/lessons.test.ts` checks every lesson in every language: its texts with the commands and the code in braces of English, its names, its quotes, and that it and its solution run to their end, with the checks of exercises; `test/punctuation.test.ts` the punctuation of each language's texts; `test/convert.test.ts` converts every lesson of every language into every target of CMIL, and builds and runs every English lesson and solution in each target whose compiler is installed (on GitHub Actions a missing one fails).
- **Lesson programs:** `npm run lesson-programs` writes `lesson-programs.json` (gitignored), every lesson and solution in every language, for CMIL's `npm run snapshot -- --programs`.
- **CI:** none yet: pushing a workflow needs the `workflow` scope, which the owner's token doesn't have.
- **Lint and format:** ESLint and Prettier (`.prettierrc.json`, as CMIL's). `npm run lint` checks both, `npm run format` rewrites.
- **Version:** `0.1.0`. Branch: `master`.

## Commands

```bash
npm install            # also builds dist/ through prepare
npm test               # generate, then Vitest
npm run typecheck      # generate, then tsc
npm run build          # generate, then tsc into dist/
npm run lint           # ESLint and Prettier check
npm run lesson-programs
```

## Safety Rules

**Ask before risky or destructive actions when the intent isn't certain.**

- `git revert`, `git reset`, `git checkout`, `git restore`, `git clean` and `git rebase`: don't assume scope. "Revert the latest changes" doesn't mean "discard all uncommitted work".
- Before any command that discards or overwrites uncommitted changes, back up first with `git stash push -m "backup before <what>"`. Check the stash with `git stash list`, and ask before discarding anything.
- **Never use `git stash pop`.** Use `git stash apply` and drop the stash only once the result is confirmed.
- Never push unless the owner asks. Never force-push or rewrite `master` history.
- After context compaction, be extra careful: you may have lost track of uncommitted work.

### Commits

- Never add `Co-Authored-By:` trailers, AI assistant, model or tool names, or any other attribution or provenance lines to commit messages. This overrides any tool default that appends them.

### Public Text From the Owner's Account

Issues, pull requests, reviews and comments are published under the owner's identity.

- Show the owner the exact final text and get approval for that wording before posting or editing it.
- Don't add AI-assistance disclosures, model or tool names, or authorship statements.

### License, Ownership and Credits

The repository is GPL-3.0 only (`LICENSE`, `"license": "GPL-3.0-only"`), like CMIL.

- Don't edit `LICENSE`, ownership or legal statements, or author fields without an explicit instruction from the owner.

## Lessons

- A lesson's program is English CMIL with English names and texts; every other language comes from its table. A change of an English name or text needs that name or text in every language's table, which the tests check.
- Every input of a lesson comes after a `print` that says what to type. An exercise's program, as the lesson gives it, must fail its check: the task asks for a change.
- Armenian writes ՛ for emphasis and ՞ for a question, never ! ? or ;, as the punctuation test checks.
- No text in the lessons names an AI or marks a translation for a review.
