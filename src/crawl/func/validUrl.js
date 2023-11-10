function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (err) {
    return false;
  }
}

function isDataURI(url) {
  // Regular expression to match a data URI
  const dataURIPattern = /^data:([a-zA-Z\/]+);base64,([A-Za-z0-9+/=]+)$/;

  // Test if the URL matches the data URI pattern
  return dataURIPattern.test(url);
}
module.exports = { isValidUrl, isDataURI };