const express = require("express");

const http = require("http");

const bodyParser = require("body-parser");
const cors = require("cors");
const socketIo = require("socket.io");

const { configEnv } = require("./configEnv");
const { mapParentLink } = require("./crawl/cheerio/utils");
const {createRealtime} = require("./io")

configEnv();

// Routers
const emailRouter = require("./routes/gmail/send_mail_router");
const { readFileHistory } = require("./crawl/modules/readFileHistory");


const app = express();
const server = http.Server(app);
const io = socketIo(server);

app.use(cors());

createRealtime(io);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/email", emailRouter);

app.post("/find", async function (req, res) {
  const { target, url } = req.body;

  const parseUrl = url.includes("http") ? url : new URL(`https://${url}`).href;
  // const jsonFileUrl = await run(parseUrl, trangloai[`${token}`]);
  // const result = [];

  // const targetNumber = 1; // The number you want to find
  let keysFound = 0; // Initialize a variable to keep track of the number of keys found

  const allHref = readFileHistory(
    `${new URL(parseUrl).hostname.replace(/\./g, "-")}.json`
  ).allLinksScrape;

  const keyContainsTargetInSrc = allHref.src_links.filter((value) =>
    value?.url.includes(target)
  );
  const keyContainsTargetInHref = allHref.href_links.filter(
    (value) => value?.url.includes(target)
  );

  
  const result = {
    src: keyContainsTargetInSrc.map((key) => ({
      ...key,
      from: mapParentLink(key.from, allHref.href_links),
    })),
    href: keyContainsTargetInHref.map((key) => ({
      ...key,
      from: mapParentLink(key.from, allHref.href_links),
    })),
  };
  // console.log(result);
  if (

    result
  ) {
    res.status(200).send({
      data: result,
    });
  } else {
    res.status(400).send("No Target found");
  }
});

server.listen(process.env.PORT, () => {
  console.log(`Server listening on Port ${process.env.PORT}`);
  
});
