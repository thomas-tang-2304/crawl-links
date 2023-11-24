const express = require("express");
const nodemailer = require("nodemailer");
const { OAuth2Client } = require("google-auth-library");
const { runCrawling } = require("../../crawl");
const { configEnv } = require("../../configEnv");
const { crawlWebsite } = require("../../crawl/cheerio/ch");
const { filterOriginStatics } = require("../../crawl/cheerio/utils");
const { jsonToHtmlList } = require("../../crawl/func/jsonToHtml");

const emailRouter = express.Router();

configEnv();

// Khởi tạo OAuth2Client với Client ID và Client Secret
const myOAuth2Client = new OAuth2Client(
  process.env.GOOGLE_MAILER_CLIENT_ID,
  process.env.GOOGLE_MAILER_CLIENT_SECRET
);
// Set Refresh Token vào OAuth2Client Credentials
myOAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_MAILER_REFRESH_TOKEN,
});

// Tạo API /email/send với method POST
emailRouter.post("/send", async (req, res) => {
  const { email, url } = req.body;
  const parseUrl = url.includes("http") ? url : new URL(`https://${url}`).href;
  try {
    // Lấy thông tin gửi lên từ client qua body
    console.log({ email, url });
    if (!email || !url)
      throw new Error("Please provide email, subject and url!");
    const htmlResult = (await crawlWebsite(parseUrl)).replace(
      /\[object Object\]/g,
      ""
    );

    const myAccessTokenObject = await myOAuth2Client.getAccessToken();

    // Access Token sẽ nằm trong property 'token' trong Object mà chúng ta vừa get được ở trên
    const myAccessToken = myAccessTokenObject?.token;

    // Tạo một biến Transport từ Nodemailer với đầy đủ cấu hình, dùng để gọi hành động gửi mail
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.ADMIN_EMAIL_ADDRESS,
        clientId: process.env.GOOGLE_MAILER_CLIENT_ID,
        clientSecret: process.env.GOOGLE_MAILER_CLIENT_SECRET,
        refresh_token: process.env.GOOGLE_MAILER_REFRESH_TOKEN,
        accessToken: myAccessToken,
      },
    });

    const mailOptions = {
      to: email, // Gửi đến ai?
      subject: `Kết quả trả về từ tên miền ${process.env.DOMAIN_NAME}:${process.env.PORT} cho trang web ${url}`, // Tiêu đề email
      html: htmlResult, // Nội dung email
    };

    // Gọi hành động gửi email
    await transport.sendMail(mailOptions);

    // Không có lỗi gì thì trả về success
    res.status(200).json({ message: "Email sent successfully." });
  } catch (error) {
    const mailOptions = {
      to: email, // Gửi đến ai?
      subject: "Kết quả trả về từ tên miền crawl.khangtrieu.com", // Tiêu đề email
      html: JSON.stringify({ errors: error.message }).replace(
        /\[object Object\]/g,
        ""
      ), // Nội dung email
    };
    // Có lỗi thì các bạn log ở đây cũng như gửi message lỗi về phía client
    console.log(error);
    await transport.sendMail(mailOptions);
    res.status(500).json({ errors: error.message });
  }
});

module.exports = emailRouter;
