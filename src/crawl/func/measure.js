async function measureTime(callback) {
  // Record the start time
  const startTime = new Date();

  // Execute the callback
  const runner = await callback();

  // Record the end time
  const endTime = new Date();

  // Calculate the elapsed time in milliseconds
  const elapsedTime = endTime - startTime;

  // Convert milliseconds to hours, minutes, and seconds
  const elapsedHours = Math.floor(elapsedTime / (1000 * 60 * 60));
  const elapsedMinutes = Math.floor(
    (elapsedTime % (1000 * 60 * 60)) / (1000 * 60)
  );
  const elapsedSeconds = Math.floor((elapsedTime % (1000 * 60)) / 1000);

  console.log(
    `Elapsed time: ${elapsedHours}:${elapsedMinutes}:${elapsedSeconds}`
  );
  return {
    elapsedTime,
    runner,
  };
}

// Call the function to measure performance

module.exports = { measureTime };
