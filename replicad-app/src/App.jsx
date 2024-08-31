import React, { useState, useEffect } from "react";

import FileSaver from "file-saver";
import { wrap } from "comlink";

import ThreeContext from "./ThreeContext.jsx";
import ReplicadMesh from "./ReplicadMesh.jsx";

import cadWorker from "./worker.js?worker";
const cad = wrap(new cadWorker());

function STEPFileImporter({ setFile }) {
  const handleFileChange = (event) => {
    const newFile = event.target.files[0];
    console.log(newFile);
    if (newFile) {
      setFile(newFile);
    }
  };

  return (
    <div>
      <input id="STEPFile" type="file" onChange={handleFileChange} />
    </div>
  );
}

export default function replicadeApp() {
  const [mesh, setMesh] = useState(null);
  const [file, setFile] = useState(null);
  const [shape, setShape] = useState(null);

  useEffect(() => {
    const importStepFile = async () => {
      if (file) {
        try {
          const blob = new Blob([file], { type: "model/stl" });
          console.log("before");
          const result = await cad.importSTEP2(blob);
          console.log("after");
          setShape(result.blob);
        } catch (error) {
          console.error("Error importing STEP file or creating mesh:", error);
        }
      }
      console.log("ended");
    };

    importStepFile();
  }, [file]);

  useEffect(() => {
    const createMesh = async () => {
      if (shape) {
        console.log("hi");
        const mesh = await cad.createMesh(shape); // 예시 크기 설정
        setMesh(mesh);
      }
    };

    createMesh();
  }, [shape]);

  return (
    <main>
      <h1>three-step-viewer</h1>
      <STEPFileImporter setFile={setFile} />{" "}
      <section style={{ height: "300px" }}>
        {mesh ? (
          <ThreeContext>
            <ReplicadMesh edges={mesh.edges} faces={mesh.faces} />
          </ThreeContext>
        ) : (
          <div
            style={{ display: "flex", alignItems: "center", fontSize: "2em" }}
          >
            Loading...
          </div>
        )}
      </section>
    </main>
  );
}
