import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Play, Pause, RotateCcw, Move, Eye, Settings, Home, Maximize } from 'lucide-react';

interface Walkthrough3DProps {
  floorPlan: any;
  ilots: any[];
  walls: any[];
  corridors: any[];
  onClose: () => void;
}

interface WalkthroughControls {
  isPlaying: boolean;
  speed: number;
  viewMode: 'walk' | 'fly' | 'orbit';
  lighting: 'natural' | 'artificial' | 'mixed';
  quality: 'high' | 'medium' | 'low';
}

export default function Walkthrough3D({ floorPlan, ilots, walls, corridors, onClose }: Walkthrough3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const controlsRef = useRef<any>();
  const animationRef = useRef<number>();
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [controls, setControls] = useState<WalkthroughControls>({
    isPlaying: false,
    speed: 1.0,
    viewMode: 'walk',
    lighting: 'natural',
    quality: 'high'
  });
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 180, z: 0 });
  const [walkPath, setWalkPath] = useState<THREE.Vector3[]>([]);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);

  // Initialize 3D scene with realistic materials and lighting
  const initializeScene = useCallback(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);
    scene.fog = new THREE.Fog(0xf8f9fa, 1000, 5000);

    // Camera setup for first-person walkthrough
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      1,
      10000
    );
    camera.position.set(0, 180, 0); // Human eye level (180cm)

    // High-quality renderer with realistic settings
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    mountRef.current.appendChild(renderer.domElement);

    // Store references
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    // Add realistic lighting system
    setupLighting(scene);
    
    // Generate 3D geometry from floor plan data
    generateFloorGeometry(scene);
    generateWallGeometry(scene);
    generateIlotGeometry(scene);
    generateCorridorGeometry(scene);
    
    // Add environmental elements for realism
    addEnvironmentalElements(scene);
    
    // Generate walkthrough path
    generateWalkPath();
    
    // Setup controls
    setupControls(camera, renderer.domElement);
    
    setIsInitialized(true);
  }, [floorPlan, ilots, walls, corridors]);

  // Realistic lighting system
  const setupLighting = (scene: THREE.Scene) => {
    // Natural lighting from windows
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);

    // Directional sunlight through windows
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    sunLight.position.set(1000, 2000, 1000);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 5000;
    sunLight.shadow.camera.left = -2000;
    sunLight.shadow.camera.right = 2000;
    sunLight.shadow.camera.top = 2000;
    sunLight.shadow.camera.bottom = -2000;
    scene.add(sunLight);

    // Interior artificial lighting
    const ceilingLights = generateCeilingLights();
    ceilingLights.forEach(light => scene.add(light));

    // Add realistic window lighting
    generateWindowLighting(scene);
  };

  // Generate ceiling lighting grid
  const generateCeilingLights = (): THREE.Light[] => {
    const lights: THREE.Light[] = [];
    const lightSpacing = 400; // 4m spacing
    const ceilingHeight = 280; // 2.8m ceiling
    
    // Calculate grid based on floor plan bounds
    const bounds = calculateFloorBounds();
    
    for (let x = bounds.minX; x <= bounds.maxX; x += lightSpacing) {
      for (let z = bounds.minZ; z <= bounds.maxZ; z += lightSpacing) {
        // Check if position is inside floor area and not in walls
        if (isPositionInsideFloor(x, z) && !isPositionInWall(x, z)) {
          const light = new THREE.PointLight(0xffffff, 0.8, 800);
          light.position.set(x, ceilingHeight, z);
          light.castShadow = true;
          light.shadow.mapSize.width = 1024;
          light.shadow.mapSize.height = 1024;
          lights.push(light);
          
          // Add visible light fixture
          const fixtureGeometry = new THREE.CylinderGeometry(15, 15, 10, 16);
          const fixtureMaterial = new THREE.MeshLambertMaterial({ color: 0xe0e0e0 });
          const fixture = new THREE.Mesh(fixtureGeometry, fixtureMaterial);
          fixture.position.set(x, ceilingHeight - 5, z);
          lights.push(fixture as any);
        }
      }
    }
    
    return lights;
  };

  // Generate realistic window lighting effects
  const generateWindowLighting = (scene: THREE.Scene) => {
    // Find exterior walls for window placement
    const exteriorWalls = walls.filter(wall => wall.isExterior);
    
    exteriorWalls.forEach(wall => {
      // Add window light sources along exterior walls
      const windowSpacing = 300; // 3m between windows
      const windowHeight = 150; // 1.5m from floor
      
      const wallLength = Math.sqrt(
        Math.pow(wall.end.x - wall.start.x, 2) + 
        Math.pow(wall.end.y - wall.start.y, 2)
      );
      
      const numWindows = Math.floor(wallLength / windowSpacing);
      
      for (let i = 1; i <= numWindows; i++) {
        const t = i / (numWindows + 1);
        const windowX = wall.start.x + t * (wall.end.x - wall.start.x);
        const windowZ = wall.start.y + t * (wall.end.y - wall.start.y);
        
        // Natural light from window
        const windowLight = new THREE.RectAreaLight(0xffffff, 2.0, 100, 150);
        windowLight.position.set(windowX, windowHeight, windowZ);
        
        // Calculate normal to wall for light orientation
        const wallNormal = new THREE.Vector2(
          -(wall.end.y - wall.start.y),
          wall.end.x - wall.start.x
        ).normalize();
        
        windowLight.lookAt(
          windowX + wallNormal.x * 100,
          windowHeight,
          windowZ + wallNormal.y * 100
        );
        
        scene.add(windowLight);
      }
    });
  };

  // Generate floor geometry with realistic materials
  const generateFloorGeometry = (scene: THREE.Scene) => {
    if (!floorPlan?.processed?.areas) return;

    const floorGeometry = new THREE.Shape();
    const bounds = calculateFloorBounds();
    
    // Create floor shape from processed areas
    floorPlan.processed.areas.forEach((area: any, index: number) => {
      if (area.points && area.points.length > 0) {
        if (index === 0) {
          floorGeometry.moveTo(area.points[0].x, area.points[0].y);
        }
        area.points.forEach((point: any, i: number) => {
          if (i > 0 || index > 0) {
            floorGeometry.lineTo(point.x, point.y);
          }
        });
      }
    });

    // Create 3D floor mesh
    const floorExtrudeSettings = {
      depth: 2,
      bevelEnabled: false
    };
    
    const floorGeom = new THREE.ExtrudeGeometry(floorGeometry, floorExtrudeSettings);
    
    // Realistic floor material (polished concrete/wood)
    const floorMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf5f5f5,
      roughness: 0.1,
      metalness: 0.0,
      reflectivity: 0.8,
      clearcoat: 0.3,
      clearcoatRoughness: 0.1
    });
    
    const floorMesh = new THREE.Mesh(floorGeom, floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);
  };

  // Generate wall geometry with realistic height and materials
  const generateWallGeometry = (scene: THREE.Scene) => {
    const wallHeight = 280; // 2.8m standard ceiling height
    
    walls.forEach(wall => {
      const wallLength = Math.sqrt(
        Math.pow(wall.end.x - wall.start.x, 2) + 
        Math.pow(wall.end.y - wall.start.y, 2)
      );
      
      // Wall geometry
      const wallGeometry = new THREE.BoxGeometry(
        wallLength,
        wallHeight,
        wall.thickness || 20
      );
      
      // Realistic wall material
      const wallMaterial = new THREE.MeshLambertMaterial({
        color: wall.isExterior ? 0xe8e8e8 : 0xf0f0f0,
        transparent: false
      });
      
      const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
      
      // Position and rotate wall
      const centerX = (wall.start.x + wall.end.x) / 2;
      const centerZ = (wall.start.y + wall.end.y) / 2;
      const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
      
      wallMesh.position.set(centerX, wallHeight / 2, centerZ);
      wallMesh.rotation.y = angle;
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      
      scene.add(wallMesh);
      
      // Add baseboards and crown molding for realism
      addWallDetails(scene, wall, wallHeight);
    });
  };

  // Add realistic wall details
  const addWallDetails = (scene: THREE.Scene, wall: any, wallHeight: number) => {
    const wallLength = Math.sqrt(
      Math.pow(wall.end.x - wall.start.x, 2) + 
      Math.pow(wall.end.y - wall.start.y, 2)
    );
    
    // Baseboard
    const baseboardGeometry = new THREE.BoxGeometry(wallLength, 15, 3);
    const baseboardMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const baseboard = new THREE.Mesh(baseboardGeometry, baseboardMaterial);
    
    const centerX = (wall.start.x + wall.end.x) / 2;
    const centerZ = (wall.start.y + wall.end.y) / 2;
    const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
    
    baseboard.position.set(centerX, 7.5, centerZ);
    baseboard.rotation.y = angle;
    scene.add(baseboard);
    
    // Crown molding
    const moldingGeometry = new THREE.BoxGeometry(wallLength, 8, 5);
    const moldingMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const molding = new THREE.Mesh(moldingGeometry, moldingMaterial);
    
    molding.position.set(centerX, wallHeight - 4, centerZ);
    molding.rotation.y = angle;
    scene.add(molding);
  };

  // Generate realistic îlot geometry with furniture details
  const generateIlotGeometry = (scene: THREE.Scene) => {
    ilots.forEach((ilot, index) => {
      // Îlot base platform
      const ilotGeometry = new THREE.BoxGeometry(
        ilot.width,
        8, // 8cm platform height
        ilot.height
      );
      
      const ilotMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x4a90e2,
        roughness: 0.3,
        metalness: 0.1,
        reflectivity: 0.5
      });
      
      const ilotMesh = new THREE.Mesh(ilotGeometry, ilotMaterial);
      ilotMesh.position.set(ilot.x, 4, ilot.y);
      ilotMesh.castShadow = true;
      ilotMesh.receiveShadow = true;
      scene.add(ilotMesh);
      
      // Add furniture elements on îlot
      addIlotFurniture(scene, ilot, index);
      
      // Add îlot number label
      addIlotLabel(scene, ilot, index);
    });
  };

  // Add realistic furniture to îlots
  const addIlotFurniture = (scene: THREE.Scene, ilot: any, index: number) => {
    const furnitureTypes = ['desk', 'chair', 'monitor', 'plant'];
    const deskHeight = 75; // 75cm desk height
    const chairHeight = 45; // 45cm chair height
    
    // Desk
    const deskGeometry = new THREE.BoxGeometry(ilot.width * 0.8, 5, ilot.height * 0.6);
    const deskMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const desk = new THREE.Mesh(deskGeometry, deskMaterial);
    desk.position.set(ilot.x, deskHeight + 4, ilot.y - ilot.height * 0.15);
    desk.castShadow = true;
    scene.add(desk);
    
    // Chair
    const chairGeometry = new THREE.BoxGeometry(50, 10, 50);
    const chairMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const chair = new THREE.Mesh(chairGeometry, chairMaterial);
    chair.position.set(ilot.x, chairHeight + 4, ilot.y + ilot.height * 0.25);
    chair.castShadow = true;
    scene.add(chair);
    
    // Chair back
    const chairBackGeometry = new THREE.BoxGeometry(50, 80, 8);
    const chairBack = new THREE.Mesh(chairBackGeometry, chairMaterial);
    chairBack.position.set(ilot.x, chairHeight + 44, ilot.y + ilot.height * 0.35);
    chairBack.castShadow = true;
    scene.add(chairBack);
    
    // Monitor
    const monitorGeometry = new THREE.BoxGeometry(60, 35, 5);
    const monitorMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
    const monitor = new THREE.Mesh(monitorGeometry, monitorMaterial);
    monitor.position.set(ilot.x, deskHeight + 25, ilot.y - ilot.height * 0.2);
    monitor.castShadow = true;
    scene.add(monitor);
    
    // Decorative plant
    if (index % 3 === 0) {
      const plantPotGeometry = new THREE.CylinderGeometry(15, 15, 20, 16);
      const plantPotMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
      const plantPot = new THREE.Mesh(plantPotGeometry, plantPotMaterial);
      plantPot.position.set(
        ilot.x + ilot.width * 0.3,
        deskHeight + 15,
        ilot.y + ilot.height * 0.3
      );
      scene.add(plantPot);
      
      // Simple plant leaves
      const leavesGeometry = new THREE.SphereGeometry(25, 8, 6);
      const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });
      const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
      leaves.position.set(
        ilot.x + ilot.width * 0.3,
        deskHeight + 35,
        ilot.y + ilot.height * 0.3
      );
      scene.add(leaves);
    }
  };

  // Add îlot number labels
  const addIlotLabel = (scene: THREE.Scene, ilot: any, index: number) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 128;
    canvas.height = 64;
    
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 128, 64);
    context.fillStyle = '#333333';
    context.font = 'bold 24px Arial';
    context.textAlign = 'center';
    context.fillText(`${index + 1}`, 64, 40);
    
    const texture = new THREE.CanvasTexture(canvas);
    const labelMaterial = new THREE.MeshBasicMaterial({ 
      map: texture,
      transparent: true
    });
    
    const labelGeometry = new THREE.PlaneGeometry(40, 20);
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.position.set(ilot.x, 120, ilot.y);
    label.lookAt(cameraRef.current?.position || new THREE.Vector3(0, 180, 0));
    scene.add(label);
  };

  // Generate corridor geometry with realistic width and materials
  const generateCorridorGeometry = (scene: THREE.Scene) => {
    corridors.forEach(corridor => {
      const corridorGeometry = new THREE.BoxGeometry(
        corridor.width,
        2, // 2cm marking height
        corridor.length
      );
      
      const corridorMaterial = new THREE.MeshLambertMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.8
      });
      
      const corridorMesh = new THREE.Mesh(corridorGeometry, corridorMaterial);
      corridorMesh.position.set(corridor.x, 1, corridor.y);
      corridorMesh.receiveShadow = true;
      scene.add(corridorMesh);
    });
  };

  // Add environmental elements for realism
  const addEnvironmentalElements = (scene: THREE.Scene) => {
    // Ceiling
    const bounds = calculateFloorBounds();
    const ceilingGeometry = new THREE.PlaneGeometry(
      bounds.maxX - bounds.minX + 100,
      bounds.maxZ - bounds.minZ + 100
    );
    const ceilingMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xffffff,
      side: THREE.DoubleSide
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(
      (bounds.maxX + bounds.minX) / 2,
      280,
      (bounds.maxZ + bounds.minZ) / 2
    );
    ceiling.receiveShadow = true;
    scene.add(ceiling);
  };

  // Generate intelligent walkthrough path
  const generateWalkPath = () => {
    const path: THREE.Vector3[] = [];
    const bounds = calculateFloorBounds();
    const eyeLevel = 180; // 1.8m eye level
    
    // Create a systematic walk path through corridors and around îlots
    corridors.forEach((corridor, index) => {
      // Walk along corridor centerline
      const segments = 10;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = corridor.x + (corridor.endX - corridor.x) * t;
        const z = corridor.y + (corridor.endY - corridor.y) * t;
        path.push(new THREE.Vector3(x, eyeLevel, z));
      }
      
      // Add pause points near îlots for viewing
      if (index % 2 === 0) {
        path.push(new THREE.Vector3(corridor.x, eyeLevel, corridor.y));
      }
    });
    
    // Add perimeter walk if no corridors
    if (path.length === 0) {
      const margin = 200;
      path.push(new THREE.Vector3(bounds.minX + margin, eyeLevel, bounds.minZ + margin));
      path.push(new THREE.Vector3(bounds.maxX - margin, eyeLevel, bounds.minZ + margin));
      path.push(new THREE.Vector3(bounds.maxX - margin, eyeLevel, bounds.maxZ - margin));
      path.push(new THREE.Vector3(bounds.minX + margin, eyeLevel, bounds.maxZ - margin));
      path.push(new THREE.Vector3(bounds.minX + margin, eyeLevel, bounds.minZ + margin));
    }
    
    setWalkPath(path);
  };

  // Setup camera controls
  const setupControls = (camera: THREE.Camera, domElement: HTMLElement) => {
    // Simple WASD + mouse look controls for first-person view
    const keys = { w: false, a: false, s: false, d: false };
    const mouse = { x: 0, y: 0, isDown: false };
    const moveSpeed = 200; // 2m/s walking speed
    
    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW': keys.w = true; break;
        case 'KeyA': keys.a = true; break;
        case 'KeyS': keys.s = true; break;
        case 'KeyD': keys.d = true; break;
      }
    };
    
    const onKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW': keys.w = false; break;
        case 'KeyA': keys.a = false; break;
        case 'KeyS': keys.s = false; break;
        case 'KeyD': keys.d = false; break;
      }
    };
    
    const onMouseDown = (event: MouseEvent) => {
      mouse.isDown = true;
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };
    
    const onMouseUp = () => {
      mouse.isDown = false;
    };
    
    const onMouseMove = (event: MouseEvent) => {
      if (!mouse.isDown) return;
      
      const deltaX = event.clientX - mouse.x;
      const deltaY = event.clientY - mouse.y;
      
      camera.rotation.y -= deltaX * 0.002;
      camera.rotation.x -= deltaY * 0.002;
      camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x));
      
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };
    
    domElement.addEventListener('keydown', onKeyDown);
    domElement.addEventListener('keyup', onKeyUp);
    domElement.addEventListener('mousedown', onMouseDown);
    domElement.addEventListener('mouseup', onMouseUp);
    domElement.addEventListener('mousemove', onMouseMove);
    
    // Movement update function
    const updateMovement = () => {
      const delta = clockRef.current.getDelta();
      const distance = moveSpeed * delta;
      
      if (keys.w) camera.translateZ(-distance);
      if (keys.s) camera.translateZ(distance);
      if (keys.a) camera.translateX(-distance);
      if (keys.d) camera.translateX(distance);
      
      // Update camera position state
      setCameraPosition({
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
      });
    };
    
    controlsRef.current = { updateMovement, keys, mouse };
  };

  // Animation loop
  const animate = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    
    // Update controls
    if (controlsRef.current?.updateMovement) {
      controlsRef.current.updateMovement();
    }
    
    // Auto-walk along path if playing
    if (controls.isPlaying && walkPath.length > 0) {
      const targetIndex = Math.floor(currentPathIndex) % walkPath.length;
      const nextIndex = (targetIndex + 1) % walkPath.length;
      const t = currentPathIndex - Math.floor(currentPathIndex);
      
      const currentPos = walkPath[targetIndex];
      const nextPos = walkPath[nextIndex];
      
      if (currentPos && nextPos) {
        const interpolatedPos = currentPos.clone().lerp(nextPos, t);
        cameraRef.current.position.copy(interpolatedPos);
        
        // Look towards next position
        cameraRef.current.lookAt(nextPos);
        
        setCurrentPathIndex(prev => (prev + controls.speed * 0.02) % walkPath.length);
      }
    }
    
    // Render
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    animationRef.current = requestAnimationFrame(animate);
  }, [controls.isPlaying, controls.speed, walkPath, currentPathIndex]);

  // Helper functions
  const calculateFloorBounds = () => {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    
    if (floorPlan?.processed?.areas) {
      floorPlan.processed.areas.forEach((area: any) => {
        if (area.points) {
          area.points.forEach((point: any) => {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minZ = Math.min(minZ, point.y);
            maxZ = Math.max(maxZ, point.y);
          });
        }
      });
    }
    
    return { minX, maxX, minZ, maxZ };
  };

  const isPositionInsideFloor = (x: number, z: number): boolean => {
    // Simplified check - in real implementation would use point-in-polygon
    const bounds = calculateFloorBounds();
    return x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ;
  };

  const isPositionInWall = (x: number, z: number): boolean => {
    // Check if position intersects with any wall
    return walls.some(wall => {
      const wallThickness = wall.thickness || 20;
      // Simplified wall collision check
      const distToWall = distanceToLineSegment(
        { x, y: z },
        { x: wall.start.x, y: wall.start.y },
        { x: wall.end.x, y: wall.end.y }
      );
      return distToWall < wallThickness / 2;
    });
  };

  const distanceToLineSegment = (point: any, lineStart: any, lineEnd: any): number => {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, yy;
    
    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }
    
    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Control handlers
  const handlePlayPause = () => {
    setControls(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleReset = () => {
    setCurrentPathIndex(0);
    if (cameraRef.current && walkPath.length > 0) {
      cameraRef.current.position.copy(walkPath[0]);
    }
  };

  const handleViewModeChange = (mode: 'walk' | 'fly' | 'orbit') => {
    setControls(prev => ({ ...prev, viewMode: mode }));
  };

  const handleSpeedChange = (speed: number) => {
    setControls(prev => ({ ...prev, speed }));
  };

  // Lifecycle
  useEffect(() => {
    initializeScene();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [initializeScene]);

  useEffect(() => {
    if (isInitialized) {
      animate();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isInitialized, animate]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header Controls */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800"
          >
            <Home className="w-4 h-4 mr-2" />
            Exit 3D View
          </Button>
          
          <Separator orientation="vertical" className="h-6" />
          
          <div className="flex items-center space-x-2">
            <Button
              variant={controls.isPlaying ? "default" : "outline"}
              size="sm"
              onClick={handlePlayPause}
            >
              {controls.isPlaying ? (
                <Pause className="w-4 h-4 mr-2" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {controls.isPlaying ? 'Pause' : 'Auto Walk'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
          
          <Separator orientation="vertical" className="h-6" />
          
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              <Eye className="w-3 h-3 mr-1" />
              {controls.viewMode.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Speed: {controls.speed.toFixed(1)}x
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs font-mono">
            X: {cameraPosition.x.toFixed(0)}
          </Badge>
          <Badge variant="outline" className="text-xs font-mono">
            Y: {cameraPosition.y.toFixed(0)}
          </Badge>
          <Badge variant="outline" className="text-xs font-mono">
            Z: {cameraPosition.z.toFixed(0)}
          </Badge>
        </div>
      </div>
      
      {/* Control Panel */}
      <div className="absolute top-20 right-4 z-10">
        <Card className="w-64">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              Walkthrough Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-2 block">
                View Mode
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['walk', 'fly', 'orbit'] as const).map(mode => (
                  <Button
                    key={mode}
                    variant={controls.viewMode === mode ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleViewModeChange(mode)}
                    className="text-xs"
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-600 mb-2 block">
                Speed: {controls.speed.toFixed(1)}x
              </label>
              <div className="grid grid-cols-4 gap-1">
                {[0.5, 1.0, 2.0, 4.0].map(speed => (
                  <Button
                    key={speed}
                    variant={controls.speed === speed ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSpeedChange(speed)}
                    className="text-xs"
                  >
                    {speed}x
                  </Button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-600 mb-2 block">
                Lighting
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['natural', 'artificial', 'mixed'] as const).map(lighting => (
                  <Button
                    key={lighting}
                    variant={controls.lighting === lighting ? "default" : "outline"}
                    size="sm"
                    onClick={() => setControls(prev => ({ ...prev, lighting }))}
                    className="text-xs"
                  >
                    {lighting.charAt(0).toUpperCase() + lighting.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="pt-2 border-t">
              <div className="text-xs text-gray-500 space-y-1">
                <div>• WASD keys to move</div>
                <div>• Mouse drag to look around</div>
                <div>• Auto-walk follows corridor path</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 3D Viewport */}
      <div ref={mountRef} className="flex-1 relative">
        {!isInitialized && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <div className="text-sm">Generating 3D environment...</div>
              <div className="text-xs text-gray-400 mt-1">
                Loading realistic interior visualization
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}