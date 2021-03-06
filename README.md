[![npm](https://img.shields.io/npm/v/@wishy-gift/html-include-chunks-webpack-plugin)](https://www.npmjs.com/package/@wishy-gift/html-include-chunks-webpack-plugin)
[![npm](https://img.shields.io/npm/dw/@wishy-gift/html-include-chunks-webpack-plugin)](https://www.npmjs.com/package/@wishy-gift/html-include-chunks-webpack-plugin)

# HTML Include Chunks Webpack Plugin

A Webpack plugin for non-SPA apps with multiple entries using HtmlWebpackPlugin

## Installation

### Webpack 5

    npm install @wishy-gift/html-include-chunks-webpack-plugin

or

    yarn add @wishy-gift/html-include-chunks-webpack-plugin

### Webpack 4

    npm install @wishy-gift/html-include-chunks-webpack-plugin@0

or

    yarn add @wishy-gift/html-include-chunks-webpack-plugin@0

## Usage

This plugin needs to be included after [HtmlWebpackConfig](https://github.com/jantimon/html-webpack-plugin/), and will look for the `entryKey` option in every usage of `HtmlWebpackConfig` to find which chunks should be included, and include only the ones needed for a given `entryKey`.

## Options

Takes no options, but uses `webpackConfig.output.publicPath` and requires that `entryKey` in `HtmlWebpackConfig` is specified, as the `entryKey` is used to filter the chunks

## Example

```javascript
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlIncludeChunksWebpackPlugin = require('@wishy-gift/html-include-chunks-webpack-plugin');

// Create a separate object for our `entry`, so that we can iterate over it more easily later
const entry = {
	a: ['./a'],
	b: ['./b'],
	c: ['./c', './d'],
};

// Create one `HtmlWebpackPlugin` per entry, so that each entry can get only the necessary chunks
const entryHtmlPlugins = Object.keys(entry).map(
	(entryKey) =>
		new HtmlWebpackPlugin({
			filename: `${entryKey}.html`,
			entryKey, // <- this is how we know which chunks to include
		})
);

module.exports = {
	entry,
	plugins: [
		...entryHtmlPlugins,
		new HtmlIncludeChunksWebpackPlugin(), // <- `HtmlIncludeChunksWebpackPlugin` must be included after the `HtmlWebpackPlugin`s
	],
};
```
