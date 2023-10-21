const { writeFileSync } = require("fs");

const writeFileHistory = (jsonFileUrl, data) => {
  writeFileSync(`crawl/history/${jsonFileUrl}.json`, data);
  
};

module.exports = {writeFileHistory}