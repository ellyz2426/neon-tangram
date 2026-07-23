import {
  World,
  PanelUI,
  BoxGeometry,
  CylinderGeometry,
  Mesh,
  MeshStandardMaterial,
  Color,
  Group,
  AmbientLight,
  PointLight,
  SphereGeometry,
  TorusGeometry,
  Entity,
} from '@iwsdk/core';
import { GameSystem } from './game-system';
import { UISystem } from './ui-system';

const container = document.getElementById('scene-container') as HTMLDivElement;

const world = await World.create(container, {
  xr: { offer: 'once' },
  features: {
    locomotion: { browserControls: true },
    grabbing: false,
    physics: false,
  },
});

// === Holodeck Environment ===
const scene = world.scene;

const ambient = new AmbientLight(new Color('#334455'), 0.4);
scene.add(ambient);

const light1 = new PointLight(new Color('#00ffff'), 1.5, 30);
light1.position.set(0, 4, 0);
scene.add(light1);

const light2 = new PointLight(new Color('#8844ff'), 0.8, 20);
light2.position.set(-3, 3, -2);
scene.add(light2);

const light3 = new PointLight(new Color('#ff4488'), 0.6, 20);
light3.position.set(3, 3, 2);
scene.add(light3);

// Grid floor
const floorGeo = new BoxGeometry(20, 0.01, 20, 40, 1, 40);
const floorMat = new MeshStandardMaterial({
  color: new Color('#000811'),
  emissive: new Color('#001122'),
  emissiveIntensity: 0.3,
  wireframe: true,
  transparent: true,
  opacity: 0.5,
});
scene.add(new Mesh(floorGeo, floorMat));

const solidFloorGeo = new BoxGeometry(20, 0.02, 20);
const solidFloorMat = new MeshStandardMaterial({
  color: new Color('#000508'),
  emissive: new Color('#000205'),
  emissiveIntensity: 0.1,
});
const solidFloor = new Mesh(solidFloorGeo, solidFloorMat);
solidFloor.position.y = -0.01;
scene.add(solidFloor);

// Grid ceiling
const ceilGeo = new BoxGeometry(20, 0.01, 20, 40, 1, 40);
const ceilMat = new MeshStandardMaterial({
  color: new Color('#000811'),
  emissive: new Color('#001122'),
  emissiveIntensity: 0.2,
  wireframe: true,
  transparent: true,
  opacity: 0.3,
});
const ceil = new Mesh(ceilGeo, ceilMat);
ceil.position.y = 5;
scene.add(ceil);

// Walls
for (let i = 0; i < 4; i++) {
  const wallGeo = new BoxGeometry(20, 5, 0.01, 40, 10, 1);
  const wallMat = new MeshStandardMaterial({
    color: new Color('#000811'),
    emissive: new Color('#001133'),
    emissiveIntensity: 0.15,
    wireframe: true,
    transparent: true,
    opacity: 0.25,
  });
  const wall = new Mesh(wallGeo, wallMat);
  wall.position.y = 2.5;
  if (i === 0) wall.position.z = -10;
  else if (i === 1) wall.position.z = 10;
  else if (i === 2) { wall.rotation.y = Math.PI / 2; wall.position.x = -10; }
  else { wall.rotation.y = Math.PI / 2; wall.position.x = 10; }
  scene.add(wall);
}

// Accent pillars
for (let i = 0; i < 4; i++) {
  const pillarGeo = new CylinderGeometry(0.05, 0.05, 5, 8);
  const pillarMat = new MeshStandardMaterial({
    color: new Color('#00ffff'),
    emissive: new Color('#00ffff'),
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.6,
  });
  const pillar = new Mesh(pillarGeo, pillarMat);
  pillar.position.y = 2.5;
  const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
  pillar.position.x = Math.cos(angle) * 7;
  pillar.position.z = Math.sin(angle) * 7;
  scene.add(pillar);
}

// Ambient orbs
for (let i = 0; i < 6; i++) {
  const orbGeo = new SphereGeometry(0.08, 16, 16);
  const orbMat = new MeshStandardMaterial({
    color: new Color('#00ffff'),
    emissive: new Color('#00ffff'),
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.5,
  });
  const orb = new Mesh(orbGeo, orbMat);
  orb.position.set((Math.random() - 0.5) * 10, 1 + Math.random() * 3, (Math.random() - 0.5) * 10);
  scene.add(orb);
}

// === Panel Entities ===
const panelY = 1.5;
const panelZ = -1.6;
const panelConfigs = [
  { key: 'menu', config: './ui/menu.json', pos: [0, panelY, panelZ] as [number, number, number], visible: true },
  { key: 'hud', config: './ui/hud.json', pos: [0, 2.3, -1.4] as [number, number, number], visible: false },
  { key: 'results', config: './ui/results.json', pos: [0, panelY, panelZ] as [number, number, number], visible: false },
  { key: 'levelSelect', config: './ui/levelselect.json', pos: [0, panelY, panelZ] as [number, number, number], visible: false },
  { key: 'settings', config: './ui/settings.json', pos: [0, panelY, panelZ] as [number, number, number], visible: false },
  { key: 'pause', config: './ui/pause.json', pos: [0, panelY, panelZ] as [number, number, number], visible: false },
  { key: 'achievements', config: './ui/achpanel.json', pos: [0, panelY, panelZ] as [number, number, number], visible: false },
  { key: 'tutorial', config: './ui/tutorial.json', pos: [0, panelY, panelZ] as [number, number, number], visible: false },
];

const panelEntities: Record<string, Entity> = {};
const panelPositions: Record<string, [number, number, number]> = {};
for (const pc of panelConfigs) {
  const group = new Group();
  group.position.set(pc.pos[0], pc.visible ? pc.pos[1] : -50, pc.pos[2]);
  group.scale.set(1.8, 1.8, 1.8);
  const entity = world.createTransformEntity(group);
  entity.addComponent(PanelUI, { config: pc.config });
  panelEntities[pc.key] = entity;
  panelPositions[pc.key] = pc.pos;
}

// === Register Systems ===
world.registerSystem(GameSystem);
world.registerSystem(UISystem);

const gameSystem = world.getSystem(GameSystem)!;
gameSystem.setRefs({ world, panelEntities, panelPositions });

const uiSystem = world.getSystem(UISystem)!;
uiSystem.setRefs({ world, game: gameSystem, panelEntities, panelPositions });
