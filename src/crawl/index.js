const { writeFileSync } = require("fs");
const { crawlLinks2 } = require("./crawler");
const { color } = require("./func/coloringLogger");
const { uniqueArray } = require("./func/uniqueArray");

const { jsonToHtmlList } = require("../crawl/func/jsonToHtml");
const { getFormattedDate } = require("./func/dating");
const { isDataURI, isValidUrl } = require("./func/validUrl");
const { measureTime } = require("./func/measure");
const { Cluster } = require("puppeteer-cluster");
const { crawlWebsite } = require("./cheerio/ch");

const serverURL = "ws://localhost:3001";

const socket = require("socket.io-client")(serverURL, {
  transports: ["websocket"],
});

const pptOptions = process.env.NODE_ENV
  ? {
      headless: "new",
      waitForSelector: "body",
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      args: ["--no-sandbox", "--no-zygote", "--disable-setuid-sandbox"],
    }
  : {
      waitForSelector: "body",
      headless: "new",
      args: ["--no-sandbox"],
    };

const cluster = Cluster.launch({
  concurrency: Cluster.CONCURRENCY_PAGE,
  maxConcurrency: 50,
  puppeteerOptions: pptOptions,
});

const MultiPleCrawl = async (curls, data) => {
  const allLinks = {
    href_links: {},
    src_links: {},
  };
  const crawledAllLinks = await crawlLinks2(curls, await cluster)
    .then((crawledData) => {
      for (const curl of Object.keys(crawledData)) {
        for (const curl2 of crawledData[curl].href_links) {
          if (allLinks.href_links.hasOwnProperty(curl2)) {
            allLinks.href_links[curl2].push(
              getKeyIndex(data ? data.href_links : allLinks.href_links, curl)
            );
          } else {
            allLinks.href_links[curl2] = [
              getKeyIndex(data ? data.href_links : allLinks.href_links, curl),
            ];
          }
        }

        for (const curl3 of crawledData[curl].src_links) {
          if (allLinks.src_links.hasOwnProperty(curl3)) {
            allLinks.src_links[curl3].push(
              getKeyIndex(data ? data.href_links : allLinks.href_links, curl)
            );
          } else {
            allLinks.src_links[curl3] = [
              getKeyIndex(data ? data.href_links : allLinks.href_links, curl),
            ];
          }
        }
      }

      return allLinks;
    })
    .catch((err) => {
      console.log(err);
    });
  return crawledAllLinks;
};

const getKeyIndex = (href, url) => {
  return Object.keys(href).indexOf(url);
};
const checkCrawlabledLinks = (thisLink, originUrl) =>
  thisLink?.startsWith(originUrl) && !thisLink.includes("#");

const run = async (c_url, uid_socket) => {
  const originUrl = c_url.includes("http")
    ? c_url
    : new URL(`https://${c_url}`).href;

  console.log("origin: ", originUrl);

  let ALL_LINK_LOAI = await MultiPleCrawl([c_url]);
  let CRAWLABLE_LINKS = Object.keys(ALL_LINK_LOAI.href_links).filter(
    (thisLink) => checkCrawlabledLinks(thisLink, originUrl)
  );

  let temp = [];
  for (let i = 0; i < CRAWLABLE_LINKS.length; ) {
    // let ALL_LINKS = CRAWLABLE_LINKS;

    const limit = parseInt(CRAWLABLE_LINKS.length / 20);

    temp =
      i + limit < CRAWLABLE_LINKS.length
        ? CRAWLABLE_LINKS.slice(i, i + limit)
        : CRAWLABLE_LINKS.slice(i);

    // if (temp.length >= limit || i + 1 >= ALL_LINKS.length) {
    console.log(
      color(
        `${temp.length} urls have been add to queue ------------------------------ `,
        "magenta"
      )
    );

    const crawledData = await MultiPleCrawl(temp, ALL_LINK_LOAI).then(
      (Crawled) => {
        temp.forEach((Cdata) => {
          console.log(
            `crawled from URL: ${color(`${Cdata}`, "cyan")} completed ${color(
              `${Math.round(
                ((i + 1) * 100) / CRAWLABLE_LINKS.length
              )}%, index ${color(i + 1, "green")}, total: ${
                CRAWLABLE_LINKS.length
              }`,
              "green"
            )}`
          );
        });
        socket.emit(
          "chat message",
          JSON.stringify({
            total: CRAWLABLE_LINKS.length,
            index: i + 1,
            progress: Math.round(((i + 1) * 100) / CRAWLABLE_LINKS.length),
          }),
          uid_socket
        );
        console.log(socket);
        return Crawled;
      }
    );
    async function processLinks(links, targetLinks) {
      Object.entries(links).map(async ([key, value]) => {
        if (!key.includes("#")) {
          if (targetLinks.hasOwnProperty(key)) {
            targetLinks[key] = uniqueArray([...targetLinks[key], ...value]);
          } else {
            targetLinks[key] = value;
          }
        }
      });
    }
    if (crawledData?.href_links && crawledData?.src_links) {
      // Create an array of promises for processing href_links and src_links
      const promises = [
        processLinks(crawledData.href_links, ALL_LINK_LOAI.href_links),
        processLinks(crawledData.src_links, ALL_LINK_LOAI.src_links),
      ];

      // Wait for both promises to be resolved
      await Promise.all(promises);
    }

    CRAWLABLE_LINKS = uniqueArray([
      ...Object.keys(ALL_LINK_LOAI.href_links),
      ...CRAWLABLE_LINKS,
    ]).filter((thisLink) => checkCrawlabledLinks(thisLink, originUrl));
    if (i + limit < CRAWLABLE_LINKS.length) i += limit;
    else i += temp.length;

    temp = [];
    // }
  }

  console.log(CRAWLABLE_LINKS.length);

  if (originUrl.indexOf(".") != -1) {
    writeFileSync(
      `src/crawl/history/${new URL(originUrl).hostname.replace(
        /\./g,
        "-"
      )}.json`,
      JSON.stringify({
        allLinks: ALL_LINK_LOAI,
      })
    );
    console.log(
      `file has been written into ${new URL(originUrl).hostname.replace(
        /\./g,
        "-"
      )}.json`
    );
  }
  return {
    filename: '${new URL(originUrl).hostname.replace(/./g, "-")}.json',
    data: { allLinks: ALL_LINK_LOAI },
  };
};

const runCrawling = async (Url, uid_socket) => {
  console.log("crawling for: ", Url);

  const parseUrl = Url.includes("http") ? Url : new URL(`https://${Url}`).href;
  const jsonFileUrl = await measureTime(() =>
    crawlWebsite(parseUrl, uid_socket)
  );
};

module.exports = { runCrawling };
