import * as PIXI from "pixi.js";
import { PhysicalBody, Point, Rect, Vector } from "./types";

/**
 * angleFromVector takes a velocity vector and returns the angle of the vector.
 */
export const angleFromVector = ({ x, y }: Vector): number => Math.atan2(y, x);

export const angleToPoint = (p1: Point, p2: Point): number => Math.atan2(p1.y - p2.y, p1.x - p2.x);

export const averageAngle = (a: number, b: number): number => Math.atan2(
  (Math.sin(a) + Math.sin(b)) / 2,
  (Math.cos(a) + Math.cos(b)) / 2,
);

export const calculateSpeed = ({ x, y }: Point): number => Math.abs(Math.hypot(x, y));

export const dist = (p1: Point, p2: Point): number => Math.hypot(p1.x - p2.x, p1.y - p2.y);

export const distToSurface = (b1: PhysicalBody, b2: PhysicalBody): number =>
  dist(b1.sprite, b2.sprite) - (b1.radius + b2.radius);

export const isInBounds = (body: PhysicalBody, { height, width }: Rect): boolean => {
  const sb = body.sprite.getBounds();
  return sb.x > 0 && sb.x + sb.width < width && sb.y > 0 && sb.y + sb.height < height;
};

interface PhysicalBodyOptions {
  anchor?: PIXI.Point;
  buttonMode?: boolean;
  initialPosition: PIXI.Point;
  interactive?: boolean;
  rotation?: number;
  scale?: PIXI.Point;
  texture: PIXI.Texture;
  velocity?: PIXI.Point;
}

export const newPhysicalBody = ({
  anchor = new PIXI.Point(),
  buttonMode = false,
  initialPosition,
  interactive = false,
  rotation = 0,
  scale = new PIXI.Point(1),
  texture,
  velocity = new PIXI.Point(),
}: PhysicalBodyOptions): PhysicalBody => {
  const sprite = new PIXI.Sprite(texture);
  sprite.anchor.set(anchor.x, anchor.y);
  sprite.buttonMode = buttonMode;
  sprite.interactive = interactive;
  sprite.rotation = rotation;
  sprite.scale.set(scale.x, scale.y);
  sprite.x = initialPosition.x;
  sprite.y = initialPosition.y;
  return {
    initialPosition,
    radius: Math.min(sprite.width, sprite.height) / 2,
    sprite,
    velocity: velocity,
  };
};

export const reset = (body: PhysicalBody): void => {
  body.sprite.x = body.initialPosition.x;
  body.sprite.y = body.initialPosition.y;
  updateVelocity(body, 0, 0);
  body.sprite.rotation = Math.PI * 1.5;
};

export const updateVelocity = (body: PhysicalBody, x: number, y = x): void => {
  body.velocity.set(x, y);
};

