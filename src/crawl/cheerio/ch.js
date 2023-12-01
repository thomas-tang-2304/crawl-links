const { parseFromString } = require("dom-parser");
const { color } = require("../func/coloringLogger");
const { uniqueArray } = require("../func/uniqueArray");
const { writeFileSync } = require("fs");
const { jsonToHtmlList } = require("../func/jsonToHtml");
const { getFormattedDate } = require("../func/dating");

const {
  mapParentIndex,
  checkCrawlabledLinks,
  filterOriginStatics,
} = require("./utils");
// const { decode } = require("../func/decodeURL");

const serverURL = "ws://localhost:3001";
const socket = require("socket.io-client")(serverURL, {
  transports: ["websocket"],
});

// Function to fetch and parse HTML

async function fetchAndParseHTML(url, queue) {
  // const indexOfCrawledUrl = queue.href_links.findIndex((o) => o.url == url);
  try {
    const resJson = await fetch(url, {
      timeout: 0,
    });
    const response = await resJson?.text(); // Replace fetch with axios.get
    if (!resJson.ok) {
      // make the promise be rejected if we didn't get a 2xx response
      throw new Error("Not 2xx response", { cause: resJson });
    } else {
      // console.log(color(`FETCH SUCCESSFULLY ${url}`, "yellow"));

      if (queue.href_links.hasOwnProperty(url)) {
        queue.href_links[url].crawl_status = "successfully";
        queue.href_links[url].status_code = resJson?.status;
      }
      // console.log(resJson.status);
      return response ? parseFromString(response) : null;
    }
  } catch (error) {
    // console.error("Error fetching URL:", url);
    // console.error(error.message);

    if (queue.href_links.hasOwnProperty(url)) {
      queue.href_links[url].status_code = error?.cause?.status;
      queue.href_links[url].crawl_status = "failed";
    }
    // console.log(error.cause.status);
    return null;
  }
}

function processElements($, tagName, attributeName, origin) {
  const linksArray = [];
  return new Promise((resolve) => {
    const elements = $?.getElementsByTagName(tagName) ?? [];
    // console.log(elements);
    elements?.forEach((element) => {
      const attributeIndex = element?.attributes?.findIndex(
        (d) => d?.name === attributeName
      );
      const attributeValue = element?.attributes[attributeIndex]?.value;

      if (attributeValue) {
        const link =
          !attributeValue.startsWith("https://") &&
          !attributeValue.startsWith("http://")
            ? `${origin}/${attributeValue}`
                .replace(/\/+/g, "/")
                .replace(":/", "://")
            : attributeValue;

        linksArray.push(link);
      }
    });

    resolve(linksArray);
  });
}

// Function to extract links from a page
async function extractLinks($, origin) {
  const links = {
    href_links: [],
    src_links: [],
  };

  await Promise.all([
    processElements($, "link", "href", origin),
    processElements($, "a", "href", origin),
    processElements($, "audio", "src", origin),
    processElements($, "embed", "src", origin),
    processElements($, "iframe", "src", origin),
    processElements($, "img", "src", origin),
    processElements($, "input", "src", origin),
    processElements($, "script", "src", origin),
    processElements($, "source", "src", origin),
    processElements($, "track", "src", origin),
    processElements($, "video", "src", origin),
  ]).then((res) => {
    const result = {
      link: res[0].map((e) => ({ url: e, tag: "link" })),
      a: res[1].map((e) => ({ url: e, tag: "a" })),
      audio: res[2].map((e) => ({ url: e, tag: "audio" })),
      embed: res[3].map((e) => ({ url: e, tag: "embed" })),
      iframe: res[4].map((e) => ({ url: e, tag: "iframe" })),
      img: res[5].map((e) => ({ url: e, tag: "img" })),
      input: res[6].map((e) => ({ url: e, tag: "input" })),
      script: res[7].map((e) => ({ url: e, tag: "script" })),
      source: res[8].map((e) => ({ url: e, tag: "source" })),
      track: res[9].map((e) => ({ url: e, tag: "track" })),
      video: res[10].map((e) => ({ url: e, tag: "video" })),
    };
    links.src_links.push(
      ...result.audio,
      ...result.embed,
      ...result.iframe,
      ...result.img,
      ...result.input,
      ...result.script,
      ...result.source,
      ...result.track,
      ...result.video
    );
    links.href_links.push(...result.link, ...result.a);
  });
  // console.log(links);
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
    href_links: {},
    src_links: {},
  };

  queue.href_links[startUrl] = { depth: 0, tag: "a" };
  let CRAWLABLE_LINKS = Object.keys(queue.href_links).filter((thisLink) =>
    checkCrawlabledLinks(thisLink, originUrl, queue.href_links[thisLink].tag)
  );

  console.log(CRAWLABLE_LINKS);
  let i = 0;
  let lastLength = 0;
  let temp = [];
  while (CRAWLABLE_LINKS.length > 0) {
    const url = CRAWLABLE_LINKS.shift();

    const UNIQUE_CRAWLABLE_LINKS = Object.keys(queue.href_links).filter(
      (thisLink) =>
        checkCrawlabledLinks(
          thisLink,
          originUrl,
          queue.href_links[thisLink].tag
        )
    );

    if (queue.href_links[url].tag == "a" && !visitedUrls.has(url)) {
      // console.log(`Crawling: ${url}`);
      console.log(
        `${color("Crawl link:", "cyan")} ${color(url + ",", "blue")} ${color(
          "Depth: ",
          "cyan"
        )} ${color(queue.href_links[url].depth, "yellow")}, finished ${color(
          i + 1,
          "green"
        )} links of ${color(UNIQUE_CRAWLABLE_LINKS.length, "green")} (${color(
          Math.round(((i + 1) * 100) / UNIQUE_CRAWLABLE_LINKS.length) + "%",
          "red"
        )})`
      );

      visitedUrls.add(url);

      // const $ = await fetchAndParseHTML(url);
      temp.push(fetchAndParseHTML(url, queue));
      // console.log(temp);
      if (
        temp.length == 100 ||
        i == 0 ||
        i == UNIQUE_CRAWLABLE_LINKS.length - 1
      ) {
          await Promise.all(temp).then((fetchData) => {
            fetchData.forEach(async (eachData) => {
              const links = await extractLinks(eachData, originUrl);

              Promise.all([
                links.href_links.forEach((link) => {
                  CRAWLABLE_LINKS.push({
                    url: link.url,
                    depth: queue.href_links[url].depth + 1,
                    tag: link.tag,
                  });
                  // const indexOfHrefOfUrl = queue.href_links.findIndex(
                  //   (o) => o.url == link.url
                  // );
                  // console.log(indexOfHrefOfUrl);
                  if (!queue.href_links.hasOwnProperty(link.url)) {
                    queue.href_links[link.url] = {
                      // url: link.url,
                      depth: queue.href_links[url].depth + 1,
                      from: [url],
                      tag: link.tag,
                    };
                  } else {
                    queue.href_links[link.url].from = [
                      ...(queue.href_links[link.url]?.from ?? []),
                      url,
                    ];
                  }
                }),

                links.src_links.forEach((link) => {
                  // const indexOfSrcOfUrl = queue.src_links.findIndex(
                  //   (o) => o.url == link.url
                  // );
                  if (!queue.src_links.hasOwnProperty(link.url))
                    queue.src_links[link.url] = {
                      from: [url],
                      tag: link.tag,
                    };
                  else {
                    queue.src_links[link.url].from = [
                      ...(queue.src_links[link.url]?.from ?? []),
                      url,
                    ];
                  }
                }),
              ]);
            });
          })

       

        temp = [];
      }
      await delay(0);
      CRAWLABLE_LINKS = Object.keys(queue.href_links).filter((thisLink) =>
        checkCrawlabledLinks(
          thisLink,
          originUrl,
          queue.href_links[thisLink].tag
        )
      );
      lastLength = UNIQUE_CRAWLABLE_LINKS.length;

      await socket.emit(
        "chat message",
        JSON.stringify({
          total: UNIQUE_CRAWLABLE_LINKS.length,
          index: i + 1,
          progress: Math.round(((i + 1) * 100) / UNIQUE_CRAWLABLE_LINKS.length),
          increase: UNIQUE_CRAWLABLE_LINKS.length - lastLength,
          crawling_for: UNIQUE_CRAWLABLE_LINKS.slice(-1)[0].url,
        }),
        uid_socket
      );

      i++;
    }
  }

   const finishedHref = mapParentIndex(Object.keys(queue.href_links), queue);

   const finishedSrc = mapParentIndex(Object.keys(queue.src_links), queue);

   if (originUrl.indexOf(".") != -1) {
     writeFileSync(
       `src/crawl/history/${new URL(originUrl).hostname.replace(
         /\./g,
         "-"
       )}.json`,
       JSON.stringify({
         allLinks: {
           href_links: finishedHref.map((e) =>
             e.from
               ? {
                   ...e,
                   from: uniqueArray(e.from),
                 }
               : e
           ),
           src_links: finishedSrc.map((e) =>
             e.from
               ? {
                   ...e,
                   from: uniqueArray(e.from),
                 }
               : e
           ),
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

  const fileLinks = require(`../history/${new URL(originUrl).hostname.replace(
    /\./g,
    "-"
  )}.json`);

  return jsonToHtmlList({
    completed_date: getFormattedDate(),
    // token,
    href: filterOriginStatics(fileLinks.allLinks.href_links),
    src: filterOriginStatics(fileLinks.allLinks.src_links),
  });
}

module.exports = { crawlWebsite };
