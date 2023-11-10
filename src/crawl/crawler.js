// const puppeteer = require("puppeteer");
const { Cluster } = require("puppeteer-cluster");
const { uniqueArray } = require("./func/uniqueArray");

const pptOptions = process.env.NODE_ENV
  ? {
      headless: "new",
      waitForSelector: "body",
      executablePath: "/usr/bin/chromium-browser",
      args: ["--no-sandbox"],
    }
  : {
      waitForSelector: "body",
      headless: "new",
      args: ["--no-sandbox"],
    };

const crawlLinks2 = async (links) => {
  const data = {};
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
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
        if (
          resourceType === "image" ||
          resourceType === "stylesheet" ||
          resourceType === "script"
        ) {
          // Block the request
          request.abort();
        } else {
          // Continue the request
          request.continue();
        }
      });
      await page.goto(url, { timeout: 60000 });

      const links = await page.evaluate(() => {
        const hrefs = Array.from(document.querySelectorAll("a"));
        const srcs = Array.from(document.querySelectorAll("*:not(script)"));
        const navigationData = window.performance
          .getEntries()
          .find((e) => e.entryType === "navigation");

        const validHrefs = {
          hrefs: [],
          srcs: [],
        };

        if (navigationData.responseStatus == 200) {
          hrefs.forEach((link) => {
            try {
              const parsedUrl = new URL(link.href);
              validHrefs.hrefs.push(parsedUrl.href);
            } catch (err) {
              console.log(err);
            }
          });

          srcs.forEach((link) => {
            try {
              const parsedUrl = new URL(link.src);
              validHrefs.srcs.push(parsedUrl.href);
            } catch (err) {
              console.log(err);
            }
          });
        }

        return validHrefs;
      });

      data[url].href_links = [];
      data[url].href_links.push(...links.hrefs);
      data[url].src_links = [];
      data[url].src_links.push(...links.srcs);
      // console.log(navigationData.responseStatus);
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

async function getStatus(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "domcontentloaded" });

  const status = await page.evaluate(() => {
    return { status: document.location.href, code: document.status };
  });

  await browser.close();

  return status;
}
module.exports = { crawlLinks2 };
