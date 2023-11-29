const web_array = [
  "phongkhamdakhoatiengiang.vn",
  "namkhoa.phongkhamdakhoatiengiang.vn",
  "phukhoa.phongkhamdakhoatiengiang.vn",
  "benhtri.phongkhamdakhoatiengiang.vn",
  "benhxahoi.phongkhamdakhoatiengiang.vn",
  "phathaibangthuoc.phongkhamdakhoatiengiang.vn",
  "phongkhamnamkhoatiengiang.vn",
  "phongkhamphukhoatiengiang.vn",
  "phongkhambenhtritiengiang.vn",
  "phongkhambenhxahoitiengiang.vn",
  "phongkhamphathaitiengiang.vn",
  "phongkhamtiengiang.vn",
  "nk.phongkhamtiengiang.vn",
  "pk.phongkhamtiengiang.vn",
  "bt.phongkhamtiengiang.vn",
  "bxh.phongkhamtiengiang.vn",
  "pt.phongkhamtiengiang.vn",

  "dakhoadaklak.vn",
  "namkhoa.dakhoadaklak.vn",
  "phukhoa.dakhoadaklak.vn",
  "benhtri.dakhoadaklak.vn",
  "benhxahoi.dakhoadaklak.vn",
  "phathai.dakhoadaklak.vn",
  "phongkhamnamkhoadaklak.vn",
  "phongkhamphukhoadaklak.vn",
  "phongkhambenhtridaklak.vn",
  "phongkhambenhxahoidaklak.vn",
  "phongkhamphathaidaklak.vn",
  "phongkhamdakhoabuonmethuot.vn",
  "nk.phongkhamdakhoabuonmethuot.vn",
  "pk.phongkhamdakhoabuonmethuot.vn",
  "bt.phongkhamdakhoabuonmethuot.vn",
  "bxh.phongkhamdakhoabuonmethuot.vn",
  "pt.phongkhamdakhoabuonmethuot.vn",
  "phongkhamdakhoadaklak.vn",
];

const axios = require("axios");

web_array.forEach((url) => {
  console.log(url);
  let data = JSON.stringify({
    email: "hongtang240@gmail.com",
    url: url,
  });
  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "http://localhost:3001/email/send",
    headers: {
      "Content-Type": "application/json",
    },
    data: data,
  };

  axios
    .request(config)
    .then((response) => {
      console.log("Finish", config.data.url);
    })
    .catch((error) => {
      console.log(error);
    });
});
