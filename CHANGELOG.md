# Changelog

## Unreleased

- **[add]** The entries `linguacode-lessons/i18n/<language>`, like `linguacode-lessons/i18n/hy-AM`: the lessons of a language, its default export, data with no code, for an app that loads each language as a part of its own, and `addLessonTexts(language, texts)`, which adds them once it checks that they have every topic, group, lesson and exercise of the course. `loadLessonTexts()` adds a language the same way.
- **[change]** `loadLessonTexts()` is in an entry of its own, `linguacode-lessons/load`: a bundler makes a file of every language a module may load, whether or not a page loads it, so with it in the main entry, an app that adds its languages with `addLessonTexts()` had all 31 of them, about 900 kB. A page that loads the languages imports it from there; the main entry loads none. `LESSON_LANGUAGES` lists the languages itself.
- **[change]** The peer dependency takes CMIL 0.24's alphas too.

## 0.2.0 (2026-10-28)

- **[add]** `TOPIC_ICON_NAMES`: the icon of each topic and group, by its name in the solid style of Font Awesome, like `list-ol` for `for`, from the `icon` of each topic and group in `course.json`. The website and the LinguaCode App show the same icons from it.

## 0.1.0 (2026-10-28)

- **[add]** The 47 lessons of LinguaCode as files, with their exercises, `course.json`, and their texts in every language of CMIL, from the website, which gives exactly the lessons it had: the lessons and exercises in a language, `checkProgram()`, and their tests.
