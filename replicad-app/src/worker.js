import opencascade from "replicad-opencascadejs/src/replicad_single.js";
import opencascadeWasm from "replicad-opencascadejs/src/replicad_single.wasm?url";
import { setOC, getOC, importSTEP } from "replicad";
import { expose } from "comlink";

// We import our model as a simple function
import { drawBox } from "./cad";

// This is the logic to load the web assembly code into replicad
let loaded = false;
const init = async () => {
  if (loaded) return Promise.resolve(true);

  const OC = await opencascade({
    locateFile: () => opencascadeWasm,
  });

  loaded = true;
  setOC(OC);

  return true;
};

const started = init();

async function createBlob(thickness) {
  // note that you might want to do some caching for more complex models
  return started.then(() => {
    return drawBox(thickness).blobSTL();
  });
}

async function createMesh(blob) {
  const sblob = await importSTEP(blob);
  console.timeEnd(this.name);
  return started.then(() => {
    return {
      faces: sblob.mesh(),
      edges: sblob.meshEdges(),
    };
  });
}

async function importSTEP2(blob) {
  let compound = await importSTEP(blob);
  compound = await compound.simplify();
  const blob2 = compound.blobSTEP();
  return started.then(() => {
    return {
      blob: blob2,
    };
  });
}

// comlink is great to expose your functions within the worker as a simple API
// to your app.
expose({ createBlob, createMesh, importSTEP2 });
