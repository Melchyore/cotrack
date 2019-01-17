const ExtractTextPlugin = require('extract-text-webpack-plugin')
const webpack = require('webpack')
const path = require('path')

const extractSass = new ExtractTextPlugin({
  filename: 'public/app.css'
})

const jquery = new webpack.ProvidePlugin({
  $: 'jquery',
  jQuery: 'jquery'
})

function sassRules() {
  return [{
    test: /\.(sass|scss)$/,
    use: ExtractTextPlugin.extract({
      fallback: 'style-loader',
      use: ['css-loader', 'sass-loader']
    })
  }]
}

function scriptRules() {
  return [{
    test: /\.js$/,
    exclude: [/node_modules/],
    loader: 'babel-loader',
    options: {
      presets: ['env']
    }
  }]
}

function imageLoaderRules() {
  return [{
    test: /\.(gif|png|jpe?g|svg)$/i,
    use: [
      'file-loader',
      {
        loader: 'image-webpack-loader',
        options: {
          disable: false, // webpack@2.x and newer
        },
      },
    ]
  }]
}

module.exports = {
  entry: [
    './resources/assets/sass/app.scss',
    './resources/assets/scripts/app.js'
  ],
  output: {
    path: path.resolve(__dirname, './'),
    filename: 'public/app.js'
  },
  module: {
    rules: sassRules().concat(scriptRules()).concat(imageLoaderRules())
  },
  plugins: [
    extractSass,
    jquery
  ]
}
