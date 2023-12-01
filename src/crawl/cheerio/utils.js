const { uniqueArray, uniqueObjectsArray } = require("../func/uniqueArray");
const { isDataURI } = require("../func/validUrl");

const checkCrawlabledLinks = (thisLink, originUrl, tag) =>
  tag == "a" &&
  thisLink?.startsWith(originUrl) &&
  !thisLink.includes("#") &&
  !/\.(png|jpg|webp|avif|jpeg|gif|tiff|svg|pdf)$/i.test(thisLink);

const mapParentIndex = (objArray, queue) => {
  const parentLinkIndex = (objArray2, myLink) => objArray2.indexOf(myLink);

  return objArray.map((queueLink) => ({
    url: queueLink,
    ...queue?.href_links[queueLink],
    from: queue?.href_links[queueLink]?.from?.map((urlLink) =>
      parentLinkIndex(Object.keys(queue.href_links), urlLink)
    ),
  }));
};

const mapParentLink = (indexArray, refArray) => {
  return indexArray
    .map((queueLink) => refArray[queueLink])
    .map((link) => link.url);
};

const filterOriginStatics = (jsonArray) => ({
  origin: jsonArray
    .map((link) =>
      link.url.toString().split("/")[2]
        ? isDataURI(link.url)
          ? link.url
          : link.url.toString().split("/")[2]
        : link.url
    )
    .reduce((result, element) => {
      result[element] = jsonArray
        .map((link) =>
          link.url.toString().split("/")[2]
            ? isDataURI(link.url)
              ? link.url
              : link.url.toString().split("/")[2]
            : link.url
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
