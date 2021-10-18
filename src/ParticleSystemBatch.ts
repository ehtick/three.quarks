import {Behavior} from './behaviors/Behavior';
import {Particle} from './Particle';
import {ParticleSystem} from './ParticleSystem';
import {
    AdditiveBlending,
    Blending,
    BufferAttribute,
    InstancedBufferAttribute,
    InstancedBufferGeometry,
    InterleavedBuffer,
    InterleavedBufferAttribute,
    Matrix3,
    Mesh,
    ShaderMaterial,
    Texture,
    Uniform,
    Vector2,
    Vector4,
    Object3D,
    TrianglesDrawMode,
    DynamicDrawUsage, DoubleSide, FrontSide, BufferGeometry, PlaneBufferGeometry, NormalBlending, Vector3
} from 'three';

import particle_frag from './shaders/particle_frag.glsl';
import particle_vert from './shaders/particle_vert.glsl';
import local_particle_vert from './shaders/local_particle_vert.glsl';
import stretched_bb_particle_vert from './shaders/stretched_bb_particle_vert.glsl';

export interface ParticleSystemBatchSettings {
    // 5 component x,y,z,u,v
    instancingGeometry: BufferGeometry;
    texture: Texture;
    uTileCount: number;
    vTileCount: number;
    blending: Blending;
    renderMode : RenderMode;
    renderOrder : number;
}

export enum RenderMode {
    BillBoard = 0,
    StretchedBillBoard = 1,
    LocalSpaceBillBoard = 2,
}

const DEFAULT_MAX_PARTICLE = 1000;

export class ParticleSystemBatch extends Mesh {
    type: string = "ParticleSystemBatch";
    systems: Set<ParticleSystem>;
    geometry: InstancedBufferGeometry;
    material!: ShaderMaterial;

    private rotationBuffer: InstancedBufferAttribute;
    private sizeBuffer: InstancedBufferAttribute;
    private colorBuffer: InstancedBufferAttribute;
    private offsetBuffer: InstancedBufferAttribute;
    private uvTileBuffer: InstancedBufferAttribute;
    private velocityBuffer? : InstancedBufferAttribute;

    settings: ParticleSystemBatchSettings;
    /*
    public renderMode: RenderMode;
    speedFactor: number;
    uTileCount: number;
    vTileCount: number;
    texture: Texture;
    private blending: Blending
    instancingGeometry: BufferGeometry;*/

    constructor(settings: ParticleSystemBatchSettings) {
        super();
        this.systems = new Set<ParticleSystem>();
        this.geometry = new InstancedBufferGeometry();
        this.settings = settings;

        /*this.renderMode = parameters.renderMode || RenderMode.BillBoard;
        this.speedFactor = parameters.speedFactor || 1;
        //this.worldSpace = (parameters.worldSpace !== undefined) ? parameters.worldSpace : false;
        this.uTileCount = parameters.uTileCount;
        this.vTileCount = parameters.vTileCount;
        this.texture = parameters.texture;
        this.blending = parameters.blending || NormalBlending;
        this.instancingGeometry = parameters.instancingGeometry || new PlaneBufferGeometry(1, 1, 1, 1);*/
        /*const instancingGeometry = new Float32Array([
            -0.5, -0.5, 0, 0, 0,
            0.5, -0.5, 0, 1, 0,
            0.5, 0.5, 0, 1, 1,
            -0.5, 0.5, 0, 0, 1
        ]);*/

        //this.interleavedBuffer = new InterleavedBuffer(instancingGeometry., 5);

        this.geometry.setIndex(this.settings.instancingGeometry.getIndex());
        this.geometry.setAttribute('position', this.settings.instancingGeometry.getAttribute('position')); //new InterleavedBufferAttribute(this.interleavedBuffer, 3, 0, false));
        this.geometry.setAttribute('uv', this.settings.instancingGeometry.getAttribute('uv')); //new InterleavedBufferAttribute(this.interleavedBuffer, 2, 3, false));

        this.offsetBuffer = new InstancedBufferAttribute(new Float32Array(DEFAULT_MAX_PARTICLE * 3), 3);
        this.offsetBuffer.setUsage(DynamicDrawUsage);
        this.geometry.setAttribute('offset', this.offsetBuffer);
        this.colorBuffer = new InstancedBufferAttribute(new Float32Array(DEFAULT_MAX_PARTICLE * 4), 4);
        this.colorBuffer.setUsage(DynamicDrawUsage);
        this.geometry.setAttribute('color', this.colorBuffer);
        this.rotationBuffer = new InstancedBufferAttribute(new Float32Array(DEFAULT_MAX_PARTICLE), 1);
        this.rotationBuffer.setUsage(DynamicDrawUsage);
        this.geometry.setAttribute('rotation', this.rotationBuffer);
        this.sizeBuffer = new InstancedBufferAttribute(new Float32Array(DEFAULT_MAX_PARTICLE), 1);
        this.sizeBuffer.setUsage(DynamicDrawUsage);
        this.geometry.setAttribute('size', this.sizeBuffer);
        this.uvTileBuffer = new InstancedBufferAttribute(new Float32Array(DEFAULT_MAX_PARTICLE), 1);
        this.uvTileBuffer.setUsage(DynamicDrawUsage);
        this.geometry.setAttribute('uvTile', this.uvTileBuffer);

        this.rebuildMaterial();
        // TODO: implement boundingVolume
        this.frustumCulled = false;
        this.renderOrder = this.settings.renderOrder;
    }

    addSystem(system: ParticleSystem) {
        this.systems.add(system);
    }

    removeSystem(system: ParticleSystem) {
        this.systems.delete(system);
    }

    rebuildMaterial() {
        let uniforms: { [a: string]: Uniform } = {};
        let defines: { [b: string]: string } = {};

        defines['USE_MAP'] = '';
        defines['USE_UV'] = '';
        uniforms['map'] = new Uniform(this.settings.texture);
        //@ts-ignore
        uniforms['uvTransform'] = new Uniform(new Matrix3().copy(this.settings.texture.matrix));
        let uTileCount = this.settings.uTileCount;
        let vTileCount = this.settings.vTileCount;

        defines['UV_TILE'] = '';
        uniforms['tileCount'] = new Uniform(new Vector2(uTileCount, vTileCount));


        if (this.settings.renderMode === RenderMode.BillBoard || this.settings.renderMode === RenderMode.LocalSpaceBillBoard) {
            let vertexShader;
            let side;
            if (this.settings.renderMode === RenderMode.LocalSpaceBillBoard) {
                vertexShader = local_particle_vert;
                side = DoubleSide;
            } else {
                vertexShader = particle_vert;
                side = FrontSide;
            }
            this.material = new ShaderMaterial({
                uniforms: uniforms,
                defines: defines,
                vertexShader: vertexShader,
                fragmentShader: particle_frag,
                transparent: true,
                depthWrite: false,
                blending: this.settings.blending || AdditiveBlending,
                side: side,
            });
        } else if (this.settings.renderMode === RenderMode.StretchedBillBoard) {

            this.velocityBuffer = new InstancedBufferAttribute(new Float32Array(DEFAULT_MAX_PARTICLE * 3), 3);
            this.velocityBuffer.setUsage(DynamicDrawUsage);
            this.geometry.setAttribute('velocity', this.velocityBuffer);

            uniforms['speedFactor'] = new Uniform(1.0);
            this.material = new ShaderMaterial({
                uniforms: uniforms,
                defines: defines,
                vertexShader: stretched_bb_particle_vert,
                fragmentShader: particle_frag,
                transparent: true,
                depthWrite: false,
                blending: this.settings.blending || AdditiveBlending,
            });
        } else {
            throw new Error("render mode unavailable");
        }
    }

    /*
    clone() {
        let system = this.system.clone();
        return system.emitter as any;
    }*/
    vector_: Vector3 = new Vector3();

    update() {
        let index = 0;
        this.systems.forEach(system => {
            const particles = system.particles;
            let particleNum = system.particleNum;

            for (let j = 0; j < particleNum; j++, index ++) {
                let particle = particles[j];
                if (system.worldSpace) {
                    this.offsetBuffer.setXYZ(index, particle.position.x, particle.position.y, particle.position.z);
                } else {
                    this.vector_.copy(particle.position).applyMatrix4(system.emitter.matrixWorld);
                    this.offsetBuffer.setXYZ(index, this.vector_.x, this.vector_.y, this.vector_.z);
                }
                this.colorBuffer.setXYZW(index, particle.color.x, particle.color.y, particle.color.z, particle.color.w);
                this.rotationBuffer.setX(index, particle.rotation);
                this.sizeBuffer.setX(index, particle.size);
                this.uvTileBuffer!.setX(index, particle.uvTile);

                if (this.settings.renderMode === RenderMode.StretchedBillBoard) {
                    this.velocityBuffer!.setXYZ(index, particle.velocity.x * system.speedFactor, particle.velocity.y * system.speedFactor, particle.velocity.z * system.speedFactor);
                }
            }
        });
        this.geometry.instanceCount = index;

        if (index > 0) {
            this.offsetBuffer.updateRange.count = index * 3;
            this.offsetBuffer.needsUpdate = true;

            this.colorBuffer.updateRange.count = index * 4;
            this.colorBuffer.needsUpdate = true;

            this.rotationBuffer.updateRange.count = index;
            this.rotationBuffer.needsUpdate = true;

            this.sizeBuffer.updateRange.count = index;
            this.sizeBuffer.needsUpdate = true;

            this.uvTileBuffer!.updateRange.count = index;
            this.uvTileBuffer!.needsUpdate = true;

            if (this.settings.renderMode === RenderMode.StretchedBillBoard) {
                this.velocityBuffer!.updateRange.count = index * 3;
                this.velocityBuffer!.needsUpdate = true;
            }
        }
    }

    dispose() {
        this.geometry.dispose();
    }

}