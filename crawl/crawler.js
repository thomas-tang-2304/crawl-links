const puppeteer = require("puppeteer");
const { Cluster } = require("puppeteer-cluster");
const { uniqueArray } = require("./func/uniqueArray");

const crawlLinks2 = async (links) => {
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_PAGE,
    maxConcurrency: 10,
    puppeteerOptions: {
      headless: "new",
    },
  });
  const data = {
    href_links: [],
    src_links: [],
  };

  await cluster.task(async ({ page, data: url }) => {
    try {
      await page.goto(url);
      // await autoScroll(page);

      // await page.waitForSelector("a");

      const hrefs = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll("a"));
        const validHrefs = [];

        links.forEach((link) => {
          try {
            const parsedUrl = new URL(link.href);
            validHrefs.push(parsedUrl.href);
          } catch (err) {
            console.log(err);
          }
        });

        return validHrefs;
      });

      const srcs = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll("*"));
        const validHrefs = [];

        links.forEach((link) => {
          try {
            const parsedUrl = new URL(link.src);
            validHrefs.push(parsedUrl.href);
          } catch (err) {
            console.log(err);
          }
        });

        return validHrefs;
      });

      data.href_links.push(...uniqueArray(hrefs));
      data.src_links.push(...uniqueArray(srcs));
    } catch (err) {
      console.log(err);
    }
  });
  for (const link of links) {
    cluster.queue(link);
  }

  // many more pages

  await cluster.idle();
  await cluster.close();

  return data;
};

const crawlLinks = async (url) => {
  try {
    const browser = await puppeteer.launch({
      headless: "new",
      waitForSelector: "body",
    });
    const page = await browser.newPage();

    await page.goto(url);
    // await autoScroll(page);

    // await page.waitForSelector("a");

    const hrefs = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      const validHrefs = [];

      links.forEach((link) => {
        try {
          const parsedUrl = new URL(link.href);
          validHrefs.push(parsedUrl.href);
        } catch (err) {
          console.log(err);
        }
      });

      return validHrefs;
    });

    const srcs = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("*"));
      const validHrefs = [];

      links.forEach((link) => {
        try {
          const parsedUrl = new URL(link.src);
          validHrefs.push(parsedUrl.href);
        } catch (err) {
          console.log(err);
        }
      });

      return validHrefs;
    });

    await browser.close();

    return {
      href_links: uniqueArray(hrefs),
      src_links: uniqueArray(srcs),
    };
  } catch (err) {
    console.log(err);
  }
};

// async function autoScroll(page) {
//   await page.evaluate(async () => {
//     await new Promise((resolve, reject) => {
//       let totalHeight = 0;
//       const distance = 100; // Scroll distance per iteration (adjust as needed)

//       const timer = setInterval(() => {
//         const scrollHeight = document.body.scrollHeight;
//         window.scrollBy(0, distance);

//         totalHeight += distance;

//         // If you've reached the bottom of the page or a certain height, stop scrolling
//         if (totalHeight >= scrollHeight || totalHeight >= 3000) {
//           clearInterval(timer);
//           resolve();
//         }
//       }, 100); // Scroll every 100 milliseconds (adjust as needed)
//     });
//   });
// }

// (async() => {
//   console.log(await crawlLinks("https://benhtri.dakhoadaklak.vn/"));
//  })();
module.exports = { crawlLinks, crawlLinks2 };
