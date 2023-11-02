const { readFileSync } = require("fs");

const readFileHistory = (jsonFileUrl) => {
  const allLinks = readFileSync(`crawl/history/${jsonFileUrl}`, "utf-8");

  const allHrefLinks = Object.keys(JSON.parse(allLinks).allLinks.href_links);
  const allSrcLinks = Object.keys(JSON.parse(allLinks).allLinks.src_links);
  const allLinksScrape = JSON.parse(allLinks).allLinks;
  // const allSrcCrawled = JSON.parse(allLinks).src_links;
  return { allHrefLinks, allSrcLinks, allLinksScrape };
};

module.exports = { readFileHistory };
