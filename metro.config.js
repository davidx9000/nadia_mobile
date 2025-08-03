const path = require('path');
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
config.resolver.sourceExts.push('svg', 'cjs');

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-native-audio-pro': path.resolve(__dirname, 'node_modules/react-native-audio-pro/src'),
};

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

module.exports = config;
