// The page: load the cloud, start the endless ceremony, keep the words beside it up to date.
// There is no recording in this slice, so light() returns zeros and the stage stays dark. That is the point of it.

import "./view/style.css";
import codecFile from "../../contracts/codec/taste.codec.json";
import { bitterLevel, type Codec } from "./codec/codec";
import { audit } from "./honesty/honesty";
import { readCloud, type CloudInfo } from "./view/cloud";
import { cardHtml, footHtml, legendHtml, lipsHtml, stagedHtml, titleHtml, trackHtml } from "./view/hud";
import { light, type Recording } from "./view/light";
import { lipLayout } from "./view/lips";
import { Loop } from "./view/loop";
import { quantities, reactionCard } from "./view/reaction";
import { sipAt } from "./view/rotation";
import type { SipLook } from "./view/puppet";
import { Stage } from "./view/scene";

const codec: Codec = codecFile;
const LIGHT_WINDOW_STEPS = 500; // 50 ms of model time, once there is any

const element = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

function problem(message: string): void {
  const box = element("problem");
  box.textContent = message;
  box.hidden = false;
}

async function start(): Promise<void> {
  const [infoResponse, cloudResponse] = await Promise.all([fetch("/brain.cloud.json"), fetch("/brain.cloud")]);
  if (!infoResponse.ok || !cloudResponse.ok) throw new Error("The brain cloud is missing. Build it with: python -m flylab web cloud");
  const info: CloudInfo = await infoResponse.json();
  const cloud = readCloud(await cloudResponse.arrayBuffer());

  const reg = quantities();
  const dots = lipLayout(info.mouthparts);
  const stage = new Stage(element<HTMLCanvasElement>("stage"), codec.menu.teas.map((tea) => tea.tier));
  stage.setCloud(cloud, info);
  stage.setLips(dots);

  // The one road from spikes to light. No recording exists yet, so both calls hand back zeros.
  const recording: Recording | null = null;
  const cloudIndex = new Map<string, number>();
  for (let i = 0; i < cloud.n; i++) cloudIndex.set(cloud.bodyId[i].toString(), i);
  const lipIndex = new Map(dots.map((dot, i) => [dot.bodyId, i]));
  stage.applyLight(light(cloud.n, cloudIndex, recording, 0, LIGHT_WINDOW_STEPS));
  stage.applyLipLight(light(dots.length, lipIndex, recording, 0, LIGHT_WINDOW_STEPS));

  element("title").innerHTML = titleHtml(reg, info);
  element("lips").innerHTML = lipsHtml(reg, dots);
  element("legend").innerHTML = legendHtml(reg, info);
  element("staged").innerHTML = stagedHtml(reg, reg.ids());
  element("credits").innerHTML = footHtml();

  const loop = new Loop();
  const pauseButton = element<HTMLButtonElement>("pause");
  const setPaused = (paused: boolean): void => {
    if (paused) loop.pause(); else loop.resume();
    pauseButton.textContent = paused ? "Resume" : "Pause";
    pauseButton.setAttribute("aria-pressed", String(paused));
  };
  pauseButton.addEventListener("click", () => { setPaused(!loop.state().paused); pauseButton.blur(); });
  window.addEventListener("keydown", (event) => {
    if (event.code !== "Space" || event.repeat) return;
    event.preventDefault();
    setPaused(!loop.state().paused);
  });

  const whatButton = element<HTMLButtonElement>("what");
  whatButton.addEventListener("click", () => {
    const on = whatButton.getAttribute("aria-pressed") !== "true";
    whatButton.setAttribute("aria-pressed", String(on));
    element("staged").hidden = !on;
    document.body.classList.toggle("show-staged", on);
    stage.showStaged(on);
    whatButton.blur();
  });

  const resize = (): void => stage.resize(window.innerWidth, window.innerHeight);
  window.addEventListener("resize", resize);
  resize();

  let shown = "";
  let last = performance.now();
  const frame = (now: number): void => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const state = loop.tick(dt);
    const sip = sipAt(codec, state.sipIndex);
    const look: SipLook = {
      teaIndex: sip.teaId ? codec.menu.teas.findIndex((tea) => tea.id === sip.teaId) : null,
      scoops: sip.scoops,
      sweets: sip.sweets,
      bitterLevel: sip.teaId ? bitterLevel(codec, sip.teaId, sip.scoops) : 0,
    };
    stage.draw(state, look, dt);
    const key = `${state.sipIndex}/${state.phase}`;
    if (key !== shown) {
      shown = key;
      element("track").innerHTML = trackHtml(reg, state);
      element("card").innerHTML = cardHtml(reactionCard(reg, codec, info, sip, state.phase, recording));
      if (import.meta.env.DEV) {
        const problems = audit(element("hud").innerHTML, reg);
        if (problems.length) problem(`Untagged on this page: ${problems.join("; ")}`);
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

start().catch((error: unknown) => problem(error instanceof Error ? error.message : String(error)));
