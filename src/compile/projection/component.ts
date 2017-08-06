import {X, Y} from '../../channel';
import {Config} from '../../config';
import {MAIN} from '../../data';
import {Encoding} from '../../encoding';
import {Field} from '../../fielddef';
import {GEOSHAPE, Mark} from '../../mark';
import {Projection, PROJECTION_PROPERTIES, ProjectionType} from '../../projection';
import {duplicate, every} from '../../util';
import {isVgSignalRef, VgProjection, VgSignal, VgSignalRef} from '../../vega.schema';
import {ModelWithField} from '../model';
import {Explicit, Split} from '../split';
import {UnitModel} from '../unit';


export class ProjectionComponent extends Split<Partial<VgProjection>> {
  public merged = false;

  public clone(newName?: string) {
    return new ProjectionComponent(newName || this.name, duplicate(this.specifiedProjection), duplicate(this.size), duplicate(this.data));
  }

  constructor(private name: string, private specifiedProjection: Projection, public size: VgSignalRef[], public data: VgSignalRef | string) {
    super(
      {...specifiedProjection},  // all explicit properties of projection
      {name}  // name as initial implicit property
    );
  }

  public equals(other: ProjectionComponent): boolean {
    const properties = every(PROJECTION_PROPERTIES, (prop) => {
      // neither has the poperty
      if (!this.explicit.hasOwnProperty(prop) &&
        !other.explicit.hasOwnProperty(prop)) {
        return true;
      }
      // both have property and an equal value for property
      if (this.explicit.hasOwnProperty(prop) &&
        other.explicit.hasOwnProperty(prop) &&
        JSON.stringify(this.get(prop)) === JSON.stringify(other.get(prop))) {
        return true;
      }
      return false;
    });
    const size = JSON.stringify(this.size) === JSON.stringify
      (other.size);
    const data = JSON.stringify(this.data) === JSON.stringify(other.data);
    return properties && size && data;
  }
}
