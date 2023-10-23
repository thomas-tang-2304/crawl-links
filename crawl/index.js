const { writeFileSync } = require("fs");
const { crawlLinks, crawlLinks2 } = require("./crawler");
const { color } = require("./func/coloringLogger");
const { uniqueArray } = require("./func/uniqueArray");
const { isValidUrl } = require("./func/validUrl");

let trangloai = { href_links: [], src_links: [] };

const Crawl = async (curl) => {
  const allLinks = await crawlLinks(curl)
    .then((crawledData) => {
      trangloai.href_links.push(curl);
      return crawledData;
    })
    .catch((err) => {
      console.log(err);
    });
  return allLinks;
};

const MultiPleCrawl = async (curls) => {
  const allLinks = await crawlLinks2(curls)
    .then((crawledData) => {
      trangloai.href_links.push(...curls);
      return crawledData;
    })
    .catch((err) => {
      console.log(err);
    });
  return allLinks;
};

const run = async (c_url) => {
  const originUrl = c_url.includes("http")
    ? c_url
    : new URL(`https://${c_url}`).href;
  console.log("origin: ", originUrl);
  const allLinks_loai = await Crawl(c_url);

  // console.log(allLinks_loai);

  for (const link of allLinks_loai.href_links) {
    if (trangloai.href_links.indexOf(link) === -1) {
      trangloai.href_links.push(link);
    }
  }
  for (const link of allLinks_loai.src_links) {
    if (trangloai.src_links.indexOf(link) === -1) {
      trangloai.src_links.push(link);
    }
  }
  trangloai = {
    href_links: uniqueArray(trangloai.href_links),
    src_links: uniqueArray(trangloai.src_links),
  };
  // console.log(trangloai.href_links.length);
  // console.log(trangloai.src_links.length);

  let temp = [];
  let otherLinks = [];
  for (let i = 0; i < trangloai.href_links.length; i++) {
    if (trangloai.href_links[i]?.startsWith(originUrl))
      temp.push(trangloai.href_links[i]);
    else otherLinks.push(trangloai.href_links[i]);
    if (temp.length < 10 && i + 1 < trangloai.href_links.length) {
    } else {
      const crawledData = await MultiPleCrawl(temp).then((Crawled) => {
        console.log(temp.length);
        temp.forEach((Cdata) => {
          console.log(
            `crawled from URL: ${color(`${Cdata}`, "cyan")} completed ${color(
              `${Math.round(
                ((i + 1) * 100) / trangloai.href_links.length
              )}%, index ${color(i)}, total: ${trangloai.href_links.length}`,
              "green"
            )}`
          );
        });
        // console.log(uniqueArray(Crawled.href_links));
        return Crawled;
      });

      trangloai.href_links.push(...crawledData.href_links, ...otherLinks);
      trangloai.src_links.push(...crawledData.src_links);

      temp = [];
      otherLinks = [];
    }
    trangloai = {
      href_links: uniqueArray(trangloai.href_links),
      src_links: uniqueArray(trangloai.src_links),
    };
  }

  trangloai = {
    href_links: uniqueArray(trangloai.href_links),
    src_links: uniqueArray(trangloai.src_links),
  };

  writeFileSync(
    `crawl/history/${new URL(originUrl).hostname.replace(/\./g, "-")}.json`,
    JSON.stringify(trangloai)
  );

  console.log(
    `file has been written into ${new URL(originUrl).hostname.replace(
      /\./g,
      "-"
    )}.json`
  );
  return `${new URL(originUrl).hostname.replace(/\./g, "-")}.json`;
};
const runCrawling = async (Url) => {
  console.log("crawling for: ", Url);
  return await run(Url);
};

module.exports = { runCrawling };
