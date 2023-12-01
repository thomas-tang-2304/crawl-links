const cluster = require("cluster"),
  os = require("os").cpus().length;

const clusterChildProcess = (callback) => {
  if (cluster.isMaster) {
    for (let i = 0; i < os; i++) {
      cluster.fork();
      console.log(`The Worker number: ${i + 1} is alive`);
    }
    cluster.on("exit", (worker) => {
      console.log(`The Worker number: ${worker.id} has died`);
    });
  } else {
    callback();
  }
};

// clusterChildProcess(() => {console.log("hello")});

module.exports = { clusterChildProcess };
