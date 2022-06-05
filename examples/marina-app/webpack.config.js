const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const path = require('path');
const { preprocess } = require('./svelte.config');

const mode = process.env.NODE_ENV || 'development';
const prod = mode === 'production';

module.exports = {
	entry: {
		bundle: [
			'./src/scss/main.scss',
			'./src/main.ts'
		]
	},
	resolve: {
		alias: {
			svelte: path.dirname(require.resolve('svelte/package.json'))
		},
		extensions: ['.mjs', '.js', '.ts', '.svelte'],
		mainFields: ['svelte', 'browser', 'module', 'main'],
		fallback: {
			"fs": false,
			"path": false,
		}
	},
	output: {
		path: path.join(__dirname, 'dist'),
		filename: '[name].js',
		chunkFilename: '[name].[id].js'
	},
	module: {
			rules: [
				{
					test: /\.ts$/,
					loader: 'ts-loader',
					exclude: /node_modules/
				},
				{
				test: /\.svelte$/,
				use: {
					loader: 'svelte-loader',
					options: {
						compilerOptions: {
							dev: !prod
						},
						emitCss: prod,
						hotReload: !prod,
							preprocess,
					}
				}
			},
			{
				test: /\.(scss|sass|css)$/,
				use: [
					{
						loader: MiniCssExtractPlugin.loader
					},
					'css-loader',
					'sass-loader'
				]
			},
			{
				// required to prevent errors from Svelte on Webpack 5+
				test: /node_modules\/svelte\/.*\.mjs$/,
				resolve: {
					fullySpecified: false
				}
			}
		]
	},
	mode,
	plugins: [
		new MiniCssExtractPlugin({
			filename: '[name].css'
		}),
		new NodePolyfillPlugin(),
		new CopyPlugin({
      patterns: [
        { from: "public" },
      ],
    }),
	],
	devtool: prod ? false : 'source-map',
	devServer: {
		hot: true
	}
};
