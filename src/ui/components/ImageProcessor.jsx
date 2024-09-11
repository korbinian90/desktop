import { useEffect, useState, useRef } from 'react';
import { Button, TextField, Checkbox, FormControlLabel, Box } from '@mui/material';
import { Niimath } from '@niivue/niimath'
import { NVImage } from '@niivue/niivue';


export function ImageProcessor({ nv, imageIndex = 0 }) {
  const [command, setCommand] = useState('-dehaze 5 -dog 2 3.2');
  const [overlay, setOverlay] = useState(true);

  const niimath = useRef(null);

  useEffect(() => {
    async function initNiimath() {
      niimath.current = new Niimath();
      await niimath.current.init();
    }
    initNiimath();
  }, []);

  const handleCommandChange = (event) => {
    setCommand(event.target.value);
  };

  const handleOverlayChange = (event) => {
    setOverlay(event.target.checked);
  };

  const handleProcessImage = async () => {
    if (nv) {
      // Perform the image processing (will run @niivue/niimath wasm)
      await processImage(command, overlay);
    }
  };

  const processImage = async (cmd, isNewLayer=true) => {
    if (!nv || nv.volumes.length === 0) {
      console.error('No volume data available.');
      return;
    }
    // get the full nifti image to send to niimath wasm
    let image = await nv.saveImage({volumeByIndex: imageIndex}).buffer;
    // to use text field as input, convert cmd string to args array (split at spaces).
    // niimath wasm expects an array of strings as input.
    // You could also use the object oriented interface to build the command. 
    // See: https://github.com/niivue/brain2print/blob/b55e6e6bedc64691f23f7e74cefd51afb2674734/main.js#L286
    const args = cmd.split(' ');
    
    // make File object from "image"
    // niimath expects a File object as input (to keep similarity to niimath CLI)
    const file = new File([image], 'image.nii', {type: 'application/octet-stream'});
    
    // don't run niimath yet, but get an instance of the image processor like this:
    const imageProcessor = niimath.current.image(file)
    
    // push each arg to the imageProcessor.commands array.
    // Normally, the @niivue/niimath object oriented interface would be used.
    // However, the text field input is used here in this app,
    // so we can just set the commands array directly on the imageProcessor object (returned from niimath.image())
    args.forEach(arg => imageProcessor.commands.push(arg));

    // process the image by calling the run() method. 
    // No processing has been done yet until this line. 
    // Note: the name should probably be updated to something more useful. 
    let processedBlob = await imageProcessor.run(`processed.nii`);
    // make File from blob that is returned from niimath wasm.
    // Again, make the name something more useful.
    let processedFile = new File([processedBlob], 'processed.nii', {type: 'application/octet-stream'});
    // remove the blob from memory
    processedBlob = null;

    // now use NVImage to load the processed file
    const nvimage = await NVImage.loadFromFile({
      file: processedFile,
      name: `processed.nii`, // perhaps use a more useful name?
      colormap: 'red',
    });
    // remove the processed file from memory
    processedFile = null;

    if (isNewLayer) {
      // are we adding a new layer or replacing the current layer?
      nv.addVolume(nvimage);
    } else {
      // if replacing, update the image at the current index
      nv.setVolume(nvimage, imageIndex);
    }

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