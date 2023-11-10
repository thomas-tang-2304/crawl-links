// const puppeteer = require("puppeteer");
const { Cluster } = require("puppeteer-cluster");
const { uniqueArray } = require("./func/uniqueArray");

const pptOptions = process.env.NODE_ENV
  ? {
    headless: "new",
    waitForSelector: "body",
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    args: ["--no-sandbox","--no-zygote", "--disable-setuid-sandbox"],
  }
  : {
    waitForSelector: "body",
    headless: "new",
  };

const crawlLinks2 = async (links) => {
  const data = {};
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_PAGE,
    maxConcurrency: 50,
    puppeteerOptions: pptOptions,
  });

  await cluster.task(async ({ page, data: url }) => {
    data[url] = {
      href_links: [],
      src_links: [],
    };
    try {
      // Enable request interception
      await page.setRequestInterception(true);

      // Intercept requests and block images and stylesheets
      page.on("request", (request) => {
        const resourceType = request.resourceType();
        if (resourceType === "image" || resourceType === "stylesheet") {
          // Block the request
          request.abort();
        } else {
          // Continue the request
          request.continue();
        }
      });
      await page.goto(url, { timeout: 0 });

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
      data[url].href_links = [];
      data[url].href_links.push(...uniqueArray(hrefs));
      data[url].src_links = [];
      data[url].src_links.push(...uniqueArray(srcs));
    } catch (err) {
      console.log(err);
    } finally {
      await page.close();
      // Disable request interception when done
      await page.setRequestInterception(false);
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
