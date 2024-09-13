import React, { useState, useEffect, useCallback } from "react";
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Paper,
  Typography,
  AppBar,
  Toolbar,
  Input,
} from "@mui/material";
import {
  InsertDriveFile as FileIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Upload as UploadIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";

const FileList = () => {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    const loadFiles = () => {
      const storedFiles = JSON.parse(localStorage.getItem("files")) || [];
      setFiles(storedFiles);
    };
    loadFiles();
  }, []);

  useEffect(() => {
    localStorage.setItem("files", JSON.stringify(files));
  }, [files]);

  const getUniqueFileName = (originalName) => {
    let name = originalName;
    let count = 1;
    while (localStorage.getItem(name) !== null) {
      name = `${originalName.replace(/\.[^/.]+$/, "")} (${count})${
        originalName.match(/\.[^/.]+$/)?.[0] || ""
      }`;
      count++;
    }
    return name;
  };

  const handleUpload = useCallback(
    (event) => {
      const fileList = event.target.files;
      const newFiles = [...files];

      Array.from(fileList).forEach((file) => {
        let fileName = file.name;

        // Check if file already exists in localStorage
        if (localStorage.getItem(fileName) !== null) {
          fileName = getUniqueFileName(fileName);
        }

        newFiles.push({ id: Date.now(), name: fileName });

        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const fileBuffer = new Uint8Array(e.target.result);
            const result = occt.ReadStepFile(fileBuffer, null);
            localStorage.setItem(fileName, JSON.stringify(result));
          } catch (error) {
            console.error("Error processing file:", error);
          }
        };
        reader.readAsArrayBuffer(file);
      });

      setFiles(newFiles);
    },
    [files]
  );

  const handleClear = useCallback(() => {
    files.forEach((file) => localStorage.removeItem(file.name));
    setFiles([]);
    localStorage.removeItem("files");
  }, [files]);

  const handleDelete = useCallback((id) => {
    setFiles((prevFiles) => {
      const fileToDelete = prevFiles.find((file) => file.id === id);
      if (fileToDelete) {
        localStorage.removeItem(fileToDelete.name);
      }
      const updatedFiles = prevFiles.filter((file) => file.id !== id);
      localStorage.setItem("files", JSON.stringify(updatedFiles));
      return updatedFiles;
    });
  }, []);

  const handleAdd = useCallback((id) => {
    setFiles((prevFiles) => {
      const newFileName = getUniqueFileName("New File");
      const newFile = { id: Date.now(), name: newFileName };
      const index = prevFiles.findIndex((file) => file.id === id);
      const newFiles = [...prevFiles];
      newFiles.splice(index + 1, 0, newFile);
      localStorage.setItem("files", JSON.stringify(newFiles));
      return newFiles;
    });
  }, []);

  return (
    <Paper
      elevation={3}
      style={{
        height: "100%",
        width: "inherite",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AppBar
        position="static"
        color="inherite"
        sx={{ margin: 0, padding: 0, boxShadow: 0 }}
      >
        <Toolbar sx={{ margin: 0, padding: 0, borderBottom: 1 }}>
          <Typography
            variant="body1"
            fontWeight="600"
            textAlign="left"
            noWrap
            style={{ flexGrow: 1 }}
            sx={{ margin: 0, padding: 0 }}
          >
            File List
          </Typography>
          <Input
            type="file"
            style={{ display: "none" }}
            id="upload-button"
            onChange={handleUpload}
          />
          <label htmlFor="upload-button">
            <IconButton color="inherit" component="span">
              <UploadIcon />
            </IconButton>
          </label>
          <IconButton color="inherit" onClick={handleClear}>
            <ClearIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <List style={{ flexGrow: 1, overflow: "auto" }}>
        {files.map((file) => (
          <ListItem
            key={file.id}
            secondaryAction={
              <>
                <IconButton edge="end" aria-label="add" onClick={() => {}}>
                  <AddIcon />
                </IconButton>
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => handleDelete(file.id)}
                >
                  <DeleteIcon />
                </IconButton>
              </>
            }
          >
            <ListItemIcon>
              <FileIcon />
            </ListItemIcon>
            <ListItemText primary={file.name} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default FileList;
