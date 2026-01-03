// Three.js Renderer - Renders organisms from WASM memory

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js';
import { OrganismType, BuildingType } from './wasm-loader.js';

export class Renderer {
    constructor(wasmModule) {
        this.wasmModule = wasmModule;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.organismMeshes = [];
        this.buildingMeshes = [];
        this.ground = null;

        // Cached geometries and materials
        this.geometries = {};
        this.materials = {};
    }

    init(containerElement) {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);  // Sky blue
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            500
        );
        this.camera.position.set(0, 50, 80);
        this.camera.lookAt(0, 0, 0);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        containerElement.appendChild(this.renderer.domElement);

        // Create lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(50, 100, 30);
        sunLight.castShadow = true;
        sunLight.shadow.camera.left = -100;
        sunLight.shadow.camera.right = 100;
        sunLight.shadow.camera.top = 100;
        sunLight.shadow.camera.bottom = -100;
        this.scene.add(sunLight);

        // Create ground
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);

        // Create cached geometries
        this.createGeometries();
        this.createMaterials();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        console.log('[Renderer] Initialized');
    }

    createGeometries() {
        // Organism geometries
        this.geometries.plant = new THREE.SphereGeometry(0.5, 8, 8);
        this.geometries.herbivore = new THREE.ConeGeometry(0.5, 1.5, 8);
        this.geometries.carnivore = new THREE.ConeGeometry(0.8, 2, 8);
        this.geometries.humanoid = new THREE.CapsuleGeometry(0.4, 1.2, 4, 8);

        // Building geometries
        this.geometries.building = new THREE.BoxGeometry(3, 4, 3);
        this.geometries.tower = new THREE.CylinderGeometry(1, 1.5, 8, 8);
        this.geometries.wall = new THREE.BoxGeometry(4, 3, 0.5);
    }

    createMaterials() {
        // Organism materials
        this.materials.plant = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        this.materials.herbivore = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        this.materials.carnivore = new THREE.MeshLambertMaterial({ color: 0xFF4500 });
        this.materials.humanoid = new THREE.MeshLambertMaterial({ color: 0x4169E1 });

        // Building materials
        this.materials.building = new THREE.MeshLambertMaterial({ color: 0x8B7355 });
        this.materials.tower = new THREE.MeshLambertMaterial({ color: 0x696969 });
        this.materials.wall = new THREE.MeshLambertMaterial({ color: 0xA9A9A9 });
    }

    update() {
        // Get organism data from WASM
        const data = this.wasmModule.getOrganismData();
        if (!data) return;

        // Update organism meshes
        for (let i = 0; i < data.count; i++) {
            if (!data.alive[i]) continue;

            // Create mesh if needed
            if (!this.organismMeshes[i]) {
                this.organismMeshes[i] = this.createOrganismMesh(data.types[i]);
                this.scene.add(this.organismMeshes[i]);
            }

            const mesh = this.organismMeshes[i];

            // Update position
            mesh.position.set(
                data.positionsX[i],
                data.positionsY[i],
                data.positionsZ[i]
            );

            // Update scale based on size
            const scale = data.sizes[i];
            mesh.scale.set(scale, scale, scale);

            // Update color based on tribe
            const tribeId = data.tribeIds[i];
            if (tribeId > 0) {
                const tribe = this.wasmModule.getTribeData(tribeId);
                if (tribe) {
                    mesh.material.color.setRGB(
                        tribe.color.r / 255,
                        tribe.color.g / 255,
                        tribe.color.b / 255
                    );
                }
            }

            // Visual feedback for actions
            if (data.attacking[i]) {
                mesh.material.emissive.setHex(0xFF0000);
            } else if (data.eating[i]) {
                mesh.material.emissive.setHex(0x00FF00);
            } else {
                mesh.material.emissive.setHex(0x000000);
            }
        }

        // Hide excess meshes
        for (let i = data.count; i < this.organismMeshes.length; i++) {
            if (this.organismMeshes[i]) {
                this.organismMeshes[i].visible = false;
            }
        }
    }

    createOrganismMesh(type) {
        let geometry, material;

        switch (type) {
            case OrganismType.PLANT:
                geometry = this.geometries.plant;
                material = this.materials.plant.clone();
                break;
            case OrganismType.HERBIVORE:
                geometry = this.geometries.herbivore;
                material = this.materials.herbivore.clone();
                break;
            case OrganismType.CARNIVORE:
                geometry = this.geometries.carnivore;
                material = this.materials.carnivore.clone();
                break;
            case OrganismType.HUMANOID:
                geometry = this.geometries.humanoid;
                material = this.materials.humanoid.clone();
                break;
            default:
                geometry = this.geometries.plant;
                material = this.materials.plant.clone();
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // Camera controls
    rotateCamera(angle) {
        const radius = Math.sqrt(
            this.camera.position.x ** 2 + this.camera.position.z ** 2
        );
        this.camera.position.x = radius * Math.sin(angle);
        this.camera.position.z = radius * Math.cos(angle);
        this.camera.lookAt(0, 0, 0);
    }

    zoomCamera(delta) {
        const factor = 1 + delta * 0.1;
        this.camera.position.multiplyScalar(factor);
        this.camera.position.y = Math.max(10, this.camera.position.y);
    }
}
