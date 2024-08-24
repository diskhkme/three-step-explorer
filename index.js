import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ViewHelper } from "three/examples/jsm/helpers/ViewHelper.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import GUI from "lil-gui";

let camera, scene, renderer;
let test_model;

const clearButton = document.getElementById("clear");
clearButton.textContent = "Clear";
clearButton.addEventListener("click", function () {
  localStorage.clear();
  objectList.innerHTML = "";
  console.log("Local storage cleared and list reset.");
});

// Load files from local storage on page load
window.addEventListener("load", function () {
  const objectList = document.getElementById("objectList");
  const existingNames = JSON.parse(localStorage.getItem("fileNames")) || {};

  for (const fileName in existingNames) {
    const listItem = document.createElement("li");
    listItem.textContent = fileName;
    objectList.appendChild(listItem);
  }
});

// Canvas
const canvas = document.getElementById("canvas");
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(
  75,
  canvas.clientWidth / canvas.clientHeight,
  0.1,
  10000
);
camera.position.set(500, 1500, 500);
camera.lookAt(0, 0, 0);
renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.autoClear = false;
renderer.setSize(canvas.clientWidth, canvas.clientHeight);

/**
 * Debug
 */
const gui = new GUI();

// Add OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
controls.dampingFactor = 0.25;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;

// Add a grid plane
const gridHelper = new THREE.GridHelper(2000, 20, 0x333333, 0x222222);
scene.add(gridHelper);

// Add a axis helper
const axesHelper = new THREE.AxesHelper(1000);
scene.add(axesHelper);

// clock
const clock = new THREE.Clock();

/**
 * Gizmo
 */
// helper
const clientRect = canvas.getClientRects()[0];
const helper = new ViewHelper(camera, renderer.domElement);
helper.controls = controls;
helper.controls.center = controls.target;

const helperSize = 128;
const gizmo = document.getElementById("gizmo");
gizmo.style.position = "absolute";
gizmo.style.height = `${helperSize}px`;
gizmo.style.width = `${helperSize}px`;
gizmo.style.top = `${clientRect.bottom - helperSize}px`;
gizmo.style.left = `${clientRect.right - helperSize}px`;
gizmo.style.right = `${clientRect.right}px`;
gizmo.style.bottom = `${clientRect.bottom}px`;
gizmo.style.backgroundColor = "0x333333";
gizmo.style.opacity = "0.4";
gizmo.style.borderRadius = "50%";

helper.setLabels("X", "Y", "Z");
document.body.appendChild(gizmo);
console.log(helper);
gizmo.addEventListener("pointerup", (event) => {
  helper.handleClick(event);
});

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  if (helper.animating) helper.update(delta);
  renderer.clear();
  renderer.render(scene, camera);
  helper.render(renderer);
}

animate();

// local storage
// TODO: 중복된 이름이 파일 목록에 이미 존재하면 (1), (2), ... 과 같이 파일 이름에 번호를 추가하여 목록에 추가
document
  .getElementById("fileInput")
  .addEventListener("change", function (event) {
    const fileList = event.target.files;
    const objectList = document.getElementById("objectList");
    const existingNames = JSON.parse(localStorage.getItem("fileNames")) || {};

    for (let i = 0; i < fileList.length; i++) {
      let fileName = fileList[i].name;
      if (existingNames[fileName]) {
        let count = existingNames[fileName];
        fileName = `${fileName} (${count})`;
        existingNames[fileList[i].name] = count + 1;
      } else {
        existingNames[fileList[i].name] = 1;
      }

      const listItem = document.createElement("li");
      listItem.textContent = fileName;

      // Create add and remove buttons
      const addButton = document.createElement("button");
      addButton.textContent = "Add";
      addButton.addEventListener("click", function () {
        occtimportjs().then(async function (occt) {
          console.log(occt);
        });
      });

      const removeButton = document.createElement("button");
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", function () {
        // Remove item from list and local storage
        objectList.removeChild(listItem);
        localStorage.removeItem(fileName);
        delete existingNames[fileName];
        localStorage.setItem("fileNames", JSON.stringify(existingNames));
        console.log(scene);
      });

      listItem.appendChild(addButton);
      listItem.appendChild(removeButton);
      objectList.appendChild(listItem);

      // Save file to local storage
      const reader = new FileReader();
      reader.onload = function (e) {
        const base64String = btoa(
          String.fromCharCode(...new Uint8Array(e.target.result))
        );
        localStorage.setItem(fileName, base64String);
        // localStorage.setItem(fileName, e.target.result);
      };
      reader.readAsArrayBuffer(fileList[i]);
    }

    localStorage.setItem("fileNames", JSON.stringify(existingNames));
  });
