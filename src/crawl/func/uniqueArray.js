const uniqueArray = (array) =>
  array.reduce((acc, item) => {
    if (!acc.includes(item)) {
      acc.push(item);
    }
    return acc;
  }, []);

module.exports = { uniqueArray };