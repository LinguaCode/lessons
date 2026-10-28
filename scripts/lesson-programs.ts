//writes every lesson and solution, in every language, into lesson-programs.json, as a list of {name, language, code},
//for CMIL's npm run snapshot -- --programs, which lists the conversions a change of CMIL changes
import fs from 'node:fs';
import {languages} from 'cmil';

import {EXERCISES, LESSONS, lessonCode, lessonTextsOf, loadLessonTexts, localize} from '../src/index.ts';

await Promise.all(languages.map(loadLessonTexts));
const programs = languages.flatMap(language =>
  LESSONS.flatMap(lesson => [
    {name: lesson.id, language, code: lessonCode(lesson, language)},
    {
      name: `${lesson.id}, solution`,
      language,
      code: localize(EXERCISES[lesson.id].solution, language, lessonTextsOf(language))
    }
  ])
);
fs.writeFileSync('lesson-programs.json', JSON.stringify(programs));
