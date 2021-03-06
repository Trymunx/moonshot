import * as PIXI from "pixi.js";
import { runGame } from "./game";

const textures = {};
const loader = new PIXI.Loader();
loader.add("moon", "moon.png")
  .add("rocket", "rocket.png")
  .add("earth", "earth.png")
  .add("arrow", "arrow.png")
  .add("speedometer", "speedometer.png")
  .add("speedometer_arrow", "speedometer_arrow.png")
  .add("crash", "crash.png")
  .add("impact02", "impact02.png")
  .add("asteroid01", "asteroid01.png")
  .add("asteroid02", "asteroid02.png");

loader.load((_, resources) => {
  for (const res in resources) {
    textures[res] = resources[res].texture;
  }
});

loader.onComplete.add(() => runGame(textures));

