import {
  useState,
  useEffect,
  useCallback,
  useContext,
  createContext,
  Fragment,
} from "react";
import update from "immutability-helper";
import "./App.css";
import { nvUtils } from "./nvUtils";
import {
  Niivue,
  NVDocument,
  SLICE_TYPE,
  NVMesh,
  NVMeshLoaders,
} from "@niivue/niivue";
import { NiivueCanvas } from "./components/NiivueCanvas";
import { ImageProcessor } from "./components/ImageProcessor";
import { Sidebar } from "./components/Sidebar";
import { FileList } from "./components/FileList";
import { MeshList } from "./components/MeshList";
import { ImageTools } from "./components/ImageTools";
import { FileItem } from "./components/FileItem";
import { MeshItem } from "./components/MeshItem";
import { ColormapSelect } from "./components/ColormapSelect";
import { MinMaxInput } from "./components/MinMaxInput";
import { MosaicInput } from "./components/MosaicInput";
import { OpacitySlider } from "./components/OpacitySlider";
import CssBaseline from "@mui/material/CssBaseline";
import Container from "@mui/material/Container";
import { ColorPickerDialog } from "./components/ColorPickerDialog";
import Typography from "@mui/material/Typography";
import { styled, useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import MuiDrawer from "@mui/material/Drawer";
import Grid from "@mui/material/Grid";
import MuiAppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import List from "@mui/material/List";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import InboxIcon from "@mui/icons-material/MoveToInbox";
import MailIcon from "@mui/icons-material/Mail";
import {
  FileCopySharp,
  Filter,
  Filter1Sharp,
  HubSharp,
  VideoSettingsOutlined,
  ViewInArOutlined,
} from "@mui/icons-material";
import JsonEditor from "./components/JsonEditor";
import { SceneSettingsDialog } from "./components/SceneSettingsDialog";
import Button from "@mui/material/Button";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

const drawerWidth = 220;

const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: "hidden",
});

const closedMixin = (theme) => ({
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: "hidden",
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up("sm")]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

// use a context to call the Niivue instance from any component
const _nv = new Niivue();
const NV = createContext(_nv);

// map the slice type UI string to the Niivue slice type
const sliceTypes = {
  axial: SLICE_TYPE.AXIAL,
  coronal: SLICE_TYPE.CORONAL,
  sagittal: SLICE_TYPE.SAGITTAL,
  multiPlanarACS: SLICE_TYPE.MULTIPLANAR,
  render: SLICE_TYPE.RENDER,
};

const NONE = 0;
const VOLUME = 1;
const MESH = 2;
const MESH_LAYER = 3;
const SETTINGS = 4;

function App() {
  // create a new Niivue object
  const nv = useContext(NV);

  nv.onImageLoaded = (volume) => {
    setActiveImage(nv.volumes.length - 1);
    setActiveImageType(VOLUME);
    handleVolumeAdded();
  };

  nv.onMeshLoaded = (mesh) => {
    setActiveImageType(MESH);
    handleMeshAdded();
  };

  nv.onLocationChange = (locationData) => {
    // set the window title to locationData.string
    document.title = locationData.string;
  };

  // get the list of colormap names
  const colormapNames = nv.colormaps(true); // sorted by name

  // create an array of objects with the colormap name and values (used to render the colormap select)
  const colormaps = colormapNames.map((name) => {
    return {
      name: name,
      values: nv.colormapFromKey(name),
    };
  });

  // ------------ State ------------
  // set the initial state of the commsInfo object to an empty object
  const [commsInfo, setCommsInfo] = useState({});
  const [activeImage, setActiveImage] = useState(0); // index of the active image
  const [images, setImages] = useState([]);
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(0);
  const [calMin, setCalMin] = useState(0);
  const [calMax, setCalMax] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [colormap, setColormap] = useState("gray"); // default
  const [sliceType, setSliceType] = useState("");
  const [mosaicString, setMosaicString] = useState("A 0 20 C 30 S 42");
  const [isColorPickerOpen, setColorPickerOpen] = useState(false);
  const [colorPickerColor, setColorPickerColor] = useState({
    r: 255,
    g: 0,
    b: 0,
    a: 1,
  });
  const [isSceneSettingsOpen, setSceneSettingsOpen] = useState(false);
  const [colorOptionToChange, setColorOption] = useState();
  const [meshes, setMeshes] = useState([]);
  const [activeMesh, setActiveMesh] = useState(0);
  const [meshOpacity, setMeshOpacity] = useState(1.0);
  const [activeImageType, setActiveImageType] = useState(NONE);
  const [sidebarContent, setSidebarContent] = useState(NONE);
  const [layers, setLayers] = useState(new Map());
  const [activeLayer, setActiveLayer] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [sideBarState, setSideBarState] = useState({
    hide: false,
    volumes: false,
    meshes: false,
    settings: false,
  });

  const handleChange = (event, newValue) => {
    let newImageType = NONE;

    switch (newValue) {
      case 1:
        newImageType = VOLUME;
        break;
      case 2:
        newImageType = MESH;
        break;
      case 3:
        newImageType = SETTINGS;
        break;
    }

    setActiveTab(newValue);
    setSidebarContent(newImageType);
    // window.resizeTo(window.width, window.height);
  };

  const handleClickTab = (index) => {
    if (index === activeTab) {
      setActiveTab(-1);
      setActiveImageType(NONE);
      setSidebarContent(NONE);
    }
  };

  const toggleSidebarContent = useCallback(
    (content) => {

      if (sidebarContent === content) {
        setSidebarContent(NONE);
        setActiveImageType(NONE);
      } else {
        setSidebarContent(content);
        setActiveImageType(content);
      }
    },
    [sidebarContent]
  );

  const setVisibility = useCallback(
    (index, opacity) => {
      nv.setOpacity(index, opacity);
    },
    [nv]
  );

  const setLayerVisibility = useCallback(
    (index, layerIndex, opacity) => {
      console.log("index, layer index, opacity", index, layerIndex, opacity);
      const mesh = nv.meshes[index];
      const layer = mesh.layers[layerIndex];
      layer.opacity = opacity;
      mesh.updateMesh(nv.gl);
      nv.drawScene();
      // update ui state
      const layerItem = layers.get(mesh.id)[layerIndex];
      layerItem.opacity = opacity;
      layerItem.visible = opacity > 0.0;
      setMeshOpacity(opacity);
      console.log("layerItem", layerItem);
      // setLayers(layers);
    },
    [nv, layers]
  );

  const setLayerAsActive = useCallback(
    (index, layerIndex) => {
      setActiveImageType(MESH_LAYER);
      setActiveMesh(index);
      setActiveLayer(layerIndex);
    },
    [setActiveImageType, setActiveMesh, setActiveLayer]
  );

  const updateOpacity = useCallback(
    (opacity) => {
      nv.setOpacity(activeImage, opacity);
      setOpacity(opacity);
    },
    [activeImage, nv]
  );

  // ------------ Callbacks ------------
  // add a volume from a URL
  const addVolume = useCallback(
    async (path, commsInfo) => {
      let url = makeNiivueUrl(path, commsInfo);
      console.log(url);
      await nv.addVolumeFromUrl({ url: url, name: path });
      let volumes = nv.volumes;
      let newImages = volumes.map((volume, index) => {
        return {
          url: volume.url,
          name: volume.name,
          index: index,
          id: volume.id,
          color: volume.colormap,
          active: index === activeImage,
          frame: volume.frame4D,
          maxFrame: volume.nTotalFrame4D,
        };
      });
      console.log(newImages);
      setImages(newImages);
    },
    [activeImage, nv, setImages]
  );

  const getMeshList = useCallback(() => {
    console.log("get meshlist called");
    let meshes = nv.meshes;
    let newMeshes = meshes.map((mesh, index) => {
      return {
        id: mesh.id,
        name: mesh.name,
        opacity: mesh.opacity,
        meshShaderIndex: mesh.meshShaderIndex,
        colormap: mesh.colormap,
        active: index === activeMesh,
        index,
      };
    });

    return newMeshes;
  }, [nv, activeMesh]);

  // add a mesh from a URL
  const addMesh = useCallback(
    async (path, commsInfo) => {
      let url = makeNiivueUrl(path, commsInfo);
      console.log(url);
      await nv.addMeshFromUrl({ url: url, name: path });
      let meshes = nv.meshes;
      let newMeshes = meshes.map((mesh, index) => {
        return {
          url: mesh.url,
          name: mesh.name,
          index: index,
          id: mesh.id,
          color: mesh.colormap,
          active: index === activeMesh,
        };
      });
      console.log(newMeshes);
      setMeshes(newMeshes);
    },
    [activeMesh, nv, setMeshes]
  );

  // add a mesh from a URL
  const addMeshLayer = useCallback(
    async (path, commsInfo) => {
      let url = makeNiivueUrl(path, commsInfo);
      console.log(url);
      const mesh = nv.meshes[activeMesh];
      let buffer = await (await fetch(url)).arrayBuffer();
      let layer = NVMeshLoaders.readLayer(url, buffer, mesh);
      if (layer) {
        layer.name = url.replace(/^.*[\\/]/, "");
        layer.url = url;
        console.log("layer", layer);
        mesh.layers.push(layer);
        mesh.updateMesh(nv.gl);
        nv.drawScene();
        layers.set(
          mesh.id,
          mesh.layers.map((l) => ({
            name: l.name,
            url: l.url,
            visible: true,
            opacity: l.opacity,
            colormap: l.colormap,
          }))
        );
        getMeshList();
        setMeshOpacity(layers.get(mesh.id)[activeLayer].opacity);
        setActiveImageType(MESH_LAYER);
        setActiveLayer(mesh.layers.length - 1);
      }
      console.log("mesh", mesh);
    },
    [nv, activeMesh, activeLayer, layers, getMeshList]
  );

  const updateMeshOpacity = useCallback(
    (opacity) => {
      const mesh = nv.meshes[activeMesh];
      mesh.opacity = opacity;
      mesh.updateMesh(nv.gl);
      setMeshOpacity(opacity);
      nv.drawScene();
      console.log("mesh opactiy is updated", mesh);
    },
    [activeMesh, nv]
  );

  const updateMeshLayerOpacity = useCallback(
    (opacity) => {
      const mesh = nv.meshes[activeMesh];
      const layer = layers.get(mesh.id)[activeLayer];
      layer.opacity = opacity;
      layer.visible = opacity > 0;
      setMeshOpacity(opacity);
      mesh.layers[activeLayer].opacity = opacity;
      mesh.updateMesh(nv.gl);
      nv.drawScene();
    },
    [activeMesh, activeLayer, nv, layers]
  );

  const updateColormap = useCallback(
    (colormap) => {
      nv.volumes[activeImage].colormap = colormap;
      nv.updateGLVolume();
      // nv.drawScene();
      setColormap(colormap);
    },
    [activeImage, nv]
  );

  const updateMeshLayerColormap = useCallback(
    (colormap) => {
      const mesh = nv.meshes[activeMesh];
      const layer = layers.get(mesh.id)[activeLayer];
      layer.colormap = colormap;
      setColormap(colormap);
      mesh.layers[activeLayer].colormap = colormap;
      mesh.updateMesh(nv.gl);
      nv.drawScene();
    },
    [activeMesh, activeLayer, nv, layers]
  );

  const setCalMinMax = useCallback(
    (min, max) => {
      nv.volumes[activeImage].cal_min = min;
      nv.volumes[activeImage].cal_max = max;
      nv.updateGLVolume();
      setMin(min);
      setMax(max);
    },
    [activeImage, nv]
  );

  const onMosaicChange = (newValue) => {
    nv.setSliceMosaicString(newValue);
    setMosaicString(newValue);
  };

  const loadMosaicString = useCallback(async () => {
    const result = await nvUtils.openLoadMosaicFileDialog();
    if (!result.canceled) {
      const mosaicString = await nvUtils.loadTextFile(result.filePaths[0]);
      nv.setSliceMosaicString(mosaicString);
      setMosaicString(mosaicString);
    }
  }, [nv]);

  const loadDocument = useCallback(async () => {
    const result = await nvUtils.openFileDialog(["*.nvd"]);
    if (!result.canceled) {
      const jsonString = await nvUtils.loadTextFile(result.filePaths[0]);
      const json = JSON.parse(jsonString);
      const document = NVDocument.loadFromJSON(json);
      nv.loadDocument(document);
    }
  }, [nv]);

  const saveDocument = useCallback(async () => {
    const result = await nvUtils.openSaveFileDialog("niivue.nvd");
    if (!result.canceled) {
      const json = nv.json();
      const re = new RegExp("([^\\\\\\\\/]*$)");

      json.name = result.filePath.match(re)[0];
      let imageIndex = 0;
      for (const imageOption of json.imageOptionsArray) {
        imageOption.name = `${nv.volumes[imageIndex++].name}.nii`;
      }
      const jsonString = JSON.stringify(json);
      nvUtils.saveTextFile(result.filePath, jsonString);
    }
  }, [nv]);

  // ------------ Effects ------------
  // get the comms info from the main process
  // when the app is first loaded
  useEffect(() => {
    async function getCommsInfo() {
      let info = await nvUtils.getCommsInfo();
      console.log(info);
      setCommsInfo(info);

      nvUtils.onSaveMosaicString(() => {
        saveMosaicString(nv.sliceMosaicString);
      });

      nvUtils.onLoadMosaicString(() => {
        loadMosaicString();
      });

      nvUtils.onLoadDocument(() => {
        loadDocument();
      });

      nvUtils.onSaveDocument(() => {
        saveDocument();
      });

      // set the callback for when volumes are loaded
      nvUtils.onLoadVolumes((imgs) => {
        console.log("loaded volumes", imgs);
        imgs.forEach(async (img) => {
          await addVolume(img, info);
        });
      });

      // set the callback for when meshes are loaded
      nvUtils.onLoadMeshes((meshes) => {
        console.log("loaded meshes", meshes);
        meshes.forEach(async (mesh) => {
          await addMesh(mesh, info);
        });
      });

      nvUtils.onLoadMeshLayers((meshLayers) => {
        console.log("loaded mesh layers", meshLayers);
        meshLayers.forEach(async (layer) => {
          await addMeshLayer(layer, info);
        });
      });

      nvUtils.onCloseAllVolumes(() => {
        let volumes = nv.volumes;
        // loop over all volumes from the end of the array to the beginning
        // this is because when a volume is removed, the array is reindexed
        // so if you remove the first volume, the second volume becomes the first
        // and the second volume is never removed
        for (let i = volumes.length - 1; i >= 0; i--) {
          nv.removeVolumeByIndex(i);
        }

        nv.meshes = [];

        setImages([]);
        setMeshes([]);
        layers.clear();
        // update active image, min, max, opacity
        setActiveImage(0);
        setActiveMesh(0);
        setActiveLayer(0);
        setMin(0);
        setMax(0);
        setOpacity(1);
        setCalMax(0);
        setCalMin(0);
        setColorPickerOpen(false);
        setColorPickerColor("#ff000000");
        setSceneSettingsOpen(false);
        setActiveImageType(NONE);

        nv.drawScene();
      });
      // set the callback for when the view needs updating
      nvUtils.onSetView((view) => {
        setSliceType(view);
        // clear the mosaic string
        nv.setSliceMosaicString("");
        if (view === "multiPlanarACSR") {
          nv.opts.multiplanarForceRender = true;
        } else if (view === "mosaic") {
          nv.setSliceMosaicString("A 0 20 C 30 S 42");
          nv.opts.multiplanarForceRender = false;
        } else {
          nv.opts.multiplanarForceRender = false;
        }
        nv.setSliceType(sliceTypes[view]);
      });
      nvUtils.onSetOpt((view) => {
        // view is an array with the first element as the option name and the second as the value(s)
        console.log("Setting ", view[0], " as ", view[1]);
        const regex = new RegExp("Color$");
        if (regex.test(view[0])) {
          const currentColor = nv.opts[view[0]];
          setColorPickerColor({
            r: currentColor[0] * 255,
            g: currentColor[1] * 255,
            b: currentColor[2] * 255,
            a: currentColor[3],
          });
          setColorPickerOpen(true);
          setColorOption(view[0]);
        } else {
          nv.opts[view[0]] = view[1];
          nv.updateGLVolume();
          nv.drawScene();
        }
      });
      nvUtils.onSetDrawPen((pen) => {
        // pen is color for drawing
        if (pen === Infinity) {
          nv.setDrawingEnabled(false);
          return;
        } else {
          nv.setDrawingEnabled(true);
        }
        let isFilled = nv.opts.isFilledPen;
        console.log("Setting draw pen to ", pen);
        nv.setPenValue(pen, isFilled);
      });
      nvUtils.onSetEvalStr((str) => {
        console.log("Evaluating ", str);
        eval(str);
      });
      nvUtils.onGetOpt((opt) => {
        // opt is the option name, returns current value(s)
        let val = nv.opts[opt[0]];
        console.log("Getting ", opt[0], " which is", val);
        return val;
      });
      // set the callback for when the DRAG mode changes
      nvUtils.onSetDragMode((mode) => {
        switch (mode) {
          case "pan":
            nv.opts.dragMode = nv.dragModes.pan;
            break;
          case "contrast":
            nv.opts.dragMode = nv.dragModes.contrast;
            break;
          case "measure":
            nv.opts.dragMode = nv.dragModes.measurement;
            break;
          case "none":
            nv.opts.dragMode = nv.dragModes.none;
            break;
        }
      });

      // set the callback for when the volume number updates (4D files)
      nvUtils.onSetFrame((frame) => {
        let vol = nv.volumes[activeImage];
        let id = vol.id;
        let currentFrame = vol.frame4D;
        nv.setFrame4D(id, currentFrame + frame);
        // TODO: update the frame in the FileItem
      });

      nvUtils.openSettings(() => {
        console.log("open settings received");
        setSceneSettingsOpen(true);
      });
    }
    getCommsInfo();
  }, [
    activeImage,
    nv,
    addVolume,
    setSceneSettingsOpen,
    loadMosaicString,
    loadDocument,
    saveDocument,
    addMesh,
    addMeshLayer,
    layers,
  ]);

  // when active image changes, update the min and max
  useEffect(() => {
    if (images.length === 0) {
      return;
    }
    let vol = nv.volumes[activeImage];
    setCalMin(vol.cal_min);
    setCalMax(vol.cal_max);
    setMin(vol.cal_min);
    setMax(vol.cal_max);
    setOpacity(vol.opacity);
    setColormap(vol.colormap);
    // nv.updateGLVolume();
  }, [activeImage, images, nv]);

  // when user changes intensity with the right click selection box
  // for now, only works with the background image
  useEffect(() => {
    nv.onIntensityChange = (volume) => {
      setMin(volume.cal_min);
      setMax(volume.cal_max);
    };
  }, [nv]);

  // ------------ Helper Functions ------------
  function makeNiivueUrl(path, commsInfo) {
    return `http://${commsInfo.host}:${commsInfo.fileServerPort}/${commsInfo.route}?${commsInfo.queryKey}=${path}`;
  }

  const toggleActive = useCallback(
    (name, value) => {
      console.log(name, value);
      let newImages = images.map((image, index) => {
        if (image.name === name) {
          image.active = value;
          setActiveImage(index);
          setActiveImageType(VOLUME);
        } else {
          image.active = false;
        }
        return image;
      });
      setImages(newImages);
    },
    [images, setActiveImage]
  );

  const toggleActiveMesh = useCallback(
    (name, value) => {
      console.log(name, value);
      let newMeshes = meshes.map((mesh, index) => {
        if (mesh.name === name) {
          mesh.active = value;
          setActiveMesh(index);
          setActiveImageType(MESH);
        } else {
          mesh.active = false;
        }
        return mesh;
      });
      setMeshes(newMeshes);
    },
    [meshes, setActiveMesh]
  );

  const getImageList = useCallback(() => {
    let volumes = nv.volumes;
    let newImages = volumes.map((volume, index) => {
      return {
        url: volume.url,
        name: volume.name,
        index: index,
        id: volume.id,
        color: volume.colormap,
        active: index === activeImage,
      };
    });

    return newImages;
  }, [nv, activeImage]);

  function handleDrop() {
    console.log("handle drop called");
    const newImages = getImageList();
    const newMeshes = getMeshList();
    console.log(newImages);
    setImages(newImages);
    setMeshes(newMeshes);
  }

  function handleVolumeAdded() {
    const images = getImageList();
    setImages(images);
  }

  function handleMeshAdded() {
    console.log("mesh added handler called");
    let meshes = nv.meshes.map((mesh, index) => {
      return {
        id: mesh.id,
        name: mesh.name,
        opacity: mesh.opacity,
        meshShaderIndex: mesh.meshShaderIndex,
        colormap: mesh.colormap,
        active: true,
        index,
      };
    });
    console.log("nv meshes", nv.meshes);
    console.log("meshes", meshes);
    setMeshes(meshes);
  }

  function handleAddMeshLayers() {
    nvUtils.openMeshLayersFileDialog();
  }

  const handleRemove = useCallback(
    (index) => {
      let vol = nv.volumes[index];
      nv.removeVolume(vol);
      let newImages = getImageList();
      setActiveImage(0);
      if (images.length === 0) {
        if (meshes.length > 0) {
          setActiveImageType(MESH);
        } else {
          setActiveImageType(NONE);
        }
      }
      setImages(newImages);
    },
    [nv, getImageList, images, meshes]
  );

  const handleRemoveMesh = useCallback(
    (index) => {
      let mesh = nv.meshes[index];
      nv.removeMesh(mesh);
      let meshes = nv.meshes;
      let newMeshes = meshes.map((mesh, index) => {
        return {
          id: mesh.id,
          name: mesh.name,
          opacity: mesh.opacity,
          meshShaderIndex: mesh.meshShaderIndex,
          colormap: mesh.colormap,
          active: index === activeMesh,
          index,
        };
      });
      setActiveMesh(0);
      setMeshes(newMeshes);
    },
    [activeMesh, nv]
  );

  const getLayerList = useCallback(
    (index) => {
      let mesh = nv.meshes[index];
      console.log("mesh from getLayerList", mesh, index);
      return mesh.layers;
    },
    [nv]
  );

  const handleLayerDropped = useCallback(
    (index, file) => {
      let mesh = nv.meshes[index];
      console.log("mesh", mesh);
      const reader = new FileReader();
      reader.onload = async (event) => {
        let buffer = event.target.result;
        console.log(buffer);
        const currentLayerCount = mesh.layers.length;
        NVMeshLoaders.readLayer(file.path, buffer, mesh);
        const newLayerCount = mesh.layers.length;
        if (newLayerCount > currentLayerCount) {
          let layer = mesh.layers[currentLayerCount];
          layer.name = file.path.replace(/^.*[\\/]/, "");
          layer.url = file.path;
          console.log("layer", layer);
          mesh.updateMesh(nv.gl);
          nv.drawScene();
          getMeshList();
          setActiveImageType(MESH_LAYER);
          setActiveLayer(mesh.layers.length - 1);
          layers.set(
            mesh.id,
            mesh.layers.map((l) => ({
              name: l.name,
              url: file.path,
              visible: true,
              opacity: l.opacity,
              colormap: l.colormap,
            }))
          );
          setMeshOpacity(layers.get(mesh.id)[activeLayer].opacity);
        }
        console.log("mesh", mesh);
      };
      reader.readAsArrayBuffer(file);
    },
    [nv, getMeshList, layers, activeLayer]
  );

  const handleMoveUp = useCallback(
    (index) => {
      const newIndex = index - 1;
      if (newIndex < 0) {
        return;
      }

      nv.setVolume(nv.volumes[index], newIndex);
      let newImages = getImageList();
      setActiveImage(0);
      setImages(newImages);
    },
    [getImageList, nv]
  );

  const handleMoveDown = useCallback(
    (index) => {
      const newIndex = index + 1;
      if (newIndex > nv.volumes.length - 1) {
        return;
      }

      nv.setVolume(nv.volumes[index], newIndex);
      let newImages = getImageList();
      setActiveImage(0);
      setImages(newImages);
    },
    [getImageList, nv]
  );

  const handleShowHeader = (index) => {
    let vol = nv.volumes[index];
    alert(vol.hdr.toFormattedString());
  };

  const handleNextFrame = (index) => {
    const vol = nv.volumes[index];
    let id = vol.id;
    let currentFrame = vol.frame4D;
    nv.setFrame4D(id, currentFrame + 1);
  };

  const handlePreviousFrame = (index) => {
    const vol = nv.volumes[index];
    let id = vol.id;
    let currentFrame = vol.frame4D;
    nv.setFrame4D(id, currentFrame - 1);
  };

  const toggleDrawer = (anchor) => (event) => {

    if (
      event.type === "keydown" &&
      (event.key === "Tab" || event.key === "Shift")
    ) {
      return;
    }

    let content = NONE;
    switch (anchor) {
      case "volumes":
        content = VOLUME;
        break;
      case "meshes":
        content = MESH;
        break;
      case "settings":
        content = SETTINGS;
        break;
    }
    setSideBarState({
      volumes: false,
      meshes: false,
      settings: false,
      [anchor]: !sideBarState[anchor],
    });

    toggleSidebarContent(content);
    // alert('anchor ' + anchor + ' is ' + open)
  };

  const saveMosaicString = async (mosaic) => {
    console.log("mosaic:", mosaic);
    if (mosaic) {
      const result = await nvUtils.openSaveMosaicFileDialog();
      if (!result.canceled) {
        nvUtils.saveTextFile(result.filePath, mosaic);
      }
    }
  };

  const onColorPickerChange = (color) => {
    setColorPickerColor(color.rgb);
    console.log("color picked: ", color);
  };

  const onCloseColorPicker = (isCanceled = true) => {
    setColorPickerOpen(false);
    console.log("color picker closed");

    if (!isCanceled) {
      const colorPicked = [
        colorPickerColor.r / 255.0,
        colorPickerColor.g / 255.0,
        colorPickerColor.b / 255.0,
        colorPickerColor.a * 1.0,
      ];
      console.log("color picked", colorPicked);
      nv.opts[colorOptionToChange] = colorPicked;
      nv.updateGLVolume();
      nv.drawScene();
    }
  };

  // const handleJsonChange = (updatedJsonObject) => {
  //   console.log('updatedJsonObject', updatedJsonObject);
  //   for(const key in updatedJsonObject) {
  //     nv.opts[key] = updatedJsonObject[key]
  //   }

  //   nv.drawScene()
  // };
  const handleJsonChange = (updatedJsonObject, key, value) => {
    // setJsonObject(updatedJsonObject);
    console.log(`Property "${key}" changed to`, value);
    nv.opts[key] = value;
    nv.updateGLVolume();
    nv.drawScene();
  };

  const moveImage = useCallback(
    (dragIndex, hoverIndex) => {
      setImages((prevImages) =>
        update(prevImages, {
          $splice: [
            [dragIndex, 1],
            [hoverIndex, 0, prevImages[dragIndex]],
          ],
        })
      );
      // update the volume order in Niivue
      nv.setVolume(nv.volumes[dragIndex], hoverIndex);
      // update the active image if it was moved
      if (activeImage === dragIndex) {
        setActiveImage(hoverIndex);
      } else if (activeImage === hoverIndex) {
        setActiveImage(dragIndex);
      }
    },
    [nv, activeImage, setImages, setActiveImage]
  );

  const renderImage = useCallback(
    (image, index) => {
      return (
        <FileItem
          id={image.id}
          key={image.id} // unique key for React
          moveImage={moveImage}
          name={image.name} // the name of the image (the full path on the file system)
          active={image.active} // whether the image is the active image
          index={index} // the index of the image in the images array
          frame={image.frame} // the current frame of the image (for 4D images)
          maxFrame={image.maxFrame} // the maximum frame of the image (for 4D images)
          onSetActive={toggleActive} // callback to set if the image is active
          onSetVisibility={setVisibility} // callback to set the visibility of the image (opacity 0 or 1)
          onRemove={handleRemove} // callback to remove the image from the scene via the context menu
          onMoveUp={handleMoveUp} // callback to move the image up via the context menu
          onMoveDown={handleMoveDown} // callback to move the image down via the context menu
          onShowHeader={handleShowHeader} // callback to show the image header via the context menu
          onNextFrame={handleNextFrame} // advances the frame for 4D volumes
          onPreviousFrame={handlePreviousFrame} // goes back a frame for 4D volumes
        ></FileItem>
      );
    },
    [
      toggleActive,
      setVisibility,
      handleRemove,
      handleMoveUp,
      handleMoveDown,
      handleShowHeader,
      handleNextFrame,
      handlePreviousFrame,
      moveImage,
    ]
  );

  const renderMesh = useCallback(
    (mesh, index) => {
      return (
        <MeshItem
          key={mesh.id} // unique key for React
          index={index}
          name={mesh.name}
          active={mesh.active}
          onSetActive={toggleActiveMesh} // callback to set if the image is active
          onSetVisibility={setVisibility} // callback to set the visibility of the image (opacity 0 or 1)
          onRemove={handleRemoveMesh} // callback to remove the image from the scene via the context menu
          onLayerDropped={handleLayerDropped} // callback to add a layer to a specific mesh
          layers={layers.get(mesh.id) ?? []}
          getLayerList={getLayerList}
          setLayerVisibility={setLayerVisibility}
          setActiveLayer={setLayerAsActive}
          onAddLayer={handleAddMeshLayers}
        ></MeshItem>
      );
    },
    [
      toggleActiveMesh,
      setVisibility,
      handleRemoveMesh,
      handleLayerDropped,
      getLayerList,
      setLayerVisibility,
      setLayerAsActive,
      layers,
    ]
  );

  let imageToolsPanel;
  switch (activeImageType) {
    case VOLUME:
      {
        imageToolsPanel = (
          <ImageTools>
            {/* colormap select: sets the colormap of the active image */}
            <ColormapSelect
              colormaps={colormaps} // array of colormap objects
              onSetColormap={updateColormap} // callback to set the colormap of the active image
              colormap={
                nv.volumes.length > 0 && nv.volumes[activeImage]
                  ? nv.volumes[activeImage].colormap
                  : colormap
              } // the current colormap of the active image
            />
            {/* min max input: set the min and max of the active image */}
            <MinMaxInput
              calMin={calMin} // the minimum value of the active image
              calMax={calMax} // the maximum value of the active image
              min={min} // the selected minimum value of the active image
              max={max} // the selected maximum value of the active image
              onSetMinMax={setCalMinMax} // callback to set the min and max of the active image
            />
            {/* opacity slider: set the opacity of the active image */}
            <OpacitySlider
              opacity={opacity} // the current opacity of the active image
              onSetOpacity={updateOpacity} // callback to set the opacity of the active image
            />
          </ImageTools>
        );
      }
      break;
    case MESH_LAYER:
      {
        let activeMeshLayer = null;
        if (layers.has(nv.meshes[activeMesh].id)) {
          const activeMeshLayers = layers.get(nv.meshes[activeMesh].id);
          console.log("active mesh layers", activeMeshLayers);
          activeMeshLayer = activeMeshLayers
            ? activeMeshLayers[activeLayer]
            : null;

          console.log("active mesh layer", activeMeshLayer);
        } else {
          console.log("no meshlayers found");
        }
        imageToolsPanel = (
          <ImageTools>
            {/* colormap select: sets the colormap of the active image */}
            <ColormapSelect
              colormaps={colormaps} // array of colormap objects
              onSetColormap={updateMeshLayerColormap} // callback to set the colormap of the active image
              colormap={activeMeshLayer ? activeMeshLayer.colormap : colormap} // the current colormap of the active image
            />
            {/* opacity slider: set the opacity of the active image */}
            <OpacitySlider
              opacity={meshOpacity} // the current opacity of the active image
              onSetOpacity={updateMeshLayerOpacity} // callback to set the opacity of the active image
            />
          </ImageTools>
        );
      }
      break;
    default:
      imageToolsPanel = <></>;
  }

  let sideBar;

  switch (sidebarContent) {
    case VOLUME:
      sideBar = (
        <Sidebar>
          <Typography
            variant="body"
            sx={{
              marginTop: 0,
              marginBottom: 0.5,
            }}
          ></Typography>
          <FileList>
            {/* FileItems: each FileItem is an image to be rendered in Niivue */}
            {images.map((image, index) => {
              return renderImage(image, index);
            })}
          </FileList>
          {/* mosaic text input if sliceType is "mosaic" */}
          {sliceType === "mosaic" && (
            <MosaicInput onChange={onMosaicChange} value={mosaicString} />
          )}
          {imageToolsPanel}
          {/* SceneTools here in the future! */}
          <ImageProcessor nv={nv} imageIndex={activeImage} />
        </Sidebar>
      );
      break;
    case MESH_LAYER:
    case MESH:
      sideBar = (
        <Sidebar>
          <Typography
            variant="body"
            sx={{
              marginTop: 0,
              marginBottom: 0.5,
            }}
          ></Typography>
          <MeshList>
            {meshes.map((mesh, index) => {
              return renderMesh(mesh, index);
            })}
          </MeshList>
          {/* mosaic text input if sliceType is "mosaic" */}
          {sliceType === "mosaic" && (
            <MosaicInput onChange={onMosaicChange} value={mosaicString} />
          )}
          {imageToolsPanel}
          {/* SceneTools here in the future! */}
        </Sidebar>
      );
      break;
    case SETTINGS:
      sideBar = (
        <Sidebar>
          <Typography
            variant="body"
            sx={{
              marginTop: 0,
              marginBottom: 0.5,
            }}
          ></Typography>
          <JsonEditor
            initialJsonObject={nv.opts}
            onJsonChange={handleJsonChange}
          ></JsonEditor>
        </Sidebar>
      );
      break;
    default:
      sideBar = <></>;
  }

  return (
    // wrap the app in the Niivue context
    <NV.Provider value={_nv}>
      {/* AppContainer: the parent component that lays out the rest of the scene */}
      {/* <div> */}
      <Container
        disableGutters
        maxWidth={false}
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          width: "100vw",
          minHeight: "300px",
          paddingTop: "50px"
        }}
      >
        {/* CssBaseline sets some standard CSS configs for working with MUI */}
        {/* <CssBaseline /> */}
        <Box
          sx={{
            position: "fixed",
            top: "0px",
            zIndex: "1000",
            backgroundColor: "white",
            width: "100%",
            height: "50px",
            display: 'flex',
            alignItems: 'center',
            paddingX: 2,
            justifyContent: 'space-between' // Distribute space between children
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              aria-label="collapse"
              onClick={toggleDrawer("hide", true)}
            >
              <ChevronLeftIcon color="primary" />
            </IconButton>
            {["volumes", "meshes", "settings"].map((anchor) => (
              <Button
                key={anchor}
                onClick={toggleDrawer(anchor, true)}
                sx={{ marginX: 1 }}
              >
                <Typography
                  sx={{
                    textDecoration: sideBarState[anchor] ? "underline" : "",
                  }}
                >
                  {anchor}
                </Typography>
              </Button>
            ))}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', paddingRight: 4 }}> {/* Increased paddingRight */}
            { /* right justified header content */}
          </Box>
        </Box>

        <Box display={"flex"} flexDirection={"row"} height={"100%"} gap={"20px"} width={"100vw"} >
          {/* Sidebar: is the left panel that shows all files and image/scene widgets */}
          {sideBar}
          {/* Niivue Canvas: where things are rendered :) */}
          <NiivueCanvas nv={nv} flex={"1"} />
          <ColorPickerDialog
            isOpen={isColorPickerOpen}
            pickedColor={colorPickerColor}
            onChange={onColorPickerChange}
            onClose={onCloseColorPicker}
            isFullScreen={false}
          />
          <SceneSettingsDialog
            isOpen={isSceneSettingsOpen}
            initialJsonObject={nv.opts}
            onJsonChange={handleJsonChange}
            isFullScreen={true}
            onClose={(wasCanceled) => {
              console.log("isCanceled", wasCanceled);
              setSceneSettingsOpen(false);
            }}
          />
        </Box>
      </Container>
      {/* </div> */}
    </NV.Provider>
  );
}

export default App;
