const { readFileSync } = require("fs");

const readFileHistory = (jsonFileUrl) => {

    const allLinks = readFileSync(`crawl/history/${jsonFileUrl}`, "utf-8");
    
    const allHrefLinks = JSON.parse(allLinks).href_links;
    const allSrcLinks = JSON.parse(allLinks).src_links;
    return { allHrefLinks, allSrcLinks };
};

module.exports = { readFileHistory };
