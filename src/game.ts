import * as PIXI from "pixi.js";
import {
  angle,
  angleFromVector,
  angleToVector,
  calculateGravityVector,
  calculateSpeed,
  dist,
  distToSurface,
  // isInBounds,
  newPhysicalBody,
  outOfBounds,
  randomInt,
  reset,
  updateVelocity,
} from "./utils";
import {
  CrashInstance,
  CrashProps,
  DraggingData,
  Planet,
  Point,
  Rocket,
} from "./types";

const AIR_RESISTANCE = 0.02;
// const RESISTANCE = 0.01;
// const GRAVITY = 0.05;
const AIR_RESISTANCE_RADIUS = 2;
const LANDING_DISTANCE = 60;
const LANDING_VELOCITY = 1;
const MAX_LANDING_VELOCITY = 5;
const DRAG_MODIFIER = 0.02;
const THRUST_POWER = 0.01;

const randomRotation = (x: number) => (Math.sign(Math.random() - 0.5) || 0) * randomInt(1, x) / 100;

export const runGame = (textures: Record<string, PIXI.Texture | undefined>): void => {
  const app = new PIXI.Application({
    antialias: true,
    backgroundColor: 0x222222,
    height: window.innerHeight,
    resolution: 1,
    transparent: false,
    width: window.innerWidth,
  });
  document.body.appendChild(app.view);

  /**
   * Sprites ----------------------------------
   */

  const planets: Planet[] = [];

  const earth: Planet = {
    ...newPhysicalBody({
      initialPosition: new PIXI.Point(app.view.width / 2, app.view.height / 2),
      scale: new PIXI.Point(1.5, 1.5),
      texture: textures["earth"],
    }),
    rotationSpeed: randomRotation(5),
  };
  planets.push(earth);

  planets.push({
    ...newPhysicalBody({
      initialPosition: new PIXI.Point(app.view.width * 0.8, app.view.height / 2),
      scale: new PIXI.Point(0.6, 0.65),
      texture: textures["moon"],
    }),
    rotationSpeed: randomRotation(10),
  }, {
    ...newPhysicalBody({
      initialPosition: new PIXI.Point(app.view.width * 0.2, app.view.height / 2),
      scale: new PIXI.Point(0.6, 0.65),
      texture: textures["moon"],
    }),
    rotationSpeed: randomRotation(10),
  });

  const rocket: Rocket = {
    ...newPhysicalBody({
      anchor: new PIXI.Point(0.5, 0.75),
      initialPosition: new PIXI.Point(
        app.view.width * 0.5,
        app.view.height * 0.5 - earth.radius,
      ),
      rotation: Math.PI * 1.5,
      scale: new PIXI.Point(0.3, 0.3),
      texture: textures["rocket"],
      velocity: new PIXI.Point(0),
    }),
    landingAngle: 0,
    thrusterFuel: 0,
  };
  reset(rocket);

  // Add to stage
  for (const planet of planets) {
    app.stage.addChild(planet.sprite);
  }
  app.stage.addChild(rocket.sprite);

  const crashes: CrashInstance[] = [];

  const addCrash = ({ x, y, duration }: CrashProps) => {
    const crash = new PIXI.Sprite(textures["crash"]);
    crash.x = x;
    crash.y = y;
    crash.scale.set(0.1);
    crash.anchor.set(0.5);
    crashes.push({
      duration,
      sprite: crash,
    });
    app.stage.addChild(crash);
  };

  // Handle dragging for launching rocket
  const draggingData: DraggingData = {};
  app.stage.interactive = true;
  app.stage.hitArea = new PIXI.Rectangle(0, 0, app.view.width, app.view.height);
  app.stage.on("pointerdown", (e: PIXI.InteractionEvent) => {
    const { x, y } = e.data.global;
    draggingData.start = { x, y };
  });
  app.stage.on("pointerup", (e: PIXI.InteractionEvent) => {
    const distance = dist(draggingData.start, e.data.global) * DRAG_MODIFIER;
    const { x, y } = angleToVector(angle(draggingData.start, e.data.global), distance);
    updateVelocity(rocket, x, y);
    rocket.sprite.rotation = angleFromVector(rocket.velocity);
    rocket.thrusterFuel = 20;
  });

  app.ticker.add(delta => {
    let closestPlanet: Planet & {distance: number;};
    const gravityVector: Point = { x: 0, y: 0 };

    for (const planet of planets) {
      planet.sprite.rotation += planet.rotationSpeed;
      const distance = dist(planet.sprite, rocket.sprite);
      if (!closestPlanet || closestPlanet.distance > distance) {
        closestPlanet = { ...planet, distance };
      }

      const { x, y } = calculateGravityVector(planet, rocket);
      gravityVector.x += x;
      gravityVector.y += y;
    }

    const distance = distToSurface(closestPlanet, rocket);
    const speed = calculateSpeed(rocket.velocity);

    if (rocket.thrusterFuel > 0
      && dist(closestPlanet.sprite, rocket.sprite) > closestPlanet.radius * 0.9) {
      rocket.thrusterFuel--;
      updateVelocity(
        rocket,
        rocket.velocity.x * (1 + THRUST_POWER),
        rocket.velocity.y * (1 + THRUST_POWER),
      );
    } else if (distance <= 5 && speed > MAX_LANDING_VELOCITY) {
      const { x, y } = rocket.sprite;
      addCrash({ duration: 100, x, y });
      rocket.sprite.visible = false;
      updateVelocity(rocket, 0);
    } else if (distance <= 0) {
      updateVelocity(rocket, 0);
      // rocket.sprite.rotation = angle(rocket.sprite, moon.sprite);
      rocket.sprite.rotation = Math.PI + angle(closestPlanet.sprite, rocket.sprite);
      const { x, y } =
        angleToVector(closestPlanet.sprite.rotation - rocket.landingAngle, closestPlanet.radius);
      rocket.sprite.x = closestPlanet.sprite.x + x;
      rocket.sprite.y = closestPlanet.sprite.y + y;
    } else if (distance < LANDING_DISTANCE) {
      const landingVector =
        angleToVector(angle(closestPlanet.sprite, rocket.sprite), LANDING_VELOCITY);
      // const landingSpeed = Math.abs(Math.hypot(landingVector.x, landingVector.y));

      if (speed > MAX_LANDING_VELOCITY) {
        updateVelocity(
          rocket,
          rocket.velocity.x * (1 - AIR_RESISTANCE),
          rocket.velocity.y * (1 - AIR_RESISTANCE),
        );
      } else {
        updateVelocity(rocket, landingVector.x, landingVector.y);
        rocket.sprite.rotation = angle(rocket.sprite, closestPlanet.sprite);
        rocket.landingAngle =
          Math.PI + closestPlanet.sprite.rotation - angle(closestPlanet.sprite, rocket.sprite);
      }

    } else if (distance < closestPlanet.sprite.width * AIR_RESISTANCE_RADIUS) {
      updateVelocity(
        rocket,
        rocket.velocity.x * (1 - AIR_RESISTANCE) + gravityVector.x,
        rocket.velocity.y * (1 - AIR_RESISTANCE) + gravityVector.y,
      );
      rocket.sprite.rotation = angleFromVector(rocket.velocity);
    } else {
      updateVelocity(
        rocket,
        rocket.velocity.x + gravityVector.x,
        rocket.velocity.y + gravityVector.y,
      );
      rocket.sprite.rotation = angleFromVector(rocket.velocity);
    }

    rocket.sprite.x += rocket.velocity.x * delta;
    rocket.sprite.y += rocket.velocity.y * delta;


    for (let i = crashes.length; i >= 0; i--) {
      const crash = crashes[i];
      if (crash === undefined) {
        continue;
      }
      if (crash.duration < 0) {
        crashes.splice(i, 1);
        app.stage.removeChild(crash.sprite);
        reset(rocket);
      } else {
        crash.sprite.scale.set(Math.min(crash.sprite.scale.x + 0.1, 2));
        crash.sprite.alpha -= 0.01;
        crash.duration -= delta;
      }
    }
    if (outOfBounds(rocket, app.view)) {
      reset(rocket);
    }
  });
};
