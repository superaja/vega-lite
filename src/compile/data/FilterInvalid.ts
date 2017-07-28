import {SCALE_CHANNELS} from '../../channel';
import {isScaleChannel} from '../../channel';
import {FieldDef} from '../../fielddef';
import {scaleCompatible, ScaleType} from '../../scale';
import {hasContinuousDomain} from '../../scale';
import {QUANTITATIVE, TEMPORAL} from '../../type';
import {contains, Dict, differ, differArray, duplicate, extend, hash, keys, stringValue} from '../../util';
import {VgFilterTransform, VgTransform} from '../../vega.schema';
import {Model, ModelWithField} from '../model';
import {scaleType} from '../scale/type';
import {UnitModel} from './../unit';
import {DataFlowNode} from './dataflow';

export class FilterInvalidNode extends DataFlowNode {
  private filterInvalid: Dict<ScaleType>;
  private fieldDefs: Dict<FieldDef<string>>;

  public clone() {
    return new FilterInvalidNode(extend({}, this.filterInvalid), extend({}, this.fieldDefs));
  }

  constructor(filter: Dict<ScaleType>, fieldDefs: Dict<FieldDef<string>>) {
   super();

   this.filterInvalid = filter;
   this.fieldDefs = fieldDefs;
  }

  public static make(model: ModelWithField) {

    const fieldDefs = {};

    const filter = model.reduceFieldDef((aggregator: Dict<ScaleType>, fieldDef, channel) => {
      const scaleComponent = isScaleChannel(channel) && model.getScaleComponent(channel);
      if (scaleComponent) {
        const scaleCompType = scaleComponent.get('type');

        // only automatically filter null for continuous domain since discrete domain scales can handle invalid values.
        if (hasContinuousDomain(scaleCompType)) {
          aggregator[fieldDef.field] = scaleCompType;
          fieldDefs[fieldDef.field] = fieldDef;
        }

        if (scaleCompType === ScaleType.LOG || scaleCompType === ScaleType.SQRT) {
          aggregator[fieldDef.field] = scaleCompType;
          fieldDefs[fieldDef.field] = fieldDef;
        }
      }
      return aggregator;
    }, {} as Dict<ScaleType>);

    if (!keys(filter).length) {
      return null;
    }

  return new FilterInvalidNode(filter, fieldDefs);
  }

  get filter() {
    return this.filterInvalid;
  }

  // create the VgTransforms for each of the filtered fields
  public assemble(): VgTransform[] {

     return keys(this.filter).reduce((vegaFilters, field) => {
      const fieldDef = this.fieldDefs[field];
      const scaleCompType = this.filter[field];
      const filters = [];

      if (fieldDef !== null) {
        filters.push(`datum[${stringValue(field)}] !== null`);
        if (contains([QUANTITATIVE, TEMPORAL], fieldDef.type)) {
          // TODO(https://github.com/vega/vega-lite/issues/1436):
          // We can be even smarter and add NaN filter for N,O that are numbers
          // based on the `parse` property once we have it.
          filters.push(`!isNaN(datum[${stringValue(field)}])`);
        }
      }

      if (scaleCompType === ScaleType.LOG || scaleCompType === ScaleType.SQRT) {
        filters.push('datum["' + field + '"] > 0');
      }

      vegaFilters.push(filters.length > 0 ?
      {
        type: 'filter',
        expr: filters.join(' && ')
      } : null);
      return vegaFilters;
    }, []);
  }
}
