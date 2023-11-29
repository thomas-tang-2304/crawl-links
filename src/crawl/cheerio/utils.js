const { uniqueArray, uniqueObjectsArray } = require("../func/uniqueArray");
const { isDataURI } = require("../func/validUrl");

const checkCrawlabledLinks = (thisLink, originUrl, tag) =>
  thisLink?.startsWith(originUrl) && //allow links which only contains the input main origin
  !thisLink.includes("#") && //ignore links which contains '#' characters
  !/\.(png|jpg|webp|avif|jpeg|gif|tiff|svg|pdf)$/i.test(thisLink) &&
  tag == "a" //ignore links which are containing image extension

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
