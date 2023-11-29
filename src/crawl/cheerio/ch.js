const { parseFromString } = require("dom-parser");
const { color } = require("../func/coloringLogger");
const { uniqueObjectsArray, uniqueArray } = require("../func/uniqueArray");
const { writeFileSync } = require("fs");
const { jsonToHtmlList } = require("../func/jsonToHtml");
const { getFormattedDate } = require("../func/dating");
const axios = require("axios");

const {
  mapParentIndex,
  checkCrawlabledLinks,
  filterOriginStatics,
} = require("./utils");
const { decode } = require("../func/decodeURL");

// Function to fetch and parse HTML

async function fetchAndParseHTML(url, queue) {
  const indexOfCrawledUrl = queue.href_links.findIndex((o) => o.url == url);
  try {
    const resJson = await fetch(url, {
      timeout: 0,
    });
    const response = await resJson?.text(); // Replace fetch with axios.get
    if (!resJson.ok) {
      // make the promise be rejected if we didn't get a 2xx response
      throw new Error("Not 2xx response", { cause: resJson });
    } else {
      console.log(color(`FETCH SUCCESSFULLY ${url}`, "yellow"));
      if (indexOfCrawledUrl) {
        queue.href_links[indexOfCrawledUrl].crawl_status = "successfully";
        queue.href_links[indexOfCrawledUrl].status_code = resJson?.status;
      }
      // console.log(resJson.status);
      return response ? parseFromString(response) : null;
    }
  } catch (error) {
    // console.log("response.status =", error.status);
    console.error("Error fetching URL:", url);
    console.error(error.message);
    if (indexOfCrawledUrl) {
      queue.href_links[indexOfCrawledUrl].status_code = error?.cause?.status;
      queue.href_links[indexOfCrawledUrl].crawl_status = "failed";
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
async function crawlWebsite(startUrl) {
  const originUrl = startUrl.includes("http")
    ? startUrl
    : new URL(`https://${startUrl}`).href;

  console.log("origin: ", originUrl);

  const visitedUrls = new Set();
  const queue = {
    href_links: [{ url: startUrl, depth: 0, tag: "a" }],
    src_links: [],
  };
  let CRAWLABLE_LINKS = queue.href_links.filter((thisLink) =>
    checkCrawlabledLinks(thisLink.url, originUrl, thisLink.tag)
  );
  
  // console.log(queue);
  let i = 0;
  let temp = [];
  while (CRAWLABLE_LINKS.length > 0) {
    const { url, depth} = CRAWLABLE_LINKS.shift();

    const UNIQUE_CRAWLABLE_LINKS = queue.href_links.filter((thisLink) =>
      checkCrawlabledLinks(thisLink.url, originUrl, thisLink.tag)
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

      // const $ = await fetchAndParseHTML(url);
      temp.push(fetchAndParseHTML(url, queue));
      // console.log(temp);
      if (
        temp.length == 100 ||
        i == 0 ||
        i == UNIQUE_CRAWLABLE_LINKS.length - 1
      ) {
        await Promise.all(temp).then((fetchData) => {
          // console.log(fetchData);
          fetchData.forEach(async (eachData) => {
            const links = await extractLinks(eachData, originUrl);
            Promise.all([
              links.href_links.forEach((link) => {
                // You can process the link here\

                // Add the link to the queue for further crawling
                CRAWLABLE_LINKS.push({ url: link.url, depth: depth + 1 });
                const indexOfHrefOfUrl = queue.href_links.findIndex(
                  (o) => o.url == link.url
                );
                // console.log(indexOfHrefOfUrl);
                if (indexOfHrefOfUrl == -1) {
                  queue.href_links.push({
                    url: link.url,
                    depth: depth + 1,
                    from: [url],
                    tag: link.tag,
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
                  (o) => o.url == link.url
                );
                if (indexOfSrcOfUrl == -1)
                  queue.src_links.push({
                    url: link.url,
                    from: [url],
                    tag: link.tag,
                  });
                else {
                  queue.src_links[indexOfSrcOfUrl].from = [
                    ...(queue.src_links[indexOfSrcOfUrl]?.from ?? []),
                    url,
                  ];
                }
              }),
            ]);
          });
          temp = [];
          console.log(queue.href_links.length);
        });
        CRAWLABLE_LINKS = queue.href_links.filter(async (thisLink) =>
        checkCrawlabledLinks(thisLink.url, originUrl, thisLink.tag)
        );
        await delay(5000);
        console.log(CRAWLABLE_LINKS);
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

  return jsonToHtmlList({
    completed_date: getFormattedDate(),
    // token,
    href: filterOriginStatics(finishedHref.map((u) => u.url)),
    src: filterOriginStatics(finishedSrc.map((u) => u.url)),
  });
}

module.exports = { crawlWebsite };
