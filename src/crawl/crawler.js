// const puppeteer = require("puppeteer");
const { Cluster } = require("puppeteer-cluster");
const { uniqueArray } = require("./func/uniqueArray");

const pptOptions = process.env.NODE_ENV
  ? {
      headless: "new",
      waitForSelector: "body",
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      args: ["--no-sandbox", "--no-zygote", "--disable-setuid-sandbox"],
    }
  : {
      waitForSelector: "body",
      headless: "new",
      args: ["--no-sandbox", "--no-zygote", "--disable-setuid-sandbox"],
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
      href_links: null,
      src_links: null
    }
 
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

      await page.goto(url, { timeout: 20000, waitUntil: "networkidle2" });

      // await page.waitForSelector("a");

      const validLinks = await page.evaluate(() => {
        const href = Array.from(document.querySelectorAll("a"));
        const src = Array.from(document.querySelectorAll("*:not(script)"));
        const rs = {
          src_links: [],
          href_links: [],
        };

        href.forEach((link) => {
          try {
            const parsedUrl = new URL(link.href);
            rs.href_links.push(parsedUrl.href);
          } catch (err) {
            console.log(err);
          }
        });

        src.forEach((link) => {
          try {
            const parsedUrl = new URL(link.src);
            rs.src_links.push(parsedUrl.href);
          } catch (err) {
            console.log(err);
          }
        });

        return rs;
      });

      // await page.waitForResponse((response) => console.log(response.status()));

      data[url].href_links = uniqueArray(validLinks.href_links);
      data[url].src_links = uniqueArray(validLinks.src_links);
      // console.log(data);
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
