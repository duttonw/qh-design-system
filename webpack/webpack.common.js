const HtmlWebPackPlugin = require("html-webpack-plugin");
const path = require('path');
const fs = require('fs');
const glob = require('glob');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const ESLintPlugin = require('eslint-webpack-plugin');

// Our function that generates our html plugins
function generateHtmlPlugins(templateDir) {
    // Read files in /html directory
    const templateFiles = fs
        .readdirSync(path.resolve(__dirname, templateDir))
        .filter(function(file) { //ignore folder
            return file.indexOf('.html') > -1
        });

    var htmlPlugins= new Array();
    templateFiles.forEach((templateFile) => {
        const parts = templateFile.split('.')
        const name = parts[0]
        const extension = parts[1]

        htmlPlugins.push(new HtmlWebPackPlugin({
            'filename': `${name}.html`,
            'template': path.resolve(__dirname, `${templateDir}/${name}.${extension}`)})
        );

    })
    return htmlPlugins;
}
const htmlPlugins = generateHtmlPlugins('../src/html');

// File arrays
let js_files = glob.sync('./src/**/**/global.js') // Module JS

function reloadHtml() {
    const cache = {};
    const plugin = {
        name: 'CustomHtmlReloadPlugin'
    };

    this.hooks.compilation.tap(plugin, compilation => {
        HtmlWebPackPlugin.getHooks(compilation).beforeEmit.tap(plugin, data => {
            const orig = cache[data.outputName];
            const html = data.html;

            // plugin seems to emit on any unrelated change?
            if (orig && orig !== html) {
                devServer.sockWrite(devServer.sockets, 'content-changed')
            }

            cache[data.outputName] = html
        })
    })
}

const copyWebPack = new CopyWebpackPlugin( {
    patterns: [
    {
        from: path.resolve(__dirname, '../src/externals'),
        to: 'externals'
    },
    {
        from: path.resolve(__dirname, '../src/assets'),
        to: 'mysource_files'
    }
],})

module.exports = {
    entry: {
        main: ['./src/index.js'].concat(js_files)
    },
    output: {
        path: path.resolve(__dirname, '../dist'), // Output folder
        filename: 'js/[name].js' // JS output path
    },
    resolve: {
        alias: {
            NodeModules: path.resolve(__dirname, '../node_modules/'),
            src: path.resolve(__dirname, '../src/')
        }
    },
    module: {
        rules: [{ // HTML
                test: /\.html$/,
                use: [{
                    loader: "html-loader",
                    options: {
                        minimize: false,
                        sources:false,
                        // interpolate: true // allow HTML snippets with commonJs require tags
                    }
                }]
            },
            { // JavaScript and JSX only (no JSON)
                test: /\.jsx?$/,
                exclude: /node_modules/,
                use: [
                    "babel-loader"
                ]
            },
            { // Images
                test: /\.(png|svg|jpg|gif|ico)$/,
                use: {
                    'loader': 'file-loader',
                    'options': {
                        'esModule': false,
                        'name': '[name].[ext]',
                        'outputPath': 'mysource_files/',
                        'publicPath': 'mysource_files/',
                    }
                }
            },
            { // Font files
                test: /\.(woff(2)?|ttf|eot|otf)(\?v=\d+\.\d+\.\d+)?$/,
                use: [{
                    'loader': 'file-loader',
                    'options': {
                        'name': './mysource_files/[name].[ext]'
                    }
                }]
            } ,
            // For TinyMCE
            {
                test: /skin\.css$/i,
                use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },
            {
                test: /content\.css$/i,
                use: ['css-loader'],
            },
            {
                test: /tinymce_classes\.css$/i,
                use: ['css-loader'],
            },
            // For Select2
            {
                test: /select2\.css$/i,
                use:[
                    'style-loader',
                    'css-loader'
                ],
            }
        ]
    },
    plugins: [
        new ESLintPlugin({ extensions: ['jsx?'], exclude: [ '/node_modules/'] }),
        ...htmlPlugins,
        copyWebPack,
        new MiniCssExtractPlugin(),
    ],
    optimization: {
        minimize: false,
        runtimeChunk: 'single'
    }
};
