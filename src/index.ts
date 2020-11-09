import * as PIXI from "pixi.js";
import { runGame } from "./game";

const textures = {};
const loader = new PIXI.Loader();
loader.add("moon", "moon.png")
  .add("rocket", "rocket.png")
  .add("crash", "crash.png");

loader.load((_, resources) => {
  for (const res in resources) {
    textures[res] = resources[res].texture;
  }
});

loader.onComplete.add(() => runGame(textures));

