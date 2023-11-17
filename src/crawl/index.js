const { writeFileSync } = require("fs");
const { crawlLinks2 } = require("./crawler");
const { color } = require("./func/coloringLogger");
const { uniqueArray } = require("./func/uniqueArray");

const { jsonToHtmlList } = require("../crawl/func/jsonToHtml");
const { getFormattedDate } = require("./func/dating");
const { isDataURI, isValidUrl } = require("./func/validUrl");
const { measureTime } = require("./func/measure");
const { Cluster } = require("puppeteer-cluster");

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
      args: ["--no-sandbox", "--no-zygote", "--disable-setuid-sandbox"],
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

  let allLinks_loai = await MultiPleCrawl([c_url]);
  let crawlableLinks = Object.keys(allLinks_loai.href_links).filter(
    (thisLink) => checkCrawlabledLinks(thisLink, originUrl)
  );

  let temp = [];
  for (let i = 0; i < crawlableLinks.length; ) {
    let ALL_LINKS = crawlableLinks;

    const limit = parseInt(ALL_LINKS.length / 20);

    temp =
      i + limit < ALL_LINKS.length
        ? ALL_LINKS.slice(i, i + limit)
        : ALL_LINKS.slice(i);

    // if (temp.length >= limit || i + 1 >= ALL_LINKS.length) {
    console.log(
      color(
        `${temp.length} urls have been add to queue ------------------------------ `,
        "magenta"
      )
    );

    const crawledData = await MultiPleCrawl(temp, allLinks_loai).then(
      (Crawled) => {
        temp.forEach((Cdata) => {
          console.log(
            `crawled from URL: ${color(`${Cdata}`, "cyan")} completed ${color(
              `${Math.round(
                ((i + 1) * 100) / ALL_LINKS.length
              )}%, index ${color(i + 1, "green")}, total: ${ALL_LINKS.length}`,
              "green"
            )}`
          );
        });
        socket.emit(
          "chat message",
          JSON.stringify({
            total: ALL_LINKS.length,
            index: i + 1,
            progress: Math.round(((i + 1) * 100) / ALL_LINKS.length),
          }),
          uid_socket
        );
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
        processLinks(crawledData.href_links, allLinks_loai.href_links),
        processLinks(crawledData.src_links, allLinks_loai.src_links),
      ];

      // Wait for both promises to be resolved
      await Promise.all(promises);
    }

    crawlableLinks = uniqueArray([
      ...Object.keys(allLinks_loai.href_links),
      ...crawlableLinks,
    ]).filter((thisLink) => checkCrawlabledLinks(thisLink, originUrl));

    temp = [];
    i += limit;
    // }
  }

  console.log(crawlableLinks.length);

  if (originUrl.indexOf(".") != -1) {
    writeFileSync(
      `src/crawl/history/${new URL(originUrl).hostname.replace(
        /\./g,
        "-"
      )}.json`,
      JSON.stringify({
        allLinks: allLinks_loai,
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
    data: { allLinks: allLinks_loai },
  };
};

const runCrawling = async (Url, uid_socket) => {
  console.log("crawling for: ", Url);

  const parseUrl = Url.includes("http") ? Url : new URL(`https://${Url}`).href;
  const jsonFileUrl = await measureTime(() => run(parseUrl, uid_socket));

  const filterOriginStatics = (jsonArray) => ({
    origin: uniqueArray(
      jsonArray.map((link) =>
        link.toString().split("/")[2]
          ? isDataURI(link)
            ? link
            : link.toString().split("/")[2]
          : link
      )
    ).reduce((result, element) => {
      result[element] = jsonArray
        .map((link) =>
          link.toString().split("/")[2]
            ? isDataURI(link)
              ? link
              : link.toString().split("/")[2]
            : link
        )
        .filter((l) => l == element).length;
      return result;
    }, {}),

    total: jsonArray.length,
  });
  // console.log(filterOriginStatics(jsonFileUrl.data.allLinks.href_links));

  return jsonToHtmlList({
    completed_date: getFormattedDate(),
    // token,
    href: filterOriginStatics(
      Object.keys(jsonFileUrl.data.allLinks.href_links)
    ),
    src: filterOriginStatics(Object.keys(jsonFileUrl.data.allLinks.src_links)),
  });
};

module.exports = { runCrawling };
