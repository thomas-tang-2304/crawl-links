const express = require("express");
const axios = require("axios");
const qs = require("qs");
// const path = require("path");
const http = require("http");
const socketIo = require("socket.io");

const bodyParser = require("body-parser");
const cors = require("cors");

const { configEnv } = require("./configEnv");

configEnv();

// Routers
const emailRouter = require("./gmail/send_mail_router");
const { readFileHistory } = require("./crawl/modules/readFileHistory");
const { createRealtime } = require("./io");
const { crawlWebsite } = require("./crawl/cheerio/ch");

// Declare requestQueue
const queueLinks = [];

const app = express();
const server = http.Server(app);
const io = socketIo(server);
// io.set("heartbeat timeout", 1000);
app.use(cors());

createRealtime(io);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/email", emailRouter);

app.post("/crawl-links", async function (req, res) {
  try {
    const { email, url, uid_socket } = req.body;
    if (!email) {
      res.status(400).send("Vui lòng cung cấp Email để tiến hành cào dữ liệu");
    }

    if (!url) {
      res.status(400).send("Vui lòng cung cấp đường dẫn url để cào dữ liệu");
    }

    if (!uid_socket) {
      res.status(400).send("Có lỗi khi gửi dữ liệu");
    }

    crawlWebsite(url, uid_socket)
      .then((result) => {
        console.log("Crawling completed:", result);
      })
      .catch((error) => {
        console.error("Error during crawling:", error);
      });

    res.status(200).send("Add queue successfully");
  } catch (err) {
    res.status(400).send(JSON.stringify(err));
  }
});

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

  const keyContainsTargetInSrc = Object.keys(allHref.src_links).find((value) =>
    value.includes(target)
  );
  const keyContainsTargetInHref = Object.keys(allHref.href_links).find(
    (value) => value.includes(target)
  );

  // console.log(keyContainsTargetInSrc, keyContainsTargetInHref);
  const result = Object.keys(allHref.href_links).filter((value, index) =>
    [
      ...(allHref.href_links[keyContainsTargetInHref] ?? []),
      ...(allHref.src_links[keyContainsTargetInSrc] ?? []),
    ].includes(index)
  );
  if (
    (keyContainsTargetInSrc ?? keyContainsTargetInHref) &&
    result.length > 0
  ) {
    res.status(200).send({
      target: keyContainsTargetInSrc ?? keyContainsTargetInHref,
      result,
    });
  } else {
    res.status(400).send("No Target found");
  }
});

server.listen(process.env.PORT, () => {
  console.log(`Server listening on Port ${process.env.PORT}`);
  let intervalId; // Define a variable to hold the interval ID

  async function processQueue() {
    // console.log("fasfsaf");
    if (queueLinks.length > 0) {
      clearInterval(intervalId);

      let data = qs.stringify({
        email: queueLinks[0].email,
        // subject: "hehe",
        url: queueLinks[0].url,
        uid_socket: queueLinks[0].uid_socket,
      });

      let config = {
        method: "post",
        maxBodyLength: Infinity,
        url: `http://localhost:3001/email/send`,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        data: data,
      };

      try {
        const response = await axios.request(config);
        console.log(JSON.stringify(response.data));
        queueLinks.shift();
        intervalId = setInterval(processQueue, 1000);
      } catch (error) {
        console.error(error);

        // Handle error
        clearInterval(intervalId);
        setTimeout(() => {
          queueLinks.shift();
          console.log(queueLinks);
          intervalId = setInterval(processQueue, 1000);
        }, 5000);
      }
    }
  }

  intervalId = setInterval(processQueue, 1000);
});
