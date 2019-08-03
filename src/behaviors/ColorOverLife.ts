import {Behavior} from "../Behavior";
import {Particle} from "../Particle";
import {FunctionColorGenerator} from "../functions/ColorGenerator";

export class ColerOverLife implements Behavior {

    constructor(public func: FunctionColorGenerator) {
    }

    initialize(particle: Particle): void {
    }

    update(particle: Particle, delta: number): void {
        this.func.genColor(particle.color, particle.age / particle.life).dot(particle.startColor);
    }

    toJSON(): any {
        return {
            type: 'ColerOverLife',
            func: this.func.toJSON(),
        };
    }
}