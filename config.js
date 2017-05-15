/**
 * @typedef Config
 *
 * @property {String} secret - app's secret token
 */

/**
 * @type {Config}
 */
module.exports = {
  secret: process.env.SECRET_TOKEN,
  log: (...messages) => {
    if (process.env.NODE_ENV === 'test' && process.env.DEBUG !== 'true') return;
    console.log(...messages);
  }
};
