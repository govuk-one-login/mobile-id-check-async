import { chalk, echo } from "zx";

export const multiColouredText = (text: string): string => {
  const colours = [
    chalk.rgb(196, 0, 0),
    chalk.rgb(255, 132, 0),
    chalk.rgb(255, 251, 0),
    chalk.rgb(4, 255, 0),
    chalk.rgb(0, 149, 255),
    chalk.rgb(170, 0, 255),
    chalk.rgb(255, 62, 181),
  ];

  let result = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    // If the character is whitespace, add it without colour
    if (char === " ") {
      result += char;
      continue;
    }

    const colourFn = colours[i % colours.length];
    result += colourFn(char);
  }
  return result;
};

export const welcomeMessage = (): void => {
  const part1 = chalk.italic(multiColouredText("Welcome"));
  const part2 = chalk.cyanBright.bold.italic(" to the ");
  const part3 = chalk.cyanBright.bold.italic.underline("unofficial");
  const part4 = chalk.cyanBright.bold.italic(
    " ID Check stack management tool...",
  );
  echo(part1 + part2 + part3 + part4);
  echo("");
};
