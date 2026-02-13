/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

const webpack = require('webpack');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

// Add locale codes here when you ship translations (e.g. ['de', 'fr', 'ja']).
// The build will copy only matching l10n and package.nls bundles to dist/.
const supportedLanguages = [];

module.exports = (env, { mode }) => {
    const isDev = mode === 'development';

    return {
        target: 'node',
        mode: mode || 'none',
        node: { __filename: false, __dirname: false },
        entry: {
            main: './main.ts',
        },
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: '[name].js',
            chunkFormat: 'commonjs',
            libraryTarget: 'commonjs2',
            devtoolModuleFilenameTemplate: '[resource-path]',
        },
        optimization: {
            minimize: !isDev,
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        keep_classnames: true,
                        keep_fnames: true,
                    },
                }),
            ],
        },
        externalsType: 'node-commonjs',
        externals: {
            vs: 'vs',
            vscode: 'commonjs vscode',
        },
        resolve: {
            roots: [__dirname],
            mainFields: ['module', 'main'],
            extensions: ['.js', '.ts'],
        },
        module: {
            rules: [
                {
                    test: /\.(ts)$/iu,
                    use: {
                        loader: 'swc-loader',
                        options: {
                            module: {
                                type: 'commonjs',
                            },
                            isModule: true,
                            sourceMaps: isDev,
                            jsc: {
                                baseUrl: path.resolve(__dirname, './'),
                                keepClassNames: true,
                                target: 'es2023',
                                parser: {
                                    syntax: 'typescript',
                                    tsx: true,
                                    functionBind: false,
                                    decorators: true,
                                    dynamicImport: true,
                                },
                            },
                        },
                    },
                },
            ],
        },
        plugins: [
            new webpack.EnvironmentPlugin({
                NODE_ENV: mode,
                IS_BUNDLE: 'true',
                DEVSERVER: isDev ? 'true' : '',
            }),
            // The dist/ folder should be self-contained and ready to publish.
            new CopyWebpackPlugin({
                patterns: [
                    // Localization bundles (only for shipped languages)
                    {
                        from: 'l10n',
                        to: 'l10n',
                        noErrorOnMissing: true,
                        filter: (filepath) =>
                            new RegExp(`bundle.l10n.(${supportedLanguages.join('|')}).json`).test(filepath),
                    },
                    // Extension manifest & metadata
                    { from: 'package.json', to: 'package.json' },
                    { from: 'package.nls.json', to: 'package.nls.json' },
                    {
                        from: 'package.nls.*.json',
                        to: '[name][ext]',
                        noErrorOnMissing: true,
                        filter: (filepath) =>
                            new RegExp(`package.nls.(${supportedLanguages.join('|')}).json`).test(filepath),
                    },
                    // Marketplace-required files
                    { from: 'CHANGELOG.md', to: 'CHANGELOG.md' },
                    { from: 'LICENSE.md', to: 'LICENSE.md' },
                    { from: 'README.md', to: 'README.md' },
                    { from: '.vscodeignore', to: '.vscodeignore', toType: 'file' },
                ],
            }),
        ].filter(Boolean),
        devtool: isDev ? 'source-map' : false,
        infrastructureLogging: {
            level: 'log',
        },
    };
};
