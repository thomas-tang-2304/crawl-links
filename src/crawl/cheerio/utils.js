const { uniqueArray, uniqueObjectsArray } = require("../func/uniqueArray");
const { isDataURI } = require("../func/validUrl");

const checkCrawlabledLinks = (thisLink, originUrl) =>
  thisLink.startsWith(originUrl) && !thisLink.includes("#");

const mapParentIndex = (objArray) => {
  const parentLinkIndex = (objArray2, myLink) =>
    objArray2.findIndex((o) => o.url == myLink);

  return uniqueObjectsArray (objArray, "url").map((queueLink) => ({
    ...queueLink,
    from: queueLink.from?.map((urlLink) => parentLinkIndex(objArray, urlLink)),
  }));
};


const filterOriginStatics = (jsonArray) => ({
  origin: uniqueArray (
    jsonArray.map((link) =>
      link.toString().split("/")[2]
        ? isDataURI(link)
          ? link
          : link.toString().split("/")[2]
        : link
    )
  ).reduce((result, element) => {
    result[element] = jsonArray
      .map((link) =>
        link.toString().split("/")[2]
          ? isDataURI(link)
            ? link
            : link.toString().split("/")[2]
          : link
      )
      .filter((l) => l == element).length;
    return result;
  }, {}),

  total: jsonArray.length,
});

module.exports = { mapParentIndex, checkCrawlabledLinks, filterOriginStatics };