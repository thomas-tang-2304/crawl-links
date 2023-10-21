
const match_trangloai = (testStr) => {
  const regex = /^([a-zA-Z0-9]*-[a-zA-Z0-9]*)*(-[0-9]+)\/$/g;
  return regex.test(testStr) || testStr == ''
};

const match_chitiet = (testStr) => {
  const regex = /^([a-zA-Z0-9]*-[a-zA-Z0-9]*)*.html$/g;
  // console.log(regex.test(testStr));
  return regex.test(testStr)
};



module.exports = { match_trangloai, match_chitiet };
