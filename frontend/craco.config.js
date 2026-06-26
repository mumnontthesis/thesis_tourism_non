const CssMinimizerPlugin = require("css-minimizer-webpack-plugin")

/**
 * CRA's cssnano preset merges Tailwind v4 nested @media utilities incorrectly
 * (e.g. md:grid-cols-4 loses grid-template-columns in production).
 * Disable mergeRules so responsive layout matches dev.
 */
module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.optimization.minimizer = webpackConfig.optimization.minimizer.map(
        (plugin) => {
          if (plugin instanceof CssMinimizerPlugin) {
            return new CssMinimizerPlugin({
              minimizerOptions: {
                preset: [
                  "default",
                  {
                    mergeRules: false,
                  },
                ],
              },
            })
          }
          return plugin
        },
      )
      return webpackConfig
    },
  },
}
