import * as PIXI from "pixi.js";
import {
  angle,
  angleFromVector,
  angleToVector,
  calculateGravityVector,
  calculateSpeed,
  dist,
  distToSurface,
  isInBounds,
  line,
  mapToRange,
  newPhysicalBody,
  outOfBounds,
  point,
  random,
  randomInArray,
  randomRotation,
  randomScreenEdge,
  randomScreenPositionInBounds,
  resetRocket,
  updateVelocity,
} from "./utils";
import {
  Asteroid,
  CrashInstance,
  CrashProps,
  DraggingData,
  Planet,
  Point,
  Rocket,
} from "./types";

let score = 0;

const ARROW_SCALE_MODIFIER = 1000; // Larger number means smaller arrow
const AIR_RESISTANCE = 0.25;
const AIR_RESISTANCE_RADIUS = 1.5;
const LANDING_DISTANCE = 60;
const LANDING_VELOCITY = 2;
const MAX_LANDING_VELOCITY = 4;
const DRAG_MODIFIER = 0.02;
const GOOD_LANDING_ANGLE = 0.45 / MAX_LANDING_VELOCITY;
const TERMINAL_VELOCITY = 50;
const SLOWDOWN = 3;

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

  const scoreText = new PIXI.Text("Score: 0", {
    fill: "#fff",
    fontFamily: "monospace",
    fontSize: 32,
  });
  scoreText.x = 20;
  scoreText.y = 20;

  // Pre-calculate center and angles to corners
  const appCenter = { x: app.view.width / 2, y: app.view.height / 2 };
  const a0 = angle({ x: 0, y: 0 }, appCenter);
  const a1 = angle({ x: 0, y: app.view.height }, appCenter);
  const a2 = angle({ x: app.view.width, y: 0 }, appCenter);
  const a3 = angle({ x: app.view.width, y: app.view.height }, appCenter);
  const minWH = Math.min(app.view.width, app.view.height);

  /**
   * Sprites ----------------------------------
   */

  const planets: Planet[] = [];

  // const earthInitialPosition = randomScreenPositionInBounds(app.view, 0.2);
  // const earthInitialPosition = [app.view.width * 0.25, app.view.height * 0.5];
  const earthInitialPosition = [app.view.width / 2, app.view.height / 2];
  const earth: Planet = {
    ...newPhysicalBody({
      initialPosition: point(...earthInitialPosition),
      scale: point(1),
      texture: textures["earth"],
    }),
    rotationSpeed: randomRotation(1),
  };
  planets.push(earth);

  // const numberOfMoons = randomInt(1, 4);
  const numberOfMoons = 1;
  for (let i = 0; i < numberOfMoons; i++) {
    // const moonPosition = randomScreenPositionInBounds(app.view, 0.1);
    // const moonPosition = [app.view.width * 0.75, app.view.height * 0.4];
    const moonPosition = [minWH * 0.9, minWH * 0.9];
    const moon = {
      ...newPhysicalBody({
        initialPosition: point(...moonPosition),
        scale: point(0.6, 0.65),
        texture: textures["moon"],
      }),
      orbitAngle: random(Math.PI * 2),
      orbitDistance: dist(earth.sprite, point(...moonPosition)),
      rotationSpeed: randomRotation(6),
      speed: random(-0.4, 0.4),
    };
    planets.push(moon);
  }

  const asteroids: Asteroid[] = [];
  const numberOfAsteroids = 0; // randomInt(5, 15);
  for (let i = 0; i < numberOfAsteroids; i++) {
    const texture = textures[randomInArray(["asteroid01", "asteroid02"])];
    const scale = random(0.5, 1.2);
    const [x, y] = randomScreenPositionInBounds(app.view, 0.1);
    asteroids.push({
      ...newPhysicalBody({
        initialPosition: point(x, y),
        scale: point(scale, scale),
        texture: texture,
      }),
      crashingDuration: 0,
      // currentDistance: dist(earth.sprite, { x, y }),
      orbitAngle: angle(earth.sprite, { x, y }),
      orbitDistance: dist(earth.sprite, { x, y }),
      rotationSpeed: randomRotation(8),
      speed: random(-0.5, 0.5),
    });
  }

  const rocket: Rocket = {
    ...newPhysicalBody({
      anchor: point(0.5, 0.75),
      initialPosition: point(
        earthInitialPosition[0],
        earthInitialPosition[1] - earth.radius,
      ),
      rotation: Math.PI * 1.5,
      scale: point(0.3),
      terminalVelocity: TERMINAL_VELOCITY,
      texture: textures["rocket"],
      velocity: point(0),
    }),
    homePlanetID: earth.id,
    landingAngle: 0,
    launching: false,
    thrusterFuel: 20,
  };

  const reset = () => {
    resetRocket(rocket, earth.id);
    score = 0;
    scoreText.text = "Score: 0";
  };
  reset();

  const arrow = new PIXI.Sprite(textures["arrow"]);
  arrow.visible = false;
  arrow.anchor.set(0.5);

  const offScreenIndicator = new PIXI.Sprite(textures["arrow"]);
  offScreenIndicator.visible = false;
  offScreenIndicator.scale.set(0.2);
  offScreenIndicator.anchor.set(1, 0.5);

  const speedometer = new PIXI.Sprite(textures["speedometer"]);
  speedometer.anchor.set(0, 1);
  speedometer.scale.set(0.6);
  speedometer.x = 20;
  speedometer.y = app.view.height - 20;
  speedometer.zIndex = 1000;
  const speedNeedle = new PIXI.Sprite(textures["speedometer_arrow"]);
  speedNeedle.anchor.set(0, 0.5);
  speedNeedle.scale.set(0.6, 1);
  speedNeedle.rotation = -Math.PI;
  speedNeedle.x = speedometer.x + speedometer.width / 2;
  speedNeedle.y = speedometer.y - speedometer.height * 0.19;
  speedNeedle.zIndex = 1001;

  // Add to stage
  for (const planet of planets) {
    app.stage.addChild(planet.sprite);
  }
  for (const asteroid of asteroids) {
    app.stage.addChild(asteroid.sprite);
  }

  const crashes: CrashInstance[] = [];
  const astroidCrashes: CrashInstance[] = [];

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
  const crashAsteroid = ({ x, y, duration, size }: CrashProps) => {
    const crash = new PIXI.Sprite(textures["impact02"]);
    crash.x = x;
    crash.y = y;
    crash.scale.set(0.1);
    crash.anchor.set(0.5);
    astroidCrashes.push({
      duration,
      size,
      sprite: crash,
    });
    app.stage.addChild(crash);
  };
  const addAsteroid = () => {
    const texture = textures[randomInArray(["asteroid01", "asteroid02"])];
    const scale = random(0.5, 1.2);
    const [x, y] = randomScreenEdge(app.view);
    const asteroid = {
      ...newPhysicalBody({
        initialPosition: point(x, y),
        scale: point(scale, scale),
        texture: texture,
      }),
      crashingDuration: 0,
      // currentDistance: dist(earth.sprite, { x, y }),
      orbitAngle: angle(earth.sprite, { x, y }),
      orbitDistance: random(earth.radius * 3, dist(earth.sprite, { x, y })),
      rotationSpeed: randomRotation(8),
      speed: random(-0.5, 0.5),
    };
    asteroid.sprite.zIndex = 1;
    asteroid.sprite.alpha = 0;
    asteroids.push(asteroid);
    app.stage.addChild(asteroid.sprite);
  };

  app.stage.addChild(rocket.sprite, offScreenIndicator, speedometer, speedNeedle, arrow, scoreText);

  // Handle dragging for launching rocket
  const draggingData: DraggingData = { dragging: false };
  app.stage.interactive = true;
  app.stage.hitArea = new PIXI.Rectangle(0, 0, app.view.width, app.view.height);
  app.stage.on("pointerdown", (e: PIXI.InteractionEvent) => {
    if (rocket.thrusterFuel <= 0 || rocket.launching) {
      return;
    }
    const { x, y } = e.data.global;
    draggingData.start = { x, y };
    draggingData.dragging = true;

    arrow.x = x;
    arrow.y = y;
    arrow.scale.set(0);
    arrow.visible = true;
  });
  app.stage.on("pointermove", (e: PIXI.InteractionEvent) => {
    if (!draggingData.dragging) {
      return;
    }
    const distance = dist(draggingData.start, e.data.global);
    const a = angle(draggingData.start, e.data.global);
    const { x, y } = e.data.global;
    arrow.x = (x + draggingData.start.x) / 2;
    arrow.y = (y + draggingData.start.y) / 2;
    arrow.scale.set(distance / ARROW_SCALE_MODIFIER);
    arrow.rotation = a;
  });
  app.stage.on("pointerup", (e: PIXI.InteractionEvent) => {
    if (rocket.thrusterFuel >= 0 && !rocket.launching) {
      const distance = dist(draggingData.start, e.data.global) * DRAG_MODIFIER;
      const { x, y } = angleToVector(angle(draggingData.start, e.data.global), distance);
      updateVelocity(rocket, x, y);
      rocket.sprite.rotation = angleFromVector(rocket.velocity);
      rocket.launching = true;
    }
    arrow.visible = false;
    draggingData.dragging = false;
  });

  app.ticker.add(delta => {
    delta = delta / (draggingData.dragging ? SLOWDOWN : 1);
    let closestPlanet: Planet & {distance: number;};
    const gravityVector: Point = { x: 0, y: 0 };

    for (const planet of planets) {
      planet.sprite.rotation += planet.rotationSpeed * delta;
      const distance = dist(planet.sprite, rocket.sprite);
      if (!closestPlanet || closestPlanet.distance > distance) {
        closestPlanet = { ...planet, distance };
      }

      const { x, y } = calculateGravityVector(planet, rocket);
      gravityVector.x += x;
      gravityVector.y += y;

      if (planet.speed && planet.orbitDistance && planet.orbitAngle) {
        const angleVector = angleToVector(
          earth.sprite.rotation * planet.speed - planet.orbitAngle, planet.orbitDistance
        );
        planet.sprite.x = earth.sprite.x + angleVector.x;
        planet.sprite.y = earth.sprite.y + angleVector.y;
      }
    }

    const distance = distToSurface(closestPlanet, rocket);
    const speed = calculateSpeed(rocket.velocity);

    // Update speedometer needle
    speedNeedle.rotation = Math.min(-Math.PI + speed * GOOD_LANDING_ANGLE, 0);

    for (let i = asteroids.length; i >= 0; i--) {
      const asteroid = asteroids[i];
      if (!asteroid) {
        continue;
      }
      for (const body of [...asteroids, ...planets]) {
        if (asteroid.id === body.id) {
          continue;
        }
        if (distToSurface(asteroid, body) <= 0) {
          const { x, y } = asteroid.sprite;
          app.stage.removeChild(asteroid.sprite);
          asteroids.splice(i, 1);
          crashAsteroid({ duration: 40, size: asteroid.radius * 2, x, y });
        }
      }
      if (asteroid.sprite.alpha < 1) {
        asteroid.sprite.alpha += 0.01;
      }
      asteroid.sprite.rotation += asteroid.rotationSpeed * delta;
      if (distToSurface(asteroid, rocket) <= 0 && speed > 0) {
        const { x, y } = rocket.sprite;
        addCrash({ duration: 100, x, y });
        rocket.sprite.visible = false;
        updateVelocity(rocket, 0);
      }
      const { x, y } = angleToVector(
        earth.sprite.rotation * asteroid.speed - asteroid.orbitAngle, asteroid.orbitDistance
      );
      asteroid.sprite.x = earth.sprite.x + x;
      asteroid.sprite.y = earth.sprite.y + y;
    }

    if (speed <= 0 && distance <= 0 && rocket.thrusterFuel <= 0
      && closestPlanet.id !== rocket.homePlanetID) {
      scoreText.text = `Score: ${++score}`;
      rocket.homePlanetID = closestPlanet.id;

      if (random() < 0.5 && asteroids.length < 40) {
        addAsteroid();
      }
    }

    if (speed <= 0 && distance <= 0) {
      rocket.thrusterFuel = 20;
    }

    if (!rocket.sprite.visible) {
      // don't update rocket if it has crashed
    } else if (rocket.launching && rocket.thrusterFuel > 0
      && dist(closestPlanet.sprite, rocket.sprite) > closestPlanet.radius * 0.9) {
      rocket.thrusterFuel--;
      updateVelocity(
        rocket,
        rocket.velocity.x,
        rocket.velocity.y,
      );
    } else if (distance <= 5 && speed > MAX_LANDING_VELOCITY) {
      const { x, y } = rocket.sprite;
      addCrash({ duration: 100, x, y });
      rocket.sprite.visible = false;
      updateVelocity(rocket, 0);
    } else if (distance <= 0) {
      updateVelocity(rocket, 0);
      rocket.sprite.rotation = Math.PI + angle(closestPlanet.sprite, rocket.sprite);
      const { x, y } =
        angleToVector(closestPlanet.sprite.rotation - rocket.landingAngle, closestPlanet.radius);
      rocket.sprite.x = closestPlanet.sprite.x + x;
      rocket.sprite.y = closestPlanet.sprite.y + y;
    } else if (distance < LANDING_DISTANCE) {
      const landingVector =
        angleToVector(angle(closestPlanet.sprite, rocket.sprite), LANDING_VELOCITY);

      const d = LANDING_DISTANCE;
      const m = mapToRange([0, d], [1, 0])(distance);
      const resistance = 1 - AIR_RESISTANCE * m;

      if (speed > MAX_LANDING_VELOCITY) {
        updateVelocity(
          rocket,
          (rocket.velocity.x + gravityVector.x) * resistance,
          (rocket.velocity.y + gravityVector.y) * resistance,
        );
        rocket.sprite.rotation = angleFromVector(rocket.velocity);
      } else {
        updateVelocity(rocket, landingVector.x, landingVector.y);
        rocket.sprite.rotation = angle(rocket.sprite, closestPlanet.sprite);
        rocket.landingAngle =
          Math.PI + closestPlanet.sprite.rotation - angle(closestPlanet.sprite, rocket.sprite);
        rocket.launching = false;
      }

    } else if (distance < closestPlanet.radius * AIR_RESISTANCE_RADIUS) {
      const d = closestPlanet.radius * AIR_RESISTANCE_RADIUS;
      const m = mapToRange([0, d], [1, 0])(distance);
      const resistance = 1 - AIR_RESISTANCE * m;
      updateVelocity(
        rocket,
        (rocket.velocity.x + gravityVector.x) * resistance,
        (rocket.velocity.y + gravityVector.y) * resistance,
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
        reset();
      } else {
        crash.sprite.scale.set(Math.min(crash.sprite.scale.x + 0.1, 2));
        crash.sprite.alpha -= 0.01;
        crash.duration -= delta;
      }
    }

    for (let i = astroidCrashes.length; i >= 0; i--) {
      const crash = astroidCrashes[i];
      if (crash === undefined) {
        continue;
      }
      if (crash.duration < 0) {
        astroidCrashes.splice(i, 1);
        app.stage.removeChild(crash.sprite);
      } else {
        crash.sprite.scale.set(Math.min(crash.sprite.scale.x + 0.05, crash.size));
        crash.sprite.alpha -= 0.01;
        crash.duration -= delta;
      }
    }

    if (!isInBounds(rocket, app.view)) {
      offScreenIndicator.visible = true;
      const a = angle(rocket.sprite, appCenter);
      const l = line(appCenter, a);

      let coords: Point;
      if (a > a0 && a < a2) {
        coords = { x: -l.c / l.m, y: 0 };
      } else if (a > a2 && a < a3) {
        coords = { x: app.view.width, y: l.m * app.view.width + l.c };
      } else if (a > a3 && a < a1) {
        coords = { x: (app.view.height - l.c) / l.m, y: app.view.height };
      } else {
        coords = { x: 0, y: l.c };
      }
      if (coords) {
        const distanceToRocket = dist(appCenter, rocket.sprite);
        const distanceToEdge = dist(appCenter, coords);
        offScreenIndicator.scale.set(distanceToEdge / (6 * distanceToRocket));
        offScreenIndicator.x = coords.x;
        offScreenIndicator.y = coords.y;
        offScreenIndicator.rotation = a;
      }
    } else {
      offScreenIndicator.visible = false;
    }

    if (outOfBounds(rocket, app.view)) {
      reset();
    }
  });
};
