import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Paper,
  Box,
  IconButton,
  Button,
  ButtonGroup,
  CssBaseline,
  Stack,
  Tab,
  Tabs,
} from "@mui/material";
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Notifications as NotificationsIcon,
  Architecture as ArchitectureIcon,
} from "@mui/icons-material";
import { IoFileTrayFullSharp as FileIcon } from "react-icons/io5";
import { FaCubes as ObjectIcon } from "react-icons/fa";
import { RiHomeSmile2Fill as HomeIcon } from "react-icons/ri";

import { Resizable } from "re-resizable";

import FileList from "./FileList";
import ObjectList from "./ObjectList";

const HomeButton = () => {
  return (
    <Button
      startIcon={<HomeIcon />}
      color="inherit"
      size="large"
      sx={{
        textTransform: "none",
        justifyContent: "flex-start",
        padding: "8px 16px",
        "&:hover": {
          backgroundColor: "rgba(255, 255, 255, 0.08)",
        },
      }}
    >
      <Typography
        sx={{
          typography: "h5",
          textAlign: "left",
          ml: 2,
        }}
      >
        Three STEP Explorer
      </Typography>
    </Button>
  );
};

const SidebarToggleButton = ({ isOpen, onToggle, position }) => (
  <Box sx={{ mx: 0.5 }}>
    <Button
      onClick={onToggle}
      sx={{
        backgroundColor: "background.paper",
        "&:hover": { backgroundColor: "action.hover" },
      }}
    >
      {position === "left"
        ? isOpen
          ? "close left panel"
          : "open left panel"
        : isOpen
        ? "close right panel"
        : "open right panel"}
    </Button>
  </Box>
);

const LeftSidebarContent = ({ leftWidth, setLeftWidth }) => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Resizable
      size={{ width: leftWidth, height: "100%" }}
      onResizeStop={(e, direction, ref, d) => {
        setLeftWidth(leftWidth + d.width);
      }}
      minWidth={200}
      maxWidth={600}
      enable={{ right: true }}
      style={{ border: "1px solid #ccc" }}
    >
      <Paper
        sx={{
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          border: "1px solid #ccc",
          margin: 0,
          padding: 0,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          sx={{
            "& .MuiTab-root": {
              minWidth: "auto",
              padding: "12px",
            },
            "& .MuiSvgIcon-root": {
              fontSize: "1.5rem",
            },
            margin: 0,
            padding: 0,
          }}
        >
          <Tab
            icon={<FileIcon sx={{ fontSize: "20rem" }} />}
            aria-label="Files"
            sx={{
              "& .MuiSvgIcon-root": {
                color: activeTab === 0 ? "primary.main" : "text.secondary",
              },
              "&:hover .MuiSvgIcon-root": {
                color: "primary.light",
              },
            }}
          />
          <Tab
            icon={<ObjectIcon sx={{ fontSize: "2rem" }} />}
            aria-label="Objects"
            sx={{
              "& .MuiSvgIcon-root": {
                color: activeTab === 1 ? "primary.main" : "text.secondary",
              },
              "&:hover .MuiSvgIcon-root": {
                color: "primary.light",
              },
            }}
          />
        </Tabs>
        <Box sx={{ flexGrow: 1, overflow: "auto", p: 1, padding: 0 }}>
          {activeTab === 0 ? <FileList /> : <ObjectList />}
        </Box>
      </Paper>
    </Resizable>
  );
};

const ResponsiveLayout = () => {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [leftWidth, setLeftWidth] = useState(300);
  const [rightWidth, setRightWidth] = useState(300);

  const handleHomeClick = () => {
    window.location.href = "/"; // 홈 경로로 이동
  };

  return (
    <>
      <CssBaseline />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          width: "100vw", // 전체 너비를 사용하도록 설정
          margin: 0,
          padding: 0,
        }}
      >
        <HomeButton />
        <AppBar
          sx={{
            position: "static",
            width: "100%",
            display: "flex",
            padding: 0,
            margin: 0,
            maxWidth: "none",
          }}
        >
          <Toolbar
            sx={{
              justifyContent: "space-between",
              width: "100%",
              padding: 0,
              margin: 0,
            }}
          >
            {/* 왼쪽 툴바 */}
            <Stack direction="row" spacing={0.5}>
              <Button
                variant="outlined"
                sx={{ backgroundColor: "background.paper" }}
              >
                Translate
              </Button>
              <Button
                variant="outlined"
                sx={{ backgroundColor: "background.paper" }}
              >
                Rotate
              </Button>
              <Button
                variant="outlined"
                sx={{ backgroundColor: "background.paper" }}
              >
                Scale
              </Button>
              <Button
                variant="outlined"
                sx={{ backgroundColor: "background.paper" }}
              >
                HandTool
              </Button>
            </Stack>
            {/* 중앙 툴바 */}
            <Stack direction="row" spacing={0.5}>
              <Button
                variant="outlined"
                sx={{ backgroundColor: "background.paper" }}
              >
                A
              </Button>
              <Button
                variant="outlined"
                sx={{ backgroundColor: "background.paper" }}
              >
                B
              </Button>
              <ButtonGroup
                variant="outlined"
                aria-label="Basic button group"
                sx={{ backgroundColor: "background.paper" }}
              >
                <Button>Union</Button>
                <Button>Intersection</Button>
                <Button>A-B</Button>
                <Button>B-A</Button>
              </ButtonGroup>
            </Stack>
            {/* 우측 툴바 */}
            <Stack direction="row" spacing={0.5}>
              <SidebarToggleButton
                isOpen={leftSidebarOpen}
                onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
                position="left"
                mx="1"
              />
              <SidebarToggleButton
                isOpen={rightSidebarOpen}
                onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
                position="right"
                mx="1"
              />
            </Stack>
          </Toolbar>
        </AppBar>
        <Box
          sx={{
            display: "flex",
            flexGrow: 1,
            overflow: "hidden",
            padding: 0,
            margin: 0,
          }}
        >
          {leftSidebarOpen && (
            <LeftSidebarContent
              leftWidth={leftWidth}
              setLeftWidth={setLeftWidth}
            />
          )}

          <Box sx={{ flexGrow: 1, overflow: "auto", border: "1px solid #ccc" }}>
            <Paper sx={{ height: "100%", border: "1px solid #ccc" }}>
              Main Content Window
            </Paper>
          </Box>

          {rightSidebarOpen && (
            <Resizable
              size={{ width: rightWidth, height: "100%" }}
              onResizeStop={(e, direction, ref, d) => {
                setRightWidth(rightWidth + d.width);
              }}
              minWidth={200}
              maxWidth={600}
              enable={{ left: true }}
              style={{ border: "0.5px solid #ccc" }}
            >
              <Paper
                sx={{
                  height: "100%",
                  overflow: "auto",
                  border: "0.6px solid #ccc",
                }}
              >
                Right Sidebar
              </Paper>
            </Resizable>
          )}
        </Box>

        <Paper sx={{ p: 2, border: "0.5px solid #ccc" }}>
          <Typography>Footer</Typography>
        </Paper>
      </Box>
    </>
  );
};

export default function App() {
  return (
    <ResponsiveLayout />
    // <FileList />
  );
}
