export interface PhysicalBody {
  initialPosition?: PIXI.Point;
  radius: number;
  sprite: PIXI.Sprite;
  velocity?: PIXI.Point;
}

export interface PhysicalBodyOptions {
  anchor?: PIXI.Point;
  buttonMode?: boolean;
  initialPosition: PIXI.Point;
  interactive?: boolean;
  rotation?: number;
  scale?: PIXI.Point;
  texture: PIXI.Texture;
  velocity?: PIXI.Point;
}

export type Rect = {
  height: number;
  width: number;
}

export type Point = {
  x: number;
  y: number;
}

export type Vector = Point;

export type DraggingData = {
  start?: {x: number, y: number};
};

export type CrashInstance = {
  duration: number;
  sprite: PIXI.Sprite;
};

export type CrashProps = {
  duration: number;
  x: number;
  y: number;
};
