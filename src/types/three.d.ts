declare module 'three' {
  export class WebGLRenderer {
    constructor();
    setSize(width: number, height: number): void;
    render(scene: Scene, camera: any): void;
    domElement: HTMLCanvasElement;
    setPixelRatio(ratio: number): void;
    dispose(): void;
  }

  export class Scene {
    constructor();
    add(object: any): void;
    remove(object: any): void;
  }

  export class OrthographicCamera {
    constructor(left: number, right: number, top: number, bottom: number, near: number, far: number);
    position: { set(x: number, y: number, z: number): void };
    updateProjectionMatrix(): void;
  }

  export class ShaderMaterial {
    constructor(parameters: any);
    uniforms: any;
  }

  export class Clock {
    constructor();
    getDelta(): number;
  }

  export class Vector2 {
    constructor(x?: number, y?: number);
    x: number;
    y: number;
    set(x: number, y: number): void;
  }

  export class Color {
    constructor(color: string | number);
    setHex(hex: number): void;
  }

  export class Mesh {
    constructor(geometry: any, material: any);
    position: { set(x: number, y: number, z: number): void };
  }

  export class PlaneGeometry {
    constructor(width: number, height: number);
  }

  export class Texture {
    constructor();
  }

  export class Uniform {
    constructor(value: any);
    value: any;
  }
}
