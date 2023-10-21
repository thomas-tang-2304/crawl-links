const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const { runCrawling } = require("./crawl");
const { uniqueArray } = require("./crawl/func/uniqueArray");
const { readFileSync } = require("fs");
const { isValidUrl } = require("./crawl/func/validUrl");
const { match_trangloai } = require("./crawl/regex");
app.use(cors());
// support parsing of application/json type post data
app.use(bodyParser.json());

//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({ extended: true }));

app.post("/crawl-links", async function (req, res) {
  const { url } = req.body;

  const parseUrl = url.includes("http") ? url : new URL(`https://${url}`).href;
  const jsonFileUrl = await runCrawling(parseUrl);

  const allLinks = readFileSync(`crawl/history/${jsonFileUrl}`, "utf-8");

  const allHrefLinks = JSON.parse(allLinks).href_links;
  const allSrcLinks = JSON.parse(allLinks).src_links;

  res.status(200).send({
    href: {
      origin: {
        name: uniqueArray(
          allHrefLinks.map((link) => link.toString().split("/")[2])
        ),
        total: uniqueArray(
          allHrefLinks.map((link) => link.toString().split("/")[2])
        ).map((origin) => {
          return allHrefLinks
            .map((link) => link.toString().split("/")[2])
            .filter((l) => l == origin).length;
        }),
      },
      total: allHrefLinks.length,
    },
    src: {
      origin: {
        name: uniqueArray(
          allSrcLinks.map((link) => link.toString().split("/")[2])
        ),
        total: uniqueArray(
          allSrcLinks.map((link) => link.toString().split("/")[2])
        ).map((origin) => {
          return allSrcLinks
            .map((link) => link.toString().split("/")[2])
            .filter((l) => l == origin).length;
        }),
      },
      total: JSON.parse(allLinks).src_links.length,
    },
  });
});

const PORT = 3001;

app.listen(PORT, () => {
  console.log("Server listening on Port", PORT);
  console.log(process.version);
});
