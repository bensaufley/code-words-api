'use strict';

import { sinon } from '../test-helper';

export default {
  stubRes() {
    let res = {};
    res.status = sinon.stub().returns(res);
    res.json = sinon.stub().returns(res);
    return res;
  }
};
