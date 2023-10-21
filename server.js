const express = require("express");
const queue = require("express-queue");

const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const { runCrawling } = require("./crawl");
const { uniqueArray } = require("./crawl/func/uniqueArray");
const { readFileSync } = require("fs");
const { readLinksFile, readFileHistory } = require("./crawl/modules/readFileHistory");

// Using queue middleware
app.use(cors());
// support parsing of application/json type post data
app.use(bodyParser.json());

app.use(
  queue({
    activeLimit: 1,
    queuedLimit: -1,
    rejectHandler: (req, res) => {
      res.sendStatus(500);
    },
  })
);

//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({ extended: true }));

app.post("/crawl-links", async function (req, res) {
  const { url } = req.body;

  const parseUrl = url.includes("http") ? url : new URL(`https://${url}`).href;
  const jsonFileUrl = await runCrawling(parseUrl);


  const allHrefLinks = readFileHistory(jsonFileUrl).allHrefLinks;
  const allSrcLinks = readFileHistory(jsonFileUrl).allSrcLinks;

  res.status(200).send({
    href: {
      origin: uniqueArray(
        allHrefLinks.map((link) => link.toString().split("/")[2])
      ).reduce((result, element) => {
        result[element] = allHrefLinks
          .map((link) => link.toString().split("/")[2])
          .filter((l) => l == element).length;
        return result;
      }, {}),

      total: allHrefLinks.length,
    },
    src: {
      origin: uniqueArray(
        allSrcLinks.map((link) => link.toString().split("/")[2])
      ).reduce((result, element) => {
        result[element] = allSrcLinks
          .map((link) => link.toString().split("/")[2])
          .filter((l) => l == element).length;
        return result;
      }, {}),

      total: allSrcLinks.length,
    },
  });
});

app.get('/', (req,res) => {
  res.send("Hello");
})

const PORT = 3001;

app.listen(PORT, () => {
  console.log("Server listening on Port", PORT);
  console.log(process.version);
});
