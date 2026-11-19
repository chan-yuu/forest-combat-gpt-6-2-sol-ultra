function createForestAssets(THREE) {
  const TAU = Math.PI * 2;
  const materialCache = new Map();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const sphere = new THREE.IcosahedronGeometry(1, 1);
  const rock = new THREE.IcosahedronGeometry(1, 0);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 8);

  function material(color, roughness = 0.86, metalness = 0) {
    const key = `${color}/${roughness}/${metalness}`;
    if (!materialCache.has(key)) {
      materialCache.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
    }
    return materialCache.get(key);
  }

  function group(parent, x = 0, y = 0, z = 0) {
    const node = new THREE.Group();
    node.position.set(x, y, z);
    parent?.add(node);
    return node;
  }

  function part(parent, geometry, finish, x, y, z, sx = 1, sy = 1, sz = 1) {
    const mesh = new THREE.Mesh(geometry, finish);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function plate(parent, finish, x, y, z, sx, sy, sz) {
    return part(parent, box, finish, x, y, z, sx, sy, sz);
  }

  function shape(parent, finish, x, y, z, sx, sy, sz) {
    return part(parent, sphere, finish, x, y, z, sx, sy, sz);
  }

  function collar(parent, finish, x, y, z, radius, height, depth = 1) {
    return part(parent, cylinder, finish, x, y, z, radius, height, radius * depth);
  }

  function extrude(points, depth) {
    const profile = new THREE.Shape();
    profile.moveTo(...points[0]);
    for (const point of points.slice(1)) profile.lineTo(...point);
    profile.closePath();
    const geometry = new THREE.ExtrudeGeometry(profile, { depth, bevelEnabled: false });
    geometry.translate(0, 0, -depth / 2);
    return geometry;
  }

  const steel = material('#8da7ac', 0.47, 0.47);
  const coldSteel = material('#46616b', 0.61, 0.28);
  const gold = material('#cc9c55', 0.55, 0.37);
  const darkIron = material('#263440', 0.69, 0.26);
  const charcoal = material('#21252a');
  const leather = material('#624133');
  const darkLeather = material('#382923');
  const tealCloth = material('#1a6871');
  const tealEnamel = material('#23858a', 0.54, 0.32);
  const rustCloth = material('#b4442f');
  const emberCloth = material('#792e23');
  const bone = material('#e0cba6');
  const orcHide = material('#779746');
  const orcShadow = material('#566d36');
  const bossHide = material('#72833d');
  const bossShadow = material('#4e592f');
  const orcEye = new THREE.MeshStandardMaterial({
    color: 0xffbd5b,
    emissive: 0xaf430b,
    emissiveIntensity: 0.55,
    roughness: 0.6,
  });
  const bladeProfile = extrude([
    [-0.088, 0.04], [0.088, 0.04], [0.083, 0.68], [0, 0.91], [-0.083, 0.68],
  ], 0.043);
  const fullerProfile = extrude([
    [-0.011, 0.12], [0.011, 0.12], [0.013, 0.63], [0, 0.77], [-0.013, 0.63],
  ], 0.003);
  const axeProfile = extrude([
    [-0.06, 0.13], [0.05, 0.17], [0.34, 0.38], [0.42, 0.22],
    [0.39, -0.06], [0.24, -0.18], [0.01, -0.08], [-0.06, -0.1],
  ], 0.105);
  const axeEdge = extrude([
    [0.34, 0.378], [0.419, 0.219], [0.389, -0.058], [0.24, -0.178],
    [0.312, -0.044], [0.343, 0.21],
  ], 0.109);
  const tabardProfile = extrude([
    [-0.13, 0.2], [0.13, 0.2], [0.12, -0.22], [0, -0.37], [-0.12, -0.22],
  ], 0.027);
  const capeProfile = extrude([
    [-0.26, 0.62], [0.25, 0.62], [0.18, 0.24], [0.33, -0.18],
    [-0.02, -0.12], [-0.32, -0.26], [-0.22, 0.27],
  ], 0.038);
  const tusk = new THREE.ConeGeometry(1, 1, 6);
  const torso = new THREE.CylinderGeometry(0.43, 0.29, 0.53, 8);
  const greave = new THREE.CylinderGeometry(1.0, 0.81, 1, 7);

  function shieldDisc(parent, finish, radius, thickness, z, sides) {
    const disc = part(parent, new THREE.CylinderGeometry(radius, radius, thickness, sides), finish, 0, 0, z);
    disc.rotation.x = Math.PI / 2;
    return disc;
  }

  function createShield() {
    const shield = group();
    shieldDisc(shield, darkIron, 0.434, 0.105, 0, 12);
    shieldDisc(shield, gold, 0.429, 0.018, -0.051, 12);
    shieldDisc(shield, leather, 0.383, 0.012, -0.064, 12);
    plate(shield, darkLeather, 0, 0.121, -0.079, 0.57, 0.068, 0.027).rotation.z = -0.2;
    plate(shield, darkLeather, 0, -0.121, -0.079, 0.57, 0.068, 0.027).rotation.z = -0.2;
    shieldDisc(shield, gold, 0.430, 0.032, 0.046, 12);
    shieldDisc(shield, coldSteel, 0.397, 0.036, 0.062, 12);
    shieldDisc(shield, tealEnamel, 0.364, 0.039, 0.081, 12);
    shieldDisc(shield, gold, 0.114, 0.031, 0.109, 8);
    shape(shield, steel, 0, 0, 0.141, 0.089, 0.089, 0.059);
    for (let index = 0; index < 4; index++) {
      const ray = group(shield, 0, 0, 0.11);
      ray.rotation.z = index * Math.PI / 2 + Math.PI / 4;
      plate(ray, gold, 0, 0.219, 0, 0.024, 0.201, 0.013);
    }
    for (let index = 0; index < 8; index++) {
      const angle = (index + 0.5) * TAU / 8;
      shape(shield, gold, Math.cos(angle) * 0.369, Math.sin(angle) * 0.369, 0.098, 0.024, 0.024, 0.017);
    }
    return shield;
  }

  function sword(hand) {
    const weapon = group(hand, -0.01, -0.598, 0.12);
    weapon.rotation.set(0.65, -0.16, 0.38);
    collar(weapon, darkLeather, 0, -0.062, 0, 0.045, 0.19);
    shape(weapon, gold, 0, -0.166, 0, 0.06, 0.052, 0.056);
    plate(weapon, gold, 0, 0.029, 0, 0.347, 0.059, 0.079);
    part(weapon, bladeProfile, steel, 0, 0.055, 0);
    part(weapon, fullerProfile, coldSteel, 0, 0.055, 0.024);
    return weapon;
  }

  function axe(hand, boss) {
    const weapon = group(hand, -0.01, -0.61, 0.12);
    weapon.rotation.set(0.72, 0.3, 0.3);
    collar(weapon, darkLeather, 0, 0.121, 0, 0.052, 0.73);
    collar(weapon, leather, 0, 0.12, 0, 0.055, 0.18);
    collar(weapon, coldSteel, 0, -0.25, 0, 0.063, 0.13);
    part(weapon, axeProfile, boss ? darkIron : coldSteel, 0, 0.437, 0, boss ? 1.27 : 0.92, 1, 1);
    part(weapon, axeEdge, steel, 0, 0.437, 0, boss ? 1.27 : 0.92, 1, 1);
    if (boss) {
      plate(weapon, rustCloth, 0.252, 0.554, 0.059, 0.23, 0.035, 0.018).rotation.z = 0.25;
    }
    return weapon;
  }

  function heroHead(head) {
    shape(head, darkIron, 0, 0.197, 0.004, 0.223, 0.258, 0.232);
    shape(head, steel, 0, 0.26, 0.009, 0.222, 0.204, 0.228);
    plate(head, charcoal, 0, 0.194, 0.222, 0.318, 0.081, 0.025);
    plate(head, coldSteel, 0, 0.111, 0.206, 0.303, 0.092, 0.069);
    plate(head, gold, 0, 0.228, 0.234, 0.321, 0.024, 0.029);
    plate(head, gold, 0, 0.193, 0.25, 0.032, 0.134, 0.02);
    shape(head, gold, 0, 0.443, -0.015, 0.095, 0.048, 0.136);
    shape(head, rustCloth, 0, 0.492, -0.054, 0.057, 0.083, 0.172).rotation.x = -0.22;
  }

  function orcHead(head, boss, skin, shade) {
    shape(head, shade, 0, 0.182, 0.024, 0.235, 0.21, 0.221);
    shape(head, skin, 0, 0.216, 0.115, 0.208, 0.191, 0.147);
    shape(head, shade, 0, 0.079, 0.163, 0.17, 0.094, 0.128);
    shape(head, darkLeather, 0, 0.11, 0.263, 0.128, 0.034, 0.016);
    shape(head, skin, 0, 0.174, 0.263, 0.067, 0.055, 0.048);
    for (const side of [-1, 1]) {
      shape(head, skin, side * 0.231, 0.181, 0, 0.099, 0.066, 0.081).rotation.z = side * 0.49;
      shape(head, shade, side * 0.096, 0.249, 0.22, 0.107, 0.047, 0.073).rotation.z = side * 0.21;
      shape(head, orcEye, side * 0.087, 0.215, 0.255, 0.034, 0.021, 0.015);
      part(head, tusk, bone, side * 0.117, 0.132, 0.248, 0.041, 0.141, 0.039).rotation.z = -side * 0.28;
    }
    if (boss) {
      shape(head, darkIron, 0, 0.334, -0.015, 0.231, 0.131, 0.214);
      plate(head, gold, 0, 0.334, 0.179, 0.321, 0.055, 0.046);
      for (const side of [-1, 1]) {
        part(head, tusk, bone, side * 0.221, 0.452, -0.003, 0.086, 0.295, 0.075).rotation.z = -side * 0.51;
      }
      shape(head, emberCloth, 0, 0.455, -0.046, 0.064, 0.08, 0.18);
    } else {
      shape(head, charcoal, 0, 0.375, -0.041, 0.11, 0.061, 0.133);
      shape(head, charcoal, 0, 0.451, -0.091, 0.089, 0.095, 0.081).rotation.x = -0.61;
    }
  }

  function buildLeg(parent, side, hero) {
    const leg = group(parent, side * 0.184, 0.925, 0);
    part(leg, greave, hero ? darkIron : darkLeather, 0, -0.238, 0, 0.145, 0.461, 0.141);
    part(leg, greave, hero ? coldSteel : leather, 0, -0.622, 0.017, 0.124, 0.442, 0.115);
    shape(leg, hero ? steel : darkIron, 0, -0.428, 0.1, 0.118, 0.143, 0.079);
    plate(leg, hero ? darkIron : darkLeather, 0, -0.851, 0.085, 0.244, 0.147, 0.375);
    if (hero) {
      shape(leg, steel, 0, -0.827, 0.213, 0.113, 0.091, 0.127);
    } else {
      collar(leg, bone, 0, -0.59, 0.015, 0.128, 0.043, 0.94);
    }
    return leg;
  }

  function buildArm(parent, side, hero, boss, skin, shade) {
    const arm = group(parent, side * 0.447, 0.516, 0.003);
    const shoulder = shape(arm, hero ? coldSteel : shade, side * 0.025, -0.038, 0, 0.207, 0.199, 0.213);
    shoulder.rotation.z = side * 0.25;
    collar(arm, hero ? darkIron : skin, side * 0.039, -0.245, 0.012, 0.117, 0.295);
    part(arm, greave, hero ? coldSteel : leather, side * 0.046, -0.469, 0.045, 0.121, 0.245, 0.121);
    shape(arm, hero ? steel : skin, side * 0.044, -0.62, 0.067, 0.112, 0.103, 0.111);
    if (hero || boss) {
      shape(arm, hero ? steel : gold, side * 0.07, -0.011, 0.021, 0.191, 0.128, 0.205).rotation.z = side * 0.32;
      if (boss) {
        part(arm, tusk, bone, side * 0.153, 0.131, 0.015, 0.067, 0.206, 0.067).rotation.z = -side * 0.65;
      }
    } else if (side === -1) {
      shape(arm, darkIron, -0.044, 0.002, 0.026, 0.176, 0.137, 0.179).rotation.z = -0.15;
    }
    return arm;
  }

  function createFighter(kind) {
    const root = group();
    const figure = group(root);
    const body = group(figure, 0, 1.019, 0);
    const head = group(body, 0, 0.622, 0.021);
    const hero = kind === 'hero';
    const boss = kind === 'boss';
    const skin = boss ? bossHide : orcHide;
    const shade = boss ? bossShadow : orcShadow;
    const legL = buildLeg(figure, 1, hero);
    const legR = buildLeg(figure, -1, hero);
    const armL = buildArm(body, 1, hero, boss, skin, shade);
    const armR = buildArm(body, -1, hero, boss, skin, shade);

    part(body, torso, hero ? coldSteel : shade, 0, 0.336, 0, 1, 1, 0.73);
    shape(body, hero ? darkIron : darkLeather, 0, -0.075, 0, 0.322, 0.206, 0.225);
    collar(body, hero ? leather : darkLeather, 0, 0.089, 0, 0.351, 0.113, 0.71);
    plate(body, hero || boss ? gold : coldSteel, 0, 0.09, 0.251, 0.152, 0.119, 0.046);
    if (hero) {
      part(body, capeProfile, rustCloth, 0, 0, -0.232).rotation.x = 0.22;
      shape(body, steel, 0, 0.398, 0.178, 0.326, 0.227, 0.131);
      collar(body, rustCloth, 0, 0.585, 0.013, 0.22, 0.096, 0.86);
      part(body, tabardProfile, tealCloth, 0, 0.005, 0.221);
      plate(body, gold, 0, -0.113, 0.24, 0.038, 0.141, 0.012);
      heroHead(head);
    } else {
      const chest = shape(body, skin, 0, 0.374, 0.108, 0.389, 0.222, 0.226);
      chest.rotation.x = -0.08;
      plate(body, boss ? emberCloth : leather, -0.02, 0.323, 0.29, 0.117, 0.571, 0.059).rotation.z = -0.61;
      if (boss) {
        figure.scale.set(1.27, 1.31, 1.24);
        plate(body, darkLeather, 0.02, 0.327, 0.314, 0.103, 0.526, 0.045).rotation.z = 0.57;
        part(body, capeProfile, emberCloth, 0, 0.01, -0.224, 1.15, 1.25, 1).rotation.x = 0.22;
      }
      part(body, tabardProfile, boss ? rustCloth : darkLeather, 0, 0.019, 0.254);
      orcHead(head, boss, skin, shade);
    }

    const weapon = hero ? sword(armR) : axe(armR, boss);
    const shield = hero ? createShield() : null;
    if (shield) {
      shield.position.set(0.043, -0.525, 0.249);
      shield.rotation.set(-0.13, 0.48, 0.06);
      armL.add(shield);
    }
    return { root, body, head, armL, armR, legL, legR, shield, weapon };
  }

  function randomSource(seed) {
    let state = seed >>> 0;
    return () => {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function octaves(x, z) {
    return Math.sin(x * 0.24 + Math.cos(z * 0.23)) * 0.48
      + Math.cos(z * 0.36 - x * 0.17) * 0.31
      + Math.sin(x * 1.13 + z * 0.82) * 0.13
      + Math.cos(x * 2.46 - z * 2.04) * 0.08;
  }

  function groundHeight(x, z) {
    const edge = THREE.MathUtils.smoothstep(Math.hypot(x, z), 16, 31);
    return octaves(x, z) * (0.06 + edge * 0.58);
  }

  function addGround(scene, random) {
    const geometry = new THREE.PlaneGeometry(146, 146, 116, 116).rotateX(-Math.PI / 2);
    const positions = geometry.getAttribute('position');
    const colors = new Float32Array(positions.count * 3);
    const trail = new THREE.Color('#746744');
    const clearing = new THREE.Color('#687650');
    const moss = new THREE.Color('#4f694e');
    const wetMoss = new THREE.Color('#263f38');
    const color = new THREE.Color();
    for (let index = 0; index < positions.count; index++) {
      const x = positions.getX(index);
      const z = positions.getZ(index);
      const distance = Math.hypot(x * 0.98, z);
      const roughness = octaves(x, z);
      const path = Math.abs(x * 0.85 + z * 0.33 + Math.sin(z * 0.21) * 2.3);
      const trailWeight = (1 - THREE.MathUtils.smoothstep(path, 1.6, 6.3)) * 0.48;
      const mossWeight = THREE.MathUtils.smoothstep(distance + roughness * 4, 10, 25);
      color.copy(clearing).lerp(trail, trailWeight + (1 - mossWeight) * 0.1);
      color.lerp(moss, mossWeight).lerp(wetMoss, mossWeight * THREE.MathUtils.clamp(0.29 - roughness * 0.38, 0, 0.8));
      color.multiplyScalar(0.91 + random() * 0.14 + roughness * 0.17);
      color.toArray(colors, index * 3);
      positions.setY(index, groundHeight(x, z) - 0.046);
    }
    geometry.computeVertexNormals();
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const land = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    land.receiveShadow = true;
    scene.add(land);
  }

  function tuftGeometry() {
    const vertices = [];
    for (let index = 0; index < 6; index++) {
      const angle = TAU * index / 6 + 0.37;
      const dx = Math.cos(angle);
      const dz = Math.sin(angle);
      const size = 0.33 + (index % 3) * 0.11;
      vertices.push(-dz * 0.036, 0, dx * 0.036, dz * 0.036, 0, -dx * 0.036,
        dx * 0.144, size, dz * 0.144);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return geometry;
  }

  function fernGeometry() {
    const vertices = [];
    for (let branch = 0; branch < 5; branch++) {
      const angle = TAU * branch / 5;
      const dx = Math.cos(angle);
      const dz = Math.sin(angle);
      const profile = (distance, width) => [
        dx * distance - dz * width,
        Math.sin(distance * 2.1) * 0.4 + distance * 0.16,
        dz * distance + dx * width,
      ];
      for (let leaf = 0; leaf < 6; leaf++) {
        const distance = 0.079 + leaf * 0.105;
        const width = (0.17 - leaf * 0.019) * (leaf === 0 ? 0.7 : 1);
        vertices.push(...profile(distance, 0), ...profile(distance + 0.14, 0), ...profile(distance + 0.12, width),
          ...profile(distance, 0), ...profile(distance + 0.12, -width), ...profile(distance + 0.14, 0));
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return geometry;
  }

  function obstaclePosition(random, inner, outer) {
    const angle = random() * TAU;
    const radius = Math.sqrt(inner * inner + random() * (outer * outer - inner * inner));
    return [Math.cos(angle) * radius, Math.sin(angle) * radius];
  }

  function batch(scene, geometry, finish, items, castShadow = false) {
    const mesh = new THREE.InstancedMesh(geometry, finish, items.length);
    const transform = new THREE.Object3D();
    const color = new THREE.Color();
    const defaultRotation = [0, 0, 0];
    items.forEach(({ position, scale, rotation = defaultRotation, tint }, index) => {
      transform.position.set(...position);
      transform.scale.set(...scale);
      transform.rotation.set(...rotation);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
      mesh.setColorAt(index, color.set(tint));
    });
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    scene.add(mesh);
  }

  function addTrees(scene, random) {
    const trunkGeometry = new THREE.CylinderGeometry(0.52, 1, 1, 7);
    const evergreenGeometry = new THREE.CylinderGeometry(0.08, 1, 1, 7);
    const trunks = [];
    const tops = [];
    const broadleaf = [];
    const frameTops = [];
    const taper = ['#344f3d', '#335640', '#284c3d', '#385b45', '#416346', '#46664a'];
    const bark = ['#564c3d', '#5c5041', '#554338', '#493d34'];
    const anchors = [[-13.9, -6.8, 6.6], [13.1, -7.8, 7.7], [-10.2, -12.1, 6.1], [10.2, -11.7, 6.8],
      [-19, -6], [-17, -14], [-11, -19], [3, -21], [15, -17], [20, -7], [-20, 7], [-22, 16], [20, 16], [21, 6]];
    const scattered = Array.from({ length: 170 }, () => obstaclePosition(random, 21, 68));
    const points = [...anchors, ...scattered.filter(([x, z]) => Math.abs(x) > 20 || z < 4 || z > 41)];
    points.forEach(([x, z, heightHint], index) => {
      const base = groundHeight(x, z);
      const height = heightHint ?? (index < anchors.length ? 9.7 : 6.9) + random() * 8;
      const width = height * (0.19 + random() * 0.09);
      const barkColor = bark[index % bark.length];
      const yaw = random() * TAU;
      trunks.push({ position: [x, base + height * 0.36, z], scale: [width * 0.15, height * 0.73, width * 0.15],
        rotation: [0, yaw, (random() - 0.5) * 0.07], tint: barkColor });
      if (index % 5 === 4) {
        for (let limb = 0; limb < 5; limb++) {
          const angle = yaw + limb * TAU / 5;
          const distance = width * (0.42 + random() * 0.15);
          const px = x + Math.cos(angle) * distance;
          const pz = z + Math.sin(angle) * distance;
          const y = base + height * (0.62 + random() * 0.31);
          broadleaf.push({ position: [px, y, pz], scale: [width * 0.72, width * 0.53, width * 0.69],
            rotation: [0.4, angle, 0.2], tint: taper[(index + limb) % taper.length] });
        }
      } else {
        for (let tier = 0; tier < 4; tier++) {
          const radius = width * (1 - tier * 0.174);
          const center = base + height * (0.466 + tier * 0.131);
          const canopy = heightHint ? frameTops : tops;
          canopy.push({ position: [x, center, z], scale: [radius, height * (0.29 + tier * 0.017), radius],
            rotation: [0, yaw + tier * 0.21, 0], tint: taper[(index + tier) % taper.length] });
        }
      }
      if (index < 52) {
        for (let root = 0; root < 3; root++) {
          const angle = yaw + root * TAU / 3;
          const extension = width * 0.29;
          trunks.push({ position: [x + Math.sin(angle) * extension, base + 0.106, z + Math.cos(angle) * extension],
            scale: [width * 0.085, extension * 2, width * 0.093],
            rotation: [Math.PI / 2 - 0.15, angle, 0], tint: barkColor });
        }
      }
    });
    const finish = material('#ffffff');
    batch(scene, trunkGeometry, finish, trunks);
    batch(scene, evergreenGeometry, finish, tops);
    batch(scene, evergreenGeometry, finish, frameTops, true);
    batch(scene, sphere, finish, broadleaf);
  }

  function addUndergrowth(scene, random) {
    const tufts = [];
    const ferns = [];
    const stones = [];
    const lichen = [];
    const petals = [];
    const stems = [];
    const grassPalette = ['#708e58', '#526f45', '#638653', '#92a66c', '#456444', '#8d9355'];
    const stonePalette = ['#566760', '#6a7672', '#435853', '#69746b'];
    const leafPalette = ['#8a7642', '#997940', '#795644', '#728b52'];
    for (let index = 0; index < 1620; index++) {
      const [x, z] = obstaclePosition(random, 0.6, index < 800 ? 21 : 47);
      const distance = Math.hypot(x, z);
      if (Math.abs(x * 0.86 + z * 0.33) < 1.8 && random() < 0.69) continue;
      if (distance < 11 && octaves(x * 1.4, z * 1.4) < -0.08 && random() < 0.66) continue;
      const size = (0.41 + random() * 0.9) * (distance < 13 ? 0.57 : 1);
      const item = { position: [x, groundHeight(x, z) - 0.025, z], scale: [size, size, size],
        rotation: [0, random() * TAU, 0], tint: grassPalette[index % grassPalette.length] };
      tufts.push(item);
      if (distance > 10 && index % 9 === 0) ferns.push({ ...item, scale: [size * 1.12, size * 1.12, size * 1.12] });
    }
    for (let index = 0; index < 241; index++) {
      const [x, z] = obstaclePosition(random, 1, index < 118 ? 19 : 38);
      const distance = Math.hypot(x, z);
      const size = (0.085 + random() * 0.29) * (distance > 17 && index % 4 === 0 ? 3.9 : 1);
      const y = groundHeight(x, z);
      const angle = random() * TAU;
      stones.push({ position: [x, y + size * 0.13 - 0.025, z], scale: [size * 1.28, size * 0.62, size],
        rotation: [0.28, angle, 0.13], tint: stonePalette[index % stonePalette.length] });
      if (size > 0.53) {
        lichen.push({ position: [x + size * 0.06, y + size * 0.47, z - size * 0.12],
          scale: [size * 1.04, size * 0.27, size * 0.83], rotation: [0.28, angle, 0.13], tint: '#62764a' });
      }
    }
    for (let index = 0; index < 320; index++) {
      const [x, z] = obstaclePosition(random, 2, 24);
      const size = 0.09 + random() * 0.12;
      petals.push({ position: [x, groundHeight(x, z) + 0.014, z], scale: [size, 0.014, size * 0.53],
        rotation: [0, random() * TAU, (random() - 0.5) * 0.14], tint: leafPalette[index % leafPalette.length] });
    }
    for (let patch = 0; patch < 26; patch++) {
      const [centerX, centerZ] = obstaclePosition(random, 10, 25);
      for (let mushroom = 0; mushroom < 4; mushroom++) {
        const x = centerX + (random() - 0.5) * 0.91;
        const z = centerZ + (random() - 0.5) * 0.91;
        const size = 0.063 + random() * 0.15;
        const y = groundHeight(x, z) - 0.02;
        stems.push({ position: [x, y + size * 0.55, z], scale: [size * 0.3, size * 1.1, size * 0.3], tint: '#aea078' });
        petals.push({ position: [x, y + size * 1.16, z], scale: [size, size * 0.46, size],
          tint: mushroom % 2 ? '#bd714c' : '#d39451' });
      }
    }
    const finish = material('#ffffff');
    const leafFinish = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 1 });
    batch(scene, tuftGeometry(), leafFinish, tufts);
    batch(scene, fernGeometry(), leafFinish, ferns);
    batch(scene, rock, finish, stones, true);
    batch(scene, rock, finish, lichen);
    batch(scene, rock, finish, petals);
    batch(scene, cylinder, finish, stems);
  }

  function addFallenTimber(scene, x, z, angle, size) {
    const timber = group(scene, x, groundHeight(x, z) + size * 0.77, z);
    timber.rotation.y = angle;
    const bark = material('#554538');
    const heartwood = material('#937151');
    const moss = material('#647949');
    collar(timber, bark, 0, 0, 0, size, size * 8).rotation.z = Math.PI / 2;
    collar(timber, heartwood, -size * 4.017, 0, 0, size * 0.86, size * 0.063).rotation.z = Math.PI / 2;
    collar(timber, bark, -size * 4.052, 0, 0, size * 0.63, size * 0.041).rotation.z = Math.PI / 2;
    collar(timber, heartwood, -size * 4.083, 0, 0, size * 0.47, size * 0.057).rotation.z = Math.PI / 2;
    for (let index = -2; index <= 2; index++) {
      shape(timber, moss, index * size * 1.42, size * 0.81, index % 2 * size * 0.27, size * 1.1, size * 0.29, size * 0.71);
    }
  }

  function addMotes(scene, random) {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    for (let index = 0; index < 126; index++) {
      const [x, z] = obstaclePosition(random, 8, 30);
      positions.push(x, 0.1 + Math.pow(random(), 2) * 5.4, z);
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const moteMaterial = new THREE.ShaderMaterial({
      uniforms: { tint: { value: new THREE.Color('#d1cf7e') } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying float vDepth;
        void main() {
          vec4 transformed = modelViewMatrix * vec4(position, 1.0);
          vDepth = -transformed.z;
          gl_Position = projectionMatrix * transformed;
          gl_PointSize = clamp(60.0 / vDepth, 1.1, 4.5);
        }
      `,
      fragmentShader: `
        uniform vec3 tint;
        varying float vDepth;
        void main() {
          float radius = length(gl_PointCoord - 0.5);
          float alpha = (1.0 - smoothstep(0.09, 0.49, radius)) * exp(-0.012 * vDepth);
          gl_FragColor = vec4(tint, alpha * 0.62);
        }
      `,
    });
    scene.add(new THREE.Points(geometry, moteMaterial));
  }

  function createForest(scene) {
    const random = randomSource(572331);
    const haze = new THREE.Color('#203b39');
    scene.background = haze;
    scene.fog = new THREE.FogExp2(haze, 0.026);
    scene.add(new THREE.HemisphereLight(0xc0e5e3, 0x4d573c, 1.79));

    const moon = new THREE.DirectionalLight(0xffd6a4, 2.25);
    moon.position.set(-8, 16, 8);
    moon.castShadow = true;
    moon.shadow.mapSize.set(1536, 1536);
    Object.assign(moon.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 0.5, far: 50 });
    moon.shadow.normalBias = 0.044;
    moon.shadow.radius = 2.6;
    scene.add(moon);

    const fill = new THREE.DirectionalLight(0x79c4c6, 1.05);
    fill.position.set(7, 7, -9);
    scene.add(fill);

    addGround(scene, random);
    addTrees(scene, random);
    addUndergrowth(scene, random);
    addFallenTimber(scene, 12.7, -13.6, -0.89, 0.69);
    addFallenTimber(scene, -16, 7.9, 0.54, 0.46);
    addMotes(scene, random);
  }

  return { createForest, createFighter, createShield };
}
