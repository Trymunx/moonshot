import * as PIXI from "pixi.js";
import { CrashInstance, CrashProps, PhysicalBody, PhysicalBodyOptions } from "./types";

const AIR_RESISTANCE = 0.05;
const RESISTANCE = 0.5;
const GRAVITY = 0.1;
const GRAVITY_RADIUS = 5;
const AIR_RESISTANCE_RADIUS = 2.5;
const LANDING_RADIUS = 1;
const LANDING_VELOCITY = 1;
const DRAG_MODIFIER = 0.05;

const newPhysicalBody = ({
  anchor,
  buttonMode = false,
  initialPosition = new PIXI.Point(),
  interactive = false,
  rotation = Math.PI * 2,
  scale,
  texture,
  velocity = new PIXI.Point(),
}: PhysicalBodyOptions): PhysicalBody => {
  const sprite = new PIXI.Sprite(texture);
  sprite.anchor.set(anchor.x || 0, anchor.y);
  sprite.buttonMode = buttonMode;
  sprite.interactive = interactive;
  sprite.rotation = rotation;
  sprite.scale.set(scale.x || 1, scale.y || 1);
  sprite.x = initialPosition.x;
  sprite.y = initialPosition.y;
  return {
    initialPosition,
    radius: Math.min(sprite.width, sprite.height) / 2,
    sprite,
    velocity,
  };
};

const textures = {};
const loader = new PIXI.Loader();
loader.add("moon", "moon.png")
  .add("spaceship", "spaceship.png")
  .add("crash", "crash.png");

loader.load((_, resources) => {
  for (const res in resources) {
    textures[res] = resources[res].texture;
  }
});

loader.onComplete.add(() => {
  const app = new PIXI.Application({
    antialias: true,
    backgroundColor: 0x222222,
    // height: window.innerHeight,
    resolution: 1,
    transparent: false,
    width: window.innerWidth,
  });

  app.renderer.autoDensity = true;
  document.body.appendChild(app.view);

  const updateVelocity = (body: PhysicalBody, x: number, y = x) => {
    body.velocity.set(x, y);
  };

  const reset = (body: PhysicalBody) => {
    body.sprite.x = body.initialPosition.x;
    body.sprite.y = body.initialPosition.y;
    updateVelocity(body, 0, 0);
    body.sprite.rotation = Math.PI * 2;
  };

  const moon: PhysicalBody = newPhysicalBody({
    anchor: new PIXI.Point(0.5, 0.5),
    initialPosition: new PIXI.Point(app.view.width / 2, app.view.height / 2),
    scale: new PIXI.Point(0.6, 0.65),
    texture: textures["moon"],
  });

  const spaceship: PhysicalBody = newPhysicalBody({
    anchor: new PIXI.Point(0.5),
    buttonMode: true,
    initialPosition: new PIXI.Point(0.1 * app.view.width, 0.9 * app.view.height),
    interactive: true,
    scale: new PIXI.Point(0.3, 0.3),
    texture: textures["spaceship"],
    velocity: new PIXI.Point(0),
  });
  reset(spaceship);

  spaceship.sprite.on("pointerdown", onDragStart)
    .on("pointerup", onDragEnd)
    .on("pointerupoutside", onDragEnd)
    .on("pointermove", onDragMove);

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

  // Add sprites to stage
  app.stage.addChild(moon.sprite, spaceship.sprite);


  interface IDraggingData {
    start?: {x: number, y: number};
  }

  const draggingData: IDraggingData = {};

  app.stage.interactive = true;
  app.stage.hitArea = new PIXI.Rectangle(0, 0, app.view.width, app.view.height);
  app.stage.on("pointerdown", (e: PIXI.InteractionEvent) => {
    // console.log(e.data.global);
    const { x, y } = e.data.global;
    draggingData.start = { x, y };
  });
  app.stage.on("pointerup", (e: PIXI.InteractionEvent) => {
    // console.log(e.data.global);
    // console.log(draggingData.start);
    const distance = Math.min(200, dist(draggingData.start, e.data.global));
    const angle = angleToPoint(draggingData.start, e.data.global);
    updateVelocity(
      spaceship,
      Math.cos(angle) * DRAG_MODIFIER * distance,
      Math.sin(angle) * DRAG_MODIFIER * distance,
    );
    spaceship.sprite.rotation =
      Math.PI / 2 + Math.atan2(spaceship.velocity.y, spaceship.velocity.x);
    // console.log(distance, angle);
  });


  // ---------------------------
  //

  function onDragEnd() {
    this.alpha = 1;
    this.dragging = false;
    this.data = null;
  }

  function onDragMove() {
    if (this.dragging) {
      const newPos = this.data.getLocalPosition(this.parent);
      this.x = newPos.x;
      this.y = newPos.y;
    }
  }

  function onDragStart(e: PIXI.InteractionEvent) {
    this.data = e.data;
    this.alpha = 0.5;
    this.dragging = true;
  }

  const isInBounds = (body: PhysicalBody) => {
    const sb = body.sprite.getBounds();
    const width = app.view.width;
    const height = app.view.height;
    return sb.x > 0 && sb.x + sb.width < width && sb.y > 0 && sb.y + sb.height < height;
  };

  interface IPoint {
    x: number;
    y: number;
  }

  const dist = (p1: IPoint, p2: IPoint) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

  const angleToPoint = (p1: IPoint, p2: IPoint) => Math.atan2(p1.y - p2.y, p1.x - p2.x);

  const distToSurface = (b1: PhysicalBody, b2: PhysicalBody) =>
    dist(b1.sprite, b2.sprite) - (b1.radius + b2.radius);

  // console.log(spaceship.sprite.getBounds());
  // console.log(
  //   spaceship.sprite.x,
  //   spaceship.sprite.getBounds().x,
  //   spaceship.sprite.y,
  //   spaceship.sprite.getBounds().y
  // );
  // console.log(app.view.width, app.view.height);
  // console.log(isInBounds(spaceship));

  // const averageAngle = (a: number, b: number) => Math.atan2(
  //   (Math.sin(a) + Math.sin(b)) / 2,
  //   (Math.cos(a) + Math.cos(b)) / 2,
  // );

  app.ticker.add(delta => {
    // moon.sprite.rotation -= 0.01;
    const distance = distToSurface(moon, spaceship);

    for (let i = crashes.length; i >= 0; i--) {
      const crash = crashes[i];
      if (crash === undefined) {
        continue;
      }
      if (crash.duration < 0) {
        crashes.splice(i, 1);
        app.stage.removeChild(crash.sprite);
      } else {
        crash.sprite.scale.set(Math.min(crash.sprite.scale.x + 0.1, 2));
        crash.sprite.alpha -= 0.01;
        crash.duration -= delta;
      }
    }

    const speed = Math.abs(Math.hypot(spaceship.velocity.x, spaceship.velocity.y));

    if (distance <= 0 && speed > 8) {
      const { x, y } = spaceship.sprite;
      addCrash({ duration: 100, x, y });
      spaceship.sprite.visible = false;
      updateVelocity(spaceship, 0);
    } else if (distance <= 0) {
      spaceship.sprite.anchor.set(0.5, 0.75);
      updateVelocity(spaceship, 0);
      spaceship.sprite.rotation = Math.PI / 2 + angleToPoint(spaceship.sprite, moon.sprite);
    } else if (distance < moon.radius * LANDING_RADIUS) {
      spaceship.sprite.anchor.set(0.5, 0.75);
      const landingSpeed = Math.abs(Math.hypot(
        LANDING_VELOCITY * -Math.cos(angleToPoint(spaceship.sprite, moon.sprite)),
        LANDING_VELOCITY * -Math.sin(angleToPoint(spaceship.sprite, moon.sprite)),
      ));

      if (speed > landingSpeed) {
        updateVelocity(
          spaceship,
          spaceship.velocity.x * (1 - AIR_RESISTANCE),
          spaceship.velocity.y * (1 - AIR_RESISTANCE),
        );
        // const velAngle = Math.atan2(spaceship.velocity.y, spaceship.velocity.x);
        // console.log("vel", velAngle);
        // spaceship.sprite.rotation = Math.PI / 2 + velAngle;
      } else {
        // spaceship.sprite.anchor.set(0.5, 0.8);
        updateVelocity(
          spaceship,
          LANDING_VELOCITY * -Math.cos(angleToPoint(spaceship.sprite, moon.sprite)),
          LANDING_VELOCITY * -Math.sin(angleToPoint(spaceship.sprite, moon.sprite))
        );
        // spaceship.sprite.rotation = Math.PI / 2 + angleToPoint(spaceship.sprite, moon.sprite);
        // console.log("landing", Math.atan2(spaceship.velocity.y, spaceship.velocity.x));
        spaceship.sprite.rotation = Math.PI / 2 + angleToPoint(spaceship.sprite, moon.sprite);
        // averageAngle(
        //   angleToPoint(spaceship.sprite, moon.sprite),
        //   Math.atan2(spaceship.velocity.y, spaceship.velocity.x),
        // );
      }

    } else if (distance < moon.sprite.width * AIR_RESISTANCE_RADIUS) {
      // spaceship.sprite.anchor.set(0.5);
      updateVelocity(
        spaceship,
        spaceship.velocity.x * (1 - AIR_RESISTANCE)
        + (1 - RESISTANCE) * -Math.cos(angleToPoint(spaceship.sprite, moon.sprite)),
        spaceship.velocity.y * (1 - AIR_RESISTANCE)
        + (1 - RESISTANCE) * -Math.sin(angleToPoint(spaceship.sprite, moon.sprite)),
      );

      spaceship.sprite.rotation =
        Math.PI / 2 + Math.atan2(spaceship.velocity.y, spaceship.velocity.x);
    } else if (distance < moon.sprite.width * GRAVITY_RADIUS) {
      spaceship.velocity.set(
        spaceship.velocity.x + (1 - RESISTANCE)
        * -Math.cos(angleToPoint(spaceship.sprite, moon.sprite)),
        spaceship.velocity.y + (1 - RESISTANCE)
        * -Math.sin(angleToPoint(spaceship.sprite, moon.sprite)),
      );

      spaceship.sprite.rotation =
        Math.PI / 2 + Math.atan2(spaceship.velocity.y, spaceship.velocity.x);

      spaceship.sprite.x +=
        spaceship.velocity.x * delta / (Math.max(10, distToSurface(moon, spaceship)) * GRAVITY);
      spaceship.sprite.y +=
        spaceship.velocity.y * delta / (Math.max(10, distToSurface(moon, spaceship)) * GRAVITY);
    }

    spaceship.sprite.x += spaceship.velocity.x * delta;
    spaceship.sprite.y += spaceship.velocity.y * delta;

    // if (!isInBounds(spaceship)) {
    //   reset(spaceship);
    // }

  });
});

