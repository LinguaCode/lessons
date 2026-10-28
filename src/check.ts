//checks a program against the solution of an exercise: both run with the same answers and the same random numbers,
//and must print the same lines
import {Session, type ProgramError} from 'cmil';

//the steps a program of a check may run between two answers, so one that doesn't end is stopped soon
const MAX_STEPS = 200_000;

//what a program printed with a set of answers, and how it ended
export type Run = {output: string[]; error?: ProgramError; needsAnswers?: boolean};

export type CheckResult =
  | {passed: true}
  | {
      passed: false;
      //the answers of the run that went wrong, and what the program printed with them
      answers: string[];
      output: string[];
      //an error the program ended with, or that it waited for more answers than the check has
      error?: ProgramError;
      needsAnswers?: boolean;
      //else the first line that isn't the solution's, from 1, as it should be and as it is, either missing
      line?: number;
      expected?: string;
      actual?: string;
    };

/**
 * Random numbers from 0 up to 1, the same ones for the same seed (mulberry32).
 */
export const seeded = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let next = Math.imul(state ^ (state >>> 15), state | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Runs a program with a set of answers, until it ends or waits for an answer the set doesn't have.
 */
export const runWith = (code: string, language: string, answers: string[], random: () => number): Run => {
  const session = new Session(code, language, {maxSteps: MAX_STEPS, random});
  let step = session.run();
  const output = [...step.output];
  for (const answer of answers) {
    if (step.state !== 'input') break;
    step = session.input(answer);
    output.push(...step.output);
  }

  if (step.state === 'input') return {output, needsAnswers: true};
  return step.error ? {output, error: step.error} : {output};
};

/**
 * Checks a program against a solution with each set of answers, and returns the first run that went wrong.
 */
export const checkProgram = (code: string, solution: string, language: string, answerSets: string[][]): CheckResult => {
  for (const [index, answers] of answerSets.entries()) {
    const expected = runWith(solution, language, answers, seeded(index + 1));
    const actual = runWith(code, language, answers, seeded(index + 1));
    const {output} = actual;

    if (actual.error) return {passed: false, answers, output, error: actual.error};
    if (actual.needsAnswers) return {passed: false, answers, output, needsAnswers: true};

    const length = Math.max(output.length, expected.output.length);
    for (let line = 0; line < length; line++) {
      if (output[line] !== expected.output[line]) {
        return {passed: false, answers, output, line: line + 1, expected: expected.output[line], actual: output[line]};
      }
    }
  }

  return {passed: true};
};
