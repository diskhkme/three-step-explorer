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

const ObjectList = () => {
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
      ObjectList
    </Paper>
  );
};

export default ObjectList;
