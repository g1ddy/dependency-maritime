const baseConfig = require('./.dependency-cruiser.cjs');

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  ...baseConfig,
  options: {
    ...baseConfig.options,
    // Graph generation specific options
    includeOnly: '^src',
    exclude: '(\\.test\\.ts|\\.test\\.tsx|\\.spec\\.ts|testUtils\\.ts)$',
  },
};
