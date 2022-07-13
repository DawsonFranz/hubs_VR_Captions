export class SpeechRecognitionSystem {
    constructor(scene) {
      this.scene = scene;
      this.transcriptText = "";
      this.entity = this.init();
      // Need to pass data through onUpdate
      //this.scene.addEventListener("update-transcript", text => this.onUpdateTranscript);
      console.log(this)
    }
  
    init = () => {

      //const localTextbox = document.querySelector("a-entity[bb-textbox]");

      const entity = document.createElement("a-entity");
      this.scene.appendChild(entity);

      entity.setAttribute("id", "networkedTranscript");

      //entity.setAttribute("visible", false);
      entity.setAttribute("offset-relative-to", { target: "#avatar-pov-node", offset: { x: 0, y: 1, z: -1.5 } });

      //entity.setAttribute("transcript-text", {value: "TRANSCRIPT NETWORKED CREATED!"});

      entity.setAttribute("networked", { template: "#interactable-iframe-media" });

      console.log("TRANSCRIPT SYSTEM INITIALIZED")

      return entity;
    }

    onUpdateTranscript = (newText) => {
      
      console.log("ONUPDATETRANSCRIPT EVENT!");

      this.transcriptText = newText;

      //this.entity.setAttribute("transcript-text", {value: newText});
      this.entity.components["transcript-text"].update(newText);

      console.log(this)
    };
}

AFRAME.registerComponent("transcript-text", {
  schema: {
    value: { type: "string" },
  },

  init (){
    this.value = "INITIALTRANSCRIPTVALUE";
    NAF.utils.getNetworkedEntity(this.el).then(networkedEl => {
        this.networkedEl = networkedEl;
        this.value = this.networkedEl.value;
        //applyPersistentSync(this.networkedEl.components.networked.data.networkId);
        console.log("NETWORKED TRANSCRIPT TEXT!!!!!!!!!!!!!!!")
        //console.log(networkedEl)
        console.log(networkedEl.components["transcript-text"])
        //console.log(networkedEl.components)
    });
  },
  update (newText){
    const mine = NAF.utils.isMine(networkedEl)
    if (!mine) var owned = NAF.utils.takeOwnership(networkedEl)
    this.value = newText;
    console.log(networkedEl.components["transcript-text"])
  }
});