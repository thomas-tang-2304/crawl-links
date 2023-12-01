async function fetchAndParseHTML(url, queue) {
  // const indexOfCrawledUrl = queue.href_links.findIndex((o) => o.url == url);
  try {
    const resJson = await fetch(url, {
      timeout: 0,
    });
    const response = await resJson?.text(); // Replace fetch with axios.get
    if (!resJson.ok) {
      // make the promise be rejected if we didn't get a 2xx response
      throw new Error("Not 2xx response", { cause: resJson });
    } else {
      // console.log(color(`FETCH SUCCESSFULLY ${url}`, "yellow"));

      if (queue.href_links.hasOwnProperty(url)) {
        queue.href_links[url].crawl_status = "successfully";
        queue.href_links[url].status_code = resJson?.status;
      }
      // console.log(resJson.status);
      return response ? parseFromString(response) : null;
    }
  } catch (error) {
    // console.error("Error fetching URL:", url);
    // console.error(error.message);

    if (queue.href_links.hasOwnProperty(url)) {
      queue.href_links[url].status_code = error?.cause?.status;
      queue.href_links[url].crawl_status = "failed";
    }
    // console.log(error.cause.status);
    return null;
  }
}

// fetchAndParseHTML(url, queue);

module.exports = { fetchAndParseHTML };
