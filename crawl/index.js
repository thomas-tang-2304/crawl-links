const { writeFileSync } = require("fs");
const { crawlLinks2 } = require("./crawler");
const { color } = require("./func/coloringLogger");
const { uniqueArray } = require("./func/uniqueArray");
const { readFileHistory } = require("../crawl/modules/readFileHistory");

const randToken = require("rand-token");
const { jsonToHtmlList } = require("../crawl/func/jsonToHtml");
const { getFormattedDate } = require("./func/dating");
const { isDataURI } = require("./func/validUrl");

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

const run = async (c_url) => {
  const originUrl = c_url.includes("http")
    ? c_url
    : new URL(`https://${c_url}`).href;
  console.log("origin: ", originUrl);

  let allLinks_loai = await MultiPleCrawl([c_url]);

  let temp = [];
  let otherLinks = [];
  for (let i = 0; i < Object.keys(allLinks_loai.href_links).length; i++) {
    const limit = parseInt(Object.keys(allLinks_loai.href_links).length / 20);
    if (Object.keys(allLinks_loai.href_links)[i]?.startsWith(originUrl))
      temp.push(Object.keys(allLinks_loai.href_links)[i]);
    else otherLinks.push(Object.keys(allLinks_loai.href_links)[i]);

    if (
      temp.length >= limit ||
      i + 1 >= Object.keys(allLinks_loai.href_links).length
    ) {
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
                  ((i + 1) * 100) / Object.keys(allLinks_loai.href_links).length
                )}%, index ${color(i, "green")}, total: ${
                  Object.keys(allLinks_loai.href_links).length
                }`,
                "green"
              )}`
            );
          });

          return Crawled;
        }
      );

      Object.keys(crawledData.href_links).forEach((c) => {
        if (allLinks_loai.href_links.hasOwnProperty(c))
          allLinks_loai.href_links[c] = uniqueArray([
            ...allLinks_loai.href_links[c],
            ...crawledData.href_links[c],
          ]).filter((a) => a !== -1);
        else {
          allLinks_loai.href_links[c] = crawledData.href_links[c].filter(
            (a) => a !== -1
          );
        }
      });

      Object.keys(crawledData.src_links).forEach((c) => {
        // console.log(allLinks_loai.href_links[c]);
        if (allLinks_loai.src_links.hasOwnProperty(c))
          allLinks_loai.src_links[c] = uniqueArray([
            ...allLinks_loai.src_links[c],
            ...crawledData.src_links[c],
          ]).filter((a) => a !== -1);
        else {
          allLinks_loai.src_links[c] = crawledData.src_links[c].filter(
            (a) => a !== -1
          );
        }
      });

      temp = [];
      otherLinks = [];
    }
  }

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
  return {
    filename: '${new URL(originUrl).hostname.replace(/./g, "-")}.json',
    data: { allLinks: allLinks_loai },
  };
};
// (async () => {
//   console.log(await run("https://pt.phongkhamdakhoabuonmethuot.vn/"));
// })();
const runCrawling = async (Url) => {
  console.log("crawling for: ", Url);
  // console.log(trangloai);

  // const trangloai = {};
  // const token = randToken.generate(8);
  // trangloai[`${token}`] = {
  //   // href_links: {},
  //   // src_links: {},
  //   allLinks: {
  //     href_links: [],
  //     src_links: [],
  //   },
  // };

  const parseUrl = Url.includes("http") ? Url : new URL(`https://${Url}`).href;
  const jsonFileUrl = await run(parseUrl);

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

// (async() => {
//   await runCrawling("https://phongkhambenhxahoidaklak.vn/");
// })();

module.exports = { runCrawling };
