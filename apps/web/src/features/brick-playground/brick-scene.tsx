import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
  type RefObject,
} from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Plane, Vector2, Vector3, Raycaster, PCFShadowMap, type OrthographicCamera } from 'three';
import {
  atPosition,
  dimensions,
  placementError,
  type Brick,
  type BrickLayout,
  type BrickCatalog,
} from './brick-core';
import { Baseplate, BrickModel, createResources, disposeResources } from './brick-models';
export type CameraCommand = {
  type: 'reset' | 'zoom-in' | 'zoom-out' | 'capture';
  sequence: number;
};
export interface SceneProps {
  layout: BrickLayout;
  catalog: BrickCatalog;
  selectedId: string | null;
  readonly: boolean;
  mode: 'edit' | 'orbit';
  flat: boolean;
  command: CameraCommand | null;
  trashRef?: RefObject<HTMLButtonElement | null>;
  onSelect: (id: string | null) => void;
  onMove: (brick: Brick) => void;
  onDelete: (id: string) => void;
  onReady: (renderer: 'webgl' | '2d') => void;
  onImage: (url: string) => void;
  onError: (message: string) => void;
  onTrashHover: (hover: boolean) => void;
  onDragHint: (message: string | null) => void;
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
function FlatPlan(props: SceneProps) {
  useEffect(() => props.onReady('2d'), [props.onReady]);
  return (
    <div className="brick-flat-wrap">
      <p>Sơ đồ 2D · Chọn gạch trong danh sách và chỉnh tọa độ bên trái.</p>
      <div className="brick-flat" role="group" aria-label="Sơ đồ chân đế nhìn từ trên">
        {[...props.layout.bricks]
          .sort((a, b) => a.y - b.y)
          .map((brick, index) => {
            const { width, depth } = dimensions(brick, props.catalog);
            const style = {
              left: `${(brick.x / 32) * 100}%`,
              top: `${(brick.z / 32) * 100}%`,
              width: `${(width / 32) * 100}%`,
              height: `${(depth / 32) * 100}%`,
              background: brick.color,
              zIndex: brick.y + 1,
            };
            return props.readonly ? (
              <span key={brick.id} style={style} title={`Gạch ${index + 1}, cao ${brick.y}`} />
            ) : (
              <button
                key={brick.id}
                style={style}
                aria-label={`Chọn trên sơ đồ: Gạch ${index + 1}, cao ${brick.y}`}
                aria-pressed={props.selectedId === brick.id}
                onClick={() => props.onSelect(brick.id)}
              />
            );
          })}
      </div>
    </div>
  );
}
/** Camera thuộc viewport; đổi chế độ giữ Canvas, chỉ lệnh của người dùng mới xuất PNG hoặc đặt lại góc nhìn. */
function CameraRig({ props, dragging }: { props: SceneProps; dragging: boolean }) {
  const ref = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera, size, gl, scene, invalidate } = useThree();
  const zoom = Math.min(size.width / 50, size.height / 42);
  useEffect(() => {
    const c = camera as OrthographicCamera;
    c.zoom = zoom;
    c.updateProjectionMatrix();
    ref.current?.target.set(0, 0.9, 0);
    ref.current?.update();
    invalidate();
  }, [camera, zoom, invalidate]);
  useEffect(() => {
    if (!props.command) return;
    const c = camera as OrthographicCamera;
    try {
      if (props.command.type === 'reset') {
        camera.position.set(38, 36, 44);
        ref.current?.target.set(0, 0.9, 0);
        c.zoom = zoom;
      } else if (props.command.type === 'capture') {
        gl.render(scene, camera);
        props.onImage(gl.domElement.toDataURL('image/png'));
      } else
        c.zoom = Math.min(
          zoom * 2.5,
          Math.max(zoom * 0.5, c.zoom * (props.command.type === 'zoom-in' ? 1.2 : 1 / 1.2)),
        );
      c.updateProjectionMatrix();
      ref.current?.update();
      invalidate();
    } catch {
      props.onError('Không xuất được ảnh. Thử lại hoặc đổi sang góc nhìn 3D.');
    }
  }, [props.command, camera, zoom, gl, scene, invalidate, props.onImage, props.onError]);
  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enabled={!dragging}
      enableRotate={props.mode === 'orbit' || props.readonly}
      enablePan={false}
      enableDamping={false}
      minPolarAngle={0.25}
      maxPolarAngle={Math.PI / 2.2}
    />
  );
}
interface Drag {
  brick: Brick;
  plane: Plane;
  offsetX: number;
  offsetZ: number;
  startX: number;
  startY: number;
  pointerId: number;
  candidate: Brick;
  moved: boolean;
  trash: boolean;
}
function Content(props: SceneProps & { onContextLost: () => void }) {
  const { gl, camera, invalidate } = useThree();
  const [preview, setPreview] = useState<Brick | null>(null);
  const drag = useRef<Drag | null>(null);
  const live = useRef(props);
  live.current = props;
  const resources = useMemo(() => createResources(props.catalog), [props.catalog]);
  useEffect(() => () => disposeResources(resources), [resources]);
  const ready = useRef(false);
  const readyFrame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(readyFrame.current), []);
  useFrame(() => {
    if (!ready.current) {
      ready.current = true;
      readyFrame.current = requestAnimationFrame(() => props.onReady('webgl'));
    }
  });
  /** Native capture tiếp tục kéo ngoài canvas; ray qua mặt phẳng điểm nắm giữ offset, vùng rác dùng client coordinates. */
  useEffect(() => {
    const canvas = gl.domElement;
    const raycaster = new Raycaster();
    const point = new Vector3();
    const clear = () => {
      const current = drag.current;
      drag.current = null;
      setPreview(null);
      live.current.onTrashHover(false);
      live.current.onDragHint(null);
      if (current && canvas.hasPointerCapture(current.pointerId))
        canvas.releasePointerCapture(current.pointerId);
      invalidate();
    };
    const move = (event: PointerEvent) => {
      const current = drag.current;
      if (!current || event.pointerId !== current.pointerId) return;
      if (
        Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < 5 &&
        !current.moved
      )
        return;
      current.moved = true;
      const rect = canvas.getBoundingClientRect();
      raycaster.setFromCamera(
        new Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          (-(event.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      if (raycaster.ray.intersectPlane(current.plane, point))
        current.candidate = atPosition(
          current.brick,
          point.x + 16 - current.offsetX,
          point.z + 16 - current.offsetZ,
          live.current.layout.bricks,
          live.current.catalog,
        );
      const trash = live.current.trashRef?.current?.getBoundingClientRect();
      current.trash =
        !!trash &&
        event.clientX >= trash.left &&
        event.clientX <= trash.right &&
        event.clientY >= trash.top &&
        event.clientY <= trash.bottom;
      const error = placementError(
        current.candidate,
        live.current.layout.bricks,
        live.current.catalog,
      );
      live.current.onTrashHover(current.trash);
      live.current.onDragHint(
        current.trash
          ? 'Thả để bỏ viên gạch'
          : error ||
              `Đặt tại ${current.candidate.x}, ${current.candidate.z} · cao ${current.candidate.y}`,
      );
      setPreview({ ...current.candidate });
    };
    const finish = (event: PointerEvent) => {
      const current = drag.current;
      if (!current || event.pointerId !== current.pointerId) return;
      move(event);
      if (current.moved) {
        if (current.trash) live.current.onDelete(current.brick.id);
        else live.current.onMove(current.candidate);
      }
      clear();
    };
    const cancel = () => {
      if (drag.current) clear();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancel();
    };
    const lost = (event: Event) => {
      event.preventDefault();
      cancel();
      live.current.onContextLost();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', escape);
    canvas.addEventListener('webglcontextlost', lost);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', escape);
      canvas.removeEventListener('webglcontextlost', lost);
      const current = drag.current;
      if (current && canvas.hasPointerCapture(current.pointerId))
        canvas.releasePointerCapture(current.pointerId);
    };
  }, [gl, camera, invalidate]);
  const begin = (event: ThreeEvent<PointerEvent>, brick: Brick) => {
    if (
      props.readonly ||
      props.mode !== 'edit' ||
      event.button !== 0 ||
      event.nativeEvent.isPrimary === false
    )
      return;
    event.stopPropagation();
    props.onSelect(brick.id);
    drag.current = {
      brick,
      plane: new Plane(new Vector3(0, 1, 0), -event.point.y),
      offsetX: event.point.x + 16 - brick.x,
      offsetZ: event.point.z + 16 - brick.z,
      startX: event.nativeEvent.clientX,
      startY: event.nativeEvent.clientY,
      pointerId: event.pointerId,
      candidate: brick,
      moved: false,
      trash: false,
    };
    gl.domElement.setPointerCapture(event.pointerId);
    setPreview(brick);
  };
  return (
    <>
      <color attach="background" args={['#eef3f5']} />
      <ambientLight intensity={1.6} />
      <hemisphereLight args={['#fff9ed', '#c0cddd', 0.9]} />
      <directionalLight
        position={[15, 35, 20]}
        intensity={2.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-27}
        shadow-camera-right={27}
        shadow-camera-top={27}
        shadow-camera-bottom={-27}
        shadow-bias={-0.0003}
      />
      <mesh position={[0, -0.38, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#eef3f5" roughness={1} />
      </mesh>
      <group
        onPointerDown={() => {
          if (!drag.current && !props.readonly) props.onSelect(null);
        }}
      >
        <Baseplate resources={resources} />
      </group>
      {props.layout.bricks.map((brick) => {
        const current = preview?.id === brick.id ? preview : brick;
        const invalid = !!placementError(current, props.layout.bricks, props.catalog);
        return (
          <group
            key={brick.id}
            name={`brick-${brick.id}`}
            onPointerDown={(event) => begin(event, brick)}
          >
            <BrickModel
              brick={current}
              catalog={props.catalog}
              resources={resources}
              selected={props.selectedId === brick.id}
              preview={preview?.id === brick.id ? (invalid ? 'invalid' : 'valid') : null}
            />
          </group>
        );
      })}
      <CameraRig props={props} dragging={!!preview} />
    </>
  );
}
export default function BrickScene(props: SceneProps) {
  const [lost, setLost] = useState(false);
  const onContextLost = useCallback(() => setLost(true), []);
  const fallback = <FlatPlan {...props} />;
  if (props.flat || lost) return fallback;
  return (
    <GraphicsBoundary fallback={fallback}>
      <Canvas
        orthographic
        camera={{ position: [38, 36, 44], near: 0.1, far: 250 }}
        shadows={{ type: PCFShadowMap }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, preserveDrawingBuffer: true, powerPreference: 'low-power' }}
        frameloop="demand"
        fallback={fallback}
        role="group"
        aria-label="Chân đế 3D tương tác; dùng danh sách và thuộc tính để thao tác bằng bàn phím."
      >
        <Content {...props} onContextLost={onContextLost} />
      </Canvas>
    </GraphicsBoundary>
  );
}
