// The page: load the cloud, start the endless ceremony, keep the words beside it up to date.
// While the tea is on his lips the page replays a recording of his whole brain tasting that sip: real spikes of the
// model on his real wiring, written by the lab. light() turns them into light, on his lips and in the cloud, and
// nothing else does. Between sips the cloud is dark, because the model has no activity of its own.

import "./view/style.css";
import codecFile from "../../contracts/codec/taste.codec.json";
import { bitterLevel, type Codec } from "./codec/codec";
import { audit } from "./honesty/honesty";
import { readCloud, type CloudInfo } from "./view/cloud";
import { cardBodyHtml, cardHeadHtml, footHtml, legendHtml, lipsHtml, stagedHtml, titleHtml, trackHtml } from "./view/hud";
import { lipLayout } from "./view/lips";
import { Loop, PHASE_SECONDS, type Phase } from "./view/loop";
import { bookAt, type SipLook } from "./view/puppet";
import { quantities, reactionCard } from "./view/reaction";
import { entryFor, Replay, replayAt, stayFor, type RecordingEntry, type RecordingIndex } from "./view/replay";
import { sipAt, type Sip } from "./view/rotation";
import { Stage } from "./view/scene";

const codec: Codec = codecFile;
const SLOWDOWN = 50;                        // his time is shown this many times slower than it runs
const LIGHT_WINDOW_STEPS = 60;              // a spike stays lit for 6 ms of his time, which is 0.3 s on screen
const RETRY_SECONDS = 15;                   // how long a recording that failed to arrive is left alone before it is asked for again
const MAX_BOWL = 0xffffffff;

const element = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

function problem(message: string): void {
  const box = element("problem");
  box.textContent = message;
  box.hidden = false;
  box.onclick = () => (box.hidden = true);
}

/**
 * `?sip=12&phase=taste&at=0.5` opens the page as a still of that moment, so that a shot of it can be taken twice and be the same.
 * The ceremony's clock and the idle clock stand, and he stays at work. Add `&break=1` for the same moment with him on his break,
 * `&staged=1` to open with "What is staged here?" switched on, `&open=lips,legend,title` to unfold panels, `&bare=1` to hide
 * the text, and `&from=x,y,z&at3=x,y,z` to stand somewhere else.
 */
function stillFromAddress(loop: Loop, query: URLSearchParams): { still: boolean; onBreak: boolean; showStaged: boolean } {
  const phase = query.get("phase");
  const running = { still: false, onBreak: false, showStaged: false };
  if (!phase) return running;
  try {
    const bowl = Number(query.get("sip") ?? "1");
    if (bowl - 1 > MAX_BOWL) throw new Error(`no such moment: bowl ${bowl}`);
    loop.seek(bowl - 1, phase as Phase, Number(query.get("at") ?? "0"));
  } catch (error) {
    // a moment that does not exist is not worth a blank page: say so, and let the ceremony run
    problem(`${error instanceof Error ? error.message : error}. The address asks for a still that does not exist, so the ceremony runs from the start. Click to dismiss.`);
    return running;
  }
  return { still: true, onBreak: query.get("break") === "1", showStaged: query.get("staged") === "1" };
}

/** Which panels are unfolded is the viewer's, and is kept between visits where the browser allows it. An address that asks for panels is a visit's, and is not kept. */
function rememberFolds(ids: string[], asked: string | null): void {
  const key = "fly-matcha.folds.2"; // .2: his lips, magnified, became open by default
  let saved: Record<string, boolean> = {};
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) saved = parsed as Record<string, boolean>;
  } catch { /* a private window, or something else's junk under our key: nothing is kept */ }
  for (const id of ids) {
    const panel = element<HTMLDetailsElement>(id);
    if (asked !== null) { panel.open = asked.split(",").includes(id); continue; }
    if (typeof saved[id] === "boolean") panel.open = saved[id];
    panel.addEventListener("toggle", () => {
      saved[id] = panel.open;
      try { localStorage.setItem(key, JSON.stringify(saved)); } catch { /* as above */ }
    });
  }
}

async function start(): Promise<void> {
  const [infoResponse, cloudResponse, indexResponse] = await Promise.all([fetch("/brain.cloud.json"), fetch("/brain.cloud"), fetch("/recordings/index.json")]);
  if (!infoResponse.ok || !cloudResponse.ok) throw new Error("The brain cloud is missing. Build it with: python -m flylab web cloud");
  if (!indexResponse.ok) throw new Error("The recordings are missing. Build them with: python -m flylab web recordings");
  const info: CloudInfo = await infoResponse.json();
  const recordings: RecordingIndex = await indexResponse.json();
  const cloud = readCloud(await cloudResponse.arrayBuffer());
  const query = new URLSearchParams(location.search);

  const reg = quantities();
  const dots = lipLayout(info.mouthparts);
  const stage = new Stage(element<HTMLCanvasElement>("stage"), codec.menu.teas.map((tea) => tea.tier));
  stage.setCloud(cloud, info);
  stage.setLips(dots);

  // Where a recorded spike can land: on a point of the cloud, or on a dot of his lips.
  const cloudIndex = new Map<string, number>();
  for (let i = 0; i < cloud.n; i++) cloudIndex.set(cloud.bodyId[i].toString(), i);
  const lipIndex = new Map(dots.map((dot, i) => [dot.bodyId, i]));
  const readout = new Set(recordings.readout.bodyIds);
  if (recordings.dtMs !== 0.1) throw new Error(`the recordings were made with a step of ${recordings.dtMs} ms, and this page counts his time in steps of 0.1 ms`);
  const stepsPerSecond = 1000 / recordings.dtMs / SLOWDOWN;   // model steps per second on the wall, while the tea is on his lips
  const options = { stepsPerSecond, lightWindowSteps: LIGHT_WINDOW_STEPS, slowdown: SLOWDOWN };
  const entryOf = (sip: Sip): RecordingEntry => entryFor(recordings, sip.sweets, sip.teaId ? bitterLevel(codec, sip.teaId, sip.scoops) : 0);

  // One recording per sip of the grid, fetched when its bowl begins and kept. A recording that has not arrived shows nothing.
  // One that failed is left alone for a while and said once: asking again every frame would be sixty requests a second.
  const fetched = new Map<string, Replay | "coming" | { failedAt: number }>();
  const replayOf = (entry: RecordingEntry): Replay | null => {
    const held = fetched.get(entry.file);
    const again = typeof held === "object" && !(held instanceof Replay) && performance.now() - held.failedAt > RETRY_SECONDS * 1000;
    if (held === undefined || again) {
      fetched.set(entry.file, "coming");
      fetch(`/recordings/${entry.file}`)
        .then((response) => { if (!response.ok) throw new Error(`${entry.file}: ${response.status}`); return response.json(); })
        .then((recording) => {
          if (recording.spikeHash !== entry.spikeHash) throw new Error(`${entry.file} is not the recording the index names`);
          fetched.set(entry.file, new Replay(recording, cloudIndex, lipIndex, readout));
        })
        .catch((error: unknown) => {
          if (!again) problem(`${error instanceof Error ? error.message : String(error)}. That bowl is shown without his brain's response. Click to dismiss.`);
          fetched.set(entry.file, { failedAt: performance.now() });
        });
    }
    return held instanceof Replay ? held : null;
  };

  element("title-body").innerHTML = titleHtml(reg, info);
  element("lips-body").innerHTML = lipsHtml(reg, dots, SLOWDOWN);
  element("legend-body").innerHTML = legendHtml(reg, info);
  element("staged").innerHTML = stagedHtml(reg, reg.ids());
  element("credits").innerHTML = footHtml();
  rememberFolds(["title", "legend", "lips", "card"], query.get("open"));
  const lipCircles = [...element("lips-body").querySelectorAll("circle")];
  const lipLit = new Uint8Array(dots.length);

  // Tasting is never rushed, and how long it lasts is set by what his brain did with the sip: he stays until MN9 has fallen silent.
  const loop = new Loop((sipIndex, phase) => (phase === "taste" ? stayFor(entryOf(sipAt(codec, sipIndex)), stepsPerSecond).seconds : PHASE_SECONDS[phase]));
  const address = stillFromAddress(loop, query);

  // A break is the viewer's wish. The clock stops at once; it starts again only when he is back at his work,
  // so nothing about the tea can happen while he is on his cushion or on his way from it.
  let resting = false;
  const pauseButton = element<HTMLButtonElement>("pause");
  const setResting = (wish: boolean): void => {
    resting = wish;
    if (wish) loop.pause();
    pauseButton.textContent = wish ? "Back to the tea" : "Take a break";
    pauseButton.setAttribute("aria-pressed", String(wish));
  };
  if (address.onBreak) setResting(true);
  pauseButton.addEventListener("click", () => setResting(!resting));

  const bareButton = element<HTMLButtonElement>("bare");
  const setBare = (bare: boolean): void => {
    document.body.classList.toggle("bare", bare);
    bareButton.textContent = bare ? "Show text" : "Hide text";
    bareButton.setAttribute("aria-pressed", String(bare));
  };
  bareButton.addEventListener("click", () => setBare(!document.body.classList.contains("bare")));
  if (query.get("bare") === "1") setBare(true);

  const whatButton = element<HTMLButtonElement>("what");
  whatButton.addEventListener("click", () => {
    const on = whatButton.getAttribute("aria-pressed") !== "true";
    whatButton.setAttribute("aria-pressed", String(on));
    element("staged").hidden = !on;
    document.body.classList.toggle("show-staged", on);
    stage.showStaged(on);
  });
  if (address.showStaged) whatButton.click();

  // Space belongs to a focused control; anywhere else it calls the break. A button clicked with the mouse gives focus back.
  window.addEventListener("keydown", (event) => {
    if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.code === "Space" || event.key === " ") {
      if (event.target instanceof Element && event.target.closest("button, summary, a[href], input, select, textarea")) return;
      event.preventDefault();
      setResting(!resting);
    } else if (event.key === "h" || event.key === "H") setBare(!document.body.classList.contains("bare"));
  });
  document.addEventListener("click", (event) => {
    if (event.detail > 0 && event.target instanceof HTMLElement) event.target.closest("button")?.blur();
  });

  let moreOpen = false; // the folded half of the card is rewritten with the card, so its state is kept here
  element("card-body").addEventListener("toggle", (event) => {
    if (event.target instanceof HTMLDetailsElement) moreOpen = event.target.open;
  }, true);

  const resize = (): void => stage.resize(window.innerWidth, window.innerHeight);
  window.addEventListener("resize", resize);
  resize();

  const lookOf = (sip: Sip): SipLook => ({
    teaIndex: sip.teaId ? codec.menu.teas.findIndex((tea) => tea.id === sip.teaId) : null,
    scoops: sip.scoops,
    sweets: sip.sweets,
    bitterLevel: sip.teaId ? bitterLevel(codec, sip.teaId, sip.scoops) : 0,
  });

  const three = (text: string | null): [number, number, number] | null => {
    const numbers = (text ?? "").split(",").map(Number);
    return numbers.length === 3 && numbers.every(Number.isFinite) ? [numbers[0], numbers[1], numbers[2]] : null;
  };
  const [from, lookAt] = [three(query.get("from")), three(query.get("at3"))];
  if (from && lookAt) stage.lookFrom(from, lookAt);

  // a still opens with everyone already in place, not on the way there
  if (address.still) stage.settle(loop.state(), lookOf(sipAt(codec, loop.state().sipIndex)), bookAt(loop.state().sipIndex), resting);

  const pins = { brain: element("pin-brain"), cord: element("pin-cord") };
  let shownReplay: Replay | null = null;
  let shownMoment = "";
  let shownCount = "";
  let last = performance.now();
  const draw = (now: number): void => {
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000)); // a frame's timestamp can lie before the clock that was read first
    last = now;
    if (!resting && loop.state().paused && stage.atWork) loop.resume();
    const state = address.still ? loop.state() : loop.tick(dt);
    const sip = sipAt(codec, state.sipIndex);
    const book = bookAt(state.sipIndex);
    const replay = replayOf(entryOf(sip));
    replayOf(entryOf(sipAt(codec, state.sipIndex + 1)));   // the next bowl's recording, ahead of time
    if (replay !== shownReplay) { stage.setActive(replay ? replay.participants : [], replay ? replay.readoutPlaces : []); shownReplay = replay; }
    const { replayed, cloud: cloudGlow, lips: glow } = replayAt(state, replay, dots.length, recordings.pilot, options);
    stage.applyActiveLight(cloudGlow);
    stage.applyLipLight(glow);
    glow.forEach((value, i) => {
      const lit = value > 0 ? 1 : 0;
      if (lit !== lipLit[i]) { lipLit[i] = lit; lipCircles[i].classList.toggle("lit", lit === 1); }
    });
    stage.draw(state, lookOf(sip), book, dt, resting, address.still);

    const at = stage.pins();
    for (const name of ["brain", "cord"] as const) {
      pins[name].style.left = `${at[name].x}px`;
      pins[name].style.top = `${at[name].y}px`;
      pins[name].hidden = !at[name].visible;
    }

    // The card is rewritten when the moment changes. While spikes are being counted only the line that counts them is.
    const away = resting ? "break" : state.paused ? "returning" : "work";
    const waiting = state.phase === "taste" && !replay;
    const moment = `${state.sipIndex}/${state.phase}/${away}/${replayed ? replayed.touching : "-"}/${waiting}`;
    const count = replayed ? `${Math.floor(replayed.steps / 40)}` : "";
    if (moment !== shownMoment || count !== shownCount) {
      const card = reactionCard(reg, codec, info, { sip, phase: state.phase, phaseSeconds: state.phaseSeconds, stay: stayFor(entryOf(sip), stepsPerSecond), away: away === "work" ? null : { book, returning: away === "returning" }, replayed, waiting });
      if (moment !== shownMoment) {
        element("track").innerHTML = trackHtml(reg, state);
        element("card-head").innerHTML = cardHeadHtml(card);
        element("card-body").innerHTML = cardBodyHtml(card, moreOpen);
      } else {
        element("card-did").innerHTML = card.lines[2].html;
      }
      shownMoment = moment;
      shownCount = count;
      if (import.meta.env.DEV) {
        const problems = audit(element("hud").innerHTML, reg);
        if (problems.length) problem(`Untagged on this page: ${problems.join("; ")}`);
      }
    }
  };
  const frame = (now: number): void => {
    try {
      draw(now);
    } catch (error) {
      // a frame that threw once will throw again: say so once, and stop
      problem(`${error instanceof Error ? error.message : String(error)}. The ceremony has stopped; reload the page.`);
      return;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

start().catch((error: unknown) => problem(error instanceof Error ? error.message : String(error)));
