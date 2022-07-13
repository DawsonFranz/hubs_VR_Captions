import { useEffect } from "react";
import createSpeechServicesPonyfill from 'web-speech-cognitive-services';
// Note: I couldn't figure out this react speech recognition plugin, so I opted for just the Azure polyfill
// import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useMicrophoneStatus } from "./room/useMicrophoneStatus"
import {Text} from 'troika-three-text'

// CONSTANT/UNCHANGING VARIABLES

// Don't include Subscription key in production build!
const SUBSCRIPTION_KEY = '';
const REGION = 'eastus';

const { SpeechRecognition } = createSpeechServicesPonyfill({
  credentials: {
    region: REGION,
    subscriptionKey: SUBSCRIPTION_KEY,
  }
});

const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

console.log("RECOGNITION OBJECT: ");
console.log(recognition);

// OTHER VARIABLES
var recognizing = false;
var sceneEl = document.querySelector("a-scene");

console.log("+++++ Closed Captions voice recognition file started! +++++");

// TODO: Making this global for now; not sure how to nest within bb-textbox objects yet, but wanted to get it working first
var captionText = initCaptionText();

AFRAME.registerComponent('bb-textbox', {
  init: function () {
    // This will be called after the entity has properly attached and loaded.
    this.el.setAttribute("geometry", { primitive: "box", width: 1, height: 0.25, depth: .005 });
    // Slightly less than pure black, with no lighting effects
    this.el.setAttribute("material", { color: "#080808", shader: "flat" });
    this.el.setAttribute("billboard", true)

    // Add child captionText object
    this.el.object3D.add(captionText);
    console.log('Caption Text: I am ready!');
    console.log(captionText)

    // Set initial location for appear captions
    if(window.APP.store.state.preferences.captionType3){
      this.el.setAttribute("offset-relative-to", {target: "#avatar-pov-node", offset: { x: 0, y: -1, z: -1 }});
      document.querySelector("a-entity[bb-textbox]").components["bb-textbox"].appear();
    }
  },

  // Update caption position on tick
  tick: function () {

    // If caption type 1 enabled, follow the user headlocked
    if(window.APP.store.state.preferences.captionType1){
      this.el.setAttribute("visible", true)
      this.el.setAttribute("follow-in-fov", { 
        target: "#avatar-pov-node", 
        offset: { x: 0, y: 0, z: -1 },
        // .01+ good for headlocked
        speed: .05,
        // somewhere between 20 and 30 seems good
        angle:  20 
      })
    }

    // If caption type 2 enabled, follow the user headlocked with lag
    else if(window.APP.store.state.preferences.captionType2){
      this.el.setAttribute("visible", true)
      this.el.setAttribute("follow-in-fov", { 
        target: "#avatar-pov-node", 
        offset: { x: 0, y: 0, z: -1 },
        // Default speed .003 = good for lag, .01 good for headlocked
        speed: .003,
        // Default angle 45 w/ y=1 good for on floor, 
        angle:  25 
      })
    }

    // If caption type 3 enabled, appear in front of users face
    else if(window.APP.store.state.preferences.captionType3){
      this.el.setAttribute("visible", true)
      this.el.removeAttribute("follow-in-fov");
      this.el.setAttribute("offset-relative-to", {target: "#avatar-pov-node", offset: { x: 0, y: -.5, z: -1 }});
    }

    // If caption type 4 enabled, no lag, high speed, high angle
    else if(window.APP.store.state.preferences.captionType4){
      this.el.setAttribute("visible", true)
      this.el.setAttribute("follow-in-fov", { 
        target: "#avatar-pov-node", 
        offset: { x: 0, y: 0, z: -1 },
        // Very fast headlock
        speed: .05,
        // Default angle 45 w/ y=1 good for on floor, 
        angle:  30 
      })
    }

    // If none enabled, hide captions
    else{
      this.el.setAttribute("visible", false)
    }
  },

  appear: function (){
    console.log("appear ran!")
    //this.el.object3D.matrixNeedsUpdate = true;
    this.el.components["offset-relative-to"].updateOffset();
  }

  // Can add update on speechrecognitionevent(?)
});

// AUTO CAPTION TEXT BLOCK!
function initCaptionText() {

  // Set default caption properties to configure:
  const ct = new Text();
    //Note: Below text is 128 characters, should fit into 3 lines nicely
    ct.text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut eleifend porta enim, vel rhoncus elit sollicitudin non orci aliquam.'
    ct.textAlign = "left"
    ct.overflowWrap = "break-word"
    ct.anchorX = "left"
    ct.anchorY = "top-baseline"
    // Default font: roboto
    ct.fontSize = .04
    ct.maxWidth = .85
    ct.color = 0xFFFFFF
    // Change the y depending on the angle of the captions!
    ct.position.y = .03
    ct.position.x = -0.425
    ct.position.z = 0.01

  return ct;
}

function updateCaptionText(newText) {
  if(newText != ""){
    captionText.text = newText;
    captionText.sync();
  }
}

// UI Element, used in uiroot.js--pulls in dynamic scene info if needed
export const ClosedCaptionsMenu = ({scene}) => {

  sceneEl = document.querySelector("a-scene");

  //console.log("CLOSEDCAPTIONSMENU!")

  // Only create caption box once--don't want to duplicate it!
  if(document.querySelector("a-entity[bb-textbox]") == null){

    var bbTextboxEl = document.createElement('a-entity');
    bbTextboxEl.setAttribute('id', 'textbox-main');
    bbTextboxEl.setAttribute('bb-textbox', '');

    // Append textbox to the scene
    AFRAME.scenes[0].appendChild(bbTextboxEl);
  }

  const { isMicMuted, isMicEnabled } = useMicrophoneStatus(scene);
  
  // Need to check for characters going over 128

  useEffect(() => {

    //console.log("USEEFFECT!")

    if ((isMicMuted || !isMicEnabled)){
      console.log("----- Voice recognition stopped! -----");
      //console.log(recognition);
      recognition.continuous = false;
      recognizing = false;
    }
    else{
      if(recognizing === false){
        console.log("+++++ Voice recognition started! +++++");
        recognition.continuous = true;
        recognition.start();
        recognizing = true;
      }
    }
  }); 
 
  // Need to figure out why this doesn't work correctly for inside vr
  return (isMicEnabled && !isMicMuted ? true : null);
}

var final_transcript = "";

// Do this when the mic detects words:
recognition.onresult = ({results}) => {

  //console.log("RECOGNITION ONRESULT")

  // Create the interim transcript string locally because we don't want it to persist like final transcript
    // NOTE: not needed right now, but can be used in the future for more live captions/words
  let interim_transcript = "";

  // Get latest result index
  let lri = results.length-1;

  // Results take time to process, so only add them to captions when they're accurate 
  if (results[lri].isFinal) {

    console.log("final_transcript: " + final_transcript.length + " chars - " + final_transcript)

    // Reset the current transcript fed into the caption box if it's more than ~1.5 lines OR if adding the new transcript overflows
    if(final_transcript.length > 64 || results[lri][0].transcript.length + final_transcript.length > 128){
      final_transcript = "";
    }

    // Add the most recent recognition result to the current final transcript
    final_transcript += results[lri][0].transcript + " ";

    if(window.APP.store.state.preferences.captionType3){
      document.querySelector("a-entity[bb-textbox]").components["bb-textbox"].appear();
    }
  } 
  else {
    interim_transcript += results[lri][0].transcript;
  }

  // Update caption box at the end if there's something new and not empty
  if(final_transcript.length != 0){
    updateCaptionText(final_transcript)
    //document.querySelector("a-entity[bb-textbox]").emit("update-transcript", final_transcript);
  }
}

recognition.onspeechend = () => {
  console.log("ONSPEECHEND")
      // Relocate caption box for appear caption type
      if(window.APP.store.state.preferences.captionType3){
        document.querySelector("a-entity[bb-textbox]").components["bb-textbox"].appear();
      }
}

recognition.onspeechstart = () => {
  console.log("ONSPEECHSTART")
      // Relocate caption box for appear caption type
      if(window.APP.store.state.preferences.captionType3){
        document.querySelector("a-entity[bb-textbox]").components["bb-textbox"].appear();
      }
}