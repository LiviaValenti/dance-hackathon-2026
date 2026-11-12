import * as THREE from "three";
import { features } from "./motion";
import type { Point, Reference } from "./motion";

export function guidePose(time: number): Point[] {
  const phase = time * Math.PI;
  const sway = Math.sin(phase) * 0.28;
  const bounce = Math.abs(Math.cos(phase)) * 0.1;
  const points: Point[] = Array.from({ length: 33 }, () => ({
    x: sway,
    y: 1.4,
    z: 0,
    visibility: 1,
  }));
  const set = (index: number, x: number, y: number, z = 0) => {
    points[index] = { x: x + sway, y: y + bounce, z, visibility: 1 };
  };
  set(0, 0, 2.56);
  set(11, 0.34, 2.18);
  set(12, -0.34, 2.18);
  set(23, 0.21, 1.33);
  set(24, -0.21, 1.33);
  set(13, 0.5 + Math.sin(phase) * 0.24, 1.83 + Math.cos(phase) * 0.16, 0.1);
  set(14, -0.5 + Math.sin(phase) * 0.24, 1.83 - Math.cos(phase) * 0.16, 0.1);
  set(15, 0.28 + Math.sin(phase) * 0.45, 2.08 + Math.cos(phase) * 0.2, 0.34);
  set(16, -0.28 + Math.sin(phase) * 0.45, 2.08 - Math.cos(phase) * 0.2, 0.34);
  set(25, 0.25 + Math.max(0, Math.sin(phase)) * 0.27, 0.7, 0.16);
  set(26, -0.25 + Math.min(0, Math.sin(phase)) * 0.27, 0.7, 0.16);
  set(
    27,
    0.28 + Math.max(0, Math.sin(phase)) * 0.47,
    0.13 + Math.max(0, -Math.cos(phase)) * 0.12,
  );
  set(
    28,
    -0.28 + Math.min(0, Math.sin(phase)) * 0.47,
    0.13 + Math.max(0, Math.cos(phase)) * 0.12,
  );
  return points;
}

export function builtInReference(): Reference {
  return {
    duration: 16,
    frames: Array.from({ length: 161 }, (_, index) => ({
      time: index / 10,
      angles: features(guidePose(index / 10))!,
    })),
    segments: [
      { start: 0, end: 4, label: "Finn sidebevegelsen" },
      { start: 4, end: 8, label: "La armene følge" },
      { start: 8, end: 12, label: "Sett det sammen" },
      { start: 12, end: 16, label: "Finn din groove" },
    ],
  };
}

export class DanceScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-2, 2, 3, -0.5, 0.1, 100);
  private body = new THREE.Group();
  private head: THREE.Group;
  private torso: THREE.Mesh;
  private limbs: { mesh: THREE.Mesh; first: number; last: number }[] = [];
  private shoes: THREE.Mesh[] = [];
  private observer: ResizeObserver;
  private mirrored = true;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0xe3eeeb, 0);
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Animert dansefigur i et tredimensjonalt studio",
    );
    container.append(this.renderer.domElement);
    this.camera.position.set(0, 2.9, 7);
    this.camera.lookAt(0, 1.4, 0);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x729b8f, 2.8));
    const light = new THREE.DirectionalLight(0xffffff, 4);
    light.position.set(-3, 6, 5);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    this.scene.add(light);
    const material = (color: number) =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
    const coral = material(0xf16a51),
      dark = material(0x283b36),
      skin = material(0xdca98b),
      cream = material(0xf7f5e9),
      green = material(0xb3d5a3);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.ShadowMaterial({ opacity: 0.13 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.position.y = -0.04;
    this.scene.add(floor);
    const grid = new THREE.GridHelper(30, 30, 0xb5cbc3, 0xcadbd4);
    grid.position.y = -0.03;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.4;
    this.scene.add(grid);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.15, 1.17, 80),
      new THREE.MeshBasicMaterial({
        color: 0x87aa99,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.02;
    this.scene.add(ring);
    this.torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.33, 0.45, 8, 16),
      coral,
    );
    this.torso.scale.set(1.08, 1, 0.7);
    this.torso.castShadow = true;
    this.body.add(this.torso);
    this.head = new THREE.Group();
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.245, 24, 20), skin);
    face.scale.set(0.87, 1.05, 0.9);
    face.castShadow = true;
    this.head.add(face);
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.253, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      green,
    );
    cap.position.y = 0.07;
    this.head.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.045, 0.27), green);
    brim.position.set(0, 0.075, 0.19);
    brim.rotation.z = -0.12;
    this.head.add(brim);
    for (const x of [-0.08, 0.08]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.019, 8, 8), dark);
      eye.position.set(x, 0.01, 0.2);
      this.head.add(eye);
    }
    this.body.add(this.head);
    for (const [first, last, radius, limbMaterial] of [
      [11, 13, 0.13, coral],
      [12, 14, 0.13, coral],
      [13, 15, 0.095, skin],
      [14, 16, 0.095, skin],
      [23, 25, 0.16, dark],
      [24, 26, 0.16, dark],
      [25, 27, 0.14, dark],
      [26, 28, 0.14, dark],
    ] as [number, number, number, THREE.Material][]) {
      const mesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(radius, 1, 6, 12),
        limbMaterial,
      );
      mesh.castShadow = true;
      this.body.add(mesh);
      this.limbs.push({ mesh, first, last });
    }
    for (let index = 0; index < 2; index++) {
      const shoe = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.13, 0.19, 6, 12),
        cream,
      );
      shoe.rotation.x = Math.PI / 2;
      shoe.castShadow = true;
      this.body.add(shoe);
      this.shoes.push(shoe);
    }
    this.scene.add(this.body);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.resize();
    this.render(0);
  }

  setMirror(value: boolean) {
    this.mirrored = value;
  }

  private resize() {
    const width = this.container.clientWidth,
      height = this.container.clientHeight;
    const aspect = width / Math.max(1, height);
    const span = 3.7;
    this.camera.left = (-span * aspect) / 2;
    this.camera.right = (span * aspect) / 2;
    this.camera.top = span / 2;
    this.camera.bottom = -span / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  render(time: number) {
    const points = guidePose(time);
    this.body.scale.x = this.mirrored ? -1 : 1;
    this.torso.position.set(
      points[23].x - 0.21,
      1.83 + (points[23].y - 1.33),
      0,
    );
    this.torso.rotation.z = Math.sin(time * Math.PI) * -0.1;
    this.head.position.set(points[0].x, points[0].y, 0);
    this.head.rotation.z = Math.sin(time * Math.PI) * -0.08;
    for (const limb of this.limbs) {
      const first = new THREE.Vector3(
        points[limb.first].x,
        points[limb.first].y,
        points[limb.first].z,
      );
      const last = new THREE.Vector3(
        points[limb.last].x,
        points[limb.last].y,
        points[limb.last].z,
      );
      limb.mesh.position.copy(first).add(last).multiplyScalar(0.5);
      const direction = last.clone().sub(first);
      limb.mesh.scale.y = direction.length() / 1.28;
      limb.mesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.normalize(),
      );
    }
    this.shoes.forEach((shoe, index) => {
      const point = points[index ? 28 : 27];
      shoe.position.set(point.x, point.y - 0.035, 0.11);
    });
    this.renderer.render(this.scene, this.camera);
  }
}
