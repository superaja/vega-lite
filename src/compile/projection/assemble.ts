import {isVgSignalRef, VgProjection, VgSignalRef} from '../../vega.schema';
import {FacetModel} from '../facet';
import {isUnitModel, Model, ModelWithField} from '../model';
import {UnitModel} from '../unit';

export function assembleProjectionsForModelAndChildren(model: Model): VgProjection[] {
  return model.children.reduce((projections, child) => {
    return projections.concat(child.assembleProjections());
  }, assembleProjectionForModel(model));
}

export function assembleProjectionForModel(model: Model): VgProjection[] {
  const component = model.component.projection;
  if (!component) {
    return [];
  }

  const size: VgSignalRef = {
    signal: `[${component.size.map((ref) => ref.signal).join(', ')}]`
  };
  let fit: VgSignalRef;
  if (isVgSignalRef(component.data)) {
    fit = component.data;
  } else {
    const finalDataName = model.lookupDataSource(component.data);
    fit = {
      signal: `data('${finalDataName}')`
    };
  }

  return [{
    name: component.get('name'),
    fit: fit,
    size: size,
    ...component.explicit
  }];
}
