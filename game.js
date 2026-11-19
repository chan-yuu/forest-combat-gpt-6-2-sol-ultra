const viewport = document.querySelector('#viewport');
const hud = {
  health: document.querySelector('#health-value'),
  healthFill: document.querySelector('#health-fill'),
  rage: document.querySelector('#rage-value'),
  rageFill: document.querySelector('#rage-fill'),
  pips: [...document.querySelectorAll('[data-pip]')],
  skills: [...document.querySelectorAll('[data-skill]')],
  shield: document.querySelector('#shield-state'),
  wave: document.querySelector('#wave-label'),
  enemyCount: document.querySelector('#enemy-count'),
  boss: document.querySelector('#boss-hud'),
  bossFill: document.querySelector('#boss-fill'),
  bossValue: document.querySelector('#boss-value'),
  toast: document.querySelector('#toast'),
  overlay: document.querySelector('#overlay'),
  title: document.querySelector('#overlay-title'),
  text: document.querySelector('#overlay-text'),
  start: document.querySelector('#start-button'),
  mute: document.querySelector('#mute-button'),
};

function boot(THREE) {
  const { createForest, createFighter, createShield } = createForestAssets(THREE);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.24;
  viewport.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera();
  createForest(scene);
  const battle = new THREE.Group();
  scene.add(battle);

  const audio = createAudio();
  let muted = false;
  const introText = hud.text.innerHTML;
  const introTitle = hud.title.textContent;
  const hero = createFighter('hero');
  hero.bodyRestY = hero.body.position.y;
  const thrown = createShield();
  scene.add(hero.root, thrown);
  thrown.visible = false;

  const keys = new Set();
  const pointer = new THREE.Vector2();
  const aimPoint = new THREE.Vector3();
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const raycaster = new THREE.Raycaster();
  const cameraFocus = new THREE.Vector3();
  const cameraOffset = new THREE.Vector3(0, 11.5, 20.5);
  const screenPoint = new THREE.Vector3();
  const facing = new THREE.Vector3();
  const intent = new THREE.Vector3();
  const step = new THREE.Vector3();
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.19, 0.23, 24),
    new THREE.MeshBasicMaterial({ color: 0xd4e5c8, transparent: true, opacity: 0.48, side: THREE.DoubleSide, depthWrite: false }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.visible = false;
  scene.add(marker);

  const RANGE = 14.2;
  const MAX_HEALTH = 120;
  const TAU = Math.PI * 2;
  const spawning = [
    [[-5.7, -4.2], [0.1, -6.7], [5.9, -4.4], [1.8, -10.6]],
    [[-5.3, -8.0], [5.4, -7.5], [0, -11.2, 'boss']],
  ];
  const ability = {
    basic: { windup: 0.14, duration: 0.42 },
    bash: { windup: 0.14, duration: 0.47 },
    throw: { windup: 0.19, duration: 0.45 },
    spin: { windup: 0.22, duration: 0.8 },
    dodge: { windup: 1, duration: 0.33 },
  };

  const enemies = [];
  const effects = [];
  const numbers = [];
  const particleGeometry = new THREE.BoxGeometry(1, 1, 1);
  const particleMaterials = new Map();
  const barBack = new THREE.MeshBasicMaterial({ color: 0x171c24, transparent: true, opacity: 0.85, depthWrite: false });
  const barFront = new THREE.MeshBasicMaterial({ color: 0xe48664, depthWrite: false });
  const barGeometry = new THREE.PlaneGeometry(1, 1);
  const projectile = {
    active: false, targets: [], elapsed: 0, from: new THREE.Vector3(),
    anchor: new THREE.Vector3(), destination: new THREE.Vector3(),
  };
  let mode = 'ready';
  let wave = 0;
  let nextWave = 0;
  let health = MAX_HEALTH;
  let rage = 0;
  let points = 0;
  let immunity = 0;
  let dodgeCooldown = 0;
  let shake = 0;
  let toastTime = 0;
  let pointerActive = false;
  let action = null;
  let combo = 0;
  let stride = 0;
  let clock = 0;
  let lastTime = performance.now();

  function resize() {
    const width = Math.max(1, viewport.clientWidth);
    const height = Math.max(1, viewport.clientHeight);
    const aspect = width / height;
    const vertical = Math.max(17.5, 11.8 / aspect);
    camera.left = -vertical * aspect / 2;
    camera.right = vertical * aspect / 2;
    camera.top = vertical / 2;
    camera.bottom = -vertical / 2;
    camera.near = 0.1;
    camera.far = 135;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function setFacing(root, dx, dz) {
    if (Math.abs(dx) + Math.abs(dz) > 0.001) root.rotation.y = Math.atan2(dx, dz);
  }

  function limitPosition(position) {
    const radius = Math.hypot(position.x, position.z);
    if (radius > RANGE) {
      position.x *= RANGE / radius;
      position.z *= RANGE / radius;
    }
  }

  function aimHero() {
    if (pointerActive) {
      raycaster.setFromCamera(pointer, camera);
      raycaster.ray.intersectPlane(floor, aimPoint);
      setFacing(hero.root, aimPoint.x - hero.root.position.x, aimPoint.z - hero.root.position.z);
    }
  }

  function movement() {
    intent.set(
      Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')),
      0,
      Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp')),
    ).normalize();
    return intent;
  }

  function toast(message, seconds = 1.5) {
    hud.toast.textContent = message;
    hud.toast.classList.add('visible');
    toastTime = seconds;
  }

  function syncHud() {
    const remaining = enemies.filter(enemy => enemy.hp > 0).length;
    hud.health.textContent = `${health} / ${MAX_HEALTH}`;
    hud.healthFill.style.width = `${health / MAX_HEALTH * 100}%`;
    hud.rage.textContent = points === 3 ? '已满' : `${rage} / 100`;
    hud.rageFill.style.width = `${points === 3 ? 100 : rage}%`;
    hud.shield.textContent = projectile.active ? '飞盾在途' : '盾牌就绪';
    hud.wave.textContent = wave === 0 ? '第一波 · 林地斥候' : '第二波 · 半兽人统领';
    hud.enemyCount.textContent = String(remaining);
    hud.pips.forEach(pip => pip.classList.toggle('filled', Number(pip.dataset.pip) <= points));
    hud.pips[0].parentElement.setAttribute('aria-label', `${points} / 3 个怒气点`);
    hud.skills.forEach(button => {
      const cost = Number(button.dataset.skill);
      const ready = mode === 'playing' && points >= cost && (cost === 3 || !projectile.active);
      button.disabled = !ready;
      button.classList.toggle('ready', ready);
    });
    const boss = enemies.find(enemy => enemy.kind === 'boss' && enemy.hp > 0);
    hud.boss.hidden = !boss || mode !== 'playing';
    if (boss) {
      hud.bossFill.style.width = `${boss.hp / boss.maxHp * 100}%`;
      hud.bossValue.textContent = `${boss.hp} / ${boss.maxHp}`;
    }
  }

  function addRage(amount) {
    if (points >= 3) return;
    rage += amount;
    if (rage >= 100) {
      points += 1;
      rage = points === 3 ? 0 : rage - 100;
      audio.play('rage');
      toast('获得 1 点怒气', 0.95);
    }
  }

  function createBar() {
    const bar = new THREE.Group();
    const background = new THREE.Mesh(barGeometry, barBack);
    background.scale.set(1.16, 0.115, 1);
    const fill = new THREE.Mesh(barGeometry, barFront);
    fill.position.z = 0.015;
    fill.scale.set(1.08, 0.055, 1);
    bar.add(background, fill);
    battle.add(bar);
    return { node: bar, fill };
  }

  function spawnWave() {
    for (const [x, z, kind = 'orc'] of spawning[wave]) {
      const rig = createFighter(kind);
      const hp = kind === 'boss' ? 320 : 64;
      rig.root.position.set(x, 0, z);
      setFacing(rig.root, hero.root.position.x - x, hero.root.position.z - z);
      const enemy = {
        ...rig, kind, hp, maxHp: hp, bodyRestY: rig.body.position.y, attack: null, cooldown: 0.75,
        stagger: 0, fall: 0, stride: 0, seed: enemies.length * 1.59,
        push: new THREE.Vector3(),
        bar: kind === 'orc' ? createBar() : null,
      };
      battle.add(enemy.root);
      enemies.push(enemy);
    }
    syncHud();
  }

  function removeEnemy(enemy) {
    cancelAttack(enemy);
    enemy.root.removeFromParent();
    enemy.bar?.node.removeFromParent();
  }

  function reset(play) {
    for (const enemy of enemies) removeEnemy(enemy);
    enemies.length = 0;
    for (const effect of effects) removeEffect(effect);
    effects.length = 0;
    for (const number of numbers) number.node.remove();
    numbers.length = 0;
    keys.clear();
    wave = 0;
    nextWave = 0;
    health = MAX_HEALTH;
    rage = 0;
    points = 0;
    immunity = 0;
    dodgeCooldown = 0;
    shake = 0;
    action = null;
    combo = 0;
    stride = 0;
    projectile.active = false;
    projectile.targets = [];
    thrown.visible = false;
    hero.shield.visible = true;
    hero.root.position.set(0, 0, 3.1);
    hero.root.rotation.set(0, Math.PI, 0);
    hero.body.rotation.set(0, 0, 0);
    pointerActive = false;
    toastTime = 0;
    hud.toast.classList.remove('visible');
    mode = play ? 'playing' : 'ready';
    hud.overlay.hidden = play;
    hud.title.textContent = introTitle;
    hud.text.innerHTML = introText;
    hud.start.textContent = '进入战斗';
    spawnWave();
    if (play) toast('第一波 · 林地斥候', 1.75);
  }

  function finish(won) {
    mode = won ? 'won' : 'lost';
    action = null;
    keys.clear();
    for (const enemy of enemies) cancelAttack(enemy);
    if (projectile.active && projectile.targets.length) {
      projectile.targets.length = 0;
      projectile.from.copy(thrown.position);
      projectile.elapsed = 0;
    }
    hud.title.textContent = won ? '林地已夺回' : '战士倒下了';
    hud.text.textContent = won
      ? '两波敌人已清除，半兽人统领倒下了。'
      : '留意脚下的红色预警，用闪避拉开距离。';
    hud.start.textContent = '再战一次';
    hud.overlay.hidden = false;
    hud.toast.classList.remove('visible');
    audio.play(won ? 'win' : 'lose');
    syncHud();
  }

  function arc(position, inner, outer, span, angle, color, opacity, height = 0.055) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, 48, 1, Math.PI / 2 - span / 2, span),
      new THREE.MeshBasicMaterial({
        color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide,
        blending: height > 0.1 ? THREE.AdditiveBlending : THREE.NormalBlending,
      }),
    );
    mesh.rotation.order = 'YXZ';
    mesh.rotation.x = Math.PI / 2;
    mesh.rotation.y = angle;
    mesh.position.copy(position);
    mesh.position.y = height;
    mesh.renderOrder = 1;
    battle.add(mesh);
    return mesh;
  }

  function fadingArc(position, inner, outer, span, angle, color, opacity, life, height, growth = 0) {
    const mesh = arc(position, inner, outer, span, angle, color, opacity, height);
    effects.push({ mesh, life, max: life, opacity, growth, dispose: true });
  }

  function sparks(position, color, count, size = 0.1, power = 4) {
    if (!particleMaterials.has(color)) {
      particleMaterials.set(color, new THREE.MeshBasicMaterial({ color }));
    }
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(particleGeometry, particleMaterials.get(color));
      mesh.position.copy(position);
      mesh.rotation.set(Math.random() * 4, Math.random() * 4, Math.random() * 4);
      const angle = Math.random() * TAU;
      const speed = power * (0.3 + Math.random() * 0.7);
      const velocity = new THREE.Vector3(Math.sin(angle) * speed, (0.15 + Math.random()) * power * 0.6, Math.cos(angle) * speed);
      const life = 0.18 + Math.random() * 0.32;
      effects.push({ mesh, velocity, life, max: life, size: size * (0.45 + Math.random() * 0.7) });
      battle.add(mesh);
    }
  }

  function removeEffect(effect) {
    effect.mesh.removeFromParent();
    if (effect.dispose) {
      effect.mesh.geometry.dispose();
      effect.mesh.material.dispose();
    }
  }

  function damageNumber(position, value, color = '#f7dfac') {
    const node = document.createElement('span');
    node.textContent = value;
    Object.assign(node.style, {
      position: 'absolute', zIndex: '2', top: '0', left: '0', color, pointerEvents: 'none',
      font: '800 1.15rem system-ui', textShadow: '0 2px 5px #121219, 0 0 12px #121219',
      willChange: 'transform, opacity',
    });
    viewport.append(node);
    numbers.push({ node, pos: position.clone(), age: 0 });
  }

  function updateEffects(dt) {
    for (let index = effects.length - 1; index >= 0; index--) {
      const effect = effects[index];
      effect.life -= dt;
      if (effect.life <= 0) {
        removeEffect(effect);
        effects.splice(index, 1);
        continue;
      }
      const ratio = effect.life / effect.max;
      if (effect.velocity) {
        effect.mesh.position.addScaledVector(effect.velocity, dt);
        effect.velocity.y -= 8 * dt;
        effect.mesh.scale.setScalar(effect.size * Math.sqrt(ratio));
      } else {
        effect.mesh.material.opacity = effect.opacity * ratio;
        const scale = 1 + (1 - ratio) * effect.growth;
        effect.mesh.scale.set(scale, scale, 1);
      }
    }
    for (let index = numbers.length - 1; index >= 0; index--) {
      const item = numbers[index];
      item.age += dt;
      if (item.age > 0.78) {
        item.node.remove();
        numbers.splice(index, 1);
        continue;
      }
      screenPoint.copy(item.pos);
      screenPoint.y += item.age * 1.35;
      screenPoint.project(camera);
      const x = (screenPoint.x + 1) * viewport.clientWidth / 2;
      const y = (1 - screenPoint.y) * viewport.clientHeight / 2;
      item.node.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      item.node.style.opacity = String(Math.min(1, (0.78 - item.age) * 3.6));
    }
  }

  function targetsWithin(radius, halfAngle = Math.PI) {
    const angle = hero.root.rotation.y;
    const position = hero.root.position;
    return enemies.filter(enemy => {
      if (enemy.hp <= 0) return false;
      const dx = enemy.root.position.x - position.x;
      const dz = enemy.root.position.z - position.z;
      const distance = Math.hypot(dx, dz);
      const padding = enemy.kind === 'boss' ? 0.38 : 0.18;
      return distance <= radius + padding
        && (distance < 0.65 || Math.sin(angle) * dx + Math.cos(angle) * dz >= Math.cos(halfAngle) * distance);
    });
  }

  function throwTargets() {
    const living = enemies.filter(enemy => enemy.hp > 0);
    const sorted = (position, candidates, range) => candidates
      .map(enemy => ({ enemy, distance: enemy.root.position.distanceTo(position) }))
      .filter(target => target.distance <= range)
      .sort((a, b) => a.distance - b.distance);
    const first = sorted(hero.root.position, living, 10.5)[0]?.enemy;
    if (!first) return [];
    const second = sorted(first.root.position, living.filter(enemy => enemy !== first), 8.5)[0]?.enemy;
    return second ? [first, second] : [first];
  }

  function cancelAttack(enemy) {
    if (!enemy.attack) return;
    for (const mesh of [enemy.attack.zone, enemy.attack.edge]) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    enemy.attack = null;
  }

  function hitEnemy(enemy, damage, color, stun = 0, knockback = 0) {
    if (enemy.hp <= 0) return;
    enemy.hp = Math.max(0, enemy.hp - damage);
    if (stun || enemy.hp === 0) {
      cancelAttack(enemy);
      enemy.stagger = Math.max(enemy.stagger, enemy.kind === 'boss' ? stun * 0.58 : stun);
      enemy.cooldown = Math.max(enemy.cooldown, stun + 0.12);
    }
    if (knockback) {
      enemy.push.subVectors(enemy.root.position, hero.root.position).normalize()
        .multiplyScalar(enemy.kind === 'boss' ? knockback * 0.35 : knockback);
    }
    const pos = enemy.root.position.clone();
    pos.y = enemy.kind === 'boss' ? 1.7 : 1.2;
    sparks(pos, color, enemy.hp ? 8 : 14);
    pos.y += enemy.kind === 'boss' ? 1.25 : 1.0;
    damageNumber(pos, damage);
    shake = Math.max(shake, enemy.hp ? 0.07 : 0.13);
    if (enemy.hp === 0) audio.play('death');
  }

  function hitHero(damage, enemy) {
    if (immunity > 0 || health <= 0) return;
    health = Math.max(0, health - damage);
    immunity = 0.44;
    shake = 0.27;
    const pos = hero.root.position.clone().add(new THREE.Vector3(0, 1.55, 0));
    sparks(pos, 0xe96e59, 12, 0.15, 5);
    pos.y += 0.75;
    damageNumber(pos, `−${damage}`, '#ffa691');
    audio.play('hurt');
    step.subVectors(hero.root.position, enemy.root.position).normalize();
    hero.root.position.addScaledVector(step, 0.42);
    limitPosition(hero.root.position);
    syncHud();
    if (health === 0) finish(false);
  }

  function shieldAnchor() {
    hero.shield.getWorldPosition(projectile.anchor);
    return projectile.anchor;
  }

  function launchShield() {
    const targets = action.targets.filter(enemy => enemy.hp > 0);
    if (!targets.length) {
      points = Math.min(3, points + 2);
      toast('附近没有可投掷的目标');
      syncHud();
      return;
    }
    projectile.targets = targets;
    projectile.elapsed = 0;
    projectile.from.copy(shieldAnchor());
    projectile.active = true;
    thrown.position.copy(projectile.from);
    thrown.visible = true;
    hero.shield.visible = false;
    audio.play('throw');
  }

  function updateShield(dt) {
    if (!projectile.active) return;
    const target = projectile.targets[0];
    const destination = projectile.destination;
    if (target) {
      destination.copy(target.root.position);
      destination.y = target.kind === 'boss' ? 1.74 : 1.22;
    } else {
      destination.copy(shieldAnchor());
    }
    const duration = THREE.MathUtils.clamp(projectile.from.distanceTo(destination) / 18, 0.16, 0.64);
    projectile.elapsed += dt;
    const t = Math.min(1, projectile.elapsed / duration);
    thrown.position.lerpVectors(projectile.from, destination, t);
    thrown.position.y += Math.sin(t * Math.PI) * (target ? 0.72 : 0.55);
    thrown.rotation.set(-1.1, clock * 8, clock * 20);
    if (Math.random() < dt * 37) sparks(thrown.position, 0x9edbfc, 1, 0.11, 0.8);
    if (t < 1) return;

    if (target) {
      if (target.hp > 0) {
        hitEnemy(target, 48, 0x8fd9ff, 0.42, 2.1);
        audio.play('ricochet');
        fadingArc(target.root.position, 0.42, 0.63, TAU, 0, 0x87e8ff, 0.76, 0.32, 0.085, 1.75);
      }
      projectile.targets.shift();
      projectile.from.copy(thrown.position);
      projectile.elapsed = 0;
    } else {
      projectile.active = false;
      thrown.visible = false;
      hero.shield.visible = true;
      audio.play('catch');
    }
    syncHud();
  }

  function startAction(name, cost = 0) {
    if (mode !== 'playing') return;
    if (name === 'dodge') {
      if (dodgeCooldown > 0 || (action && (!action.applied || action.name === 'spin'))) return;
      audio.play('dodge');
      dodgeCooldown = 0.62;
      immunity = Math.max(immunity, 0.34);
      const direction = movement().clone();
      if (direction.lengthSq() === 0) {
        const angle = hero.root.rotation.y;
        direction.set(-Math.sin(angle), 0, -Math.cos(angle));
      }
      action = { name, t: 0, direction, applied: false, ...ability[name] };
      fadingArc(hero.root.position, 0.35, 0.65, TAU, 0, 0x9abbb4, 0.4, 0.26, 0.08, 1.8);
      return;
    }
    if (action) return;
    if (cost > points) {
      toast(`需要 ${cost} 点怒气`);
      return;
    }
    if ((name === 'bash' || name === 'throw') && projectile.active) {
      toast('等待盾牌返回');
      return;
    }
    const targets = name === 'throw' ? throwTargets() : [];
    if (name === 'throw' && targets.length === 0) {
      toast('附近没有可投掷的目标');
      return;
    }
    aimHero();
    if (targets.length) {
      const delta = step.subVectors(targets[0].root.position, hero.root.position);
      setFacing(hero.root, delta.x, delta.z);
    }
    points -= cost;
    if (name === 'basic') {
      combo = 1 - combo;
      audio.play('swing');
    }
    action = { name, t: 0, applied: false, targets, ...ability[name] };
    syncHud();
  }

  function applyAction(name) {
    const { position, rotation } = hero.root;
    if (name === 'basic') {
      const hits = targetsWithin(2.65, 0.94);
      fadingArc(position, 1.78, 2.68, 1.9, rotation.y, 0xffdb9f, 0.82, 0.21, 0.87, 0.09);
      for (const target of hits) hitEnemy(target, 22, 0xffc985, 0, 0.95);
      if (hits.length) {
        addRage(34);
        audio.play('hit');
      }
    }
    if (name === 'bash') {
      const hits = targetsWithin(2.8, 0.7);
      audio.play('bash');
      fadingArc(position, 1.68, 2.88, 1.45, rotation.y, 0xa8e5ff, 0.94, 0.26, 0.63, 0.2);
      for (const target of hits) hitEnemy(target, 37, 0x9ee8ff, 1.10, 8);
    }
    if (name === 'throw') launchShield();
    if (name === 'spin') {
      audio.play('whirlwind');
      shake = Math.max(shake, 0.32);
      const hits = targetsWithin(4.2);
      for (const target of hits) hitEnemy(target, 98, 0xffc778, 0.55, 6.4);
      fadingArc(position, 2.05, 4.18, TAU, 0, 0xffb960, 0.87, 0.38, 0.75, 0.16);
      fadingArc(position, 2.55, 4.32, TAU, 0, 0xff8b52, 0.72, 0.59, 0.076, 0.13);
      const center = position.clone().add(new THREE.Vector3(0, 0.95, 0));
      sparks(center, 0xffcca0, 28, 0.17, 9);
    }
    syncHud();
  }

  function pose(rig, walking, phase, sway = 1) {
    const stride = Math.sin(phase) * walking;
    const idle = Math.sin(clock * 3 + phase * 0.1);
    rig.body.position.y = rig.bodyRestY + Math.abs(stride) * 0.065 + idle * 0.027;
    rig.body.rotation.set(0, stride * 0.10, stride * 0.024 * sway);
    rig.head.rotation.set(-0.026, -stride * 0.066, 0);
    rig.armL.rotation.set(-0.19 - stride * 0.50, 0, 0.055);
    rig.armR.rotation.set(-0.10 + stride * 0.54, 0, -0.065);
    rig.legL.rotation.x = stride * 0.72;
    rig.legR.rotation.x = -stride * 0.72;
  }

  function updateHero(dt) {
    const position = hero.root.position;
    const direction = movement();
    const walking = direction.lengthSq() > 0;
    immunity = Math.max(0, immunity - dt);
    dodgeCooldown = Math.max(0, dodgeCooldown - dt);
    if (!action) {
      if (pointerActive) aimHero();
      else if (walking) setFacing(hero.root, direction.x, direction.z);
      if (walking) position.addScaledVector(direction, dt * 6.5);
    } else if (action.name === 'dodge') {
      position.addScaledVector(action.direction, dt * (12.2 - action.t * 10));
    } else {
      if (walking) position.addScaledVector(direction, dt * (action.name === 'spin' ? 2.4 : 1.6));
      if (action.t < 0.16 && (action.name === 'basic' || action.name === 'bash')) {
        facing.set(Math.sin(hero.root.rotation.y), 0, Math.cos(hero.root.rotation.y));
        position.addScaledVector(facing, dt * (action.name === 'bash' ? 5.4 : 1.8));
      }
    }
    limitPosition(position);
    if (walking) stride += 13 * dt;
    pose(hero, walking ? (action ? 0.34 : 0.84) : 0, stride);
    if (!action) return;

    const active = action;
    active.t += dt;
    if (!active.applied && active.t >= active.windup) {
      active.applied = true;
      applyAction(active.name);
    }
    const rate = active.t / active.duration;
    const swing = Math.sin(Math.min(1, rate) * Math.PI);
    switch (active.name) {
      case 'basic':
        hero.armR.rotation.x -= 1.18 * swing;
        hero.armR.rotation.z -= 0.93 * swing;
        hero.body.rotation.y = (combo ? 1 : -1) * (rate < 0.31 ? -0.75 * rate / 0.31 : 0.94 * Math.sin(rate * Math.PI));
        break;
      case 'bash':
        hero.armL.rotation.x -= 1.18 * swing;
        hero.body.rotation.y += 0.55 * swing;
        hero.armL.rotation.z -= 0.44 * swing;
        break;
      case 'throw':
        hero.armL.rotation.x -= 1.25 * swing;
        hero.body.rotation.y -= 0.8 * swing;
        break;
      case 'spin':
        hero.body.rotation.y = rate * TAU * 2;
        hero.armR.rotation.z -= 1.18 * swing;
        hero.armL.rotation.z += 0.76 * swing;
        break;
      case 'dodge':
        hero.body.rotation.x = 0.38 * swing;
        hero.body.position.y -= 0.36 * swing;
        hero.legL.rotation.x = -0.63 * swing;
        hero.legR.rotation.x = 0.68 * swing;
        break;
    }
    if (active.t >= active.duration) action = null;
  }

  function startEnemyAttack(enemy, heavy) {
    const boss = enemy.kind === 'boss';
    const radius = heavy ? 4.25 : boss ? 3.45 : 2.45;
    const halfAngle = heavy ? Math.PI : boss ? 0.98 : 0.79;
    const duration = heavy ? 1.03 : boss ? 0.78 : 0.62;
    const angle = enemy.root.rotation.y;
    const zone = arc(enemy.root.position, 0.16, radius, halfAngle * 2, angle, 0xea4540, 0.12, 0.063);
    const edge = arc(enemy.root.position, radius - 0.085, radius, halfAngle * 2, angle, 0xff6655, 0.8, 0.071);
    enemy.attack = { radius, halfAngle, duration, angle, zone, edge, t: 0, damage: heavy ? 36 : boss ? 26 : 15, heavy };
    audio.play(heavy ? 'enemyHeavy' : 'enemyWindup');
  }

  function updateEnemyAttack(enemy, dt) {
    const attack = enemy.attack;
    attack.t += dt;
    const progress = Math.min(attack.t / attack.duration, 1);
    attack.zone.material.opacity = 0.15 + progress * progress * 0.37;
    attack.edge.material.opacity = 0.57 + progress * 0.35;
    enemy.armR.rotation.x -= 1.85 * progress;
    enemy.armR.rotation.z -= 0.48 * progress;
    enemy.body.rotation.x -= 0.15 * progress;
    if (attack.t < attack.duration) return;

    const dx = hero.root.position.x - enemy.root.position.x;
    const dz = hero.root.position.z - enemy.root.position.z;
    const distance = Math.hypot(dx, dz);
    const dot = Math.sin(attack.angle) * dx + Math.cos(attack.angle) * dz;
    if (distance <= attack.radius && dot >= Math.cos(attack.halfAngle) * distance) hitHero(attack.damage, enemy);
    fadingArc(enemy.root.position, attack.radius * 0.57, attack.radius, attack.halfAngle * 2,
      attack.angle, 0xff795c, 0.72, 0.25, attack.heavy ? 0.09 : 0.73, 0.12);
    audio.play(attack.heavy ? 'bash' : 'swing');
    enemy.cooldown = enemy.kind === 'boss' ? 1.06 : 0.93 + Math.random() * 0.28;
    cancelAttack(enemy);
  }

  function updateEnemies(dt) {
    for (const enemy of enemies) {
      if (!enemy.root.visible || (enemy.hp && mode !== 'playing')) continue;
      const boss = enemy.kind === 'boss';
      if (enemy.hp === 0) {
        enemy.fall += dt;
        enemy.body.rotation.x = -1.5 * Math.min(1, enemy.fall * 3);
        enemy.root.position.y = -0.37 * Math.min(1, enemy.fall) - Math.max(0, enemy.fall - 0.6) * 1.9;
        if (enemy.bar) enemy.bar.node.visible = false;
        if (enemy.fall >= 1.38) enemy.root.visible = false;
        continue;
      }
      enemy.stagger = Math.max(0, enemy.stagger - dt);
      enemy.cooldown = Math.max(0, enemy.cooldown - dt);
      const position = enemy.root.position;
      position.addScaledVector(enemy.push, dt);
      enemy.push.multiplyScalar(Math.exp(-7.5 * dt));
      const dx = hero.root.position.x - position.x;
      const dz = hero.root.position.z - position.z;
      const distance = Math.hypot(dx, dz);
      let walking = 0;
      if (!enemy.attack) setFacing(enemy.root, dx, dz);
      const othersAttacking = enemies.filter(other => other !== enemy && other.attack).length;
      if (enemy.stagger <= 0 && !enemy.attack) {
        if (enemy.cooldown <= 0 && othersAttacking < 2 && distance <= (boss ? 3.55 : 2.06)) {
          startEnemyAttack(enemy, boss && Math.random() < 0.53);
        } else if (distance > (boss ? 2.68 : 1.76)) {
          const speed = boss ? 2.3 : 2.9;
          position.x += dx / distance * dt * speed;
          position.z += dz / distance * dt * speed;
          walking = 0.77;
        }
      }
      enemy.stride += walking * dt * (boss ? 11 : 15);
      pose(enemy, walking, enemy.stride + enemy.seed);
      if (enemy.stagger > 0) {
        enemy.body.rotation.x -= Math.min(0.31, enemy.stagger * 0.55);
        enemy.armL.rotation.z += 0.19;
      }
      if (enemy.attack) updateEnemyAttack(enemy, dt);
      if (enemy.attack) continue;
      for (const other of enemies) {
        if (other === enemy || other.hp <= 0) continue;
        step.subVectors(position, other.root.position);
        const length = step.length();
        const spacing = boss || other.kind === 'boss' ? 1.55 : 1.12;
        if (length < spacing && length > 0.001) position.addScaledVector(step, (spacing - length) * dt * 4 / length);
      }
      step.subVectors(position, hero.root.position);
      const length = step.length();
      const spacing = boss ? 1.12 : 0.82;
      if (length < spacing && length > 0.001) position.addScaledVector(step, (spacing - length) * dt * 8 / length);
      limitPosition(position);
    }
  }

  function updateWaves(dt) {
    if (mode !== 'playing' || enemies.some(enemy => enemy.hp > 0)) return;
    if (wave === spawning.length - 1) {
      finish(true);
      return;
    }
    if (nextWave === 0) {
      nextWave = 2.35;
      health = Math.min(MAX_HEALTH, health + 32);
      toast('斥候已击退 · 回复 32 点生命', nextWave);
      syncHud();
    }
    nextWave -= dt;
    if (nextWave > 0) return;
    nextWave = 0;
    wave += 1;
    spawnWave();
    toast('半兽人统领现身', 2.3);
  }

  function updateCamera(dt) {
    facing.set(hero.root.position.x * 0.64, 0, hero.root.position.z * 0.64 - 1.25);
    cameraFocus.lerp(facing, 1 - Math.exp(-5.2 * dt));
    camera.position.copy(cameraFocus).add(cameraOffset);
    if (shake > 0) {
      shake = Math.max(0, shake - dt * 1.6);
      camera.position.x += Math.sin(clock * 110) * shake * 0.68;
      camera.position.y += Math.cos(clock * 94) * shake * 0.45;
    }
    camera.lookAt(cameraFocus);
    camera.updateMatrixWorld();
  }

  function updateMarkers() {
    marker.visible = mode === 'playing' && pointerActive;
    if (marker.visible) {
      raycaster.setFromCamera(pointer, camera);
      raycaster.ray.intersectPlane(floor, aimPoint);
      marker.position.set(aimPoint.x, 0.074, aimPoint.z);
      marker.visible = Math.hypot(aimPoint.x, aimPoint.z) < RANGE + 0.5;
    }
    for (const enemy of enemies) {
      if (!enemy.bar) continue;
      const { bar } = enemy;
      bar.node.visible = mode === 'playing' && enemy.hp > 0 && enemy.hp < enemy.maxHp;
      if (!bar.node.visible) continue;
      bar.node.position.copy(enemy.root.position);
      bar.node.position.y = 2.36;
      bar.node.quaternion.copy(camera.quaternion);
      const ratio = enemy.hp / enemy.maxHp;
      bar.fill.scale.x = 1.08 * ratio;
      bar.fill.position.x = (ratio - 1) * 0.54;
    }
  }

  function frame(now) {
    const dt = Math.min(0.043, (now - lastTime) / 1000);
    lastTime = now;
    clock += dt;
    if (mode === 'playing') {
      updateHero(dt);
    } else {
      pose(hero, 0, 0);
      if (mode === 'lost') hero.body.rotation.x = -1.33;
    }
    updateShield(dt);
    updateWaves(dt);
    updateEnemies(dt);
    updateCamera(dt);
    updateMarkers();
    updateEffects(dt);
    if (toastTime > 0) {
      toastTime -= dt;
      if (toastTime <= 0) hud.toast.classList.remove('visible');
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  const inputs = {
    Digit1: ['bash', 1], Digit2: ['throw', 2], Digit3: ['spin', 3],
    Numpad1: ['bash', 1], Numpad2: ['throw', 2], Numpad3: ['spin', 3],
    Space: ['basic'], ShiftLeft: ['dodge'], ShiftRight: ['dodge'],
  };
  const movementKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];
  function updatePointer(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) * 2 / rect.width - 1, 1 - (event.clientY - rect.top) * 2 / rect.height);
    pointerActive = true;
  }

  window.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.code === 'KeyR' && mode !== 'ready' && !event.repeat) {
      audio.unlock();
      reset(true);
      return;
    }
    if (mode !== 'playing') return;
    if (event.code === 'Space' && event.target instanceof HTMLButtonElement) return;
    if (movementKeys.includes(event.code) || inputs[event.code]) {
      event.preventDefault();
      audio.unlock();
    }
    if (movementKeys.includes(event.code)) keys.add(event.code);
    if (inputs[event.code] && (!event.repeat || event.code === 'Space')) startAction(...inputs[event.code]);
  });
  window.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('blur', () => {
    keys.clear();
    pointerActive = false;
  });
  renderer.domElement.addEventListener('pointermove', updatePointer);
  renderer.domElement.addEventListener('pointerleave', () => { pointerActive = false; });
  renderer.domElement.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    if (document.activeElement instanceof HTMLButtonElement) document.activeElement.blur();
    updatePointer(event);
    audio.unlock();
    startAction('basic');
  });
  hud.start.addEventListener('click', () => {
    audio.unlock();
    reset(true);
    hud.start.blur();
  });
  hud.skills.forEach(button => button.addEventListener('click', () => {
    audio.unlock();
    const cost = Number(button.dataset.skill);
    startAction(...inputs[`Digit${cost}`]);
    button.blur();
  }));
  hud.mute?.addEventListener('click', () => {
    muted = !muted;
    audio.setMuted(muted);
    if (!muted) audio.unlock();
    hud.mute.textContent = muted ? '声音关' : '声音开';
    hud.mute.setAttribute('aria-pressed', String(muted));
    hud.mute.blur();
  });

  new ResizeObserver(resize).observe(viewport);
  resize();
  reset(false);
  updateCamera(1);
  syncHud();
  requestAnimationFrame(frame);
}

function showStartupError(error, title, message) {
  console.error(error);
  hud.overlay.hidden = false;
  hud.title.textContent = title;
  hud.text.textContent = message;
  hud.start.disabled = true;
}

import('three').then(THREE => {
  try {
    boot(THREE);
    hud.start.disabled = false;
  } catch (error) {
    showStartupError(error, '无法启动 3D 场景', '请使用支持 WebGL 2 的浏览器打开这个页面。');
  }
}, error => {
  showStartupError(error, 'Three.js 加载失败', '请检查网络连接，然后刷新页面。');
});
