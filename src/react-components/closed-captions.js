import { useState, useEffect } from "react";
import createSpeechServicesPonyfill from 'web-speech-cognitive-services';
// Note: I couldn't figure out this react speech recognition plugin, so I opted for just the Azure polyfill
// import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useMicrophoneStatus } from "./room/useMicrophoneStatus"
import {Text} from 'troika-three-text'


// CONSTANT/UNCHANGING VARIABLES
// const [isMicMuted, setIsMicMuted] = useState(!mediaDevicesManager.isMicEnabled);
// const [isMicEnabled, setIsMicEnabled] = useState(APP.mediaDevicesManager.isMicShared);

// OTHER VARIABLES
var recognizing = true;

console.log("+++++ Closed Captions voice recognition file started! +++++");

// TODO: Making this global for now; not sure how to nest within bb-textbox objects yet, but wanted to get it working first
var captionText = initCaptionText();
var recognition = null;

AFRAME.registerComponent('bb-textbox', {
  init: function () {

    // Don't include Subscription key in production build!
    const SUBSCRIPTION_KEY = '';
    const REGION = 'eastus';

    // TODO: Figure out audiocontexts?
    const { SpeechRecognition } = createSpeechServicesPonyfill({
      credentials: {
        region: REGION,
        subscriptionKey: SUBSCRIPTION_KEY,
      }
    });
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    console.log("RECOGNITION OBJECT: ");
    console.log(recognition);


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
      this.el.setAttribute("offset-relative-to", {target: "#avatar-pov-node", offset: { x: 0, y: -.5, z: -1 }});
      document.querySelector("a-entity[bb-textbox]").components["bb-textbox"].appear();
    }

    if(window.APP.store.state.preferences.captionType4){
      this.el.setAttribute("offset-relative-to", {target: "#avatar-pov-node", offset: { x: 0, y: 0, z: 12 }});
      document.querySelector("a-entity[bb-textbox]").components["bb-textbox"].appear();
    }

    // const onMicEnabled = () => {
    //   setIsMicEnabled(true);
    // };
    // const onMicDisabled = () => {
    //   setIsMicEnabled(false);
    // };

    // scene.addEventListener(MediaDevicesEvents.MIC_SHARE_ENDED, onMicDisabled);
    // scene.addEventListener(MediaDevicesEvents.MIC_SHARE_STARTED, onMicEnabled);

    APP.dialog.on("mic-state-changed", this.onMicStateChanged);
    console.log("afte app dialog on hook")

    let lri = -1;
    let overflowNum = 0;

    // Do this when the mic detects words:
    recognition.onresult = ({results}) => {

      // Appear logic--appear on new speech result start
      if (lri != results.length-1){
        if(window.APP.store.state.preferences.captionType3){
          document.querySelector("a-entity[bb-textbox]").components["bb-textbox"].appear();
        }
      }

      // Get latest result index so each caption is unique
      lri = results.length-1;
      //console.log(results[lri])

      // This logic makes dynamically displays the captions in the textbox so that they don't overflow
      let transcript = results[lri][0].transcript;
      
      // Appear logic--appear on new page
      if (overflowNum != Math.trunc(transcript.length / MAX_CHARS)){
        if(window.APP.store.state.preferences.captionType3){
          document.querySelector("a-entity[bb-textbox]").components["bb-textbox"].appear();
        }
      }

      overflowNum = Math.trunc(transcript.length / MAX_CHARS);
      //console.log("Times overflowed to a new panel: " + overflowNum )

      let latestPhrase = splitString(transcript, MAX_CHARS);
      if(results[lri].isFinal){
        console.log("Final Result!")
      }

      //console.log(results)
      console.log(latestPhrase)

      if(latestPhrase !== undefined && latestPhrase !== null){
        // Update caption box at the end with the most recent text 
        updateCaptionText( latestPhrase[overflowNum] )
      }
      // Update caption box at the end if there's something new and not empty
    }

    recognition.start();

    // TODO: FIgure out how to get access to microphone--I don't think it's doing that every time!
    recognition.oncognitiveservices = (error) => {
      console.log("cognitiveservices!")
      console.log(error)
    }

    recognition.onaudiostart = () => {
      console.log("ONAUDIOSTART")
    }

    recognition.onsoundstart = () => {
      console.log("Onsoundstart!")
    }
    recognition.onspeechstart = () => {
      console.log("OnSpeechStart!")
    }  
    
    // recognition.onresult --> Not running for some reason

    recognition.onspeechend = () => {
      console.log("ONSPEECHEND")

      recognition.start()
    }
    recognition.onsoundend = () => {
      console.log("onsoundEnd")
    }

    recognition.onaudioend = (error) => {
      console.log("OnAudioEnd!")
    }
    recognition.onend = () => {
      console.log("ONEND!!! RECOGNITION ENDED!!!")
    }

    // TODO: FIgure out how to get access to microphone--I don't think it's doing that every time!
    recognition.onerror = ({error}) => {
      console.log("Recognition ONERROR:" + error)
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
        angle:  25 
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

    // If caption type 4 enabled, static caption
    else if(window.APP.store.state.preferences.captionType4){
      this.el.setAttribute("visible", true)
      this.el.removeAttribute("follow-in-fov");
      this.el.setAttribute("offset-relative-to", {target: "#avatar-pov-node", offset: { x: 0, y: -.5, z: -1 }});
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
  },

  onMicStateChanged: function (){
    //this.mic.setAttribute("mic-button", "active", APP.dialog.isMicEnabled);
    console.log("mic changed, enabled?: " + APP.dialog.isMicEnabled);
    if (APP.dialog.isMicEnabled && !APP.dialog.isMicMuted) {
      console.log("+++++ Voice recognition started! +++++");
      //recognition.continuous = true;

      recognition.start();
      console.log(recognition);
      recognizing = true;
    } else {
      console.log("----- Voice recognition stopped! -----");

  // //try to give a bit delay and then start again with the same instance
  // setTimeout(function(){ recognition.start(); }, 400);
      //recognition.abort();
      console.log(recognition);
      recognizing = false;
    }
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

  console.log("CLOSEDCAPTIONSMENU!")

  //console.log("SCENE LOADED? :" + scene.hasLoaded);
  // console.log("MIC SHARED? :" + APP.mediaDevicesManager.isMicShared);
  // console.log("RECOGNITION VAR: " + recognition);

  const { isMicMuted, isMicEnabled } = useMicrophoneStatus(scene);

  // console.log("SCENE ENTERED?");
  // console.log(scene.is("entered"))

  // Only create caption box once--don't want to duplicate it!
  if(document.querySelector("a-entity[bb-textbox]") == null && scene.hasLoaded && isMicEnabled && scene.is("entered")){

    var bbTextboxEl = document.createElement('a-entity');
    bbTextboxEl.setAttribute('id', 'textbox-main');
    bbTextboxEl.setAttribute('bb-textbox', '');

    // Append textbox to the scene
    AFRAME.scenes[0].appendChild(bbTextboxEl);
  }

  // Need to figure out why this doesn't work correctly for inside vr
  return (isMicEnabled && !isMicMuted ? true : null);
}

const MAX_CHARS = 128;

const splitString = (str = '', MAX_CHARS) => {
  const regex = new RegExp(String.raw`\S.{1,${MAX_CHARS - 2}}\S(?= |$)`,
  'g');
  const chunks = str.match(regex);
  return chunks;
}