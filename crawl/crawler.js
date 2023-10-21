const puppeteer = require("puppeteer");

const uniqueArray = (array) =>
  array.reduce((acc, item) => {
    if (!acc.includes(item)) {
      acc.push(item);
    }
    return acc;
  }, []);

// const isValidUrl = (string) => {
//   try {
//     new URL(string);
//     return true;
//   } catch (err) {
//     return false;
//   }
// };

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
module.exports = { crawlLinks };
