function jsonToHtmlList(json) {
  if (typeof json !== "object") {
    return ""; // Handle non-object values (e.g., strings, numbers)
  }

  let html = "<ul>";
  for (const key in json) {
    if (json.hasOwnProperty(key)) {
      const value = json[key] ;
      html += "<li><strong>" + key + ":</strong> " + value;
      if (typeof value === "object") {
        html += jsonToHtmlList(value); // Recursively process nested objects
      }
      html += "</li>";
    }
  }
  html += "</ul>";
  return html
}

module.exports = { jsonToHtmlList };
