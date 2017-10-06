const chai = require('chai');

module.exports = (strategy, reqFunc = () => {}) => {
  return new Promise((resolve, reject) => {
    chai.passport
      .use(strategy)
      .success((...args) => resolve(args))
      .error((err) => reject(err))
      .fail(() => reject(new Error('Authentication Failed')))
      .req(reqFunc)
      .authenticate();
  });
};
