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

module.exports = { crawlLinks2 };
