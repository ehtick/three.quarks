import {Behavior} from './Behavior';
import {Particle} from '../Particle';
import {ValueGenerator, ValueGeneratorFromJSON} from '../functions/ValueGenerator';
import {Quaternion, Vector3} from '../math';
/**
 * Change the emit direction of particles.
 */
export class ChangeEmitDirection implements Behavior {
    type = 'ChangeEmitDirection';
    _temp: Vector3 = new Vector3();
    _q: Quaternion = new Quaternion();
    memory = {data: [], dataCount: 0};

    constructor(public angle: ValueGenerator) {}

    initialize(particle: Particle): void {
        const len = particle.velocity.length();
        if (len == 0) return;
        particle.velocity.normalize();
        if (particle.velocity.x === 0 && particle.velocity.y === 0) {
            this._temp.set(0, particle.velocity.z, 0);
        } else {
            this._temp.set(-particle.velocity.y, particle.velocity.x, 0);
        }
        this.angle.startGen(this.memory);
        this._q.setFromAxisAngle(this._temp.normalize(), this.angle.genValue(this.memory));
        this._temp.copy(particle.velocity);
        particle.velocity.applyQuaternion(this._q);
        this._q.setFromAxisAngle(this._temp, Math.random() * Math.PI * 2);
        particle.velocity.applyQuaternion(this._q);
        particle.velocity.setLength(len);
    }

    update(particle: Particle, delta: number): void {}

    frameUpdate(delta: number): void {}

    toJSON(): any {
        return {
            type: this.type,
            angle: this.angle.toJSON(),
        };
    }

    static fromJSON(json: any): Behavior {
        return new ChangeEmitDirection(ValueGeneratorFromJSON(json.angle) as ValueGenerator);
    }

    clone(): Behavior {
        return new ChangeEmitDirection(this.angle);
    }
    reset(): void {}
}
