import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyPlugin from 'copy-webpack-plugin';
import Dotenv from 'dotenv-webpack';
import ZipPlugin from 'zip-webpack-plugin';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const outputPath = 'dist';
const entryPoints = {
  main: path.resolve(__dirname, 'src', 'main.ts'),
  background: path.resolve(__dirname, 'src', 'background.ts'),
  inject: path.resolve(__dirname, 'src', 'inject.ts'),
  popup: path.resolve(__dirname, 'src', 'popup', 'index.tsx'),
  options: path.resolve(__dirname, 'src', 'options', 'index.tsx'),
};

const configs = {
  entry: entryPoints,
  devtool: 'inline-source-map',
  output: {
    path: path.join(__dirname, outputPath),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', 'jsx'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'popup.html',
      template: 'src/popup/index.html',
      chunks: ['popup'],
    }),
    new HtmlWebpackPlugin({
      filename: 'options.html',
      template: 'src/options/index.html',
      chunks: ['options'],
    }),
    new CleanWebpackPlugin(),
    new CopyPlugin({
      patterns: [{ from: '.', to: '.', context: 'public' }],
    }),
    new Dotenv(),
    new ZipPlugin({
      filename: 'c2w_proxy.zip',
    }),
  ],
};

export default configs;
