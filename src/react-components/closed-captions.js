import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import styles from "../assets/stylesheets/presence-log.scss";
import classNames from "classnames";
import html2canvas from "html2canvas";
import { coerceToUrl } from "../utils/media-utils";
import { formatMessageBody } from "../utils/chat-message";
import { createPlaneBufferGeometry } from "../utils/three-utils";
import HubsTextureLoader from "../loaders/HubsTextureLoader";

import { useMicrophoneStatus } from "./room/useMicrophoneStatus"
import {Text} from 'troika-three-text'


// CONSTANT/UNCHANGING VARIABLES
const SpeechRecognition = window.SpeechRecognition || webkitSpeechRecognition;
const SpeechGrammarList = window.SpeechGrammarList || webkitSpeechGrammarList;
const SpeechRecognitionEvent = window.SpeechRecognitionEvent || webkitSpeechRecognitionEvent;

// RECOGNITION CONFIG

var recognition = new SpeechRecognition();

recognition.continuous = true;
recognition.lang = 'en-us';
recognition.interimResults = true;
recognition.maxAlternatives = 1;

// OTHER VARIABLES

var final_transcript = "";
var recognizing = false;

console.log("+++++ Closed Captions voice recognition file started! +++++");

// TODO: Making this global for now; not sure how to nest within bb-textbox objects yet, but wanted to get it working first
var captionText = initCaptionType2();

AFRAME.registerComponent('bb-textbox', {
  init: function () {
    // This will be called after the entity has properly attached and loaded.

    this.el.setAttribute("offset-relative-to", { target: "#avatar-pov-node", offset: { x: 0, y: 0, z: -5 } });
    this.el.setAttribute("geometry", { primitive: "box", width: 10, height: 3, depth: 1 });
    this.el.setAttribute("material", { color: "black" });
    this.el.setAttribute("billboard", true)

    // Add child captionText object
    this.el.object3D.add(captionText);

    console.log('I am ready!');
    console.log(captionText)
  },
  tick: function () {
    this.el.setAttribute("offset-relative-to", { target: "#avatar-pov-node", offset: { x: 0, y: 0, z: -5 } });
    this.el.object3D.matrixNeedsUpdate = true;
  }
  // Can add update on speechrecognitionevent(?)
});

function initCaptionType2() {

// AUTO CAPTION TEXT BLOCK!
  // Set default caption properties to configure:
  const ct = new Text();

    // TODO: Make sans serif, overflow to next line
    ct.text = 'Hello world WHEEEE!'
    ct.textAlign = "center"
    ct.overflowWrap = "break-word"
    ct.anchorX = "center"
    ct.anchorY = "middle"
    ct.maxWidth = 8

    ct.fontSize = .5
    ct.position.y = 0
    ct.position.x = 0
    ct.position.z = .75
    ct.color = 0xFFFFFF

  return ct;
}

function updateCaptionType2(newText) {
  if(newText != ""){
    captionText.text = newText;
    captionText.sync();
  }
}

// UI Element, used in uiroot.js--pulls in dynamic scene info if needed

export const ClosedCaptionsMenu = ({scene}) => {

  // We cannot create this every time -- TODO TOMORROW: need to look in another file to see if this exists elsewhere!
    // (creating element then appending it to the scene)
    
  const bbTextboxEl = document.createElement('a-entity');
  bbTextboxEl.setAttribute('bb-textbox', '');
  //console.log(bbTextboxEl)

  document.querySelector('a-scene').appendChild(bbTextboxEl)

  // Set it to itself now in the scene?
  //bbTextboxEl = document.querySelector('a-scene').appendChild(bbTextboxEl)
  //console.log(bbTextboxEl.object3D);

  const { isMicMuted, isMicEnabled } = useMicrophoneStatus(scene);

  // TODO: FIX USEEFFECT HOOK! Make sure it doesn't run things too many times!
  useEffect(() => {
    //console.log("USEEFFECT")
    if (isMicMuted || !isMicEnabled){
      console.log("----- Voice recognition stopped! -----");
      recognition.stop();
      recognizing = false
    }
    else{
      if(recognizing === false){
        console.log("+++++ Voice recognition started! +++++");
        recognizing = true
        recognition.start()
      }
    }
  }); 
  return (isMicEnabled && !isMicMuted ? true : null);
}

// BUG: Breaks when going in and out of browser -- needs to be fixed -- TEST?

// Do this when the mic detects words:

  recognition.onresult = (event) => {

    //console.log("RECOGNITION ONRESULT")

    // Create the interim transcript string locally because we don't want it to persist like final transcript
    let interim_transcript = "";

    // Loop through the results from the speech wrecognition object.
    for (let i = event.resultIndex; i < event.results.length; ++i) {
        //console.log("event.results["+i+"][0].transcript: " + event.results[i][0].transcript);
      // If the result item is Final, add it to Final Transcript, Else add it to Interim transcript
      if (event.results[i].isFinal) {
        final_transcript += event.results[i][0].transcript;
      } 
      else {
        interim_transcript += event.results[i][0].transcript;
        // Update the text live based on interim/temp transcript
      }

      // ENABLE IF YOU WANT TO: Also message something in the console if a specific word is found

        // let resultArray = event.results[i][0].transcript.split(' ');
        // resultArray.forEach(word => {
        //   if (word === "taco"){
        //     console.log("TACO HEARD!");
        //   }
        // }) 

      // Caption Type 2 is the troika text in world
      if(window.APP.store.state.preferences.captionType2){
        updateCaptionType2(interim_transcript)
      }
    }

    if(final_transcript.length != 0){

      console.log("final result: " + final_transcript)
      
      // After we finish a voice recognition event and have a final transcript, set the caption text to it
      if(window.APP.store.state.preferences.captionType2){
        updateCaptionType2(interim_transcript)
      }

      if(window.APP.store.state.preferences.captionType1){
        // Then spawn caption bubbles, with extra going over MAX_CHARS (these can be separate later)
        const MAX_CHARS = 64;

        while(final_transcript.length > MAX_CHARS){
          let str = "";
          str = final_transcript.substring(0,MAX_CHARS);
          spawnCaptionMessage(str);
          final_transcript = final_transcript.substring(MAX_CHARS);
        }
        // If there's an extra bubble at the end
        spawnCaptionMessage(final_transcript);
      }
      // Make sure transcript is empty before next recognition event!
      final_transcript = ""
    }
  }

  // This doesn't happen with recognition continuous (only when exit window)
  recognition.onspeechend = (event) => {
    console.log("ONSPEECHEND")
    recognition.stop();
    recognizing = false;
  }


// Below code imported from chat-message.js

const textureLoader = new HubsTextureLoader();

const captionBehaviorType = 1; // Need to import this later

const CAPTION_MESSAGE_TEXTURE_SIZE = 1024;

const messageBodyDom = (body, from, fromSessionId, onViewProfile, emojiClassName) => {
  const { formattedBody, multiline, monospace, emoji } = formatMessageBody(body, { emojiClassName });
  const wrapStyle = multiline ? styles.messageWrapMulti : styles.messageWrap;
  const messageBodyClasses = {
    [styles.messageBody]: true,
    [styles.messageBodyMulti]: multiline,
    [styles.messageBodyMono]: monospace
  };
  const includeClientLink = onViewProfile && fromSessionId && history && NAF.clientId !== fromSessionId;
  const onFromClick = includeClientLink ? () => onViewProfile(fromSessionId) : () => {};

  const content = (
    <div className={wrapStyle}>
      {from && (
        <div
          onClick={onFromClick}
          className={classNames({ [styles.messageSource]: true, [styles.messageSourceLink]: includeClientLink })}
        >
          {from}:
        </div>
      )}
      <div className={classNames(messageBodyClasses)}>{formattedBody}</div>
    </div>
  );

  return { content, multiline, emoji };
};

function renderCaptionMessage(body, from, allowEmojiRender) {
  const { content, emoji, multiline } = messageBodyDom(body, from, null, null, styles.emoji);
  const isEmoji = allowEmojiRender && emoji;
  const el = document.createElement("div");
  el.setAttribute("class", `${styles.presenceLog} ${styles.presenceLogSpawn}`);
  // THIS is where the caption is actually added to the document??????
  document.body.appendChild(el);

  const entryDom = (
    <div
      className={classNames({
        [styles.presenceLogEntry]: !isEmoji,
        [styles.presenceLogEntryOneLine]: !isEmoji && !multiline,
        [styles.presenceLogEmoji]: isEmoji
      })}
    >
      {content}
    </div>
  );

  // Need to look more into this return to figure out what it does
  return new Promise((resolve, reject) => {
    ReactDOM.render(entryDom, el, () => {
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      const ratio = height / width;
      const scale = (CAPTION_MESSAGE_TEXTURE_SIZE * Math.min(1.0, 1.0 / ratio)) / el.offsetWidth;
      html2canvas(el, { backgroundColor: null, scale, logging: false })
        .then(canvas => {
          canvas.toBlob(blob => resolve([blob, width, height]), "image/png");
          el.remove();
        })
        .catch(reject);
    });
  });
}


// Essentially just filters out blank messages and URLs, then renders the caption message as an image and emits it into the scene as a picture
export async function spawnCaptionMessage(body, from) {

  // TODO: Expand to multiple caption types!

  // No captions if show captions is off in preferences (window.APP.store contains a lot of the preference info)
  //console.log("CaptionType1:" + window.APP.store.state.preferences.captionType1);
  if (body.length === 0){
    return;
  } 

  try {
    const url = new URL(coerceToUrl(body));
    if (url.host) {
      document.querySelector("a-scene").emit("add_media", body);
      return;
    }
  } catch (e) {
    // Ignore parse error
  }

  // If not a URL, spawn as a text bubble
  const [blob] = await renderCaptionMessage(body, from, true);
  document.querySelector("a-scene").emit("add_media", new File([blob], "message.png", { type: "image/png" }));
}


// Constructor - unsure if this part is needed since it's based on buttons

export function CaptionMessage(props) {
  const { content } = messageBodyDom(props.body, props.name, props.sessionId, props.onViewProfile);

  return (
    <div className={props.className}>
      {props.maySpawn && (
        <button
          className={classNames(styles.iconButton, styles.spawnMessage)}
          onClick={() => spawnCaptionMessage(props.body)}
        />
      )}
      {content}
    </div>
  );
}

CaptionMessage.propTypes = {
  name: PropTypes.string,
  type: PropTypes.string,
  maySpawn: PropTypes.bool,
  body: PropTypes.string,
  sessionId: PropTypes.string,
  className: PropTypes.string,
  onViewProfile: PropTypes.func
};
