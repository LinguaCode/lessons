//the parts of the titles and the descriptions of the lessons, with the words of the commands they name; the page and its
//build share it, so it loads no lessons of its own
import {commandsOf} from 'cmil';

/**
 * The parts of a title or a description: its texts, and the words of the commands it names, like {print}.
 */
export const partsOf = (text: string, language: string): {text: string; command?: string}[] => {
  const words = new Map(commandsOf(language).map(({command, words}) => [command, words[0]]));
  return text
    .split(/(\{\w+\})/)
    .filter(Boolean)
    .map(part => {
      const command = /^\{(\w+)\}$/.exec(part)?.[1];
      return command && words.has(command) ? {text: words.get(command)!, command} : {text: part};
    });
};
