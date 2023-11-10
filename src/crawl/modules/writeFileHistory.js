const fs = require("fs");

// Create an array of numbers from 1 to 1 million
const numbers = Array.from({ length: 1000000 }, (_, i) => i + 1);

// Convert the array to a JSON string
const jsonContent = JSON.stringify(numbers);

// Write the JSON string to a file
fs.writeFileSync("numbers.json", jsonContent);

console.log("Numbers from 1 to 1 million have been written to numbers.json.");
