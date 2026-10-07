import { RoundedBox } from '@react-three/drei';
import type { RoomItem } from './room-core';

type Vector = [number, number, number];
function Block({
  at,
  size,
  color,
  radius = 0.035,
}: {
  at: Vector;
  size: Vector;
  color: string;
  radius?: number;
}) {
  return (
    <RoundedBox
      position={at}
      args={size}
      radius={Math.min(radius, ...size.map((value) => value / 3))}
      smoothness={2}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={color} roughness={0.85} />
    </RoundedBox>
  );
}
function Cylinder({
  at,
  radius,
  height,
  color,
  topRadius = radius,
}: {
  at: Vector;
  radius: number;
  topRadius?: number;
  height: number;
  color: string;
}) {
  return (
    <mesh position={at} castShadow receiveShadow>
      <cylinderGeometry args={[topRadius, radius, height, 16]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
}
function Legs({ width, depth, height }: { width: number; depth: number; height: number }) {
  return (
    <>
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <Block
            key={`${x}-${z}`}
            at={[x * (width / 2 - 0.1), height / 2, z * (depth / 2 - 0.1)]}
            size={[0.08, height, 0.08]}
            color="#a17b5c"
          />
        )),
      )}
    </>
  );
}

/** Hình học nguyên bản nằm trong footprint catalog; không tải model hoặc texture bên ngoài. */
export function FurnitureModel({ item, night }: { item: RoomItem; night: boolean }) {
  const { color, kind } = item;
  if (kind === 'bed')
    return (
      <>
        <Block at={[0, 0.21, 0]} size={[1.7, 0.3, 2.05]} color="#b58e69" />
        <Block at={[0, 0.43, 0]} size={[1.62, 0.21, 1.96]} color="#f6f0e6" radius={0.08} />
        <Block at={[0, 0.56, 0.37]} size={[1.64, 0.14, 1.17]} color={color} radius={0.065} />
        <Block at={[-0.42, 0.59, -0.62]} size={[0.66, 0.16, 0.47]} color="#fff9ef" radius={0.07} />
        <Block at={[0.42, 0.59, -0.62]} size={[0.66, 0.16, 0.47]} color="#eee6d9" radius={0.07} />
        <Block at={[0, 0.43, -0.94]} size={[1.7, 0.82, 0.15]} color={color} />
      </>
    );
  if (kind === 'desk')
    return (
      <>
        <Legs width={1.6} depth={0.75} height={0.69} />
        <Block at={[0, 0.75, 0]} size={[1.6, 0.12, 0.75]} color={color} />
        <Block at={[-0.21, 0.824, -0.1]} size={[0.58, 0.025, 0.37]} color="#dedee4" />
        <Block at={[-0.21, 1.02, -0.255]} size={[0.58, 0.36, 0.025]} color="#7a8990" />
        <Block at={[-0.21, 1.02, -0.238]} size={[0.52, 0.29, 0.012]} color="#c4d9df" />
        <Cylinder at={[0.52, 0.87, 0.05]} radius={0.06} height={0.13} color="#f2eee6" />
      </>
    );
  if (kind === 'chair')
    return (
      <>
        <Legs width={0.65} depth={0.65} height={0.4} />
        <Block at={[0, 0.46, 0]} size={[0.65, 0.12, 0.65]} color={color} radius={0.07} />
        <Block at={[0, 0.8, 0.265]} size={[0.65, 0.5, 0.12]} color={color} radius={0.055} />
      </>
    );
  if (kind === 'shelf')
    return (
      <>
        <Block at={[0, 0.81, -0.225]} size={[1.2, 1.55, 0.05]} color={color} />
        {[-0.56, 0.56].map((x) => (
          <Block key={x} at={[x, 0.8, 0]} size={[0.08, 1.6, 0.5]} color={color} />
        ))}
        {[0.06, 0.55, 1.05, 1.54].map((y) => (
          <Block key={y} at={[0, y, 0]} size={[1.2, 0.07, 0.5]} color={color} />
        ))}
        {['#99aba1', '#b9a0ba', '#dcb17e', '#889fa9', '#ceaba3'].map((book, index) => (
          <Block
            key={book}
            at={[-0.39 + index * 0.17, 0.75, -0.03]}
            size={[0.12, 0.34, 0.25]}
            color={book}
          />
        ))}
        <Block at={[-0.22, 0.14, -0.01]} size={[0.55, 0.07, 0.31]} color="#adb9c8" />
        <Block at={[-0.25, 0.21, -0.01]} size={[0.49, 0.07, 0.28]} color="#d5b08c" />
        <Cylinder
          at={[0.25, 1.22, -0.04]}
          radius={0.11}
          topRadius={0.08}
          height={0.24}
          color="#ece2d0"
        />
      </>
    );
  if (kind === 'lamp')
    return (
      <>
        <Cylinder at={[0, 0.055, 0]} radius={0.22} height={0.07} color="#b19b7e" />
        <Cylinder at={[0, 0.75, 0]} radius={0.028} height={1.4} color="#b19b7e" />
        <mesh position={[0, 1.5, 0]} castShadow>
          <cylinderGeometry args={[0.14, 0.22, 0.34, 20]} />
          <meshStandardMaterial
            color={color}
            roughness={0.85}
            emissive={night ? '#ffe0a0' : '#000000'}
            emissiveIntensity={night ? 0.65 : 0}
          />
        </mesh>
        {night && (
          <pointLight
            position={[0, 1.36, 0]}
            intensity={3}
            distance={4}
            color="#ffdfaa"
            decay={2}
          />
        )}
      </>
    );
  return (
    <>
      <Cylinder at={[0, 0.2, 0]} radius={0.2} topRadius={0.25} height={0.36} color="#d1ab8d" />
      <Cylinder at={[0, 0.39, 0]} radius={0.23} height={0.025} color="#79624f" />
      <Cylinder at={[0, 0.65, 0]} radius={0.02} height={0.58} color="#5f7959" />
      {[
        [-0.16, 0.72, 0],
        [0.15, 0.87, 0.06],
        [-0.08, 1.03, -0.07],
        [0.13, 0.64, -0.12],
        [0, 0.89, 0.13],
      ].map((position, index) => (
        <mesh
          key={index}
          position={position as Vector}
          scale={[0.15, 0.22, 0.12]}
          rotation={[0, index, index % 2 === 0 ? -0.5 : 0.5]}
          castShadow
        >
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      ))}
    </>
  );
}
