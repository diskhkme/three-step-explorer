import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ViewHelper } from "three/examples/jsm/helpers/ViewHelper.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import GUI from "lil-gui";

let camera, scene, renderer;
let faceId = 0;

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
const ambientLight = new THREE.AmbientLight(0x808040); // soft white light
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.setY(1000);
scene.add(directionalLight);

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
// scene.add(gridHelper);

// Add a axis helper
const axesHelper = new THREE.AxesHelper(1000);
// scene.add(axesHelper);

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
const occt = await occtimportjs();

const objectList = document.getElementById("objectList"); // Move this declaration outside
const addedObjects = []; // 추가된 객체를 저장할 배열

document
  .getElementById("fileInput")
  .addEventListener("change", function (event) {
    const fileList = event.target.files;
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
        const resultString = localStorage.getItem(fileName);
        const result = JSON.parse(resultString);
        console.log(result);
        for (let resultMesh of result.meshes) {
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(
              resultMesh.attributes.position.array,
              3
            )
          );
          if (resultMesh.attributes.normal) {
            geometry.setAttribute(
              "normal",
              new THREE.Float32BufferAttribute(
                resultMesh.attributes.normal.array,
                3
              )
            );
          }

          if (resultMesh.index) {
            geometry.setIndex(
              new THREE.Uint32BufferAttribute(resultMesh.index.array, 1)
            );
          }
          geometry.clearGroups();
          for (let brepFace of resultMesh.brep_faces) {
            geometry.addGroup(
              brepFace.first * 3,
              (brepFace.last - brepFace.first + 1) * 3,
              0
            );
          }

          let geometries = separateGroups(geometry);
          geometry.dispose();
          console.log(geometries);
          for (let geometry of geometries) {
            const material = new THREE.MeshStandardMaterial({
              color: 0xffffff * Math.random(),
              roughness: 0.5,
              metalness: 0.1,
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.userData.faceId = faceId;
            faceId += 1;
            scene.add(mesh);
            const edges = new THREE.EdgesGeometry(geometry);
            const line = new THREE.LineSegments(
              edges,
              new THREE.LineBasicMaterial({ color: 0xffffff * Math.random() })
            );
            console.log(line);
            scene.add(line);
          }
          updateObjectList(); // 객체 리스트 업데이트
        }
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
        const index = addedObjects.indexOf(mesh);
        if (index > -1) {
          addedObjects.splice(index, 1); // 배열에서 객체 제거
        }
        updateObjectList(); // 객체 리스트 업데이트
      });

      listItem.appendChild(addButton);
      listItem.appendChild(removeButton);
      objectList.appendChild(listItem);

      // Save file to local storage
      const reader = new FileReader();
      reader.onload = function (e) {
        let fileBuffer = new Uint8Array(e.target.result);
        let result = occt.ReadStepFile(fileBuffer, null);
        console.log(result);
        localStorage.setItem(fileName, JSON.stringify(result));
      };
      reader.readAsArrayBuffer(fileList[i]);
    }

    localStorage.setItem("fileNames", JSON.stringify(existingNames));
  });

// 객체 리스트를 업데이트하는 함수
function updateObjectList() {
  const objectListElement = document.getElementById("sceneObjectList");
  objectListElement.innerHTML = ""; // 기존 리스트 초기화
  addedObjects.forEach((object, index) => {
    const listItem = document.createElement("li");
    listItem.textContent = object.name;

    // Create select button
    const selectButton = document.createElement("button");
    selectButton.textContent = "Select";
    selectButton.addEventListener("click", function () {
      console.log(`Selected: ${fileName}`);
    });

    // Create remove button
    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", function () {
      console.log(`Removed: ${object.name}`);
      // updateObjectList(); // 객체 리스트 업데이트
    });

    listItem.appendChild(selectButton); // select 버튼 추가
    listItem.appendChild(removeButton); // remove 버튼 추가
    objectListElement.appendChild(listItem);
  });
}

// Add this code after initializing the renderer
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Add event listener for mouse movement
canvas.addEventListener("click", (event) => {
  // Calculate mouse position in normalized device coordinates (-1 to +1)
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;
  console.log("Mouse position:", mouse);

  // Update the raycaster with the camera and mouse position
  raycaster.setFromCamera(mouse, camera);

  // Calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    const intersectedObject = intersects[0].object;
    console.log("Intersected object:", intersectedObject);

    if (
      intersectedObject.userData &&
      intersectedObject.userData.faceId !== undefined
    ) {
      console.log("FaceID:", intersectedObject.userData.faceId);
    } else {
      console.log("FaceID not found in userData");
    }

    // Optional: Highlight the intersected object
    intersectedObject.material.emissive.setHex(0xff0000);
    setTimeout(() => {
      intersectedObject.material.emissive.setHex(0x000000);
    }, 200);
  } else {
    console.log("No intersection detected");
  }
});

function separateGroups(bufGeom) {
  let outGeometries = [];
  let groups = bufGeom.groups;
  let origVerts = bufGeom.getAttribute("position").array;
  let origNormals = bufGeom.getAttribute("normal").array;
  let origIndices = bufGeom.index ? bufGeom.index.array : null;

  for (let ig = 0, ng = groups.length; ig < ng; ig++) {
    let group = groups[ig];
    let newBufGeom = new THREE.BufferGeometry();
    let newPositions = [];
    let newNormals = [];
    let newIndices = [];
    let vertexMap = new Map();

    for (let i = 0; i < group.count; i++) {
      let index = origIndices ? origIndices[group.start + i] : group.start + i;
      let newIndex;

      if (vertexMap.has(index)) {
        newIndex = vertexMap.get(index);
      } else {
        newIndex = newPositions.length / 3;
        vertexMap.set(index, newIndex);

        newPositions.push(
          origVerts[index * 3],
          origVerts[index * 3 + 1],
          origVerts[index * 3 + 2]
        );
        newNormals.push(
          origNormals[index * 3],
          origNormals[index * 3 + 1],
          origNormals[index * 3 + 2]
        );
      }

      newIndices.push(newIndex);
    }

    newBufGeom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(newPositions, 3)
    );
    newBufGeom.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(newNormals, 3)
    );
    newBufGeom.setIndex(newIndices);
    outGeometries.push(newBufGeom);
  }
  return outGeometries;
}

// For Debug
// Create a circular pointer element
const pointer = document.createElement("div");
pointer.style.position = "absolute";
pointer.style.width = "20px";
pointer.style.height = "20px";
pointer.style.borderRadius = "50%";
pointer.style.backgroundColor = "rgba(255, 0, 0, 0.5)";
pointer.style.pointerEvents = "none";
pointer.style.transform = "translate(-50%, -50%)"; // Center the pointer
document.body.appendChild(pointer);

// Update pointer position on mouse move
window.addEventListener("mousemove", (event) => {
  pointer.style.left = `${event.clientX}px`;
  pointer.style.top = `${event.clientY}px`;
});

// Hide pointer when mouse leaves canvas
canvas.addEventListener("mouseleave", () => {
  pointer.style.display = "none";
});

// Show pointer when mouse enters canvas
canvas.addEventListener("mouseenter", () => {
  pointer.style.display = "block";
});
