/*    Copyright 2019 Firewalla INC
 *
 *    This program is free software: you can redistribute it and/or  modify
 *    it under the terms of the GNU Affero General Public License, version 3,
 *    as published by the Free Software Foundation.
 *
 *    This program is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    GNU Affero General Public License for more details.
 *
 *    You should have received a copy of the GNU Affero General Public License
 *    along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

let Promise = require('bluebird');

let log = require('../net2/logger.js')(__filename, 'info');

let StatusEnum = {
  IDLE: 0,
  DELAYING: 1,
  WORKING: 2
};

let delayInterval = 1000;

let _status = StatusEnum.IDLE;
let _scheduledFunc = null;
let _scheduledObject = null;

function delay(t) {
  return new Promise(function(resolve) {
    setTimeout(resolve, t)
  });
}

// only run func once at the same time, 
// and new come func will override the existing queued funcs
// the reload status can only be IDLE, DELAYING, WORKING

// TODO: support multiple kinds of func
function reload(func, object) {
  
  switch(_status) {
    case StatusEnum.DELAYING:
      return Promise.resolve();
      break;
    case StatusEnum.IDLE:
      _status = StatusEnum.DELAYING;
      return delay(delayInterval)
        .then(() => {
          _status = StatusEnum.WORKING;
          return func.call(object)
            .then(() => {
              _status = StatusEnum.IDLE;
              // if there is a scheduled func, run it
              if(_scheduledFunc !== null) {
                let f = _scheduledFunc;
                let o = _scheduledObject;
                _scheduledFunc = null;
                _scheduledObject = null;
                return reload(f,o)
                  .then(() => {
                    return Promise.resolve();
                  })
              } else {
                return Promise.resolve(); // if no scheduled func, work complete
              }
            });
        });
      break;
    case StatusEnum.WORKING:
      _scheduledFunc = func;
      return Promise.resolve();
      break;
    default:
      return Promise.reject(new Error("Invalid Flow Control State"));
  }
}

module.exports = {
  reload: reload
};
