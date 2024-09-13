import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ViewHelper } from "three/examples/jsm/helpers/ViewHelper.js";
import { TransformControls } from "three/examples/jsm/Addons.js";
import { SUBTRACTION, Brush, Evaluator } from "three-bvh-csg";

// Global variables for scene, camera, renderer, and other utilities
let camera, scene, renderer;
let faceId = 0;
let partId = 1;

// Variables for brush selection and object management
let brushA, brushB;
let isSelectingA = false;
let isSelectingB = false;
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
const dragThreshold = 200; // Time threshold to consider as drag (in milliseconds)
let currentTransform = null;

// Set up clear button functionality
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

// Set up the 3D scene
const canvas = document.getElementById("canvas");
scene = new THREE.Scene();

// Add lighting to the scene
const ambientLight = new THREE.AmbientLight(0x808040);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.setY(1000);
scene.add(directionalLight);

// Set up orthographic camera
camera = new THREE.OrthographicCamera(
  canvas.clientWidth / -2,
  canvas.clientWidth / 2,
  canvas.clientHeight / 2,
  canvas.clientHeight / -2,
  0.1,
  10000
);
camera.position.set(500, 1500, 500);
camera.lookAt(0, 0, 0);

// Set up renderer
renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.autoClear = false;
renderer.setSize(canvas.clientWidth, canvas.clientHeight);

// Add OrbitControls for camera manipulation
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;

// Add grid and axis helpers
const gridHelper = new THREE.GridHelper(2000, 20, 0x333333, 0x222222);
scene.add(gridHelper);
const axesHelper = new THREE.AxesHelper(1000);
scene.add(axesHelper);

// Set up clock for animations
const clock = new THREE.Clock();

// Set up TransformControls for object manipulation
const transformControls = new TransformControls(camera, renderer.domElement);

// Event listener for transform control modes
window.addEventListener("keydown", function (event) {
  switch (event.key) {
    case "r":
      transformControls.setMode("rotate");
      break;
    case "t":
      transformControls.setMode("translate");
      break;
    case "s":
      transformControls.setMode("scale");
      break;
  }
});

// Set up ViewHelper for orientation gizmo
const clientRect = canvas.getClientRects()[0];
const helper = new ViewHelper(camera, renderer.domElement);
helper.controls = controls;
helper.controls.center = controls.target;

// Position the orientation gizmo
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
gizmo.addEventListener("pointerup", (event) => {
  helper.handleClick(event);
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (helper.animating) helper.update(delta);
  renderer.clear();
  renderer.render(scene, camera);
  helper.render(renderer);
}

animate();

// Load OCCT module
const occt = await occtimportjs();

// Set up UI elements
const objectList = document.getElementById("objectList");
const addedObjects = [];

document
  .getElementById("fileInput")
  .addEventListener("change", handleFileInput);

// Function to handle file input
function handleFileInput(event) {
  const fileList = event.target.files;
  const existingNames = JSON.parse(localStorage.getItem("fileNames")) || {};

  for (let i = 0; i < fileList.length; i++) {
    processFile(fileList[i], existingNames);
  }

  localStorage.setItem("fileNames", JSON.stringify(existingNames));
}

// Function to process uploaded files
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

// Function to ensure unique file names
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

// Function to create list items for uploaded files
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

// Helper function to create buttons
function createButton(text, onClick) {
  const button = document.createElement("button");
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

// Function to add a model to the 3D scene
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

  // Create bounding box and corner spheres
  const boundingBox = new THREE.Box3().setFromObject(parts);
  const boundingBoxHelper = new THREE.Box3Helper(boundingBox, 0xa0a0a0);
  parts.add(boundingBoxHelper);

  const corners = getCorners(boundingBox);
  corners.forEach((corner) => {
    const cornerSphere = createCornerSphere(corner);
    parts.add(cornerSphere);
    cornerSpheres.push(cornerSphere);
  });
  rootObject.position.sub(corners[0]);

  addedObjects.push({ name: fileName, mesh: rootObject });
  updateObjectList();
}

// Function to get corners of a bounding box
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

// Function to create a corner sphere
function createCornerSphere(position) {
  const sphereGeometry = new THREE.SphereGeometry(2, 16, 16);
  const sphereMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
  });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.copy(position);
  sphere.userData.isCornerSphere = true;
  return sphere;
}

// Functions to enable/disable orbit controls
function enableOrbitControls() {
  controls.enabled = true;
}
function disableOrbitControls() {
  controls.enabled = false;
}

// Function to set up transform controls for an object
function setupTransformControls(object) {
  transformControls.attach(object);
  scene.add(transformControls);

  transformControls.addEventListener("mouseDown", disableOrbitControls);
  transformControls.addEventListener("mouseUp", enableOrbitControls);

  transformControls.setRotationSnap(THREE.MathUtils.degToRad(15));
  transformControls.setTranslationSnap(10);
}

// Function to reset transform controls
function resetTransformControls() {
  if (transformControls.object) {
    transformControls.detach();
  }

  transformControls.removeEventListener("mouseDown", disableOrbitControls);
  transformControls.removeEventListener("mouseUp", enableOrbitControls);

  scene.remove(transformControls);

  transformControls.setRotationSnap(null);
  transformControls.setTranslationSnap(null);
  transformControls.setScaleSnap(null);

  transformControls.setMode("translate");

  transformControls.size = 1;
  transformControls.space = "world";

  currentTransform = null;

  controls.enabled = true;

  console.log("TransformControls has been fully reset");
}

// Function to create geometry from mesh data
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

// Function to create a part from geometry
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

// Function to remove a model from storage
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
// Function to remove a model from the scene
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

// Function to update the object list in the UI
function updateObjectList() {
  const objectListElement = document.getElementById("sceneObjectList");
  objectListElement.innerHTML = ""; // Clear existing list
  addedObjects.forEach((object) => {
    const listItem = document.createElement("li");
    listItem.textContent = object.name;

    // Create remove button
    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", function () {
      console.log(`Removing: ${object.name}`);
      removeModelFromScene(object.name);
    });

    listItem.appendChild(removeButton);
    objectListElement.appendChild(listItem);
  });
}

// Set up raycaster for object selection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Event listeners for mouse interactions
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

// Function to handle click events
function handleClick(event) {
  // Calculate mouse position in normalized device coordinates
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;

  // Update the raycaster and check for intersections
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  let validIntersection = null;

  // Find the first valid intersection
  for (const intersect of intersects) {
    if (!ignoredTypes.includes(intersect.object.type)) {
      validIntersection = intersect;
      break;
    }
  }

  if (validIntersection?.object.userData?.isCornerSphere) {
    // Handle corner sphere interaction
    resetTransformControls();
    const corner = validIntersection.object;
    const rootObject = corner.parent.parent;
    if (currentTransform === null) {
      currentTransform = new THREE.Object3D();
      currentTransform.position.copy(rootObject.position);
      currentTransform.quaternion.copy(rootObject.quaternion);
    }

    // Calculate world position of the corner sphere
    const cornerWorldPosition = new THREE.Vector3();
    corner.getWorldPosition(cornerWorldPosition);

    // Calculate move vector
    const moveVector = new THREE.Vector3().subVectors(
      cornerWorldPosition,
      rootObject.position
    );
    moveVector.applyQuaternion(rootObject.quaternion.invert());

    // Update root object position
    rootObject.position.copy(cornerWorldPosition);

    // Adjust model parts position
    corner.parent.position.sub(moveVector);

    rootObject.quaternion.copy(currentTransform.quaternion);
    // Update currentTransform position
    currentTransform.position.copy(rootObject.position);

    setupTransformControls(rootObject);
  } else if (validIntersection) {
    // Handle object selection
    const intersectedObject = validIntersection.object;
    if (intersectedObject.material && intersectedObject.material.emissive) {
      if (selectedObjects.includes(intersectedObject)) {
        // Deselect if already selected
        const index = selectedObjects.indexOf(intersectedObject);
        selectedObjects.splice(index, 1);
        intersectedObject.material.emissive.setHex(0xffa500);
      } else {
        // Select new object
        selectedObjects.push(intersectedObject);
        intersectedObject.currentHex =
          intersectedObject.material.emissive.getHex();
        intersectedObject.material.emissive.setHex(0xff0000);
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
    // Reset selection if no valid intersection
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

// Function to separate geometry groups
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

// Event listener for window resize
window.addEventListener("resize", onWindowResize, false);

// Function to handle window resize
function onWindowResize() {
  const width = Math.max(500, window.innerWidth - 400);
  const height = window.innerHeight;

  // Update camera
  if (camera instanceof THREE.OrthographicCamera) {
    const aspect = width / height;
    const frustumSize = 1000;
    camera.left = (frustumSize * aspect) / -2;
    camera.right = (frustumSize * aspect) / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
  }

  // Update renderer size
  renderer.setSize(width, height);

  // Update ViewHelper position
  updateViewHelperPosition();
}

// Function to update ViewHelper position
function updateViewHelperPosition() {
  const helperSize = 128;
  const canvasRect = canvas.getBoundingClientRect();
  gizmo.style.top = `${canvasRect.bottom - helperSize}px`;
  gizmo.style.left = `${canvasRect.right - helperSize}px`;
}

// Event listener for mouse movement
canvas.addEventListener("mousemove", onMouseMove);

// Function to handle mouse movement
function onMouseMove(event) {
  // Calculate mouse position in normalized device coordinates
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;

  // Update raycaster
  raycaster.setFromCamera(mouse, camera);

  // Check for intersections
  const intersects = raycaster.intersectObjects(scene.children, true);

  let validIntersection = null;

  // Find first valid intersection
  for (const intersect of intersects) {
    if (!ignoredTypes.includes(intersect.object.type)) {
      validIntersection = intersect;
      break;
    }
  }

  // Reset previously highlighted object
  if (
    lastHighlightedObject &&
    !selectedObjects.includes(lastHighlightedObject)
  ) {
    lastHighlightedObject.material.emissive.setHex(0x000000);
    lastHighlightedObject = null;
  }

  // Highlight intersected object
  if (validIntersection) {
    const intersectedObject = validIntersection.object;
    if (
      intersectedObject.material &&
      intersectedObject.material.emissive &&
      !selectedObjects.includes(intersectedObject)
    ) {
      lastHighlightedObject = intersectedObject;
      lastHighlightedObject.material.emissive.setHex(0xffa500); // Orange color
    }
  }
}

// Set up sidebar UI elements
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
    isSelectingA = !isSelectingA; // Toggle selection flag
    buttonA.textContent = isSelectingA
      ? "Cancel selecting Brush A"
      : "Select Brush A";
  }
  if (!isSelectedB) {
    buttonB.textContent = isSelectingB
      ? "Cancel selecting Brush B"
      : "Select Brush B";
  }
});

// Add event listeners for buttonB
buttonB.addEventListener("click", function () {
  if (!isSelectingA) {
    isSelectedB = false;
    isSelectingB = !isSelectingB; // Toggle selection flag
    buttonB.textContent = isSelectingB
      ? "Cancel selecting Brush B"
      : "Select Brush B";
  }
  if (!isSelectedA) {
    buttonA.textContent = isSelectingA
      ? "Cancel selecting Brush A"
      : "Select Brush A";
  }
});

// Add UI button for CSG operation
const csgButton = document.createElement("button");
csgButton.textContent = "Perform CSG Operation";
sidebar.appendChild(csgButton);

// Event listener for CSG operation
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
// Function to initialize a brush for CSG operations
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

// Function to merge geometries of a complex object
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
