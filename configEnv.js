const { config } = require("dotenv");

const nodeEnv = process.env.NODE_ENV || "";

const configEnv = () => {
  if (nodeEnv) {
    config({
      path: `./.env.production`,
    });
  } else {
    config();
  }
};


module.exports = { configEnv };