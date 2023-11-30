// const uri =
//   "https://hoanghamobile.com/do-choi-cong-nghe?amp;search=true&amp;filters=%7b%22sort%22%3a%225%22%2c%22brand%22%3a%22206%22%7d&amp;search=true";

// console.log(encoded);
// // Expected output: "https://mozilla.org/?x=%D1%88%D0%B5%D0%BB%D0%BB%D1%8B"
const decode = (uri) => {
  try {
    return decodeURI(uri);
    // Expected output: "https://mozilla.org/?x=шеллы"
  } catch (e) {
    // Catches a malformed URI
    console.error(e);
    return uri;
  }
};

module.exports = { decode };