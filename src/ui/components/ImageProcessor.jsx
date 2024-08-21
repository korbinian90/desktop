import React, { useEffect, useState } from 'react';
import { Button, TextField, Checkbox, FormControlLabel, Box } from '@mui/material';

import { v4 as uuidv4 } from 'uuid';

export function ImageProcessor({ nv, imageIndex = 0 }) {
  // const [processedBuffer, setProcessedBuffer] = useState(null);
  const [command, setCommand] = useState('-dehaze 5 -dog 2 3.2');
  const [overlay, setOverlay] = useState(true);

  const handleCommandChange = (event) => {
    setCommand(event.target.value);
  };

  const handleOverlayChange = (event) => {
    setOverlay(event.target.checked);
  };

  const handleProcessImage = () => {
    if (nv) {
      // Perform the image processing
      processImage(command, overlay);
    }
  };

  // Initialize the worker
  const worker = new Worker(new URL('../imageWorker.js', import.meta.url), { type: 'module' });

  // Handler to receive messages from the worker
  useEffect(() => {
    worker.onmessage = (e) => {
      console.log('worker data', e);
      // Extract data from the worker's message
      const id = e.data.id;
      let processedImage = nv.volumes.find((image) => image.id == id);
      console.log('nv', nv);
      if (!processedImage) {
        console.log("Image not found");
        return;
      }

      const isNewLayer = e.data.isNewLayer;
      if (isNewLayer) {
        const name = processedImage.name;
        processedImage = processedImage.clone();
        processedImage.id = uuidv4();
        processedImage.name = `${name}-processed`;
      }

      let imageBytes = e.data.imageBytes;

      // Handle different data types for the processed image
      switch (processedImage.hdr.datatypeCode) {
        case 2: //NiiDataType.DT_UINT8:
          processedImage.img = new Uint8Array(imageBytes);
          break;
        case 4: //NiiDataType.DT_INT16:
          processedImage.img = new Int16Array(imageBytes.buffer);
          break;
        case 16: //NiiDataType.DT_FLOAT32:
          processedImage.img = new Float32Array(imageBytes.buffer);
          break;
        case 512: //NiiDataType.DT_UINT16:
          processedImage.img = new Uint16Array(imageBytes.buffer);
          break;
        default:
          throw new Error("Datatype " + processedImage.hdr.datatypeCode + " not supported");
      }

      // Recalculate the image min/max values if needed
      processedImage.trustCalMinMax = false;
      processedImage.calMinMax();

      // Determine whether to add or update the volume
      let imageIndex = nv.volumes.length;
      if (isNewLayer) {
        // if (imageIndex > 1) {
        //   nv.removeVolume(nv.volumes[1].id);
        // }
        if (overlay) {
          nv.addVolume(processedImage);
          nv.setColormap(nv.volumes[1].id, 'red');
        } else {
          nv.setVolume(processedImage, nv.volumes.length);
        }
      } else {
        imageIndex = nv.volumes.indexOf(processedImage);
      }

      console.log('Image processed');
    };

    return () => {
      worker.terminate();
    };
  }, [worker]);

  // Function to send the buffer and command to the worker
  // const processImage = () => {
  //   if (!nv || nv.volumes.length === 0) {
  //     console.error('No volume data available.');
  //     return;
  //   }

  //   const imageIndex = 0;

  //   // Clone the image from the volume
  //   let image = nv.volumes[imageIndex].clone();

  //   // Check if the image has a valid buffer
  //   if (!image.img.buffer) {
  //     console.error('Image buffer is not available.');
  //     return;
  //   }

  //   // Get image metadata
  //   let metadata = image.getImageMetadata();
  //   metadata.id = nv.volumes[imageIndex].id;
  //   console.log('metadata', metadata);

  //   // Ensure metadata is serializable (you may need to adjust this if metadata is complex)
  //   if (!metadata || typeof metadata !== 'object') {
  //     console.error('Invalid image metadata.');
  //     return;
  //   }

  //   // Prepare command and flag
  //   const cmd = command;
  //   const isNewLayer = true;

  //   // Post the message to the worker
  //   worker.postMessage([metadata, image.img.buffer, cmd, isNewLayer], [image.img.buffer]);
  // };
  const processImage = (cmd, isNewLayer) => {
    if (!nv || nv.volumes.length === 0) {
      console.error('No volume data available.');
      return;
    }

    let image = nv.volumes[imageIndex];
    let metadata = image.getImageMetadata();
    const clone = image.clone();
    worker.postMessage([metadata, clone.img.buffer, cmd, isNewLayer], [clone.img.buffer]);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', paddingRight: '20px' }}>
      <TextField
        variant="outlined"
        size="small"
        value={command}
        onChange={handleCommandChange}
        sx={{ marginRight: '10px' }}
      />
      <Button
        variant="contained"
        color="primary"
        onClick={handleProcessImage}
        sx={{ marginRight: '10px' }}
      >
        Process
      </Button>
      <FormControlLabel
        control={
          <Checkbox
            checked={overlay}
            onChange={handleOverlayChange}
          />
        }
        label="Overlay"
        sx={{ marginRight: '10px' }}
      />
    </Box>
  );
}