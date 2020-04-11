('use strict');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const uniq = require('lodash/uniq');

const isDev = process.env.NODE_ENV !== 'production';

const cssRegex = /(?:\.css)$/;
const jsRegex = /(?:\.js)$/;

class HtmlIncludeChunksWebpackPlugin {
	constructor(options) {
		if (typeof options !== 'undefined') {
			throw new Error(`${this.pluginName} takes no options`);
		}

		this.pluginName = 'HtmlIncludeChunksWebpackPlugin';

		this.apply = this.apply.bind(this);
		this.registerCb = this.registerCb.bind(this);
		this.getAssetTags = this.getAssetTags.bind(this);
		this.addChunksById = this.addChunksById.bind(this);

		this.chunksById = {};
		this.chunksByName = {};

		this.publicPath = '';
	}

	apply(compiler) {
		compiler.hooks.compilation.tap(this.pluginName, (compilation) => {
			this.publicPath = compilation.outputOptions.publicPath || '';

			compilation.hooks.afterOptimizeChunkAssets.tap(
				this.pluginName,
				this.addChunksById
			);

			HtmlWebpackPlugin.getHooks(compilation).alterAssetTags.tapAsync(
				this.pluginName,
				this.registerCb
			);
		});
	}

	addChunksById(chunks) {
		chunks.forEach((chunk) => {
			const {groupsIterable, id, name, files} = chunk;

			const siblings = new Set();

			for (const chunkGroup of groupsIterable) {
				for (const sibling of chunkGroup.chunks) {
					if (sibling !== chunk) {
						siblings.add(sibling.id);
					}
				}
			}

			this.chunksById[id] = {
				id: id,
				name: name,
				files: files,
				siblings: Array.from(siblings),
			};

			this.chunksByName[name] = this.chunksById[id];
		});
	}

	getLinkTag(fileName) {
		return {
			tagName: 'link',
			voidTag: true,
			attributes: {
				rel: 'stylesheet',
				href: `${this.publicPath}${fileName}`,
			},
		};
	}

	getScriptTag(fileName) {
		return {
			tagName: 'script',
			voidTag: false,
			attributes: {
				src: `${this.publicPath}${fileName}`,
			},
		};
	}

	getAssetTags(entryKey, pluginData) {
		let allFiles = [];

		const entryChunk = this.chunksByName[entryKey];

		entryChunk.siblings.forEach((chunkId) => {
			const chunk = this.chunksById[chunkId];

			allFiles = allFiles.concat(chunk.files);
		});

		allFiles = allFiles.concat(entryChunk.files);

		allFiles = uniq(allFiles);

		const styles = allFiles
			.filter((file) => file.match(cssRegex))
			.map(this.getLinkTag);
		const scripts = allFiles
			.filter((file) => isDev || file.match(jsRegex))
			.map(this.getScriptTag);

		return {
			styles,
			scripts,
			meta: pluginData.assetTags.meta,
		};
	}

	registerCb(htmlPluginData, callback) {
		const entryKey = htmlPluginData.plugin.options.entryKey;

		if (!entryKey) {
			console.warn(
				`No entryKey found in HtmlWebpackPlugin options, skipping HtmlIncludeChunks processing`
			);

			if (callback) {
				return callback(null, htmlPluginData);
			}
			return Promise.resolve(htmlPluginData);
		}

		const isString = typeof entryKey === 'string';

		if (!isString) {
			throw new Error(`only strings can be used with entryKey`);
		}

		const assetTags = this.getAssetTags(entryKey, htmlPluginData);

		const result = {
			...htmlPluginData,
			assetTags,
		};

		if (callback) {
			return callback(null, result);
		}

		return Promise.resolve(result);
	}
}

module.exports = HtmlIncludeChunksWebpackPlugin;
