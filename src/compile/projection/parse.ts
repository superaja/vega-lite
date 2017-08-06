import {SHAPE, X, Y} from '../../channel';
import {Config} from '../../config';
import {MAIN} from '../../data';
import {isFieldDef} from '../../fielddef';
import {GEOSHAPE} from '../../mark';
import {Projection, PROJECTION_PROPERTIES} from '../../projection';
import {LookupData} from '../../transform';
import {LATITUDE, LONGITUDE} from '../../type';
import {contains, every} from '../../util';
import {VgProjection, VgSignalRef} from '../../vega.schema';
import {isUnitModel, Model} from '../model';
import {UnitModel} from '../unit';
import {ProjectionComponent} from './component';

export function parseProjection(model: Model) {
  if (isUnitModel(model)) {
    model.component.projection = parseUnitProjection(model);
  } else {
    // because parse happens from leaves up (unit specs before layer spec),
    // we can be sure that the above if statement has already occured
    // and therefore we have access to child.component.projection
    // for each of model's children
    model.component.projection = parseNonUnitProjections(model);
  }
}

function parseUnitProjection(model: UnitModel): ProjectionComponent {
  const {specifiedProjection, markDef, config, encoding} = model;

  const isGeoShapeMark = markDef && markDef.type === GEOSHAPE;
  const isGeoPointMark = encoding && [X, Y].every(
    (channel) => {
      const def = encoding[channel];
      return isFieldDef(def) && contains([LATITUDE, LONGITUDE], def.type);
  });

  if (isGeoShapeMark || isGeoPointMark) {
    let data: VgSignalRef | string;
    if (isGeoPointMark || (isGeoShapeMark && encoding[SHAPE])) {
      // if there is a shape encoding or latitude / longitude encoding,
      // the compiler added a geojson transform w/ a signal as specified
      data = {
        signal: model.getName('geojson')
      } as VgSignalRef;
    } else {
      // main source is geojson, so we can just use that
      data = model.requestDataName(MAIN);
    }

    return new ProjectionComponent(model.getName('projection'), {
      ...(config.projection || {}),
      ...(specifiedProjection || {}),
    } as Projection, [model.getSizeSignalRef('width'), model.getSizeSignalRef('height')], data);
  }

  return undefined;
}

function parseNonUnitProjections(model: Model): ProjectionComponent {
  if (model.children.length === 0) {
    return undefined;
  }

  let master: ProjectionComponent;
  const mergable = every(model.children, (child) => {
    parseProjection(child);
    const projection = child.component.projection;
    if (!projection) {
      // child layer does not use a projection
      return true;
    } else if (!master) {
      // cached 'projection' is null, cache this one
      master = projection;
      return true;
    } else if (master.equals(projection)) {
      return true;
    }
    return false;
  });

  // it cached one and all other children share the same projection,
  if (master && mergable) {
    // so we can elevate it to the layer level.
    const name = model.getName('projection');
    const modelProjection = master.clone(model.getName('projection'));

    // and "remove" all others
    model.children.forEach((child) => {
      if (child.component.projection) {
        child.component.projection.merged = true;
        child.renameProjection(child.component.projection.get('name'), modelProjection.get('name'));
      }
    });

    return modelProjection;
  }

  return undefined;
}
