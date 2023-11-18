// Import required modules
const axios = require("axios");
const cheerio = require("cheerio");
const { color } = require("../func/coloringLogger");
const { uniqueObjectsArray, uniqueArray } = require("../func/uniqueArray");
const { writeFileSync } = require("fs");
const { jsonToHtmlList } = require("../func/jsonToHtml");
const { getFormattedDate } = require("../func/dating");

const {
  mapParentIndex,
  checkCrawlabledLinks,
  filterOriginStatics,
} = require("./utils");

const serverURL = "ws://localhost:3001";

const socket = require("socket.io-client")(serverURL, {
  transports: ["websocket"],
});

// Function to fetch and parse HTML
async function fetchAndParseHTML(url) {
  try {
    const response = await axios.get(url);
    return cheerio.load(response.data);
  } catch (error) {
    console.error("Error fetching URL:", url);
    console.error(error.message);
    return null;
  }
}

// Function to extract links from a page
function extractLinks($, origin) {
  const links = {
    href_links: [],
    src_links: [],
  };
  $("a").each((index, element) => {
    const href = $(element).attr("href");
    if (href) {
      !href.startsWith("https://") && !href.startsWith("http://")
        ? links.href_links.push(`${origin}/${href}`.replace(/\/+/g, "/"))
        : links.href_links.push(href);
    }
  });

  $("*:not(script)").each((index, element) => {
    const src = $(element).attr("src");
    if (src) {
      links.src_links.push(src);
    }
  });
  return links;
}

// Function to crawl a website
async function crawlWebsite(startUrl, uid_socket) {
  const originUrl = startUrl.includes("http")
    ? startUrl
    : new URL(`https://${startUrl}`).href;

  console.log("origin: ", originUrl);

  const visitedUrls = new Set();
  const queue = {
    href_links: [{ url: startUrl, depth: 0 }],
    src_links: [],
  };
  let CRAWLABLE_LINKS = queue.href_links.filter((thisLink) =>
    checkCrawlabledLinks(thisLink.url, originUrl)
  );
  // console.log(queue);
  let i = 0;
  while (CRAWLABLE_LINKS.length > 0) {
    const { url, depth } = CRAWLABLE_LINKS.shift();

    const UNIQUE_CRAWLABLE_LINKS = uniqueObjectsArray(
      queue.href_links.filter((thisLink) =>
        checkCrawlabledLinks(thisLink.url, originUrl)
      ),
      "url"
    );

    if (!visitedUrls.has(url)) {
      // console.log(`Crawling: ${url}`);
      console.log(
        `${color("Crawl link:", "cyan")} ${color(url + ",", "blue")} ${color(
          "Depth: ",
          "cyan"
        )} ${color(depth, "yellow")}, finished ${color(
          i + 1,
          "green"
        )} links of ${color(UNIQUE_CRAWLABLE_LINKS.length, "green")} (${color(
          Math.round(((i + 1) * 100) / UNIQUE_CRAWLABLE_LINKS.length) + "%",
          "red"
        )})`
      );
      visitedUrls.add(url);

      const $ = await fetchAndParseHTML(url);

      if ($) {
        const links = extractLinks($, originUrl);

        links.href_links.forEach((link) => {
          // You can process the link here\

          // Add the link to the queue for further crawling
          if (checkCrawlabledLinks(link, originUrl)) {
            CRAWLABLE_LINKS.push({ url: link, depth: depth + 1 });
          }
          const indexOfHrefOfUrl = queue.href_links.findIndex(
            (o) => o.url == link
          );
          // console.log(indexOfHrefOfUrl);
          if (indexOfHrefOfUrl == -1) {
            queue.href_links.push({
              url: link,
              depth: depth + 1,
              from: [url],
            });
          } else {
            queue.href_links[indexOfHrefOfUrl].from = uniqueArray([
              ...(queue.href_links[indexOfHrefOfUrl]?.from ?? []),
              url,
            ]);
          }
        });

        links.src_links.forEach((link) => {
          const indexOfSrcOfUrl = queue.src_links.findIndex(
            (o) => o.url == link
          );
          if (indexOfSrcOfUrl == -1)
            queue.src_links.push({ url: link, from: [url] });
          else {
            queue.src_links[indexOfSrcOfUrl].from = uniqueArray([
              ...(queue.src_links[indexOfSrcOfUrl]?.from ?? []),
              url,
            ]);
          }
        });

        socket.emit(
          "chat message",
          JSON.stringify({
            total: CRAWLABLE_LINKS.length,
            index: CRAWLABLE_LINKS.indexOf(url) + 1,
            progress: Math.round(
              ((CRAWLABLE_LINKS.indexOf(url) + 1) * 100) /
                CRAWLABLE_LINKS.length
            ),
          }),
          uid_socket
        );
        i++;
      }
    }
  }

  const finishedHref = mapParentIndex(queue.href_links);

  const finishedSrc = mapParentIndex(queue.src_links);

  if (originUrl.indexOf(".") != -1) {
    writeFileSync(
      `src/crawl/history/${new URL(originUrl).hostname.replace(
        /\./g,
        "-"
      )}.json`,
      JSON.stringify({
        allLinks: {
          href_links: finishedHref,
          src_links: finishedSrc,
        },
      })
    );
    console.log(
      `file has been written into ${new URL(originUrl).hostname.replace(
        /\./g,
        "-"
      )}.json`
    );
  }

  return jsonToHtmlList({
    completed_date: getFormattedDate(),
    // token,
    href: filterOriginStatics(finishedHref.map((u) => u.url)),
    src: filterOriginStatics(finishedSrc.map((u) => u.url)),
  });
}

module.exports = { crawlWebsite };
