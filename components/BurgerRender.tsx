import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { IngredientType, INGREDIENTS } from '../types';
import * as THREE from 'three';

interface BurgerRenderProps {
  ingredients: IngredientType[];
  isTarget?: boolean;
}

const IngredientMesh: React.FC<{ type: IngredientType; position: [number, number, number] }> = ({ type, position }) => {
  const def = INGREDIENTS[type];
  const meshRef = useRef<THREE.Mesh>(null);

  // Simple animation for floating/bobbing if it's the target display
  useFrame((state) => {
    if (meshRef.current && position[0] !== 0) { // Only animate if not center stack
        meshRef.current.rotation.y += 0.01;
    }
  });

  let geometry;
  
  switch (def.shape) {
    case 'sphere_half':
      // Top Bun
      geometry = <sphereGeometry args={[def.radius, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />;
      break;
    case 'box':
      // Cheese
      geometry = <boxGeometry args={[def.radius * 1.5, def.height, def.radius * 1.5]} />;
      break;
    case 'rough':
      // Lettuce - Use a slightly distorted cylinder or torus
      geometry = <torusKnotGeometry args={[def.radius * 0.6, 0.1, 64, 8, 2, 3]} />;
      break;
    case 'cylinder':
    default:
      geometry = <cylinderGeometry args={[def.radius, def.radius, def.height, 32]} />;
      break;
  }

  return (
    <mesh ref={meshRef} position={new THREE.Vector3(...position)} castShadow receiveShadow>
      {geometry}
      <meshStandardMaterial color={def.color} roughness={0.3} />
    </mesh>
  );
};

export const BurgerRender: React.FC<BurgerRenderProps> = ({ ingredients, isTarget }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current && isTarget) {
       // Rotate the target burger slowly
       groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.5;
    }
  });

  // Calculate stack positions
  let currentY = 0;
  const renderedIngredients = ingredients.map((type, index) => {
    const def = INGREDIENTS[type];
    const yPos = currentY + def.height / 2;
    currentY += def.height;
    
    // Add a little random rotation for realism if it's the player stack
    const rotation = isTarget ? 0 : (Math.random() - 0.5) * 0.2;

    return (
      <group key={`${index}-${type}`} rotation={[0, rotation, 0]}>
         <IngredientMesh type={type} position={[0, yPos, 0]} />
      </group>
    );
  });

  return (
    <group ref={groupRef}>
      {/* Plate */}
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <cylinderGeometry args={[2.5, 2.2, 0.2, 32]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {renderedIngredients}
    </group>
  );
};