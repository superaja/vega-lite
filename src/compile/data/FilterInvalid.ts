import {SCALE_CHANNELS} from '../../channel';
import {isScaleChannel} from '../../channel';
import {FieldDef} from '../../fielddef';
import {hasContinuousDomain, scaleCompatible, ScaleType} from '../../scale';
import {QUANTITATIVE, TEMPORAL} from '../../type';
import {contains, Dict, differ, differArray, duplicate, extend, hash, keys, stringValue} from '../../util';
import {VgFilterTransform, VgTransform} from '../../vega.schema';
import {Model, ModelWithField} from '../model';
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
        const scaleType = scaleComponent.get('type');

        // only automatically filter null for continuous domain since discrete domain scales can handle invalid values.
        if (hasContinuousDomain(scaleType)) {
          aggregator[fieldDef.field] = scaleType;
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

      if (scaleCompType === ScaleType.LOG || scaleCompType === ScaleType.SQRT) {
        filters.push(`datum[${stringValue(field)}] > 0`);
      } else if (fieldDef !== null) {
        filters.push(`datum[${stringValue(field)}] !== null`);
        filters.push(`!isNaN(datum[${stringValue(field)}])`);
      }

      vegaFilters.push(filters.length > 0 ? {
        type: 'filter',
        expr: filters.join(' && ')
      } : null);
      return vegaFilters;
    }, []);
  }
}
