// NOTE when changing be sure to check hardcoded mask values in hub.html
export const Layers = {
  // These 3 layers are hardcoded in THREE
  CAMERA_LAYER_DEFAULT: 1,
  CAMERA_LAYER_XR_LEFT_EYE: 1, // note this is intentionally the same as CAMERA_LAYERS_DEFAULT
  CAMERA_LAYER_XR_RIGHT_EYE: 2,

  CAMERA_LAYER_REFLECTION: 3,
  CAMERA_LAYER_INSPECT: 4,
  CAMERA_LAYER_BATCH_INSPECT: 5,
  CAMERA_LAYER_VIDEO_TEXTURE_TARGET: 6,

  CAMERA_LAYER_THIRD_PERSON_ONLY: 7,
  CAMERA_LAYER_FIRST_PERSON_ONLY: 8,
  CAMERA_LAYER_UI: 9
};

/**
 * Sets layer flags on the underlying Object3D
 * @namespace environment
 * @component layers
 */
AFRAME.registerComponent("layers", {
  schema: {
    mask: { default: Layers.CAMERA_LAYER_DEFAULT },
    recursive: { default: false }
  },
  init() {
    this.update = this.update.bind(this);
    this.el.addEventListener("object3dset", this.update);
  },
  update(oldData) {
    const obj = this.el.object3D;
    if (this.data.recursive) {
      obj.traverse(o => (o.layers.mask = this.data.mask));
    } else {
      obj.layers.mask = this.data.mask;
    }
  },
  remove() {
    this.el.removeEventListener("object3dset", this.update);
  }
});
