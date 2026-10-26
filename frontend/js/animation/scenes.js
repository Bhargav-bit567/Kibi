/* ============================================
   WanderMatch — Cinematic Scenes
   Each scene defines its own 3D behavior
   ============================================ */

// Scene 1: Hero Mountain — camera flies forward through mountains
class HeroScene extends ScrollScene {
  constructor() {
    super('hero', { texture: createMountainTexture(), aspect: 2 });
  }

  activate(scene, camera) {
    super.activate(scene, camera);
    // Add a second layer for depth
    this.bgTexture = createGradientTexture(['#87CEEB', '#FAF7F2'], 'vertical');
    const bgGeo = new THREE.PlaneGeometry(20, 10);
    const bgMat = new THREE.MeshBasicMaterial({ map: this.bgTexture });
    this.bgMesh = new THREE.Mesh(bgGeo, bgMat);
    this.bgMesh.position.z = -10;
    scene.add(this.bgMesh);

    // Foreground mountain layer
    this.fgTexture = createMountainTexture();
    const fgGeo = new THREE.PlaneGeometry(8, 4);
    const fgMat = new THREE.MeshBasicMaterial({ map: this.fgTexture, transparent: true });
    this.fgMesh = new THREE.Mesh(fgGeo, fgMat);
    this.fgMesh.position.set(0, -1, -2);
    scene.add(this.fgMesh);
  }

  update(progress, scene, camera) {
    // Camera moves from z=5 to z=-3 (through the scene)
    const z = 5 - progress * 8;
    camera.position.set(0, 0, z);

    // Slight lateral movement for cinematic feel
    const x = Math.sin(progress * Math.PI * 2) * 0.5;
    camera.position.x = x;
    camera.lookAt(0, 0, -5);

    // Fade foreground as we pass through
    if (this.fgMesh) {
      this.fgMesh.material.opacity = progress < 0.7 ? 1 - (progress / 0.7) * 0.3 : 0.3;
    }
  }
}

// Scene 2: Traveler — traveler approaches camera
class TravelerScene extends ScrollScene {
  constructor() {
    super('traveler', { texture: createTravelerTexture(), aspect: 1 });
  }

  activate(scene, camera) {
    super.activate(scene, camera);
    this.travelerTexture = createTravelerTexture();
    const geo = new THREE.PlaneGeometry(4, 4);
    const mat = new THREE.MeshBasicMaterial({ map: this.travelerTexture, transparent: true });
    this.traveler = new THREE.Mesh(geo, mat);
    this.traveler.position.set(0, 0, -10);
    scene.add(this.traveler);
  }

  update(progress, scene, camera) {
    // Traveler starts far away and approaches
    const z = -10 + progress * 12;
    this.traveler.position.z = z;
    this.traveler.position.x = Math.sin(progress * Math.PI) * 0.3;

    // Scale up as it approaches
    const scale = 0.5 + progress * 1.2;
    this.traveler.scale.set(scale, scale, scale);

    camera.position.set(0, 0, 5);
    camera.lookAt(this.traveler.position);

    // Fade out as it passes behind camera
    if (progress > 0.8) {
      this.traveler.material.opacity = 1 - (progress - 0.8) * 5;
    } else {
      this.traveler.material.opacity = 1;
    }
  }
}

// Scene 3: Phone — phone rotates and approaches
class PhoneScene extends ScrollScene {
  constructor() {
    super('phone', { texture: createPhoneTexture(), aspect: 1 });
  }

  activate(scene, camera) {
    super.activate(scene, camera);
    this.phoneTexture = createPhoneTexture();
    const geo = new THREE.PlaneGeometry(2.5, 2.5);
    const mat = new THREE.MeshBasicMaterial({ map: this.phoneTexture, transparent: true });
    this.phone = new THREE.Mesh(geo, mat);
    scene.add(this.phone);
  }

  update(progress, scene, camera) {
    // Phone enters from right, rotates, and centers
    const angle = (progress - 0.5) * Math.PI;
    const radius = 4 - progress * 3;

    this.phone.position.x = Math.sin(angle) * radius;
    this.phone.position.z = Math.cos(angle) * radius - 2;
    this.phone.rotation.y = angle;

    camera.position.set(0, 0, 5);
    camera.lookAt(this.phone.position);
  }
}

// Scene 4: Map — camera moves along route
class MapScene extends ScrollScene {
  constructor() {
    super('map', { texture: createMapTexture(), aspect: 2 });
  }

  activate(scene, camera) {
    super.activate(scene, camera);
    this.mapTexture = createMapTexture();
    const geo = new THREE.PlaneGeometry(10, 5);
    const mat = new THREE.MeshBasicMaterial({ map: this.mapTexture });
    this.mapMesh = new THREE.Mesh(geo, mat);
    this.mapMesh.position.z = -3;
    scene.add(this.mapMesh);
  }

  update(progress, scene, camera) {
    // Camera pans across the map from left to right
    const x = -4 + progress * 8;
    camera.position.set(x, 0, 5);
    camera.lookAt(x, 0, -3);
  }
}

// Scene 5: Social — travelers appear in sequence
class SocialScene extends ScrollScene {
  constructor() {
    super('social', { texture: createSocialTexture(), aspect: 2 });
  }

  activate(scene, camera) {
    super.activate(scene, camera);
    this.socialTexture = createSocialTexture();
    const geo = new THREE.PlaneGeometry(10, 5);
    const mat = new THREE.MeshBasicMaterial({ map: this.socialTexture, transparent: true });
    this.socialMesh = new THREE.Mesh(geo, mat);
    this.socialMesh.position.z = -4;
    scene.add(this.socialMesh);
  }

  update(progress, scene, camera) {
    // Subtle zoom and pan
    const z = 5 - progress * 2;
    camera.position.set(0, 0, z);
    camera.lookAt(0, 0, -4);

    // Fade in
    this.socialMesh.material.opacity = Math.min(1, progress * 1.5);
  }
}

// Scene 6: Final — wide landscape pull-back
class FinalScene extends ScrollScene {
  constructor() {
    super('final', { texture: createFinalTexture(), aspect: 2 });
  }

  activate(scene, camera) {
    super.activate(scene, camera);
    this.finalTexture = createFinalTexture();
    const geo = new THREE.PlaneGeometry(12, 6);
    const mat = new THREE.MeshBasicMaterial({ map: this.finalTexture });
    this.finalMesh = new THREE.Mesh(geo, mat);
    this.finalMesh.position.z = -5;
    scene.add(this.finalMesh);
  }

  update(progress, scene, camera) {
    // Camera pulls back
    const z = 3 + progress * 4;
    camera.position.set(0, 0, z);
    camera.lookAt(0, 0, -5);
  }
}
