import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ViewHelper } from "three/examples/jsm/helpers/ViewHelper.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import GUI from "lil-gui";
import {
  ConvexGeometry,
  TransformControls,
} from "three/examples/jsm/Addons.js";
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
  .addEventListener("change", function (event) {
    const fileList = event.target.files;
    const existingNames = JSON.parse(localStorage.getItem("fileNames")) || {};

    const parts = new THREE.Group();
    parts.userData.geometry = [];
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

        const pivot = new THREE.Object3D();
        pivot.userData.geometry = [];
        scene.add(pivot);

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

          if (resultMesh.attributes.uv) {
            geometry.setAttribute(
              "uv",
              new THREE.Float32BufferAttribute(
                resultMesh.attributes.uv.array,
                2
              )
            );
          }

          if (resultMesh.index) {
            geometry.setIndex(
              new THREE.Uint32BufferAttribute(resultMesh.index.array, 1)
            );
          }
          pivot.userData.geometry.push(geometry.clone());
          geometry.clearGroups();
          for (let brepFace of resultMesh.brep_faces) {
            geometry.addGroup(
              brepFace.first * 3,
              (brepFace.last - brepFace.first + 1) * 3,
              0
            );
          }
          // let group = new THREE.Group();
          const material = new THREE.MeshStandardMaterial({
            color: 0xffffff * Math.random(),
            roughness: 0.5,
            metalness: 0.1,
            side: THREE.DoubleSide,
          });

          const mesh = new THREE.Mesh(geometry, material);
          let box3 = new THREE.Box3().setFromObject(mesh, true);
          let boundingBox = new THREE.Box3Helper(box3, 0x0000ff);
          parts.add(boundingBox);
          // parts.add(pivot);
          pivot.add(parts);

          // 바운딩 박스의 중심 계산
          let center = new THREE.Vector3();
          boundingBox.box.getCenter(center);

          // 바운딩 박스의 크기의 절반 계산
          let halfSize = new THREE.Vector3();
          boundingBox.box.getSize(halfSize).multiplyScalar(0.5);

          // 중심에서 꼭짓점(최소 x, y, z)으로의 벡터 계산
          let toVertex = new THREE.Vector3(
            -halfSize.x,
            -halfSize.y,
            -halfSize.z
          );

          // 반지름이 20인 구 지오메트리 생성
          let sphereGeometry = new THREE.SphereGeometry(2, 32, 32);

          // 구 재질 생성 (예: 빨간색 반투명)
          let sphereMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.5,
          });

          // 구 메쉬 생성
          const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

          // 구의 위치를 바운딩 박스의 중심에서 꼭짓점으로 이동
          sphere.position.copy(center).add(toVertex);
          console.log(sphere.position);
          // 구를 씬에 추가
          parts.add(sphere);
          // scene.add(sphere);

          const part = new THREE.Group();
          part.userData.name = resultMesh.name
            ? resultMesh.name
            : `Part-${partId}`;
          if (!resultMesh.name) {
            partId += 1;
          }
          console.debug(resultMesh);
          console.log(geometry);
          parts.userData.geometry.push(geometry);
          let geometries = separateGroups(geometry);
          geometry.dispose();
          console.log(geometries);
          for (let geometry of geometries) {
            const material = new THREE.MeshStandardMaterial({
              color: 0xffffff * Math.random(),
              roughness: 0.5,
              metalness: 0.1,
              side: THREE.DoubleSide,
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.userData.faceId = faceId;
            faceId += 1;
            part.add(mesh);
            const edges = new THREE.EdgesGeometry(geometry);
            const line = new THREE.LineSegments(
              edges,
              new THREE.LineBasicMaterial({ color: 0xffffff * Math.random() })
            );
            // group.add(line); //  곡면에 edge가 많아서 edge-edge 간격이 좁은 경우 face selection이 잘 되지않음.
          }
          parts.add(part);
        }
        console.log(parts);
        // scene.add(parts);
        parts.userData.name = fileName;

        // const transformControls = new TransformControls(
        //   camera,
        //   renderer.domElement
        // );

        transformControls.attach(pivot);
        scene.add(transformControls);

        // Listen to mouse down event to disable OrbitControls while using TransformControls
        transformControls.addEventListener("mouseDown", function () {
          controls.enabled = false;
        });

        // Enable OrbitControls again on mouse up
        transformControls.addEventListener("mouseUp", function () {
          controls.enabled = true;
        });

        transformControls.setRotationSnap(THREE.MathUtils.degToRad(15));
        transformControls.setTranslationSnap(5);

        let corner = null;
        parts.children.forEach((child) => {
          if (child.isMesh) {
            corner = child;
          }
        });

        if (corner) {
          parts.position.sub(corner.position);
        } else {
          console.warn("No Pivot object found.");
        }

        addedObjects.push({ name: result.root.children[0].name, mesh: parts });
        updateObjectList();
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
  addedObjects.forEach((object) => {
    const listItem = document.createElement("li");
    listItem.textContent = object.name;

    // Create select button
    const selectButton = document.createElement("button");
    selectButton.textContent = "Select";
    selectButton.addEventListener("click", function () {
      console.log(`Selected: ${object.name}`);
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

    // Add child names to the list
    object.mesh.children.forEach((child) => {
      const childItem = document.createElement("li");
      childItem.style.paddingLeft = "20px"; // Indentation for child items
      childItem.textContent = child.userData.name; // Assuming child has userData.name

      // Create select button for child
      const childSelectButton = document.createElement("button");
      childSelectButton.textContent = "Select";
      childSelectButton.addEventListener("click", function () {
        console.log(`Selected child: ${child.userData.name}`);
      });

      // Create remove button for child
      const childRemoveButton = document.createElement("button");
      childRemoveButton.textContent = "Remove";
      childRemoveButton.addEventListener("click", function () {
        console.log(`Removed child: ${child.userData.name}`);
        // Logic to remove child from the scene can be added here
      });

      childItem.appendChild(childSelectButton); // select 버튼 추가
      childItem.appendChild(childRemoveButton); // remove 버튼 추가
      objectListElement.appendChild(childItem);
    });
  });
}

// Add this code after initializing the renderer
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

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
      let selectedObject = intersectedObject;
      while (selectedObject.parent.type !== "Scene")
        selectedObject = selectedObject.parent;
      initializeBrush(selectedObject);

      // useGroup =true
      // initializeBrush(intersectedObject);

      console.log("FaceID:", intersectedObject.userData.faceId);
    } else {
      console.log("FaceID not found in userData");
    }
    // console.log(intersectedObject.parent);
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
      ? "Select Brush A (Selecting...)"
      : "Select Brush A"; // Update text
  }
  if (!isSelectedB) {
    buttonB.textContent = isSelectingB
      ? "Select Brush B (Selecting...)"
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
      ? "Select Brush B (Selecting...)"
      : "Select Brush B"; // Update text
  }
  if (!isSelectedA) {
    buttonA.textContent = isSelectingA
      ? "Select Brush A (Selecting...)"
      : "Select Brush A"; // Update text
  }
});

// Add UI button for CSG operation
const csgButton = document.createElement("button");
csgButton.textContent = "Perform CSG Operation";
sidebar.appendChild(csgButton);

csgButton.addEventListener("click", function () {
  if (brushA && brushB) {
    // brushA.updateMatrixWorld();
    // brushB.updateMatrixWorld();
    // console.log(brushB);
    console.log(brushA);
    console.log(brushB);
    const evaluator = new Evaluator();
    evaluator.useGroups = false;
    const result = evaluator.evaluate(brushA, brushB, SUBTRACTION); // Perform CSG operation
    console.log(result);
    result.position.setY(1000);
    scene.add(result); // Add the result to the scene
    console.log("CSG operation performed:", result);
  } else {
    console.log("BrushA or BrushB is not set.");
  }
});

// Function to add objects to the scene and set brushes
function initializeBrush(mesh) {
  console.log(mesh);
  if (!isSelectingA && !isSelectingB) return;

  const brush = new Brush(mesh.userData.geometry[0]); // Create a Brush from the mesh geometry
  brush.updateMatrixWorld();

  if (isSelectingA) {
    console.log("Check A");
    brushA = brush; // Set brushA to the current object
    isSelectingA = false; // Reset the flag
    buttonA.textContent = mesh.userData.name; // Reset button text
    isSelectedA = true;
  } else if (isSelectingB) {
    console.log("Check B");
    brushB = brush; // Set brushB to the current object
    isSelectingB = false; // Reset the flag
    buttonB.textContent = mesh.userData.name; // Reset button text
    isSelectedB = true;
  }
}
// function groupToMesh(group, material) {
//   const geometries = [];

//   // Traverse through the group and collect geometries
//   group.traverse((child) => {
//     if (child.isMesh) {
//       geometries.push(child.geometry);
//     }
//   });

//   // Merge geometries into one
//   const mergedGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(
//     geometries,
//     false
//   );

//   // Create a new mesh with the merged geometry
//   const mesh = new THREE.Mesh(mergedGeometry, material);

//   return mesh;
// }

// // Usage example
// const group = new THREE.Group();
// // Add meshes to the group
// const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
// const newMesh = groupToMesh(group, material);
// scene.add(newMesh);
