import * as PIXI from "pixi.js";
import {PhysicalBody, Planet, Point, Rect, Rocket, Vector} from "./types";

/**
 * angleFromVector takes a velocity vector and returns the angle of the vector.
 */
export const angleFromVector = ({x, y}: Vector): number => Math.atan2(y, x);

export const angleToVector = (
  angle: number, multiplierX = 1, multiplierY = multiplierX
): Vector => ({
  x: Math.cos(angle) * multiplierX,
  y: Math.sin(angle) * multiplierY,
});

export const angle = (p1: Point, p2: Point): number => Math.atan2(p1.y - p2.y, p1.x - p2.x);

export const averageAngle = (a: number, b: number): number => Math.atan2(
  (Math.sin(a) + Math.sin(b)) / 2,
  (Math.cos(a) + Math.cos(b)) / 2,
);

export const calculateGravityVector = (planet: Planet, body: PhysicalBody): Point => {
  const distance = Math.max(0.01, dist(planet.sprite, body.sprite));
  return angleToVector(angle(planet.sprite, body.sprite), planet.radius / (2 * distance));
};

export const calculateSpeed = ({x, y}: Point): number => Math.abs(Math.hypot(x, y));

export const dist = (p1: Point, p2: Point): number => Math.hypot(p1.x - p2.x, p1.y - p2.y);

export const distToSurface = (b1: PhysicalBody, b2: PhysicalBody): number =>
  dist(b1.sprite, b2.sprite) - (b1.radius + b2.radius);

export const isInBounds = (body: PhysicalBody, {height, width}: Rect): boolean => {
  const sb = body.sprite.getBounds();
  return sb.x > 0 && sb.x + sb.width < width && sb.y > 0 && sb.y + sb.height < height;
};
export const outOfBounds = (body: PhysicalBody, {height, width}: Rect): boolean => {
  const sb = body.sprite.getBounds();
  return sb.x < 0 - width || sb.x > width * 2 || sb.y < 0 - height || sb.y > height * 2;
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

const idGenerator = () => {
  let entityCount = 0;
  return () => entityCount++;
}
const getNewID = idGenerator();

export const newPhysicalBody = ({
  anchor = new PIXI.Point(0.5, 0.5),
  buttonMode = false,
  initialPosition,
  interactive = false,
  rotation = 0,
  scale = new PIXI.Point(1, 1),
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
    id: getNewID(),
    initialPosition,
    radius: Math.min(sprite.width, sprite.height) / 2,
    sprite,
    velocity: velocity,
  };
};

export const random = (a = 1, b?: number): number =>
  b === undefined ? Math.random() * a : Math.random() * (b - a) + a;

// Returns -1 or 1 more or less randomly, with a slight preference for 1 due to handling of 0
export const randomSign = () => Math.sign(Math.random() - 0.5) || 1;

export const randomInt = (a: number, b?: number): number => {
  if (b === undefined) {
    return Math.floor(Math.random() * a);
  }
  const min = Math.ceil(a);
  const max = Math.floor(b);
  return Math.floor(Math.random() * (max - min) + min);
};

export const randomInArray = <T>(a: T[]): T => a[randomInt(a.length)];

export const randomRotation = (x: number): number => randomSign() * randomInt(1, x) / 100;

export const randomScreenPositionInBounds = (w: number, h: number, x: number): [number, number] => [
  random(w * x, w * (1 - x)),
  random(h * x, h * (1 - x)),
];

export const reset = (rocket: Rocket): void => {
  rocket.sprite.x = rocket.initialPosition.x;
  rocket.sprite.y = rocket.initialPosition.y;
  updateVelocity(rocket, 0, 0);
  rocket.sprite.rotation = Math.PI * 1.5;
  rocket.sprite.visible = true;
  rocket.thrusterFuel = 0;
};

export const updateVelocity = (body: PhysicalBody, x: number, y = x): void => {
  body.velocity.set(x, y);
};
