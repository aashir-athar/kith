// Metro is configured to consume the sibling ./shared package (source-only, no build step) and
// to stay out of ./server, whose own node_modules would collide with a second React/RN copy.
// Windows-safe: the blockList regex is built from escaped absolute paths.

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, 'shared');
const serverRoot = path.resolve(projectRoot, 'server');

const config = getDefaultConfig(projectRoot);

// Watch the shared source so edits hot-reload into the app.
config.watchFolders = [sharedRoot];

// Resolve the bare specifier `@kith/shared` to the shared source folder.
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@kith/shared': sharedRoot,
};

// Keep Metro from crawling the server or shared's node_modules.
const escape = (p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [
  new RegExp(escape(serverRoot) + '.*'),
  new RegExp(escape(path.join(sharedRoot, 'node_modules')) + '.*'),
];

module.exports = config;
