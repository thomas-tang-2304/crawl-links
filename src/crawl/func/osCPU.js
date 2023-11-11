const pidusage = require("pidusage");


// Record the initial usage

const pidusage = require("pidusage");

// Record the initial usage
pidusage(process.pid, (err, stats) => {
  if (err) {
    console.error(err);
    return;
  }

  const startCPU = stats.cpu;
  console.log(`Initial CPU usage: ${startCPU}%`);

  // Run your code here

  // Measure CPU usage again after running the code
  pidusage(process.pid, (err, stats) => {
    if (err) {
      console.error(err);
      return;
    }

    const endCPU = stats.cpu;
    console.log(`Final CPU usage: ${endCPU}%`);
  });
});