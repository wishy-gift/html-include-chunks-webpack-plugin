('use strict');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const uniq = require('lodash/uniq');

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
		this.getLinkTag = this.getLinkTag.bind(this);
		this.getScriptTag = this.getScriptTag.bind(this);
		this.getAssetTags = this.getAssetTags.bind(this);
		this.addChunksById = this.addChunksById.bind(this);

		this.chunksById = {};
		this.chunksByName = {};
	}

	apply(compiler) {
		compiler.hooks.compilation.tap(this.pluginName, (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: this.pluginName,
					stage: compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
				},
				() => {
					for (const chunkGroup of compilation.namedChunkGroups.values()) {
						const entrypointChunk = chunkGroup.getEntrypointChunk();

						this.addChunksById(entrypointChunk);
					}
				}
			);

			HtmlWebpackPlugin.getHooks(compilation).alterAssetTags.tapAsync(
				this.pluginName,
				this.registerCb
			);
		});
	}

	addChunksById(entrypointChunk) {
		const { groupsIterable, id, name, files } = entrypointChunk;

		const siblings = new Set();

		for (const chunkGroup of groupsIterable) {
			for (const sibling of chunkGroup.chunks) {
				if (sibling !== chunkGroup) {
					siblings.add(sibling.id);
					this.chunksById[sibling.id] = sibling;
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
	}

	getFileUrl(fileName, hash, publicPath) {
		let url = `${publicPath}${fileName}`;

		if (hash) {
			// Append the hash as a parameter in the query string.
			// If the URL already contains query parameters, append with '&' instead of '?'.
			url += (fileName.indexOf('?') === -1 ? '?' : '&') + hash;
		}

		return url;
	}

	getLinkTag(fileName, hash, publicPath) {
		return {
			tagName: 'link',
			voidTag: true,
			attributes: {
				rel: 'stylesheet',
				href: this.getFileUrl(fileName, hash, publicPath),
			},
		};
	}

	getScriptTag(fileName, hash, publicPath) {
		return {
			tagName: 'script',
			voidTag: false,
			attributes: {
				src: this.getFileUrl(fileName, hash, publicPath),
			},
		};
	}

	getAssetTags(entryKey, pluginData) {
		let allFiles = [];

		const chunk = this.chunksByName[entryKey];

		chunk.siblings.forEach((chunkId) => {
			const sibling = this.chunksById[chunkId];

			const siblingFiles = Array.from(sibling.files);

			allFiles = allFiles.concat(siblingFiles);
		});

		const chunkFiles = Array.from(chunk.files);

		allFiles = allFiles.concat(chunkFiles);

		allFiles = uniq(allFiles);

		let compilationHash = null;
		if (pluginData.plugin.options.hash) {
			compilationHash = pluginData.plugin.childCompilerHash;
		}

		const styles = allFiles
			.filter((file) => file.match(cssRegex))
			.map((fileName) =>
				this.getLinkTag(fileName, compilationHash, pluginData.publicPath)
			);
		const scripts = allFiles
			.filter((file) => file.match(jsRegex))
			.map((fileName) =>
				this.getScriptTag(fileName, compilationHash, pluginData.publicPath)
			);

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
