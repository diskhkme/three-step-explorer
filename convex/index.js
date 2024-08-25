import * as THREE from "three";
import { ConvexHull } from "three/addons/math/ConvexHull.js";
import { ConvexGeometry, OrbitControls } from "three/examples/jsm/Addons.js";

// Scene, Camera, Renderer 초기화
const scene = new THREE.Scene();
const canvas = document.getElementById("myCanvas");
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);

const controls = new OrbitControls(camera, renderer.domElement);

const boxGeometry = new THREE.BoxGeometry(6, 6, 6);
const vertices = [];
const position = boxGeometry.getAttribute("position");
for (let i = 0; i < position.count; i++) {
  vertices.push(new THREE.Vector3().fromBufferAttribute(position, i));
}

// const convexHull = new ConvexHull().setFromPoints(vertices);

// for (let i = 0; i < convexHull.faces.length; i++) {
//   const face = convexHull.faces[i];
//   const faceVertices = [];
//   let edge = face.edge;
//   do {
//     faceVertices.push(edge.vertex.point);
//     edge = edge.next;
//   } while (edge !== face.edge);

//   const faceGeometry = new THREE.BufferGeometry().setFromPoints(faceVertices);
//   const faceMaterial = new THREE.MeshBasicMaterial({
//     color: 0xffffff * Math.random(),
//     side: THREE.DoubleSide,
//   });
//   const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
//   scene.add(faceMesh);
// }

// 카메라 위치 설정
camera.position.z = 10;

// Ambient light 추가
const ambientLight = new THREE.AmbientLight(0x404040); // 부드러운 흰색 빛
scene.add(ambientLight);

// Directional light 추가
const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // 흰색 빛
directionalLight.position.set(10, 10, 10).normalize();
scene.add(directionalLight);

// 애니메이션 루프
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

function createOptimizedConvexHull(vertices) {
  // ConvexHull 생성
  const convexHull = new ConvexHull().setFromPoints(vertices);

  // ConvexHull의 모든 고유한 vertex 수집
  const uniqueVertices = new Set();
  convexHull.faces.forEach((face) => {
    let edge = face.edge;
    do {
      uniqueVertices.add(edge.vertex.point);
      edge = edge.next;
    } while (edge !== face.edge);
  });

  // Set을 Array로 변환
  const vertexArray = Array.from(uniqueVertices);

  // 새로운 ConvexGeometry 생성
  const convexGeometry = new ConvexGeometry(vertexArray);

  // Material 생성
  const material = new THREE.MeshPhongMaterial({
    color: 0x156289,
    emissive: 0x072534,
    side: THREE.DoubleSide,
    flatShading: true,
  });

  // Mesh 생성
  const mesh = new THREE.Mesh(convexGeometry, material);

  return mesh;
}

// 사용 예시
const initialVertices = [
  /* 여기에 초기 vertex 배열 입력 */
];
const optimizedConvexHullMesh = createOptimizedConvexHull(initialVertices);
scene.add(optimizedConvexHullMesh);

// function mergeFaces(convexHull) {
//   const faces = convexHull.faces;
//   const mergedFaces = [];
//   const visited = new Set();

//   function calculateNormal(face) {
//     const vertices = [];
//     let edge = face.edge;
//     do {
//       vertices.push(edge.vertex.point);
//       edge = edge.next;
//     } while (edge !== face.edge);

//     const triangle = new THREE.Triangle(vertices[0], vertices[1], vertices[2]);
//     return triangle.getNormal(new THREE.Vector3());
//   }

//   function areNormalsEqual(n1, n2, tolerance = 0.01) {
//     return n1.angleTo(n2) < tolerance;
//   }

//   function mergeFaceGroup(startFace) {
//     // const normal = calculateNormal(startFace);
//     const normal = startFace.normal;
//     const faceGroup = [startFace];
//     const queue = [startFace];
//     visited.add(startFace);

//     while (queue.length > 0) {
//       const currentFace = queue.shift();
//       let edge = currentFace.edge;

//       do {
//         const adjacentFace = edge.twin.face;
//         if (!visited.has(adjacentFace)) {
//           const adjacentNormal = adjacentFace.normal;
//           console.log(normal, adjacentNormal);
//           if (areNormalsEqual(normal, adjacentNormal)) {
//             faceGroup.push(adjacentFace);
//             queue.push(adjacentFace);
//             visited.add(adjacentFace);
//           }
//         }
//         edge = edge.next;
//       } while (edge !== currentFace.edge);
//     }

//     return faceGroup;
//   }

//   for (const face of faces) {
//     if (!visited.has(face)) {
//       const mergedFace = mergeFaceGroup(face);
//       mergedFaces.push(mergedFace);
//     }
//   }

//   return mergedFaces;
// }

// // 사용 예시
// const convexHull = new ConvexHull().setFromPoints(vertices);
// const mergedFaces = mergeFaces(convexHull);

// // 병합된 face들을 시각화
// mergedFaces.forEach((faceGroup, index) => {
//   const faceVertices = new Set();
//   faceGroup.forEach((face) => {
//     let edge = face.edge;
//     do {
//       faceVertices.add(edge.vertex.point);
//       edge = edge.next;
//     } while (edge !== face.edge);
//   });

//   const geometry = new THREE.BufferGeometry();
//   const positions = Array.from(faceVertices).flatMap((v) => [v.x, v.y, v.z]);
//   geometry.setAttribute(
//     "position",
//     new THREE.Float32BufferAttribute(positions, 3)
//   );
//   geometry.computeVertexNormals(); // 정점 normal 계산

//   const material = new THREE.MeshPhongMaterial({
//     color: new THREE.Color(Math.random(), Math.random(), Math.random()),
//     side: THREE.DoubleSide,
//   });
//   const mesh = new THREE.Mesh(geometry, material);
//   scene.add(mesh);
// });
