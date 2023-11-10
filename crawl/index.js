const { writeFileSync } = require("fs");
const { crawlLinks2 } = require("./crawler");
const { color } = require("./func/coloringLogger");
const { uniqueArray } = require("./func/uniqueArray");

const { jsonToHtmlList } = require("../crawl/func/jsonToHtml");
const { getFormattedDate } = require("./func/dating");
const { isDataURI, isValidUrl } = require("./func/validUrl");

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
          allLinks.href_links[curl2] = [
            getKeyIndex(data ? data.href_links : allLinks.href_links, curl),
          ];
        }

        for (const curl3 of crawledData[curl].src_links) {
          allLinks.src_links[curl3] = [
            getKeyIndex(data ? data.href_links : allLinks.href_links, curl),
          ];
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
  const startTime = process.hrtime();
  const originUrl = c_url.includes("http")
    ? c_url
    : new URL(`https://${c_url}`).href;
  console.log("origin: ", originUrl);

  let allLinks_loai = await MultiPleCrawl([c_url]);

  let temp = [];
  let arrayAllLinks = Object.keys(allLinks_loai.href_links);
  for (let i = 0; i < arrayAllLinks.length; i++) {
    const limit =
      parseInt(arrayAllLinks.length / 20) < 10
        ? 10
        : parseInt(arrayAllLinks.length / 20);
    if (
      arrayAllLinks[i]?.startsWith(originUrl) &&
      !arrayAllLinks[i]?.includes("#")
    )
      temp.push(arrayAllLinks[i]);
    // else otherLinks.push(arrayAllLinks[i]);

    if (temp.length >= 50 || i + 1 >= arrayAllLinks.length) {
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
                  ((i + 1) * 100) / arrayAllLinks.length
                )}%, index ${color(i + 1, "green")}, total: ${
                  arrayAllLinks.length
                }`,
                "green"
              )}`
            );
          });
          arrayAllLinks = uniqueArray([
            ...arrayAllLinks,
            ...Object.keys(Crawled.href_links),
          ]);
          socket.emit(
            "chat message",
            JSON.stringify({
              index: i + 1,
              total: arrayAllLinks.length,
              progress: Math.round(((i + 1) * 100) / arrayAllLinks.length),
            }),
            uid_socket
          );
          return Crawled;
        }
      );

      Object.keys(crawledData.href_links).forEach((c) => {
        if (allLinks_loai.href_links.hasOwnProperty(c)) {
          allLinks_loai.href_links[c].push(...crawledData.href_links[c]);
        } else {
          allLinks_loai.href_links[c] = crawledData.href_links[c];
        }
      });

      Object.keys(crawledData.src_links).forEach((c) => {
        if (allLinks_loai.src_links.hasOwnProperty(c)) {
          allLinks_loai.src_links[c].push(...crawledData.src_links[c]);
        } else {
          allLinks_loai.src_links[c] = crawledData.src_links[c];
        }
      });

      temp = [];
    }
  }

  if (originUrl.indexOf(".") != -1) {
    writeFileSync(
      `crawl/history/${new URL(originUrl).hostname.replace(/\./g, "-")}.json`,
      JSON.stringify({ allLinks: allLinks_loai })
    );
    console.log(
      `file has been written into ${new URL(originUrl).hostname.replace(
        /\./g,
        "-"
      )}.json`
    );
  }
  const endTime = process.hrtime(startTime);
  console.log(
    `Time elapsed: ${Math.floor(endTime[0] / 60)}h ${endTime[0] % 60}s ${
      endTime[1] / 1e6
    }ms`
  );
  return {
    filename: `${new URL(originUrl).hostname.replace(/./g, "-")}.json`,
    data: { allLinks: allLinks_loai },
  };
};

const runCrawling = async (Url, uid_socket) => {
  console.log("crawling for: ", Url);

  const parseUrl = Url.includes("http") ? Url : new URL(`https://${Url}`).href;
  const jsonFileUrl = await run(parseUrl, uid_socket);

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

  return jsonToHtmlList({
    completed_date: getFormattedDate(),
    href: filterOriginStatics(
      Object.keys(jsonFileUrl.data.allLinks.href_links)
    ),
    src: filterOriginStatics(Object.keys(jsonFileUrl.data.allLinks.src_links)),
  });
};

module.exports = { runCrawling };
