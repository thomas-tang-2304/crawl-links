function color(text, color) {
  const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
  };

  if (colors[color]) {
    return colors[color] + text + colors.reset;
  } else {
    return text;
  }
}

module.exports = { color };