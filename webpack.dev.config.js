let path = require("path");
let webpack = require("webpack");
const config = require('./webpack.config');

config.devServer = {
  inline: true,
  contentBase: path.resolve(__dirname, 'server')
};

module.exports = config;
