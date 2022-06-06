import { inflateMirror } from "../inflate-mirror";
import { inflateMediaFrame } from "../inflate-media-frame";
import { THREE_SIDES } from "../components/troika-text";
import {
  CursorRaycastable,
  Holdable,
  HoldableButton,
  Logger,
  Networked,
  NetworkedTransform,
  Object3DTag,
  OffersRemoteConstraint,
  RemoteHoverTarget,
  Rigidbody,
  SingleActionButton,
  Slice9,
  Spin,
  Text,
  CameraTool,
  PhysicsShape,
  TextButton,
  HoverButton,
  HandCollisionTarget,
  OffersHandConstraint
} from "../bit-components";
import { Text as TroikaText } from "troika-three-text";

function isValidChild(child) {
  if (child === undefined) {
    console.warn("found undefined node");
    return false;
  } else if (typeof child === "string") {
    console.warn("found text node", child);
    return false;
  }

  return true;
}

const reservedAttrs = ["position", "rotation", "scale", "visible", "name"];

class Ref {
  constructor() {
    this.current = null;
  }
}
export function createRef() {
  return new Ref();
}
function resolveRef(world, ref) {
  if (ref.current === null) {
    ref.current = addEntity(world);
  }
  return ref.current;
}

export function createElementEntity(tag, attrs, ...children) {
  attrs = attrs || {};
  if (typeof tag === "function") {
    return tag(attrs);
  } else if (tag === "entity") {
    const outputAttrs = {};
    const components = [];
    let ref = null;

    for (let attr in attrs) {
      if (reservedAttrs.includes(attr)) {
        outputAttrs[attr] = attrs[attr];
      } else if (attr === "ref") {
        ref = attrs[attr];
      } else {
        // if jsx transformed the attr into attr: true, change it to attr: {}.
        components[attr] = attrs[attr] === true ? {} : attrs[attr];
      }
    }

    return {
      attrs: outputAttrs,
      components,
      children: children.flat().filter(isValidChild),
      ref
    };
  } else {
    throw new Error("invalid tag", tag);
  }
}

import { hasComponent, addComponent, addEntity, removeEntity } from "bitecs";

export function addObject3DComponent(world, eid, obj) {
  if (hasComponent(APP.world, Object3DTag, eid)) {
    throw new Error("Tried to an object3D tag to an entity that already has one");
  }
  addComponent(APP.world, Object3DTag, eid);
  world.eid2obj.set(eid, obj);
  obj.eid = eid;
  return eid;
}

// TODO HACK gettting internal bitecs symbol, should expose an API to check a properties type
const $isEidType = Object.getOwnPropertySymbols(CameraTool.screenRef).find(s => s.description === "isEidType");
console.log($isEidType);

const createDefaultInflator = (Component, defaults = {}) => {
  return (world, eid, componentProps) => {
    componentProps = Object.assign({}, defaults, componentProps);
    addComponent(world, Component, eid, true);
    Object.keys(componentProps).forEach(propName => {
      const prop = Component[propName];
      if (!prop) {
        console.error(`${propName} is not a valid property of`, Component);
        return;
      }
      const value = componentProps[propName];
      prop[eid] = prop[$isEidType] ? resolveRef(world, value) : value;
    });
  };
};

const textDefaults = {
  textAlign: "center",
  anchorX: "center",
  anchorY: "middle"
};

function inflateText(world, eid, componentProps) {
  componentProps = Object.assign({}, textDefaults, componentProps);
  addComponent(world, Text, eid);
  const text = new TroikaText();
  Object.entries(componentProps).forEach(([name, value]) => {
    switch (name) {
      case "value":
        text.text = value;
        break;
      case "side":
        text.material.side = THREE_SIDES[value];
        break;
      case "opacity":
        text.material.side = value;
        break;
      case "fontUrl":
        text.font = value;
        break;
      default:
        text[name] = value;
    }
  });
  text.sync();
  addObject3DComponent(world, eid, text);
}

import { updateSlice9Geometry } from "../update-slice9-geometry";

function inflateSlice9(world, eid, { size, insets, texture }) {
  const geometry = (this.geometry = new THREE.PlaneBufferGeometry(1, 1, 3, 3));
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false });
  console.log(material);
  const obj = new THREE.Mesh(geometry, material);
  addObject3DComponent(world, eid, obj);

  addComponent(world, Slice9, eid);
  Slice9.insets[eid].set(insets);
  Slice9.size[eid].set(size);
  updateSlice9Geometry(world, eid);
}

// TODO: Remove this component. Only used for debugging
function inflateLogger(world, eid, data) {
  addComponent(world, Logger, eid);
  world.eid2loggerdata = world.eid2loggerdata || new Map();
  world.eid2loggerdata.set(eid, data);
}

const inflators = {
  spin: createDefaultInflator(Spin),
  "cursor-raycastable": createDefaultInflator(CursorRaycastable),
  "remote-hover-target": createDefaultInflator(RemoteHoverTarget),
  "hand-collision-target": createDefaultInflator(HandCollisionTarget),
  "offers-remote-constraint": createDefaultInflator(OffersRemoteConstraint),
  "offers-hand-constraint": createDefaultInflator(OffersHandConstraint),
  "single-action-button": createDefaultInflator(SingleActionButton),
  "holdable-button": createDefaultInflator(HoldableButton),
  "text-button": createDefaultInflator(TextButton),
  "hover-button": createDefaultInflator(HoverButton),
  holdable: createDefaultInflator(Holdable),
  rigidbody: createDefaultInflator(Rigidbody),
  "physics-shape": createDefaultInflator(PhysicsShape),
  "networked-transform": createDefaultInflator(NetworkedTransform),
  networked: createDefaultInflator(Networked),
  logger: inflateLogger,
  "media-frame": inflateMediaFrame,
  object3D: addObject3DComponent,
  slice9: inflateSlice9,
  "camera-tool": createDefaultInflator(CameraTool, { captureDurIdx: 1 }),
  text: inflateText,
  mirror: inflateMirror
};

export function renderAsEntity(world, entityDef) {
  const eid = entityDef.ref ? resolveRef(world, entityDef.ref) : addEntity(world);

  Object.keys(entityDef.components).forEach(name => {
    if (!inflators[name]) {
      throw new Error(`Failed to inflate unknown component called ${name}`);
    }

    inflators[name](world, eid, entityDef.components[name]);
  });

  let obj = world.eid2obj.get(eid);
  if (!obj) {
    obj = new THREE.Group();
    addObject3DComponent(world, eid, obj);
  }

  if (entityDef.attrs.position) {
    obj.position.fromArray(entityDef.attrs.position);
  }
  if (entityDef.attrs.rotation) {
    obj.rotation.fromArray(entityDef.attrs.rotation);
  }
  if (entityDef.attrs.scale) {
    obj.scale.fromArray(entityDef.attrs.scale);
  }
  if (entityDef.attrs.name) {
    obj.scale.name = entityDef.attrs.name;
  }
  entityDef.children.forEach(child => {
    if (child.type === "a-entity") {
      throw new Error("a-entity can only be children of a-entity");
    } else {
      const childEid = renderAsEntity(world, child);
      obj.add(world.eid2obj.get(childEid));
    }
  });
  return eid;
}
