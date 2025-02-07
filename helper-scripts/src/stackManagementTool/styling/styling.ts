import { chalk, echo } from "zx";

export const multiColouredText = (text: string): string => {
  // Define a rainbow array of chalk color functions.
  // Using custom hex colors for orange, indigo, and violet.
  const colours = [
    chalk.rgb(196, 0, 0),
    chalk.hex("#FFA500"), // Orange
    chalk.yellow,
    chalk.green,
    chalk.rgb(0, 149, 255),
    chalk.rgb(174, 0, 255), // Indigo
    chalk.hex("#EE82EE"), // Violet
  ];
  let result = "";
  // Loop over each character in the text
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    // If the character is whitespace, just add it without coloring
    if (char === " ") {
      result += char;
      continue;
    }
    // Choose a color based on the character's index (cycling through the rainbow colors)
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
};
