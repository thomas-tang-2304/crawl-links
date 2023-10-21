const { JSDOM } = require("jsdom");
const baiviet_links = require("./htmlStrings.json");

const uniqueArray = (array) =>
  array.reduce((acc, item) => {
    if (!acc.includes(item)) {
      acc.push(item);
    }
    return acc;
  }, []);

// Your HTML as a string

const readData = (htmlString, attr) => {
  // Parse the HTML string using JSDOM
  const dom = new JSDOM(htmlString);

  // Find all <a> tags within the JSDOM document
  const allATags = dom.window.document.querySelectorAll("*");
  const allImgTags = dom.window.document.querySelectorAll("*");

  // Iterate through the NodeList and log the href attributes
  const links = [];

  allATags.forEach((aTag) => {
    if (isValidUrl(aTag.getAttribute(attr)) && aTag) {
      const href = new URL(aTag?.getAttribute(attr));
      links.push(href?.origin);
    }
  });

  return links
  
};

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (err) {
    return false;
  }
}

const origin = "https://benhxahoi.dakhoadaklak.vn/";
(async () => {
  let allLinks = {
    href: [],
    src: [],
  };
  for (let index = 0; index < baiviet_links.data.length; index++) {
    const baiviet_link = baiviet_links.data[index]["NoiDung"];
    const thisLink1 = readData(baiviet_link,"href");
    const thisLink2 = readData(baiviet_link, "src");
    allLinks = {
      href: uniqueArray([...thisLink1, ...allLinks.href]),
      src: uniqueArray([...thisLink2, ...allLinks.src]),
    };

    console.log(
      `Completed ${Math.round(
        ((index + 1) / baiviet_links.data.length) * 100
      )}%, All Links:`,
      baiviet_links.data.length
    );
  }
  console.log(allLinks);
})();
