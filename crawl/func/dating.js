
const getFormattedDate =() => {

    const currentDate = new Date();
    
    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric", // Use 'numeric' to get a 4-digit year
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
      hour12: false, // Set to false for 24-hour format
    };
    
    const formattedDate = new Intl.DateTimeFormat("en-US", options).format(
      currentDate
    );
    return formattedDate;
}


module.exports = { getFormattedDate };
