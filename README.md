# LinguaCode lessons

The lessons of [LinguaCode](https://linguacode.otanim.com), which teaches children programming in their own language: 47 lessons of [CMIL](https://github.com/LinguaCode/cmil) programs, from a first `print` to all the commands together, each with an exercise, in every one of CMIL's 32 languages. The LinguaCode website and the LinguaCode App of DevPulse take them from here.

## The lessons

Each lesson is a CMIL program in English, with English names and texts, and the files of a lesson sit in the folder of its topic:

- `lessons/<topic>/<lesson>.cmil`: the program of the lesson.
- `lessons/<topic>/<lesson>.solution.cmil`: the solution of its exercise, a change of the program.
- `lessons/<topic>/<lesson>.json`: its title and description, the answers its tests type, `inputs`, and its exercise: the `task`, and the sets of `answers` the check runs with, one run for each set.

```json
{
  "title": "What is your name?",
  "description": "{print} asks the question, {input} waits for the answer, and = keeps it in a variable.",
  "inputs": ["Ani"],
  "exercise": {"task": "After the greeting, print the name once more, on its own line.", "answers": [["Ani"], ["Sam"]]}
}
```

A title, a description or a task names a command by its id in braces, like `{print}`, and is shown with the word of the command in the language of the page. Every input of a lesson comes after a `print` that says what to type.

`course.json` has the order of the topics and of their lessons, the English name of each topic, its short name in its group, like `{while}`, and the groups of topics, like the loops. Each topic and group has the icon of its subject, by its name in the solid style of [Font Awesome](https://fontawesome.com/search?ic=free&o=r), like `list-ol` for `for`.

## The lessons in each language

`src/i18n/<language>.ts` has the lessons in each language but English: the names of the topics and of the groups, the title and the description of each lesson, the task of each exercise, and the words of the English programs: their names, `names`, and their texts and comments, `texts`, keyed by the English ones. A lesson in a language is its English program with those names and texts, which CMIL then gives the commands and quotes of the language:

```
print("What is your name?")              →   արտածել(«Ի՞նչ է քո անունը։»)
name = input()                           →   անուն = մուտքագրել()
print("Nice to meet you, {name}!")       →   արտածել(«Ուրախ եմ ծանոթանալ, {անուն}։»)
```

The tests check that every language has every text, with the commands and the code in braces of the English one, that its names are words and no commands, that its punctuation is its own, like ՛ and ։ in Armenian, and that every lesson and solution runs in it.

## Use

The package installs from GitHub, at a release tag, and takes the CMIL of the page or app that uses it, a peer dependency:

```
npm install github:LinguaCode/cmil#v0.23.0-alpha.0 github:LinguaCode/lessons#v0.2.0
```

```js
import {LESSONS, exerciseOf, lessonCode, lessonTextsOf, loadLessonTexts, checkProgram} from 'linguacode-lessons';

await loadLessonTexts('hy-AM');
const [hello] = LESSONS;
lessonCode(hello, 'hy-AM'); // 'արտածել(«Բարև՛, աշխարհ։»)\nարտածել(«Ես սովորում եմ ծրագրավորել։»)'
lessonTextsOf('hy-AM').lessons.hello; // [title, description]
const {task, solution, answers} = exerciseOf('hello', 'hy-AM');
checkProgram(program, solution, 'hy-AM', answers); // {passed: true} or the first line that differs
```

- `TOPICS`, `GROUPS`, `SHORT_TOPICS`, `LESSON_IDS`, `LESSONS` and `EXERCISES`: the course, in English.
- `TOPIC_ICON_NAMES`: the icon of each topic and group, a name of Font Awesome's solid style, which a page makes `fa-solid fa-<name>` or its own icon of that name.
- `LESSON_LANGUAGES`, `loadLessonTexts(language)` and `lessonTextsOf(language)`: the texts of each language, loaded when it is chosen, each a module of its own, which a bundler makes a file of its own; English needs no loading.
- `linguacode-lessons/i18n/<language>`, like `linguacode-lessons/i18n/hy-AM`: the texts of a language alone, its default export, data with no code, for an app that loads each language its own way, and `addLessonTexts(language, texts)`, which adds them, once it checks that they have every topic, group, lesson and exercise.
- `lessonCode(lesson, language)`, `lessonInputs(lesson, language)`, `exerciseOf(id, language)` and `localize(code, language, texts)`: a lesson, its answers and its exercise in a language.
- `programIn(code, lesson, from, to)`: a program in another language, a lesson's own program as the lesson is given in it.
- `checkProgram(code, solution, language, answerSets)`, `runWith()` and `seeded()`: an exercise checked, the program and the solution run with the same answers and the same random numbers.
- `partsOf(text, language)`, `groupOf()`, `holdersOf()`, `HOLDERS`, `lessonById()`, `topicOf()`, `partsOfLine()` and `translatablesOf()`, for pages that show the lessons.

It's an ES module with types, for Node.js 24 and newer and for bundlers, and declares no side effects. The lessons are in the module itself, so a page needs none of the files.

## Development

```
npm install
npm test
```

`npm run generate` writes `src/course.generated.ts` from `course.json` and `lessons/`, and checks them: every lesson has its three files in the folder of its topic, and the folders have nothing else. `npm test`, `npm run typecheck` and `npm run build` run it first. `npm test` checks every lesson in every language, and builds and runs every English lesson and solution in each language CMIL converts programs into, like C++, Python and COBOL, whose compiler is installed. `npm run lesson-programs` writes every lesson and solution in every language into `lesson-programs.json`, for CMIL's `npm run snapshot -- --programs`. `npm run lint` checks the code with ESLint and Prettier.

## License

GPL-3.0-only, like CMIL. See [LICENSE](LICENSE).
