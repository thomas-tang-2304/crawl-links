const { uniqueArray, uniqueObjectsArray } = require("../func/uniqueArray");
const { isDataURI } = require("../func/validUrl");

const checkCrawlabledLinks = (thisLink, originUrl, tag) =>
  tag == "a" &&
  thisLink?.startsWith(originUrl) &&
  !thisLink.includes("#") &&
  !/\.(png|jpg|webp|avif|jpeg|gif|tiff|svg|pdf)$/i.test(thisLink);

const mapParentIndex = (objArray, refArray) => {
  const parentLinkIndex = (objArray2, myLink) =>
    objArray2.findIndex((o) => o.url == myLink);

  return uniqueObjectsArray(objArray, "url").map((queueLink) => ({
    ...queueLink,
    from: queueLink.from?.map((urlLink) => parentLinkIndex(refArray, urlLink)),
  }));
};

const mapParentLink = (indexArray, refArray) => {
  return indexArray
    .map((queueLink) => refArray[queueLink])
    .map((link) => link.url);
};

const filterOriginStatics = (jsonArray) => ({
  origin: uniqueArray(
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

module.exports = {
  mapParentIndex,
  mapParentLink,
  checkCrawlabledLinks,
  filterOriginStatics,
};
