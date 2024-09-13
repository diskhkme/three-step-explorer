import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ViewHelper } from "three/examples/jsm/helpers/ViewHelper.js";
// import GUI from "lil-gui";
import { TransformControls } from "three/examples/jsm/Addons.js";
import { SUBTRACTION, Brush, Evaluator } from "three-bvh-csg";

let camera, scene, renderer;
let faceId = 0;
let partId = 1;

/// Define brushA and brushB
let brushA, brushB;
let isSelectingA = false; // Flag for brushA selection
let isSelectingB = false; // Flag for brushB selection
let isSelectedA = false;
let isSelectedB = false;

let cornerSpheres = [];
let lastHighlightedObject = null;
let selectedObjects = [];
const ignoredTypes = [
  "TransformControls",
  "GridHelper",
  "AxesHelper",
  "TransformControlsPlane",
];

let isMouseDown = false;
let mouseDownTime = 0;
const dragThreshold = 200; // 드래그로 간주할 시간 임계값 (밀리초)
let currentTransform = null;

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
    const listItem = createListItem(fileName);
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

// camera = new THREE.PerspectiveCamera(
//   75,
//   canvas.clientWidth / canvas.clientHeight,
//   0.1,
//   10000
// );
camera = new THREE.OrthographicCamera(
  canvas.clientWidth / -2,
  canvas.clientWidth / 2, // left, right
  canvas.clientHeight / 2,
  canvas.clientHeight / -2, // top, bottom
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
// const gui = new GUI();

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

const transformControls = new TransformControls(camera, renderer.domElement);

window.addEventListener("keydown", function (event) {
  console.log(event.key);
  switch (event.key) {
    case "r": // R 키로 회전 모드 설정
      transformControls.setMode("rotate");
      console.log("TransformControls mode set to rotate");
      break;
    case "t": // T 키로 이동 모드 설정
      transformControls.setMode("translate");
      console.log("TransformControls mode set to translate");
      break;
    case "s": // S 키로 스케일 모드 설정
      transformControls.setMode("scale");
      console.log("TransformControls mode set to scale");
      break;
    default:
      break;
  }
});
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
const occt = await occtimportjs();

const objectList = document.getElementById("objectList"); // Move this declaration outside
const addedObjects = []; // 추가된 객체를 저장할 배열

document
  .getElementById("fileInput")
  .addEventListener("change", handleFileInput);

function handleFileInput(event) {
  const fileList = event.target.files;
  const existingNames = JSON.parse(localStorage.getItem("fileNames")) || {};

  for (let i = 0; i < fileList.length; i++) {
    processFile(fileList[i], existingNames);
  }

  localStorage.setItem("fileNames", JSON.stringify(existingNames));
}

function processFile(file, existingNames) {
  let fileName = getUniqueFileName(file.name, existingNames);
  const listItem = createListItem(fileName);
  objectList.appendChild(listItem);

  const reader = new FileReader();
  reader.onload = (e) => {
    let fileBuffer = new Uint8Array(e.target.result);
    let result = occt.ReadStepFile(fileBuffer, null);
    localStorage.setItem(fileName, JSON.stringify(result));
  };
  reader.readAsArrayBuffer(file);
}

function getUniqueFileName(originalName, existingNames) {
  if (existingNames[originalName]) {
    let count = existingNames[originalName];
    existingNames[originalName] = count + 1;
    return `${originalName} (${count})`;
  } else {
    existingNames[originalName] = 1;
    return originalName;
  }
}

function createListItem(fileName) {
  const listItem = document.createElement("li");
  listItem.textContent = fileName;

  const addButton = createButton("Add", () => addModelToScene(fileName));
  const removeButton = createButton("Remove", () =>
    removeModelFromStorage(fileName, listItem)
  );

  listItem.appendChild(addButton);
  listItem.appendChild(removeButton);
  return listItem;
}

function createButton(text, onClick) {
  const button = document.createElement("button");
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}
function addModelToScene(fileName) {
  const resultString = localStorage.getItem(fileName);
  const result = JSON.parse(resultString);

  const rootObject = new THREE.Object3D();
  rootObject.name = fileName;
  scene.add(rootObject);

  const parts = new THREE.Group();
  parts.name = "ModelParts";
  rootObject.add(parts);
  rootObject.userData.geometry = [];

  result.meshes.forEach((resultMesh) => {
    const geometry = createGeometryFromMesh(resultMesh);
    const part = createPartFromGeometry(geometry, resultMesh.name);
    rootObject.userData.geometry.push(geometry.clone());
    parts.add(part);
  });

  // Create bounding box for the entire model
  const boundingBox = new THREE.Box3().setFromObject(parts);
  const boundingBoxHelper = new THREE.Box3Helper(boundingBox, 0xa0a0a0);
  parts.add(boundingBoxHelper);

  // Add spheres at all 8 corners of the bounding box
  const corners = getCorners(boundingBox);
  corners.forEach((corner) => {
    const cornerSphere = createCornerSphere(corner);
    parts.add(cornerSphere);
    cornerSpheres.push(cornerSphere);
  });
  rootObject.position.sub(corners[0]);
  // Adjust position so the pivot is at the origin
  addedObjects.push({ name: fileName, mesh: rootObject });
  updateObjectList();
}

function getCorners(boundingBox) {
  return [
    new THREE.Vector3(boundingBox.min.x, boundingBox.min.y, boundingBox.min.z),
    new THREE.Vector3(boundingBox.min.x, boundingBox.min.y, boundingBox.max.z),
    new THREE.Vector3(boundingBox.min.x, boundingBox.max.y, boundingBox.min.z),
    new THREE.Vector3(boundingBox.min.x, boundingBox.max.y, boundingBox.max.z),
    new THREE.Vector3(boundingBox.max.x, boundingBox.min.y, boundingBox.min.z),
    new THREE.Vector3(boundingBox.max.x, boundingBox.min.y, boundingBox.max.z),
    new THREE.Vector3(boundingBox.max.x, boundingBox.max.y, boundingBox.min.z),
    new THREE.Vector3(boundingBox.max.x, boundingBox.max.y, boundingBox.max.z),
  ];
}

function createCornerSphere(position) {
  const sphereGeometry = new THREE.SphereGeometry(2, 16, 16);
  const sphereMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
  });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.copy(position);
  sphere.userData.isCornerSphere = true; // 태그 추가
  return sphere;
}
function enableOrbitControls() {
  controls.enabled = true;
}
function disableOrbitControls() {
  controls.enabled = false;
}

function setupTransformControls(object) {
  transformControls.attach(object);
  scene.add(transformControls);

  transformControls.addEventListener("mouseDown", disableOrbitControls);
  transformControls.addEventListener("mouseUp", enableOrbitControls);

  transformControls.setRotationSnap(THREE.MathUtils.degToRad(15));
  transformControls.setTranslationSnap(10);
}

function resetTransformControls() {
  // TransformControls에서 객체 분리
  if (transformControls.object) {
    transformControls.detach();
  }

  // 이벤트 리스너 제거
  transformControls.removeEventListener("mouseDown", disableOrbitControls);
  transformControls.removeEventListener("mouseUp", enableOrbitControls);

  // TransformControls를 씬에서 제거
  scene.remove(transformControls);

  // 스냅 설정 초기화
  transformControls.setRotationSnap(null);
  transformControls.setTranslationSnap(null);
  transformControls.setScaleSnap(null);

  // 모드 초기화
  transformControls.setMode("translate");

  // 크기 및 공간 초기화
  transformControls.size = 1;
  transformControls.space = "world";

  // 현재 선택된 객체 초기화
  currentTransform = null;

  // OrbitControls 다시 활성화
  controls.enabled = true;

  console.log("TransformControls has been fully reset");
}

function createGeometryFromMesh(resultMesh) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(resultMesh.attributes.position.array, 3)
  );
  if (resultMesh.attributes.normal) {
    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(resultMesh.attributes.normal.array, 3)
    );
  }
  if (resultMesh.attributes.uv) {
    geometry.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(resultMesh.attributes.uv.array, 2)
    );
  }
  if (resultMesh.index) {
    geometry.setIndex(
      new THREE.Uint32BufferAttribute(resultMesh.index.array, 1)
    );
  }
  geometry.clearGroups();
  resultMesh.brep_faces.forEach((brepFace) => {
    geometry.addGroup(
      brepFace.first * 3,
      (brepFace.last - brepFace.first + 1) * 3,
      0
    );
  });
  return geometry;
}

function createPartFromGeometry(geometry, name) {
  const part = new THREE.Group();
  part.userData.name = name || `Part-${partId++}`;

  const geometries = separateGroups(geometry);
  geometries.forEach((geo) => {
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff * Math.random(),
      roughness: 0.5,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, material);
    mesh.userData.faceId = faceId++;
    part.add(mesh);
  });

  return part;
}

function removeModelFromStorage(fileName, listItem) {
  objectList.removeChild(listItem);
  localStorage.removeItem(fileName);
  const existingNames = JSON.parse(localStorage.getItem("fileNames")) || {};
  delete existingNames[fileName];
  localStorage.setItem("fileNames", JSON.stringify(existingNames));

  const index = addedObjects.findIndex((obj) => obj.name === fileName);
  if (index > -1) {
    addedObjects.splice(index, 1);
  }
  updateObjectList();
}

function removeModelFromScene(objectName) {
  const objectToRemove = scene.getObjectByName(objectName);
  if (objectToRemove) {
    scene.remove(objectToRemove);

    // Remove from addedObjects array
    const index = addedObjects.findIndex((obj) => obj.name === objectName);
    if (index > -1) {
      addedObjects.splice(index, 1);
    }

    // Update the object list
    updateObjectList();
  }
}

// 객체 리스트를 업데이트하는 함수
function updateObjectList() {
  const objectListElement = document.getElementById("sceneObjectList");
  objectListElement.innerHTML = ""; // 기존 리스트 초기화
  addedObjects.forEach((object) => {
    const listItem = document.createElement("li");
    listItem.textContent = object.name;

    // Create select button
    // const selectButton = document.createElement("button");
    // selectButton.textContent = "Select";
    // selectButton.addEventListener("click", function () {
    //   console.log(`Selected: ${object.name}`);
    // });

    // Create remove button
    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", function () {
      console.log(`Removing: ${object.name}`);
      removeModelFromScene(object.name);
    });

    // listItem.appendChild(selectButton); // select 버튼 추가
    listItem.appendChild(removeButton); // remove 버튼 추가
    objectListElement.appendChild(listItem);

    // Add child names to the list
    // object.mesh.children.forEach((child) => {
    //   const childItem = document.createElement("li");
    //   childItem.style.paddingLeft = "20px"; // Indentation for child items
    //   childItem.textContent = child.userData.name; // Assuming child has userData.name

    //   // Create select button for child
    //   const childSelectButton = document.createElement("button");
    //   childSelectButton.textContent = "Select";
    //   childSelectButton.addEventListener("click", function () {
    //     console.log(`Selected child: ${child.userData.name}`);
    //   });

    //   // Create remove button for child
    //   const childRemoveButton = document.createElement("button");
    //   childRemoveButton.textContent = "Remove";
    //   childRemoveButton.addEventListener("click", function () {
    //     console.log(`Removed child: ${child.userData.name}`);
    //     // Logic to remove child from the scene can be added here
    //   });

    //   childItem.appendChild(childSelectButton); // select 버튼 추가
    //   childItem.appendChild(childRemoveButton); // remove 버튼 추가
    //   objectListElement.appendChild(childItem);
    // });
  });
}

// Add this code after initializing the renderer
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

canvas.addEventListener("mousedown", (event) => {
  isMouseDown = true;
  mouseDownTime = Date.now();
});

canvas.addEventListener("mouseup", (event) => {
  const mouseUpTime = Date.now();
  const clickDuration = mouseUpTime - mouseDownTime;

  if (clickDuration < dragThreshold) {
    handleClick(event);
  }

  isMouseDown = false;
});

function handleClick(event) {
  // Calculate mouse position in normalized device coordinates (-1 to +1)
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;
  console.log("Mouse position:", mouse);

  // Update the raycaster with the camera and mouse position
  raycaster.setFromCamera(mouse, camera);

  // Calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects(scene.children, true);

  let validIntersection = null;

  // 유효한 첫 번째 교차점 찾기
  for (const intersect of intersects) {
    if (!ignoredTypes.includes(intersect.object.type)) {
      validIntersection = intersect;
      break;
    }
  }

  if (validIntersection?.object.userData?.isCornerSphere) {
    resetTransformControls();
    const corner = validIntersection.object;
    const rootObject = corner.parent.parent;
    if (currentTransform === null) {
      currentTransform = new THREE.Object3D();
      currentTransform.position.copy(rootObject.position);
      currentTransform.quaternion.copy(rootObject.quaternion);
      console.log(
        "Initial currentTransform position set:",
        currentTransform.position
      );
    }

    // 코너 스피어의 월드 위치 계산
    const cornerWorldPosition = new THREE.Vector3();
    corner.getWorldPosition(cornerWorldPosition);

    // 이동 벡터 계산
    const moveVector = new THREE.Vector3().subVectors(
      cornerWorldPosition,
      rootObject.position
    );
    moveVector.applyQuaternion(rootObject.quaternion.invert());

    // rootObject의 위치 업데이트
    rootObject.position.copy(cornerWorldPosition);

    // modelParts의 위치 조정
    corner.parent.position.sub(moveVector);

    rootObject.quaternion.copy(currentTransform.quaternion);
    // currentTransform 위치 업데이트
    currentTransform.position.copy(rootObject.position);

    console.log("Updated positions:");
    console.log("Root object:", rootObject.position);
    console.log("Model parts:", corner.parent.position);
    console.log("Current transform:", currentTransform.position);

    setupTransformControls(rootObject);
  } else if (validIntersection) {
    const intersectedObject = validIntersection.object;
    if (intersectedObject.material && intersectedObject.material.emissive) {
      if (selectedObjects.includes(intersectedObject)) {
        // 이미 선택된 객체라면 선택 해제
        const index = selectedObjects.indexOf(intersectedObject);
        selectedObjects.splice(index, 1);
        intersectedObject.material.emissive.setHex(0xffa500);
      } else {
        // 새로 선택된 객체라면 추가
        selectedObjects.push(intersectedObject);
        intersectedObject.currentHex =
          intersectedObject.material.emissive.getHex();
        intersectedObject.material.emissive.setHex(0xff0000); // 빨간색
      }
    }

    if (
      intersectedObject.userData &&
      intersectedObject.userData.faceId !== undefined
    ) {
      console.log("FaceID:", intersectedObject.userData.faceId);

      let selectedObject = intersectedObject;
      while (selectedObject.parent.type !== "Scene")
        selectedObject = selectedObject.parent;
      initializeBrush(selectedObject);
    } else {
      console.log("FaceID not found in userData");
    }
  } else {
    currentTransform = null;
    console.log("No intersection detected");
    resetTransformControls();
    selectedObjects.forEach((obj) => {
      obj.material.emissive.setHex(0x000000);
    });
    selectedObjects = [];
  }
  onMouseMove(event);
}

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
// const pointer = document.createElement("div");
// pointer.style.position = "absolute";
// pointer.style.width = "20px";
// pointer.style.height = "20px";
// pointer.style.borderRadius = "50%";
// pointer.style.backgroundColor = "rgba(255, 0, 0, 0.5)";
// pointer.style.pointerEvents = "none";
// pointer.style.transform = "translate(-50%, -50%)"; // Center the pointer
// document.body.appendChild(pointer);

window.addEventListener("resize", onWindowResize, false);
function onWindowResize() {
  const width = Math.max(500, window.innerWidth - 400);
  const height = window.innerHeight;

  // 카메라 업데이트
  if (camera instanceof THREE.OrthographicCamera) {
    const aspect = width / height;
    const frustumSize = 1000;
    camera.left = (frustumSize * aspect) / -2;
    camera.right = (frustumSize * aspect) / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
  }

  // 렌더러 크기 업데이트
  renderer.setSize(width, height);

  // ViewHelper 업데이트
  updateViewHelperPosition();
}

function updateViewHelperPosition() {
  const helperSize = 128;
  const canvasRect = canvas.getBoundingClientRect();
  gizmo.style.top = `${canvasRect.bottom - helperSize}px`;
  gizmo.style.left = `${canvasRect.right - helperSize}px`;
}

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

// 마우스 이벤트 리스너 추가
canvas.addEventListener("mousemove", onMouseMove);

function onMouseMove(event) {
  // 마우스 위치를 정규화된 장치 좌표로 변환 (-1 to +1)
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;

  // Raycaster 업데이트
  raycaster.setFromCamera(mouse, camera);

  // 씬의 모든 오브젝트에 대해 교차 검사
  const intersects = raycaster.intersectObjects(scene.children, true);

  let validIntersection = null;

  // 유효한 첫 번째 교차점 찾기
  for (const intersect of intersects) {
    if (!ignoredTypes.includes(intersect.object.type)) {
      validIntersection = intersect;
      break;
    }
  }

  // 이전에 하이라이트된 오브젝트가 있고 선택된 객체가 아니라면 원래 색상으로 복원
  if (
    lastHighlightedObject &&
    !selectedObjects.includes(lastHighlightedObject)
  ) {
    lastHighlightedObject.material.emissive.setHex(0x000000);
    lastHighlightedObject = null;
  }

  // 유효한 교차점이 있고 선택된 객체가 아니면 색상 변경
  if (validIntersection) {
    const intersectedObject = validIntersection.object;
    if (
      intersectedObject.material &&
      intersectedObject.material.emissive &&
      !selectedObjects.includes(intersectedObject)
    ) {
      lastHighlightedObject = intersectedObject;
      lastHighlightedObject.material.emissive.setHex(0xffa500); // 주황색
    }
  }
}

const sidebar = document.getElementById("sidebar");
// Create buttons for selecting brushes
const buttonA = document.createElement("button");
buttonA.textContent = "Select Brush A";
sidebar.appendChild(buttonA);

const buttonB = document.createElement("button");
buttonB.textContent = "Select Brush B";
sidebar.appendChild(buttonB);

// Add event listeners for buttonA
buttonA.addEventListener("click", function () {
  if (!isSelectingB) {
    isSelectedA = false;
    // Prevent selecting A if B is selecting
    isSelectingA = !isSelectingA; // Toggle selection flag
    buttonA.textContent = isSelectingA
      ? "Cancel selecting Brush A"
      : "Select Brush A"; // Update text
  }
  if (!isSelectedB) {
    buttonB.textContent = isSelectingB
      ? "Cancel selecting Brush B"
      : "Select Brush B"; // Update text
  }
});

// Add event listeners for buttonB
buttonB.addEventListener("click", function () {
  if (!isSelectingA) {
    isSelectedB = false;
    // Prevent selecting B if A is selecting
    isSelectingB = !isSelectingB; // Toggle selection flag
    buttonB.textContent = isSelectingB
      ? "Cancel selecting Brush B"
      : "Select Brush B"; // Update text
  }
  if (!isSelectedA) {
    buttonA.textContent = isSelectingA
      ? "Cancel selecting Brush A"
      : "Select Brush A"; // Update text
  }
});

// Add UI button for CSG operation
const csgButton = document.createElement("button");
csgButton.textContent = "Perform CSG Operation";
sidebar.appendChild(csgButton);

csgButton.addEventListener("click", function () {
  if (brushA && brushB) {
    console.log(brushA);
    console.log(brushB);
    const evaluator = new Evaluator();
    evaluator.useGroups = false;
    const result = evaluator.evaluate(brushA, brushB, SUBTRACTION); // Perform CSG operation

    // Create a root object to hold everything
    const rootObject = new THREE.Object3D();
    rootObject.name = "CSG Result";

    // Set up the result mesh
    result.geometry.deleteAttribute("uv");
    result.material = new THREE.MeshStandardMaterial({
      color: 0xffffff * Math.random(),
      roughness: 0.5,
      metalness: 0.1,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });

    // Add edges to the result
    const edges = new THREE.EdgesGeometry(result.geometry);
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        opacity: 0.4,
      })
    );
    result.add(line);

    // Compute bounding box for the result
    result.geometry.computeBoundingBox();
    const boundingBox = new THREE.Box3().setFromObject(result);

    // Create bounding box helper
    const boundingBoxHelper = new THREE.Box3Helper(boundingBox, 0xa0a0a0);

    // Add corner spheres
    const corners = getCorners(boundingBox);
    const cornerSpheres = corners.map((corner) => createCornerSphere(corner));

    // Add result, bounding box helper, and corner spheres to the root object
    rootObject.add(result, boundingBoxHelper, ...cornerSpheres);

    // Position the root object at the minimum point of the bounding box
    rootObject.position.copy(boundingBox.min);

    // Adjust positions of child objects relative to the root
    const offset = new THREE.Vector3().subVectors(
      new THREE.Vector3(),
      boundingBox.min
    );
    result.position.add(offset);
    boundingBoxHelper.position.add(offset);
    cornerSpheres.forEach((sphere) => sphere.position.add(offset));

    // Add the root object to the scene
    scene.add(rootObject);
    rootObject.position.setX(boundingBox.max.x * 2);

    // Update the list of added objects
    addedObjects.push({ name: "CSG Result", mesh: rootObject });
    updateObjectList();

    console.log("CSG operation performed:", result);
  } else {
    console.log("BrushA or BrushB is not set.");
  }
});

// Function to add objects to the scene and set brushes
function initializeBrush(mesh) {
  console.log(mesh);
  if (!isSelectingA && !isSelectingB) return;

  const geometry = mergeGeometries(mesh);
  const brush = new Brush(geometry); // Create a Brush from the mesh geometry
  brush.updateMatrixWorld();

  if (isSelectingA) {
    console.log("Check A");
    brushA = brush; // Set brushA to the current object
    isSelectingA = false; // Reset the flag
    buttonA.textContent = "Reselect Brush A"; // Reset button text
    isSelectedA = true;
  } else if (isSelectingB) {
    console.log("Check B");
    brushB = brush; // Set brushB to the current object
    isSelectingB = false; // Reset the flag
    buttonB.textContent = "Reselect Brush B"; // Reset button text
    isSelectedB = true;
  }
}
function mergeGeometries(object) {
  const geometries = [];
  const materialIndices = [];
  let vertexOffset = 0;

  // Use iterative approach instead of recursive
  const stack = [object];
  while (stack.length > 0) {
    const current = stack.pop();
    if (
      current.isMesh &&
      !(current.geometry instanceof THREE.SphereGeometry) &&
      !(current instanceof THREE.BoxHelper)
    ) {
      const geometry = current.geometry;
      const positionAttribute = geometry.getAttribute("position");

      // Clone the geometry to avoid modifying the original
      const clonedGeometry = geometry.clone();

      // Apply the child's matrix to the geometry
      clonedGeometry.applyMatrix4(current.matrixWorld);

      // Add dummy UV if it doesn't exist
      if (!clonedGeometry.attributes.uv) {
        const positions = clonedGeometry.attributes.position.array;
        const uvs = new Float32Array((positions.length / 3) * 2);
        for (let i = 0; i < uvs.length; i += 2) {
          uvs[i] = uvs[i + 1] = 0;
        }
        clonedGeometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
      }

      geometries.push(clonedGeometry);

      // Store material index for each vertex
      const index = current.material.uuid;
      const count = positionAttribute.count;
      for (let i = 0; i < count; i++) {
        materialIndices.push(index);
      }

      vertexOffset += count;
    }
    if (current.children) {
      stack.push(...current.children);
    }
  }

  if (geometries.length === 0) {
    console.warn("No valid geometries found to merge.");
    return null;
  }

  // Merge all geometries
  const mergedGeometry = new THREE.BufferGeometry();
  const attributes = {};
  let indexCount = 0;

  // Pre-calculate total counts
  for (const geometry of geometries) {
    for (const name in geometry.attributes) {
      if (!attributes[name]) {
        attributes[name] = {
          array: [],
          itemSize: geometry.attributes[name].itemSize,
        };
      }
      attributes[name].array.push(geometry.attributes[name].array);
    }
    indexCount += geometry.index
      ? geometry.index.count
      : geometry.attributes.position.count;
  }

  // Merge attributes
  for (const name in attributes) {
    const mergedArray = mergeTypedArrays(attributes[name].array);
    mergedGeometry.setAttribute(
      name,
      new THREE.BufferAttribute(mergedArray, attributes[name].itemSize)
    );
  }

  // Merge indices
  if (indexCount > 0) {
    const mergedIndex = new Uint32Array(indexCount);
    let indexOffset = 0;
    let vertexOffset = 0;

    for (const geometry of geometries) {
      const index = geometry.index;
      const positionAttribute = geometry.attributes.position;

      if (index) {
        for (let i = 0; i < index.count; i++) {
          mergedIndex[indexOffset++] = vertexOffset + index.getX(i);
        }
      } else {
        for (let i = 0; i < positionAttribute.count; i++) {
          mergedIndex[indexOffset++] = vertexOffset + i;
        }
      }

      vertexOffset += positionAttribute.count;
    }

    mergedGeometry.setIndex(new THREE.BufferAttribute(mergedIndex, 1));
  }

  // Add material indices as a custom attribute
  mergedGeometry.setAttribute(
    "materialIndex",
    new THREE.Float32BufferAttribute(materialIndices, 1)
  );

  return mergedGeometry;
}

// Helper function to merge typed arrays
function mergeTypedArrays(arrays) {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new arrays[0].constructor(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
