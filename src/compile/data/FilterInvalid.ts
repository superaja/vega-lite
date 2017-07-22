import {SCALE_CHANNELS} from '../../channel';
import {isScaleChannel} from '../../channel';
import {FieldDef} from '../../fielddef';
import {scaleCompatible, ScaleType} from '../../scale';
import {hasContinuousDomain} from '../../scale';
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
        } else if (scaleComponent.get('type') === ScaleType.LOG) {
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
      const scaleType = this.filter[field];
      if (scaleType === ScaleType.LOG) {
        vegaFilters.push({
          type: 'filter',
          expr: 'datum["' + field + '"] > 0'
        } as VgFilterTransform
        );
      } else if (fieldDef !== null) {
        vegaFilters.push(`datum[${stringValue(field)}] !== null`);
        if (contains([QUANTITATIVE, TEMPORAL], fieldDef.type)) {
          // TODO(https://github.com/vega/vega-lite/issues/1436):
          // We can be even smarter and add NaN filter for N,O that are numbers
          // based on the `parse` property once we have it.
          vegaFilters.push(`!isNaN(datum[${stringValue(field)}])`);
        }
      }
      return vegaFilters;
    }, []);
  }
}
