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

const SpeechRecognition = window.SpeechRecognition || webkitSpeechRecognition;
const SpeechGrammarList = window.SpeechGrammarList || webkitSpeechGrammarList;
const SpeechRecognitionEvent = window.SpeechRecognitionEvent || webkitSpeechRecognitionEvent;

export const ClosedCaptionsMenu = ({scene}) => {

  var recognition = new SpeechRecognition()
  var recognizing = false;

  // Grammar list - used if you want to recognize only specific words and then do specific actions onmatch/onnomatch

  // const colors = [ 'aqua' , 'azure' , 'beige', 'bisque', 'black', 'blue', 'brown', 'chocolate', 'coral', 'taco' ];
  // var grammar = '#JSGF V1.0; grammar colors; public <color> = ' + colors.join(' | ') + ' ;'
  // var speechRecognitionList = new SpeechGrammarList()
  //speechRecognitionList.addFromString(grammar, 1)
  //recognition.grammars = speechRecognitionList;

  recognition.continuous = true;
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  //console.log(scene);
  const { isMicMuted, isMicEnabled } = useMicrophoneStatus(scene);

  let final_transcript = "";
  
  useEffect(() => {

    if(recognizing === false){
      recognition.start();
    }

    if (isMicMuted || !isMicEnabled){
      recognition.stop();
    }

    // Do this when the mic detects words:

    recognition.onresult = (event) => {
      // Create the interim transcript string locally because we don't want it to persist like final transcript
      let interim_transcript = "";
      // Loop through the results from the speech recognition object.
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        // If the result item is Final, add it to Final Transcript, Else add it to Interim transcript
        if (event.results[i].isFinal) {
          final_transcript += event.results[i][0].transcript;
        } else {
          interim_transcript += event.results[i][0].transcript;
        }

        console.log("event.results["+i+"][0].transcript: " + event.results[i][0].transcript);

        // Also message something in the console if a specific word is found
        let resultArray = event.results[i][0].transcript.split(' ');
        resultArray.forEach(word => {

          if (word === "taco"){
            console.log("TACO HEARD!");
          }
        }) 
      }
      // After a voice recognition result is found, we spawn it as a caption
      //console.log(final_transcript)
      spawnCaptionMessage(final_transcript);
    }

    recognition.onstart = function() {
      recognizing = true;
      console.log("+++++ Voice recognition started! +++++");
    };

    recognition.onstop = function() {
      recognizing = false;
      console.log("----- Voice recognition stopped! -----");
    };
  }); 
  return (isMicEnabled && !isMicMuted ? final_transcript : null);
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
  // TODO: THIS is where the caption is actually added to the document/scene??????
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
  console.log("CaptionType1:" + window.APP.store.state.preferences.captionType1);
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
