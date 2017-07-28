/* tslint:disable:quotemark */

import {assert} from 'chai';

import {FilterInvalidNode} from '../../../src/compile/data/FilterInvalid';
import {NonPositiveFilterNode} from '../../../src/compile/data/nonpositivefilter';
import {ScaleType} from '../../../src/scale';
import {VgTransform} from '../../../src/vega.schema';
import {parseUnitModelWithScale} from '../../util';

describe('compile/data/FilterInvalid', function () {
  it('should produce the correct filters' ,function () {
    const model = parseUnitModelWithScale({
      mark: "point",
      encoding: {
        x: {field: 'filterNull', type: "temporal"},
         y: {field: 'nonPositiveFilter', type: "quantitative", scale: {type: 'log'}},
        color: {field: 'noFilter', type: "ordinal"}
      }
    });

    const filter = FilterInvalidNode.make(model);

    assert.deepEqual(filter.filter, {
      filterNull: ScaleType.TIME,
      nonPositiveFilter: ScaleType.LOG
    });
  });
});
