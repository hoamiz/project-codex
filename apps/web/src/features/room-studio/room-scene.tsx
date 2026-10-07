import { Component, useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { PCFShadowMap, Plane, Vector3, type OrthographicCamera } from 'three';
import { FurnitureModel } from './room-models';
import {
  footprint,
  placementError,
  snap,
  type RoomCatalog,
  type RoomItem,
  type RoomLayout,
} from './room-core';

export type CameraCommand = {
  type: 'reset' | 'zoom-in' | 'zoom-out' | 'capture';
  sequence: number;
};
interface SceneProps {
  layout: RoomLayout;
  catalog: RoomCatalog;
  selectedId: string | null;
  readonly: boolean;
  mode: 'edit' | 'orbit';
  command: CameraCommand | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, z: number) => void;
  onReady: (renderer: 'webgl' | '2d') => void;
  onImage: (url: string) => void;
}

class GraphicsBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function FloorPlan(props: SceneProps) {
  useEffect(() => props.onReady('2d'), [props.onReady]);
  return (
    <div className="room-floorplan-wrapper">
      <div className="room-floorplan-note">
        Sơ đồ 2D · Chọn đồ và chỉnh vị trí bằng bảng điều khiển.
      </div>
      <div
        className="room-floorplan"
        style={{
          background: props.layout.floorColor,
          borderColor: props.layout.wallColor,
          aspectRatio: `${props.catalog.room.width}/${props.catalog.room.depth}`,
        }}
        aria-label="Sơ đồ căn phòng"
      >
        {props.layout.items.map((item, index) => {
          const [width, depth] = footprint(item, props.catalog);
          const spec = props.catalog.items.find((entry) => entry.kind === item.kind)!;
          const style = {
            left: `${((item.x + props.catalog.room.width / 2) / props.catalog.room.width) * 100}%`,
            top: `${((item.z + props.catalog.room.depth / 2) / props.catalog.room.depth) * 100}%`,
            width: `${(width / props.catalog.room.width) * 100}%`,
            height: `${(depth / props.catalog.room.depth) * 100}%`,
            background: item.color,
          };
          return props.readonly ? (
            <span key={item.id} className="room-floor-item" style={style}>
              <span>{spec.label}</span>
            </span>
          ) : (
            <button
              key={item.id}
              className="room-floor-item"
              style={style}
              aria-label={`Chọn trên sơ đồ: ${spec.label} ${index + 1}`}
              aria-pressed={item.id === props.selectedId}
              onClick={() => props.onSelect(item.id)}
            >
              <span>{spec.label}</span>
            </button>
          );
        })}
      </div>
      <small>6 × 5 m · Hướng tường cửa sổ ở phía trên</small>
    </div>
  );
}

function Architecture({ layout, onDeselect }: { layout: RoomLayout; onDeselect: () => void }) {
  const night = layout.lighting === 'night';
  return (
    <>
      <mesh position={[0, -0.11, 0]} receiveShadow onPointerDown={onDeselect}>
        <boxGeometry args={[6.16, 0.22, 5.16]} />
        <meshStandardMaterial color={layout.floorColor} roughness={0.9} />
      </mesh>
      {Array.from({ length: 11 }, (_, index) => (
        <mesh key={index} position={[-2.5 + index * 0.5, 0.003, 0]}>
          <boxGeometry args={[0.008, 0.008, 5.12]} />
          <meshStandardMaterial color="#8c735d" transparent opacity={0.27} />
        </mesh>
      ))}
      <mesh position={[0, 1.38, -2.57]} castShadow receiveShadow>
        <boxGeometry args={[6.16, 2.76, 0.14]} />
        <meshStandardMaterial color={layout.wallColor} roughness={0.9} />
      </mesh>
      <mesh position={[-3.07, 1.38, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.14, 2.76, 5.16]} />
        <meshStandardMaterial color={layout.wallColor} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.1, -2.475]}>
        <boxGeometry args={[6, 0.2, 0.06]} />
        <meshStandardMaterial color="#f8f2e8" />
      </mesh>
      <mesh position={[-2.975, 0.1, 0]}>
        <boxGeometry args={[0.06, 0.2, 5]} />
        <meshStandardMaterial color="#f8f2e8" />
      </mesh>
      <group position={[1, 1.75, -2.46]}>
        <mesh>
          <boxGeometry args={[1.65, 1.28, 0.035]} />
          <meshStandardMaterial color="#fbf6ed" />
        </mesh>
        <mesh position={[0, 0, 0.025]}>
          <boxGeometry args={[1.48, 1.1, 0.02]} />
          <meshStandardMaterial
            color={night ? '#606e98' : '#bdd7dc'}
            emissive={night ? '#233653' : '#bdd7dc'}
            emissiveIntensity={0.12}
          />
        </mesh>
        <mesh position={[0, 0, 0.045]}>
          <boxGeometry args={[0.065, 1.15, 0.03]} />
          <meshStandardMaterial color="#fbf6ed" />
        </mesh>
        <mesh position={[0, -0.59, 0.085]} castShadow>
          <boxGeometry args={[1.8, 0.06, 0.21]} />
          <meshStandardMaterial color="#f5eee4" />
        </mesh>
      </group>
      <group position={[-2.965, 1.68, 0.6]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[0.91, 1.12, 0.025]} />
          <meshStandardMaterial color="#c39e7b" />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[0.8, 1.01, 0.02]} />
          <meshStandardMaterial color="#f4eadf" />
        </mesh>
        <mesh position={[-0.15, 0.15, 0.045]}>
          <circleGeometry args={[0.22, 24]} />
          <meshStandardMaterial color="#c9ad94" />
        </mesh>
        <mesh position={[0.13, -0.23, 0.049]}>
          <planeGeometry args={[0.38, 0.4]} />
          <meshStandardMaterial color="#91a58c" />
        </mesh>
      </group>
      <mesh position={[0, 0.009, 0.7]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.1, 48]} />
        <meshStandardMaterial color={night ? '#b2a8bc' : '#ede4d7'} roughness={1} />
      </mesh>
    </>
  );
}

/** Camera khớp kích thước canvas thực tế; thao tác xem không thay đổi layout được chia sẻ. */
function CameraRig({
  command,
  dragging,
  orbit,
  onImage,
}: {
  command: CameraCommand | null;
  dragging: boolean;
  orbit: boolean;
  onImage: SceneProps['onImage'];
}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera, size, invalidate, gl, scene } = useThree();
  const zoom = Math.min(size.width / 10.5, size.height / 8.2);
  useEffect(() => {
    const orthographic = camera as OrthographicCamera;
    orthographic.zoom = zoom;
    orthographic.updateProjectionMatrix();
    controls.current?.target.set(0, 0.7, 0);
    controls.current?.update();
    invalidate();
  }, [camera, zoom, invalidate]);
  useEffect(() => {
    if (!command) return;
    const orthographic = camera as OrthographicCamera;
    if (command.type === 'reset') {
      camera.position.set(8, 7, 9);
      controls.current?.target.set(0, 0.7, 0);
      orthographic.zoom = zoom;
    } else if (command.type === 'capture') {
      gl.render(scene, camera);
      onImage(gl.domElement.toDataURL('image/png'));
    } else
      orthographic.zoom = Math.min(
        zoom * 1.8,
        Math.max(zoom * 0.6, orthographic.zoom * (command.type === 'zoom-in' ? 1.2 : 1 / 1.2)),
      );
    orthographic.updateProjectionMatrix();
    controls.current?.update();
    invalidate();
  }, [command, camera, gl, scene, invalidate, zoom, onImage]);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={!dragging}
      enableRotate={orbit}
      enablePan={false}
      enableDamping={false}
      enableZoom
      minPolarAngle={Math.PI / 5}
      maxPolarAngle={Math.PI / 2.35}
    />
  );
}

function SceneContent(props: SceneProps) {
  const [preview, setPreview] = useState<RoomItem | null>(null);
  const dragging = useRef<{ id: string; offsetX: number; offsetZ: number } | null>(null);
  const ready = useRef(false);
  const plane = useRef(new Plane(new Vector3(0, 1, 0), 0));
  const point = useRef(new Vector3());
  const night = props.layout.lighting === 'night';
  const readyFrame = useRef(0);
  useFrame(() => {
    if (ready.current) return;
    ready.current = true;
    readyFrame.current = requestAnimationFrame(() => props.onReady('webgl'));
  });
  useEffect(() => () => cancelAnimationFrame(readyFrame.current), []);

  /** Chiếu ray con trỏ lên sàn và giữ offset điểm nắm; preview chưa ghi history/localStorage. */
  const beginDrag = (event: ThreeEvent<PointerEvent>, item: RoomItem) => {
    if (props.readonly || props.mode !== 'edit' || event.button !== 0) return;
    event.stopPropagation();
    props.onSelect(item.id);
    if (!event.ray.intersectPlane(plane.current, point.current)) return;
    dragging.current = {
      id: item.id,
      offsetX: point.current.x - item.x,
      offsetZ: point.current.z - item.z,
    };
    // R3F bổ sung capture vào target để tiếp tục raycast khi con trỏ rời model.
    (event.target as Element | null)?.setPointerCapture(event.pointerId);
    setPreview(item);
  };
  const moveDrag = (event: ThreeEvent<PointerEvent>, item: RoomItem) => {
    if (dragging.current?.id !== item.id) return;
    event.stopPropagation();
    if (!event.ray.intersectPlane(plane.current, point.current)) return;
    setPreview({
      ...item,
      x: snap(point.current.x - dragging.current.offsetX, props.catalog.room.snap),
      z: snap(point.current.z - dragging.current.offsetZ, props.catalog.room.snap),
    });
  };
  const finishDrag = (event: ThreeEvent<PointerEvent>, item: RoomItem, cancel = false) => {
    if (dragging.current?.id !== item.id) return;
    event.stopPropagation();
    if (preview && !cancel) props.onMove(item.id, preview.x, preview.z);
    dragging.current = null;
    setPreview(null);
    try {
      (event.target as Element | null)?.releasePointerCapture(event.pointerId);
    } catch {
      /* Trình duyệt có thể đã thu hồi capture khi pointer bị hủy. */
    }
  };
  return (
    <>
      <color attach="background" args={[night ? '#292a38' : '#f1ede6']} />
      <ambientLight intensity={night ? 0.7 : 1.6} color={night ? '#c3c6ef' : '#fff7ee'} />
      <hemisphereLight args={[night ? '#a7b4da' : '#fff9ed', '#beaa96', night ? 0.45 : 0.9]} />
      <directionalLight
        position={[4, 8, 5]}
        intensity={night ? 0.7 : 3}
        color={night ? '#cdd6ff' : '#ffeed7'}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0006}
        shadow-normalBias={0.025}
      />
      <Architecture
        layout={props.layout}
        onDeselect={() => {
          if (!props.readonly && !dragging.current && props.mode === 'edit') props.onSelect(null);
        }}
      />
      {props.layout.items.map((item) => {
        const current = preview?.id === item.id ? preview : item;
        const spec = props.catalog.items.find((entry) => entry.kind === item.kind)!;
        const selected = props.selectedId === item.id;
        const invalid =
          preview?.id === item.id && !!placementError(current, props.layout.items, props.catalog);
        return (
          <group
            name={`room-item-${item.id}`}
            key={item.id}
            position={[current.x, 0, current.z]}
            rotation={[0, (current.rotation * Math.PI) / 180, 0]}
            onPointerDown={(event) => beginDrag(event, item)}
            onPointerMove={(event) => moveDrag(event, item)}
            onPointerUp={(event) => finishDrag(event, item)}
            onPointerCancel={(event) => finishDrag(event, item, true)}
          >
            <FurnitureModel item={current} night={night} />
            {(selected || invalid) && (
              <mesh position={[0, 0.025, 0]}>
                <boxGeometry args={[spec.width + 0.08, 0.015, spec.depth + 0.08]} />
                <meshBasicMaterial
                  color={invalid ? '#c94357' : '#8d78b1'}
                  transparent
                  opacity={0.28}
                  depthWrite={false}
                />
              </mesh>
            )}
          </group>
        );
      })}
      <CameraRig
        command={props.command}
        dragging={!!preview}
        orbit={props.mode === 'orbit' || props.readonly}
        onImage={props.onImage}
      />
    </>
  );
}

export default function RoomScene(props: SceneProps & { flat: boolean }) {
  const fallback = <FloorPlan {...props} />;
  if (props.flat) return fallback;
  return (
    <GraphicsBoundary fallback={fallback}>
      <Canvas
        orthographic
        shadows={{ type: PCFShadowMap }}
        camera={{ position: [8, 7, 9], near: 0.1, far: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, preserveDrawingBuffer: true, powerPreference: 'low-power' }}
        frameloop="demand"
        fallback={fallback}
        role="group"
        aria-label="Phòng 3D tương tác; dùng bảng đồ và các nút chỉnh sửa để thao tác bằng bàn phím."
      >
        <SceneContent {...props} />
      </Canvas>
    </GraphicsBoundary>
  );
}
