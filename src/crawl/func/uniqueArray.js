const uniqueArray = (array) =>
  array.reduce((acc, item) => {
    if (!acc.includes(item)) {
      acc.push(item);
    }
    return acc;
  }, []);

const uniqueObjectsArray = (array, propertyName) =>
  array.reduce((acc, item) => {
    const isDuplicate = acc.some(
      (obj) => obj[propertyName] === item[propertyName]
    );

    if (!isDuplicate) {
      acc.push(item);
    }

    return acc;
  }, []);

module.exports = { uniqueArray, uniqueObjectsArray };
