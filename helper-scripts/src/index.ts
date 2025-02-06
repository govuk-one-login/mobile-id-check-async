import inquirer from "inquirer";

console.log("Hello, world!");

const askFavouriteFruits = async (): Promise<void> => {
  const { fruits } = await inquirer.prompt<{ fruits: string }>([
    {
      type: "input",
      name: "fruits",
      message: "What are your fav fruits? (separate with commas)",
    },
  ]);

  const fruitsArray = fruits
    .split(",")
    .map((fruit) => fruit.trim())
    .filter((fruit) => fruit !== "");

  console.log("\nYour fav fruits are:");
  fruitsArray.forEach((fruit) => console.log(` ${fruit}, `));
};

try {
  await askFavouriteFruits();
} catch (error: unknown) {
  console.log("There was an error. Error:", error);
}
