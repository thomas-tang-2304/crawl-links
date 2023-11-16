// const puppeteer = require("puppeteer");

const { uniqueArray } = require("./func/uniqueArray");


const crawlLinks2 = async (links, cluster) => {
  const data = {};

  await cluster.task(async ({ page, data: url }) => {
    data[url] = {
      href_links: null,
      src_links: null,
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

      await page.goto(url, { timeout: 30000, waitUntil: "networkidle2" });

      // await page.waitForSelector("a");

      const validLinks = await page.evaluate(() => {
        const href = Array.from(document.querySelectorAll("a"));
        const src = Array.from(document.querySelectorAll("*:not(script)"));
        const rs = {
          src_links: [],
          href_links: [],
        };
        (async () => {
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
        })();

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
      await page.setRequestInterception(false);
    }
  });
  for (const link of links) {
    cluster.queue(link);
  }
  await cluster.idle();

  

  return data;
};

module.exports = { crawlLinks2 };
