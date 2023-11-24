const path = require("path");

module.exports = {
  mode: 'production',
  devtool: 'source-map',
  target: "node",
  entry: "./src/server.js",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
  module: {
    rules: [
      {
        test: /\.(js)$/,
        exclude: /node_modules/,
        use: "babel-loader",
      },
    ],
  },

  // resolve: {
  //   extensions: ["ts", ".js", ".json"],
  // },
  // stats:{
  //   errorDetails: true
  // },
  // mode: "production"
};
