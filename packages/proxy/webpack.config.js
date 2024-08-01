const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const ZipPlugin = require('zip-webpack-plugin');

const path = require('path');
const outputPath = 'dist';
const entryPoints = {
  main: [
    path.resolve(__dirname, 'src', 'main.ts'),
  ],
  background: path.resolve(__dirname, 'src', 'background.ts'),
};

module.exports = {
  entry: entryPoints,
  output: {
    path: path.join(__dirname, outputPath),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyPlugin({
      patterns: [{ from: '.', to: '.', context: 'public' }]
    }),
    new Dotenv(),
    new ZipPlugin({
      filename: 'c2w_proxy.zip',
    })
  ]
};
