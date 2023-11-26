
const { parseFromString } = require("dom-parser");
const { color } = require("../func/coloringLogger");
const { uniqueObjectsArray } = require("../func/uniqueArray");
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


async function fetchAndParseHTML(url) {
  try {
    const response = await (
      await fetch(url, {timeout:5000}).then((result) => {
        // console.log("response.status =", result.status);

        return result;
      })
    ).text();
    return parseFromString(response);
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
  Promise.all([

    $?.getElementsByTagName("a").forEach((element) => {
      const hrefIndex = element?.attributes?.findIndex((d) => d?.name == "href");
      const href = element?.attributes[hrefIndex]?.value;
      if (href) {
        // console.log(href);
        !href.startsWith("https://") && !href.startsWith("http://")
          ? links.href_links.push(
              `${origin}/${href}`.replace(/\/+/g, "/").replace(":/", "://")
            )
          : links.href_links.push(href);
      }
    }),
  
    [
      ...$?.getElementsByTagName("audio"),
      ...$?.getElementsByTagName("embed"),
      ...$?.getElementsByTagName("iframe"),
      ...$?.getElementsByTagName("img"),
      ...$?.getElementsByTagName("input"),
      ...$?.getElementsByTagName("script"),
      ...$?.getElementsByTagName("source"),
      ...$?.getElementsByTagName("track"),
      ...$?.getElementsByTagName("video"),
    ].forEach((element) => {
      const srcIndex = element?.attributes?.findIndex((d) => d?.name == "src");
      const src = element?.attributes[srcIndex]?.value;
      if (src) {
        !src.startsWith("https://") && !src.startsWith("http://")
          ? links.src_links.push(
              `${origin}/${src}`.replace(/\/+/g, "/").replace(":/", "://")
            )
          : links.src_links.push(src);
      }
    })
  ])

  return links;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  let lastLength = 0;
  while (CRAWLABLE_LINKS.length > 0) {
    const { url, depth } = CRAWLABLE_LINKS.shift();

    const UNIQUE_CRAWLABLE_LINKS = 
      queue.href_links.filter((thisLink) =>
        checkCrawlabledLinks(thisLink.url, originUrl)
      )


    if (!visitedUrls.has(url) && checkCrawlabledLinks(url, originUrl)) {
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

         socket.emit(
           "chat message",
           JSON.stringify({
             total: UNIQUE_CRAWLABLE_LINKS.length,
             index: i + 1,
             progress: Math.round(
               ((i + 1) * 100) / UNIQUE_CRAWLABLE_LINKS.length
             ),
             increase: UNIQUE_CRAWLABLE_LINKS.length - lastLength,
             crawling_for: UNIQUE_CRAWLABLE_LINKS.slice(-1)[0].url,
           }),
           uid_socket
         );
        Promise.all([
          links.href_links.forEach((link) => {
            // You can process the link here\

            // Add the link to the queue for further crawling
            CRAWLABLE_LINKS.push({ url: link, depth: depth + 1 });
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
              queue.href_links[indexOfHrefOfUrl].from = [
                ...(queue.href_links[indexOfHrefOfUrl]?.from ?? []),
                url,
              ];
            }
          }),

          links.src_links.forEach((link) => {
            const indexOfSrcOfUrl = queue.src_links.findIndex(
              (o) => o.url == link
            );
            if (indexOfSrcOfUrl == -1)
              queue.src_links.push({ url: link, from: [url] });
            else {
              queue.src_links[indexOfSrcOfUrl].from = [
                ...(queue.src_links[indexOfSrcOfUrl]?.from ?? []),
                url,
              ];
            }
          }),
        ]);

        lastLength = UNIQUE_CRAWLABLE_LINKS.length;
      }
      if (i % 100 == 0) {
        console.log(queue.href_links.length);
        await delay(5000);
      }
      i++;
    }
  }
  queue.href_links = uniqueObjectsArray(queue.href_links, "url");
  queue.src_links = uniqueObjectsArray(queue.src_links, "url");

  const finishedHref = mapParentIndex(queue.href_links, queue.href_links);

  const finishedSrc = mapParentIndex(queue.src_links, queue.href_links);

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
