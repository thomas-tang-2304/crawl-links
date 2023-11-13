const { writeFileSync } = require("fs");
const { crawlLinks2 } = require("./crawler");
const { color } = require("./func/coloringLogger");
const { uniqueArray } = require("./func/uniqueArray");
const { readFileHistory } = require("../crawl/modules/readFileHistory");

const { jsonToHtmlList } = require("../crawl/func/jsonToHtml");
const { getFormattedDate } = require("./func/dating");
const { isDataURI, isValidUrl } = require("./func/validUrl");
const { measureTime } = require("./func/measure");

const serverURL = "ws://localhost:3001";
const socket = require("socket.io-client")(serverURL, {
  transports: ["websocket"],
});

const MultiPleCrawl = async (curls, data) => {
  const allLinks = {
    href_links: {},
    src_links: {},
  };
  const crawledAllLinks = await crawlLinks2(curls)
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

const run = async (c_url, uid_socket) => {
  const originUrl = c_url.includes("http")
    ? c_url
    : new URL(`https://${c_url}`).href;
  console.log("origin: ", originUrl);

  let allLinks_loai = await MultiPleCrawl([c_url]);

  let temp = [];
  for (let i = 0; i < Object.keys(allLinks_loai.href_links).length; i++) {
    let ALL_LINKS = Object.keys(allLinks_loai.href_links);
    const limit = parseInt(ALL_LINKS.length / 20);

    if (ALL_LINKS[i]?.startsWith(originUrl) && !ALL_LINKS[i].includes("#"))
      temp.push(ALL_LINKS[i]);

    if (temp.length >= limit || i + 1 >= ALL_LINKS.length) {
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
                )}%, index ${color(i + 1, "green")}, total: ${
                  ALL_LINKS.length
                }`,
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
      if (crawledData?.href_links) {
        Object.keys(crawledData?.href_links)?.forEach((c) => {
          if (!c.includes("#")) {
            if (allLinks_loai.href_links.hasOwnProperty(c))
              allLinks_loai.href_links[c] = uniqueArray([
                ...allLinks_loai.href_links[c],
                ...crawledData.href_links[c],
              ]);
            else {
              allLinks_loai.href_links[c] = crawledData.href_links[c];
            }
          }
        });
      }
      if (crawledData?.src_links) {
        Object.keys(crawledData?.src_links)?.forEach((c) => {
          // console.log(allLinks_loai.href_links[c]);
          if (!c.includes("#")) {
            if (allLinks_loai.src_links.hasOwnProperty(c)) {
              allLinks_loai.src_links[c] = uniqueArray([
                ...allLinks_loai.src_links[c],
                ...crawledData.src_links[c],
              ]);
            } else {
              allLinks_loai.src_links[c] = crawledData.src_links[c];
            }
          }
        });
      }

      temp = [];
    }
  }

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
