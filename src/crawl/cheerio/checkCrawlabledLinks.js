const checkCrawlabledLinks = (thisLink, originUrl, tag) =>
  tag == "a" &&
  thisLink?.startsWith(originUrl) &&
  !thisLink.includes("#") &&
  !/\.(png|jpg|webp|avif|jpeg|gif|tiff|svg|pdf)$/i.test(thisLink);
