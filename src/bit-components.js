import { defineComponent, Types } from "bitecs";

export const $isStringType = Symbol("isStringType");

export const Networked = defineComponent({
  id: Types.ui32,
  creator: Types.ui32,
  owner: Types.ui32,

  lastOwnerTime: Types.ui32
});
Networked.id[$isStringType] = true;
Networked.creator[$isStringType] = true;
Networked.owner[$isStringType] = true;

export const Owned = defineComponent();
export const NetworkedMediaFrame = defineComponent({
  capturedNid: Types.ui32,
  scale: [Types.f32, 3]
});
NetworkedMediaFrame.capturedNid[$isStringType] = true;

export const MediaFrame = defineComponent({
  capturedNid: Types.ui32,
  scale: [Types.f32, 3],
  mediaType: Types.ui8,
  bounds: [Types.f32, 3],
  preview: Types.eid
});
export const Text = defineComponent();
export const Slice9 = defineComponent({
  insets: [Types.ui32, 4],
  size: [Types.f32, 2]
});

export const NetworkedTransform = defineComponent({
  position: [Types.f32, 3]
});

export const AEntity = defineComponent();
export const Object3DTag = defineComponent();
export const Spin = defineComponent({ x: Types.f32, y: Types.f32, z: Types.f32 });
export const CursorRaycastable = defineComponent();
export const RemoteHoverTarget = defineComponent();
export const NotRemoteHoverTarget = defineComponent();
export const Holdable = defineComponent();
export const RemoveNetworkedEntityButton = defineComponent();
export const Interacted = defineComponent();

export const HandRight = defineComponent();
export const HandLeft = defineComponent();
export const RemoteRight = defineComponent();
export const RemoteLeft = defineComponent();
export const HoveredHandRight = defineComponent();
export const HoveredHandLeft = defineComponent();
export const HoveredRemoteRight = defineComponent();
export const HoveredRemoteLeft = defineComponent();
export const HeldHandRight = defineComponent();
export const HeldHandLeft = defineComponent();
export const HeldRemoteRight = defineComponent();
export const HeldRemoteLeft = defineComponent();
export const Held = defineComponent();
export const MediaFramePreviewClone = defineComponent({
  preview: Types.eid
});
export const OffersRemoteConstraint = defineComponent();
export const HandCollisionTarget = defineComponent();
export const OffersHandConstraint = defineComponent();
export const TogglesHoveredActionSet = defineComponent();

export const HoverButton = defineComponent({ type: Types.ui8 });
export const TextButton = defineComponent({ labelRef: Types.eid });
export const HoldableButton = defineComponent();
export const SingleActionButton = defineComponent();

export const Pen = defineComponent();
export const HoverMenuChild = defineComponent();
export const Static = defineComponent();
export const Inspectable = defineComponent();
export const PreventAudioBoost = defineComponent();
export const IgnoreSpaceBubble = defineComponent();
export const Rigidbody = defineComponent({ bodyId: Types.ui16, collisionGroup: Types.ui32, collisionMask: Types.ui32 });
export const PhysicsShape = defineComponent({ bodyId: Types.ui16, shapeId: Types.ui16, halfExtents: [Types.f32, 3] });
export const Pinnable = defineComponent();
export const Pinned = defineComponent();

export const FloatyObject = defineComponent({ flags: Types.ui8, releaseGravity: Types.f32 });

export const CameraTool = defineComponent({
  snapTime: Types.f32,
  state: Types.ui8,
  captureDurIdx: Types.ui8,

  snapMenuRef: Types.eid,
  button_next: Types.eid,
  button_prev: Types.eid,
  snapRef: Types.eid,
  cancelRef: Types.eid,
  recVideoRef: Types.eid,
  screenRef: Types.eid,
  selfieScreenRef: Types.eid,
  cameraRef: Types.eid,
  countdownLblRef: Types.eid,
  captureDurLblRef: Types.eid
});

window.$C = {
  CameraTool
};
