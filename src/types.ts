export interface PhysicalBody {
  id: number;
  initialPosition: Point;
  radius: number;
  sprite: PIXI.Sprite;
  terminalVelocity?: number;
  velocity: Point;
}

export interface Planet extends PhysicalBody {
  rotationSpeed: number;
}

export interface Asteroid extends Planet {
  crashingDuration: number;
  orbitAngle: number;
  orbitDistance: number;
  speed: number;
}

export interface Rocket extends PhysicalBody {
  landingAngle: number;
  thrusterFuel: number;
}

export type Rect = {
  height: number;
  width: number;
}

export type Point = {
  x: number;
  y: number;
}

export type Tuple<T> = [T, T];
export type Range = Tuple<number>;

export type Vector = Point;

export type DraggingData = {
  dragging: boolean;
  start?: {x: number, y: number};
};

export type CrashInstance = {
  duration: number;
  size?: number;
  sprite: PIXI.Sprite;
};

export type CrashProps = {
  duration: number;
  size?: number;
  x: number;
  y: number;
};
