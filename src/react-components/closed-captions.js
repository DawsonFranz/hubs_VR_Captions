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
recognition.lang = 'en-US';
recognition.interimResults = true;
recognition.maxAlternatives = 1;

// OTHER VARIABLES

let final_transcript = "";
let recognizing = false;


// AUTO CAPTION TEXT BLOCK!

  // Set default caption properties to configure:
  const myText = new Text();

  // TODO: Make sans serif, overflow to next line
  myText.text = 'Hello world WHEEEE!'
  myText.textAlign = "center"
  myText.overflowWrap = "break-word"
  myText.anchorX = "center"
  myText.fontSize = .5
  myText.position.y = 5
  myText.position.x = 0
  myText.position.z = 0
  myText.color = 0x000000
  myText.maxWidth = 8

console.log("+++++ Closed Captions voice recognition file started! +++++");

// UI Element, used in uiroot.js

export const ClosedCaptionsMenu = ({scene}) => {
  
  const { isMicMuted, isMicEnabled } = useMicrophoneStatus(scene);

  //console.log(scene);
  document.querySelector("a-scene").object3D.add(myText)

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

      myText.text = interim_transcript;
      myText.sync()
    }

    if(final_transcript.length != 0){

      console.log("final result: " + final_transcript)
      
      // After we finish a voice recognition event and have a final transcript, set the caption text to it
      myText.text = final_transcript
      myText.sync()

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
  if (body.length === 0 || !window.APP.store.state.preferences.captionType1){
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
