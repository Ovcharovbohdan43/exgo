const { getDefaultConfig } = require('expo/metro-config');

// Force Metro to prefer CommonJS entrypoints (avoid ESM "module"/"exports" resolution for react-i18next)
const config = getDefaultConfig(__dirname);

config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: false,
  resolverMainFields: ['react-native', 'main', 'browser'], // skip "module" to pick CJS
  // Ensure .cjs is resolved, but keep defaults
  sourceExts: Array.from(new Set([...config.resolver.sourceExts, 'cjs'])),
  // Explicit fallbacks for common deps that ship mixed ESM/CJS (uuid/i18next)
  extraNodeModules: {
    uuid: require('path').resolve(__dirname, 'node_modules/uuid'),
    'react-i18next': require('path').resolve(__dirname, 'node_modules/react-i18next'),
  },
};

module.exports = config;
