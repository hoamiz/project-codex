import { useLayoutEffect, useRef } from 'react';
import {
  BoxGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  Object3D,
  type InstancedMesh,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { dimensions, type Brick, type BrickCatalog } from './brick-core';
export interface Resources {
  bodies: Map<string, RoundedBoxGeometry>;
  stud: CylinderGeometry;
  base: BoxGeometry;
  materials: Map<string, MeshStandardMaterial>;
  baseMaterial: MeshStandardMaterial;
}
/** Cache geometry/material thuộc scene; các gạch dùng chung rồi dispose khi rời route. */
export function createResources(catalog: BrickCatalog): Resources {
  const bodies = new Map<string, RoundedBoxGeometry>();
  for (const s of catalog.kinds)
    for (const [w, d] of [
      [s.width, s.depth],
      [s.depth, s.width],
    ]) {
      const key = `${w}:${d}:${s.height}`;
      if (!bodies.has(key))
        bodies.set(
          key,
          new RoundedBoxGeometry(w - 0.07, s.height * 0.4 - 0.035, d - 0.07, 2, 0.055),
        );
    }
  return {
    bodies,
    stud: new CylinderGeometry(0.29, 0.29, 0.15, 12),
    base: new BoxGeometry(32, 0.35, 32),
    materials: new Map(
      catalog.colors.map((c) => [
        c.value,
        new MeshStandardMaterial({ color: c.value, roughness: 0.32, metalness: 0.025 }),
      ]),
    ),
    baseMaterial: new MeshStandardMaterial({ color: '#739b87', roughness: 0.75 }),
  };
}
export function disposeResources(r: Resources) {
  for (const g of r.bodies.values()) g.dispose();
  r.stud.dispose();
  r.base.dispose();
  for (const m of r.materials.values()) m.dispose();
  r.baseMaterial.dispose();
}
function Studs({
  width,
  depth,
  top,
  resources,
  color,
  base = false,
}: {
  width: number;
  depth: number;
  top: number;
  resources: Resources;
  color: string;
  base?: boolean;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const matrix = new Object3D();
    let i = 0;
    for (let z = 0; z < depth; z++)
      for (let x = 0; x < width; x++) {
        matrix.position.set(x + 0.5, top + 0.06, z + 0.5);
        matrix.updateMatrix();
        ref.current!.setMatrixAt(i++, matrix.matrix);
      }
    ref.current!.instanceMatrix.needsUpdate = true;
    ref.current!.computeBoundingSphere();
  }, [width, depth, top]);
  return (
    <instancedMesh
      ref={ref}
      args={[
        resources.stud,
        base ? resources.baseMaterial : resources.materials.get(color),
        width * depth,
      ]}
      castShadow
      receiveShadow
      dispose={null}
    />
  );
}
export function Baseplate({ resources }: { resources: Resources }) {
  return (
    <group position={[-16, 0, -16]} name="brick-baseplate">
      <mesh
        geometry={resources.base}
        material={resources.baseMaterial}
        position={[16, -0.175, 16]}
        receiveShadow
        dispose={null}
      />
      <Studs width={32} depth={32} top={0} resources={resources} color="" base />
    </group>
  );
}
export function BrickModel({
  brick,
  catalog,
  resources,
  preview,
  selected,
}: {
  brick: Brick;
  catalog: BrickCatalog;
  resources: Resources;
  preview: 'valid' | 'invalid' | null;
  selected: boolean;
}) {
  const { width, depth, height } = dimensions(brick, catalog);
  return (
    <group position={[brick.x - 16, brick.y * 0.4, brick.z - 16]}>
      <mesh
        geometry={resources.bodies.get(`${width}:${depth}:${height}`)}
        material={preview ? undefined : resources.materials.get(brick.color.toLowerCase())}
        position={[width / 2, height * 0.2, depth / 2]}
        castShadow
        receiveShadow
        dispose={null}
      >
        {preview && (
          <meshStandardMaterial
            color={preview === 'invalid' ? '#dc2626' : '#16a34a'}
            transparent
            opacity={0.6}
          />
        )}
      </mesh>
      <Studs
        width={width}
        depth={depth}
        top={height * 0.4}
        resources={resources}
        color={brick.color.toLowerCase()}
      />
      {selected && (
        <mesh position={[width / 2, 0.02, depth / 2]}>
          <boxGeometry args={[width + 0.12, 0.015, depth + 0.12]} />
          <meshBasicMaterial
            color={preview === 'invalid' ? '#dc2626' : '#315f97'}
            transparent
            opacity={0.35}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
