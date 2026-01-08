// Creature Visual System - AAA Variety for Planet Eden
// Generates unique 3D meshes for different species with visual variety

import * as THREE from 'three';
import { HerbivoreSpecies, CarnivoreSpecies, VisualVariety } from './variety.js';

// =============================================================================
// CREATURE MESH GENERATOR
// =============================================================================
export class CreatureVisuals {
    constructor() {
        this.materials = new Map();
        this.geometryCache = new Map();
        this.initMaterials();
    }

    initMaterials() {
        // Pre-create common materials for performance
        this.materials.set('fur_brown', new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.9,
            metalness: 0.0
        }));
        this.materials.set('fur_gray', new THREE.MeshStandardMaterial({
            color: 0x606060,
            roughness: 0.85,
            metalness: 0.0
        }));
        this.materials.set('skin_tan', new THREE.MeshStandardMaterial({
            color: 0xC9A068,
            roughness: 0.8,
            metalness: 0.1
        }));
    }

    // =========================================================================
    // HERBIVORE MESH GENERATORS
    // =========================================================================

    createDeer(speciesData, visualOverrides = {}) {
        const group = new THREE.Group();
        const colors = {
            body: visualOverrides.bodyColor || speciesData.visual.bodyColor,
            accent: visualOverrides.accentColor || speciesData.visual.accentColor
        };
        const size = visualOverrides.sizeMultiplier || 1.0;

        // Body
        const bodyGeo = new THREE.SphereGeometry(0.6 * size, 16, 12);
        bodyGeo.scale(1.4, 1.0, 0.9);
        const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({
            color: colors.body,
            roughness: 0.85
        }));
        body.position.y = 0;
        body.castShadow = true;
        body.userData.isBody = true;
        group.add(body);

        // Neck
        const neck = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15 * size, 0.2 * size, 0.6 * size, 12),
            new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.85 })
        );
        neck.position.set(0, 0.3 * size, 0.6 * size);
        neck.rotation.x = -0.5;
        neck.castShadow = true;
        group.add(neck);

        // Head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.25 * size, 12, 10),
            new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.85 })
        );
        head.scale.set(0.8, 1.0, 1.3);
        head.position.set(0, 0.55 * size, 0.85 * size);
        head.castShadow = true;
        head.userData.isHead = true;
        group.add(head);

        // Snout
        const snout = new THREE.Mesh(
            new THREE.ConeGeometry(0.1 * size, 0.25 * size, 8),
            new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 0.9 })
        );
        snout.position.set(0, 0.5 * size, 1.05 * size);
        snout.rotation.x = Math.PI / 2;
        group.add(snout);

        // Ears
        for (const side of [-1, 1]) {
            const ear = new THREE.Mesh(
                new THREE.ConeGeometry(0.08 * size, 0.2 * size, 6),
                new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.85 })
            );
            ear.position.set(side * 0.15 * size, 0.75 * size, 0.8 * size);
            ear.rotation.z = side * 0.4;
            ear.castShadow = true;
            group.add(ear);
        }

        // Antlers (if applicable)
        if (speciesData.visual.hasAntlers &&
            (visualOverrides.features?.includes('antlers') || Math.random() < speciesData.visual.antlerChance)) {
            this.addAntlers(group, size, colors.body);
        }

        // Eyes
        for (const side of [-1, 1]) {
            const eye = new THREE.Mesh(
                new THREE.SphereGeometry(0.04 * size, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0x2F1F14, emissive: 0x111111 })
            );
            eye.position.set(side * 0.12 * size, 0.6 * size, 0.95 * size);
            group.add(eye);
        }

        // Legs
        const legPositions = [
            [-0.3, 0.6], [0.3, 0.6], [-0.3, -0.4], [0.3, -0.4]
        ];
        legPositions.forEach((pos, idx) => {
            const legPivot = new THREE.Group();
            legPivot.position.set(pos[0] * size, -0.35 * size, pos[1] * size);
            legPivot.userData.isLeg = true;
            legPivot.userData.legIndex = idx;

            const leg = new THREE.Mesh(
                new THREE.CylinderGeometry(0.06 * size, 0.04 * size, 0.6 * size, 8),
                new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.85 })
            );
            leg.position.y = -0.3 * size;
            leg.castShadow = true;
            legPivot.add(leg);

            // Hoof
            const hoof = new THREE.Mesh(
                new THREE.CylinderGeometry(0.05 * size, 0.06 * size, 0.08 * size, 8),
                new THREE.MeshStandardMaterial({ color: 0x2F2F2F, roughness: 0.9 })
            );
            hoof.position.y = -0.64 * size;
            legPivot.add(hoof);

            group.add(legPivot);
        });

        // Tail
        const tail = new THREE.Mesh(
            new THREE.SphereGeometry(0.08 * size, 8, 6),
            new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 0.85 })
        );
        tail.position.set(0, 0.1 * size, -0.8 * size);
        tail.userData.isTail = true;
        group.add(tail);

        group.userData.species = 'deer';
        return group;
    }

    addAntlers(group, size, color) {
        const antlerMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B7355,
            roughness: 0.7
        });

        for (const side of [-1, 1]) {
            const antlerBase = new THREE.Group();
            antlerBase.position.set(side * 0.1 * size, 0.8 * size, 0.75 * size);
            antlerBase.rotation.z = side * 0.3;

            // Main beam
            const beam = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02 * size, 0.03 * size, 0.4 * size, 6),
                antlerMaterial
            );
            beam.position.y = 0.2 * size;
            antlerBase.add(beam);

            // Tines
            for (let i = 0; i < 3; i++) {
                const tine = new THREE.Mesh(
                    new THREE.ConeGeometry(0.015 * size, 0.15 * size, 4),
                    antlerMaterial
                );
                tine.position.set(
                    side * 0.05 * size,
                    0.15 * size + i * 0.1 * size,
                    0
                );
                tine.rotation.z = side * 0.8;
                antlerBase.add(tine);
            }

            group.add(antlerBase);
        }
    }

    createRabbit(speciesData, visualOverrides = {}) {
        const group = new THREE.Group();
        const colors = {
            body: visualOverrides.bodyColor || speciesData.visual.bodyColor,
            accent: visualOverrides.accentColor || speciesData.visual.accentColor
        };
        const size = (visualOverrides.sizeMultiplier || 1.0) * 0.5; // Rabbits are small

        // Body
        const body = new THREE.Mesh(
            new THREE.SphereGeometry(0.25 * size, 12, 10),
            new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.9 })
        );
        body.scale.set(1.2, 1.0, 1.4);
        body.position.y = 0;
        body.castShadow = true;
        body.userData.isBody = true;
        group.add(body);

        // Head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.15 * size, 10, 8),
            new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.9 })
        );
        head.position.set(0, 0.1 * size, 0.25 * size);
        head.castShadow = true;
        head.userData.isHead = true;
        group.add(head);

        // Long ears
        for (const side of [-1, 1]) {
            const ear = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.04 * size, 0.25 * size, 4, 8),
                new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.9 })
            );
            ear.position.set(side * 0.06 * size, 0.35 * size, 0.2 * size);
            ear.rotation.x = -0.2;
            ear.rotation.z = side * 0.2;
            ear.castShadow = true;
            group.add(ear);

            // Inner ear
            const innerEar = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.02 * size, 0.2 * size, 4, 8),
                new THREE.MeshStandardMaterial({ color: 0xFFCCCC, roughness: 0.9 })
            );
            innerEar.position.copy(ear.position);
            innerEar.position.z += 0.02 * size;
            innerEar.rotation.copy(ear.rotation);
            group.add(innerEar);
        }

        // Eyes
        for (const side of [-1, 1]) {
            const eye = new THREE.Mesh(
                new THREE.SphereGeometry(0.03 * size, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0x2F1F14 })
            );
            eye.position.set(side * 0.08 * size, 0.15 * size, 0.35 * size);
            group.add(eye);
        }

        // Nose
        const nose = new THREE.Mesh(
            new THREE.SphereGeometry(0.02 * size, 6, 6),
            new THREE.MeshStandardMaterial({ color: 0xFFAAAA })
        );
        nose.position.set(0, 0.08 * size, 0.4 * size);
        group.add(nose);

        // Legs (small)
        const frontLegs = [[-0.08, 0.15], [0.08, 0.15]];
        frontLegs.forEach((pos, idx) => {
            const legPivot = new THREE.Group();
            legPivot.position.set(pos[0] * size, -0.15 * size, pos[1] * size);
            legPivot.userData.isLeg = true;
            legPivot.userData.legIndex = idx;

            const leg = new THREE.Mesh(
                new THREE.CylinderGeometry(0.025 * size, 0.02 * size, 0.15 * size, 6),
                new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.9 })
            );
            leg.position.y = -0.075 * size;
            legPivot.add(leg);
            group.add(legPivot);
        });

        // Back legs (larger)
        const backLegs = [[-0.1, -0.15], [0.1, -0.15]];
        backLegs.forEach((pos, idx) => {
            const legPivot = new THREE.Group();
            legPivot.position.set(pos[0] * size, -0.1 * size, pos[1] * size);
            legPivot.userData.isLeg = true;
            legPivot.userData.legIndex = idx + 2;

            const leg = new THREE.Mesh(
                new THREE.SphereGeometry(0.06 * size, 8, 6),
                new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.9 })
            );
            leg.scale.set(0.6, 1.2, 1.0);
            leg.position.y = -0.06 * size;
            legPivot.add(leg);
            group.add(legPivot);
        });

        // Fluffy tail
        const tail = new THREE.Mesh(
            new THREE.SphereGeometry(0.08 * size, 8, 6),
            new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 0.95 })
        );
        tail.position.set(0, 0.05 * size, -0.3 * size);
        tail.userData.isTail = true;
        group.add(tail);

        group.userData.species = 'rabbit';
        return group;
    }

    createElephant(speciesData, visualOverrides = {}) {
        const group = new THREE.Group();
        const colors = {
            body: visualOverrides.bodyColor || speciesData.visual.bodyColor,
            accent: visualOverrides.accentColor || speciesData.visual.accentColor
        };
        const size = (visualOverrides.sizeMultiplier || 1.0) * 1.8; // Elephants are large

        // Body
        const bodyGeo = new THREE.SphereGeometry(1.0 * size, 20, 16);
        bodyGeo.scale(1.3, 1.0, 1.1);
        const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({
            color: colors.body,
            roughness: 0.95
        }));
        body.position.y = 0.3 * size;
        body.castShadow = true;
        body.userData.isBody = true;
        group.add(body);

        // Head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.5 * size, 16, 12),
            new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.95 })
        );
        head.position.set(0, 0.6 * size, 1.1 * size);
        head.castShadow = true;
        head.userData.isHead = true;
        group.add(head);

        // Trunk
        const trunkSegments = 6;
        let lastPos = new THREE.Vector3(0, 0.3 * size, 1.5 * size);
        for (let i = 0; i < trunkSegments; i++) {
            const segSize = 0.15 * size * (1 - i * 0.1);
            const segment = new THREE.Mesh(
                new THREE.CylinderGeometry(segSize * 0.8, segSize, 0.2 * size, 8),
                new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.95 })
            );
            segment.position.copy(lastPos);
            segment.position.y -= i * 0.15 * size;
            segment.position.z += i * 0.08 * size;
            segment.rotation.x = 0.3 + i * 0.1;
            segment.castShadow = true;
            group.add(segment);
            lastPos = segment.position.clone();
        }

        // Ears
        for (const side of [-1, 1]) {
            const ear = new THREE.Mesh(
                new THREE.CircleGeometry(0.5 * size, 12),
                new THREE.MeshStandardMaterial({
                    color: colors.body,
                    roughness: 0.95,
                    side: THREE.DoubleSide
                })
            );
            ear.position.set(side * 0.55 * size, 0.6 * size, 0.9 * size);
            ear.rotation.y = side * 0.5;
            ear.castShadow = true;
            group.add(ear);
        }

        // Tusks
        if (speciesData.visual.hasTusks &&
            (visualOverrides.features?.includes('tusks') || Math.random() < speciesData.visual.tuskChance)) {
            for (const side of [-1, 1]) {
                const tusk = new THREE.Mesh(
                    new THREE.ConeGeometry(0.08 * size, 0.6 * size, 8),
                    new THREE.MeshStandardMaterial({
                        color: 0xFFF8DC,
                        roughness: 0.4,
                        metalness: 0.1
                    })
                );
                tusk.position.set(side * 0.25 * size, 0.2 * size, 1.4 * size);
                tusk.rotation.x = -1.2;
                tusk.rotation.z = side * 0.3;
                tusk.castShadow = true;
                group.add(tusk);
            }
        }

        // Eyes
        for (const side of [-1, 1]) {
            const eye = new THREE.Mesh(
                new THREE.SphereGeometry(0.06 * size, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0x2F1F14 })
            );
            eye.position.set(side * 0.35 * size, 0.7 * size, 1.3 * size);
            group.add(eye);
        }

        // Legs (thick pillar-like)
        const legPositions = [
            [-0.5, 0.5], [0.5, 0.5], [-0.5, -0.5], [0.5, -0.5]
        ];
        legPositions.forEach((pos, idx) => {
            const legPivot = new THREE.Group();
            legPivot.position.set(pos[0] * size, -0.4 * size, pos[1] * size);
            legPivot.userData.isLeg = true;
            legPivot.userData.legIndex = idx;

            const leg = new THREE.Mesh(
                new THREE.CylinderGeometry(0.2 * size, 0.25 * size, 0.8 * size, 12),
                new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.95 })
            );
            leg.position.y = -0.4 * size;
            leg.castShadow = true;
            legPivot.add(leg);

            // Foot
            const foot = new THREE.Mesh(
                new THREE.CylinderGeometry(0.28 * size, 0.3 * size, 0.15 * size, 12),
                new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 0.95 })
            );
            foot.position.y = -0.85 * size;
            legPivot.add(foot);

            group.add(legPivot);
        });

        // Tail
        const tail = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03 * size, 0.05 * size, 0.5 * size, 6),
            new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.95 })
        );
        tail.position.set(0, 0.1 * size, -1.0 * size);
        tail.rotation.x = 0.5;
        tail.userData.isTail = true;
        group.add(tail);

        group.userData.species = 'elephant';
        return group;
    }

    // =========================================================================
    // CARNIVORE MESH GENERATORS
    // =========================================================================

    createWolf(speciesData, visualOverrides = {}) {
        const group = new THREE.Group();

        // Select fur color variation
        const furVariations = speciesData.visual.furVariation || ['gray'];
        const selectedFur = visualOverrides.furColor ||
            furVariations[Math.floor(Math.random() * furVariations.length)];

        const furColors = {
            gray: 0x606060,
            black: 0x1a1a1a,
            white: 0xe8e8e8,
            brown: 0x5c4033
        };

        const colors = {
            body: visualOverrides.bodyColor || furColors[selectedFur] || speciesData.visual.bodyColor,
            accent: visualOverrides.accentColor || 0x404040,
            eyes: speciesData.visual.eyeColor || 0xFFAA00
        };
        const size = visualOverrides.sizeMultiplier || 1.0;

        // Body (elongated for wolf)
        const bodyGeo = new THREE.SphereGeometry(0.5 * size, 16, 12);
        bodyGeo.scale(1.6, 0.9, 0.85);
        const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({
            color: colors.body,
            roughness: 0.9
        }));
        body.position.y = 0;
        body.castShadow = true;
        body.userData.isBody = true;
        group.add(body);

        // Head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.3 * size, 12, 10),
            new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.9 })
        );
        head.scale.set(0.9, 0.95, 1.2);
        head.position.set(0, 0.15 * size, 0.75 * size);
        head.castShadow = true;
        head.userData.isHead = true;
        group.add(head);

        // Snout
        const snout = new THREE.Mesh(
            new THREE.ConeGeometry(0.15 * size, 0.35 * size, 10),
            new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.9 })
        );
        snout.position.set(0, 0.08 * size, 1.05 * size);
        snout.rotation.x = Math.PI / 2;
        snout.castShadow = true;
        group.add(snout);

        // Nose
        const nose = new THREE.Mesh(
            new THREE.SphereGeometry(0.05 * size, 8, 6),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
        );
        nose.position.set(0, 0.12 * size, 1.2 * size);
        group.add(nose);

        // Ears (pointed)
        for (const side of [-1, 1]) {
            const ear = new THREE.Mesh(
                new THREE.ConeGeometry(0.1 * size, 0.2 * size, 6),
                new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.9 })
            );
            ear.position.set(side * 0.18 * size, 0.4 * size, 0.65 * size);
            ear.rotation.z = side * 0.2;
            ear.castShadow = true;
            group.add(ear);
        }

        // Glowing eyes
        for (const side of [-1, 1]) {
            const eye = new THREE.Mesh(
                new THREE.SphereGeometry(0.04 * size, 8, 8),
                new THREE.MeshStandardMaterial({
                    color: colors.eyes,
                    emissive: colors.eyes,
                    emissiveIntensity: 0.5
                })
            );
            eye.position.set(side * 0.12 * size, 0.22 * size, 0.9 * size);
            group.add(eye);
        }

        // Legs
        const legPositions = [
            [-0.25, 0.4], [0.25, 0.4], [-0.25, -0.45], [0.25, -0.45]
        ];
        legPositions.forEach((pos, idx) => {
            const legPivot = new THREE.Group();
            legPivot.position.set(pos[0] * size, -0.25 * size, pos[1] * size);
            legPivot.userData.isLeg = true;
            legPivot.userData.legIndex = idx;

            const leg = new THREE.Mesh(
                new THREE.CylinderGeometry(0.07 * size, 0.05 * size, 0.5 * size, 8),
                new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.9 })
            );
            leg.position.y = -0.25 * size;
            leg.castShadow = true;
            legPivot.add(leg);

            // Paw
            const paw = new THREE.Mesh(
                new THREE.SphereGeometry(0.06 * size, 8, 6),
                new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 0.9 })
            );
            paw.scale.set(1.2, 0.6, 1.4);
            paw.position.y = -0.52 * size;
            legPivot.add(paw);

            group.add(legPivot);
        });

        // Bushy tail
        const tail = new THREE.Mesh(
            new THREE.ConeGeometry(0.12 * size, 0.5 * size, 8),
            new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.95 })
        );
        tail.position.set(0, 0.05 * size, -0.85 * size);
        tail.rotation.x = -0.8;
        tail.userData.isTail = true;
        group.add(tail);

        group.userData.species = 'wolf';
        group.userData.furColor = selectedFur;
        return group;
    }

    createLion(speciesData, visualOverrides = {}) {
        const group = new THREE.Group();
        const colors = {
            body: visualOverrides.bodyColor || speciesData.visual.bodyColor,
            accent: visualOverrides.accentColor || speciesData.visual.accentColor,
            eyes: speciesData.visual.eyeColor || 0xDAA520
        };
        const size = (visualOverrides.sizeMultiplier || 1.0) * 1.2;
        const hasMane = visualOverrides.features?.includes('mane') ||
            Math.random() < (speciesData.visual.maneChance || 0.5);

        // Body
        const bodyGeo = new THREE.SphereGeometry(0.6 * size, 16, 12);
        bodyGeo.scale(1.4, 1.0, 0.95);
        const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({
            color: colors.body,
            roughness: 0.85
        }));
        body.position.y = 0;
        body.castShadow = true;
        body.userData.isBody = true;
        group.add(body);

        // Head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.35 * size, 14, 12),
            new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.85 })
        );
        head.position.set(0, 0.2 * size, 0.8 * size);
        head.castShadow = true;
        head.userData.isHead = true;
        group.add(head);

        // Mane (if male)
        if (hasMane) {
            const mane = new THREE.Mesh(
                new THREE.SphereGeometry(0.5 * size, 16, 12),
                new THREE.MeshStandardMaterial({
                    color: colors.accent,
                    roughness: 0.95
                })
            );
            mane.position.set(0, 0.25 * size, 0.7 * size);
            mane.scale.set(1.2, 1.1, 0.9);
            mane.castShadow = true;
            group.add(mane);
        }

        // Snout
        const snout = new THREE.Mesh(
            new THREE.ConeGeometry(0.18 * size, 0.3 * size, 10),
            new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.85 })
        );
        snout.position.set(0, 0.1 * size, 1.1 * size);
        snout.rotation.x = Math.PI / 2;
        group.add(snout);

        // Nose
        const nose = new THREE.Mesh(
            new THREE.SphereGeometry(0.06 * size, 8, 6),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
        );
        nose.position.set(0, 0.15 * size, 1.25 * size);
        group.add(nose);

        // Ears
        for (const side of [-1, 1]) {
            const ear = new THREE.Mesh(
                new THREE.SphereGeometry(0.08 * size, 8, 6),
                new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.85 })
            );
            ear.position.set(side * 0.25 * size, 0.45 * size, 0.65 * size);
            ear.castShadow = true;
            group.add(ear);
        }

        // Eyes
        for (const side of [-1, 1]) {
            const eye = new THREE.Mesh(
                new THREE.SphereGeometry(0.05 * size, 8, 8),
                new THREE.MeshStandardMaterial({
                    color: colors.eyes,
                    emissive: colors.eyes,
                    emissiveIntensity: 0.4
                })
            );
            eye.position.set(side * 0.15 * size, 0.28 * size, 0.98 * size);
            group.add(eye);
        }

        // Legs
        const legPositions = [
            [-0.35, 0.45], [0.35, 0.45], [-0.35, -0.5], [0.35, -0.5]
        ];
        legPositions.forEach((pos, idx) => {
            const legPivot = new THREE.Group();
            legPivot.position.set(pos[0] * size, -0.35 * size, pos[1] * size);
            legPivot.userData.isLeg = true;
            legPivot.userData.legIndex = idx;

            const leg = new THREE.Mesh(
                new THREE.CylinderGeometry(0.1 * size, 0.08 * size, 0.55 * size, 8),
                new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.85 })
            );
            leg.position.y = -0.275 * size;
            leg.castShadow = true;
            legPivot.add(leg);

            // Paw
            const paw = new THREE.Mesh(
                new THREE.SphereGeometry(0.09 * size, 8, 6),
                new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.9 })
            );
            paw.scale.set(1.2, 0.6, 1.3);
            paw.position.y = -0.57 * size;
            legPivot.add(paw);

            group.add(legPivot);
        });

        // Tail with tuft
        const tailBase = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04 * size, 0.06 * size, 0.6 * size, 8),
            new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.85 })
        );
        tailBase.position.set(0, 0 * size, -0.9 * size);
        tailBase.rotation.x = -0.6;
        tailBase.userData.isTail = true;
        group.add(tailBase);

        const tailTuft = new THREE.Mesh(
            new THREE.SphereGeometry(0.1 * size, 8, 6),
            new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 0.95 })
        );
        tailTuft.position.set(0, -0.2 * size, -1.25 * size);
        group.add(tailTuft);

        group.userData.species = 'lion';
        group.userData.hasMane = hasMane;
        return group;
    }

    createBear(speciesData, visualOverrides = {}) {
        const group = new THREE.Group();

        // Select fur variation
        const furVariations = speciesData.visual.furVariation || ['brown'];
        const selectedFur = visualOverrides.furColor ||
            furVariations[Math.floor(Math.random() * furVariations.length)];

        const furColors = {
            brown: 0x4A3728,
            black: 0x1a1a1a,
            polar: 0xF0F0F0
        };

        const colors = {
            body: visualOverrides.bodyColor || furColors[selectedFur] || speciesData.visual.bodyColor,
            accent: selectedFur === 'polar' ? 0xE0E0E0 : 0x2F1F14
        };
        const size = (visualOverrides.sizeMultiplier || 1.0) * 1.4;

        // Body (large and bulky)
        const bodyGeo = new THREE.SphereGeometry(0.7 * size, 18, 14);
        bodyGeo.scale(1.2, 1.0, 1.1);
        const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({
            color: colors.body,
            roughness: 0.95
        }));
        body.position.y = 0.1 * size;
        body.castShadow = true;
        body.userData.isBody = true;
        group.add(body);

        // Head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.35 * size, 14, 12),
            new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.95 })
        );
        head.position.set(0, 0.35 * size, 0.7 * size);
        head.castShadow = true;
        head.userData.isHead = true;
        group.add(head);

        // Snout
        const snout = new THREE.Mesh(
            new THREE.ConeGeometry(0.15 * size, 0.25 * size, 10),
            new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 0.9 })
        );
        snout.position.set(0, 0.28 * size, 1.0 * size);
        snout.rotation.x = Math.PI / 2;
        group.add(snout);

        // Nose
        const nose = new THREE.Mesh(
            new THREE.SphereGeometry(0.06 * size, 8, 6),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
        );
        nose.position.set(0, 0.32 * size, 1.12 * size);
        group.add(nose);

        // Small round ears
        for (const side of [-1, 1]) {
            const ear = new THREE.Mesh(
                new THREE.SphereGeometry(0.1 * size, 8, 6),
                new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.95 })
            );
            ear.position.set(side * 0.25 * size, 0.6 * size, 0.55 * size);
            ear.castShadow = true;
            group.add(ear);
        }

        // Eyes
        for (const side of [-1, 1]) {
            const eye = new THREE.Mesh(
                new THREE.SphereGeometry(0.04 * size, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0x2F2F2F })
            );
            eye.position.set(side * 0.15 * size, 0.42 * size, 0.9 * size);
            group.add(eye);
        }

        // Legs (thick and sturdy)
        const legPositions = [
            [-0.4, 0.4], [0.4, 0.4], [-0.4, -0.45], [0.4, -0.45]
        ];
        legPositions.forEach((pos, idx) => {
            const legPivot = new THREE.Group();
            legPivot.position.set(pos[0] * size, -0.4 * size, pos[1] * size);
            legPivot.userData.isLeg = true;
            legPivot.userData.legIndex = idx;

            const leg = new THREE.Mesh(
                new THREE.CylinderGeometry(0.15 * size, 0.18 * size, 0.55 * size, 10),
                new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.95 })
            );
            leg.position.y = -0.275 * size;
            leg.castShadow = true;
            legPivot.add(leg);

            // Large paw
            const paw = new THREE.Mesh(
                new THREE.SphereGeometry(0.15 * size, 10, 8),
                new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.95 })
            );
            paw.scale.set(1.3, 0.5, 1.4);
            paw.position.y = -0.58 * size;
            legPivot.add(paw);

            group.add(legPivot);
        });

        // Short tail
        const tail = new THREE.Mesh(
            new THREE.SphereGeometry(0.1 * size, 8, 6),
            new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.95 })
        );
        tail.position.set(0, 0.1 * size, -0.75 * size);
        tail.userData.isTail = true;
        group.add(tail);

        group.userData.species = 'bear';
        group.userData.furColor = selectedFur;
        return group;
    }

    // =========================================================================
    // GENERIC CREATURE CREATOR (Routes to specific species)
    // =========================================================================

    createHerbivoreMesh(speciesId, visualOverrides = {}) {
        const speciesKey = Object.keys(HerbivoreSpecies)[speciesId % Object.keys(HerbivoreSpecies).length];
        const species = HerbivoreSpecies[speciesKey];

        switch (speciesKey) {
            case 'DEER':
                return this.createDeer(species, visualOverrides);
            case 'RABBIT':
                return this.createRabbit(species, visualOverrides);
            case 'ELEPHANT':
                return this.createElephant(species, visualOverrides);
            case 'BOAR':
                return this.createBoar(species, visualOverrides);
            case 'BISON':
                return this.createBison(species, visualOverrides);
            default:
                return this.createDeer(species, visualOverrides);
        }
    }

    createCarnivoreMesh(speciesId, visualOverrides = {}) {
        const speciesKey = Object.keys(CarnivoreSpecies)[speciesId % Object.keys(CarnivoreSpecies).length];
        const species = CarnivoreSpecies[speciesKey];

        switch (speciesKey) {
            case 'WOLF':
                return this.createWolf(species, visualOverrides);
            case 'LION':
                return this.createLion(species, visualOverrides);
            case 'BEAR':
                return this.createBear(species, visualOverrides);
            case 'TIGER':
                return this.createTiger(species, visualOverrides);
            case 'HYENA':
                return this.createHyena(species, visualOverrides);
            default:
                return this.createWolf(species, visualOverrides);
        }
    }

    // Placeholder methods for remaining species
    createBoar(speciesData, visualOverrides = {}) {
        // Similar structure to deer, but stockier
        const group = new THREE.Group();
        const colors = {
            body: visualOverrides.bodyColor || speciesData.visual.bodyColor,
            accent: visualOverrides.accentColor || speciesData.visual.accentColor
        };
        const size = visualOverrides.sizeMultiplier || 1.0;

        // Stocky body
        const bodyGeo = new THREE.SphereGeometry(0.5 * size, 14, 10);
        bodyGeo.scale(1.3, 0.9, 1.0);
        const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({
            color: colors.body,
            roughness: 0.9
        }));
        body.position.y = 0;
        body.castShadow = true;
        body.userData.isBody = true;
        group.add(body);

        // Head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.3 * size, 12, 10),
            new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.9 })
        );
        head.position.set(0, 0.1 * size, 0.55 * size);
        head.castShadow = true;
        head.userData.isHead = true;
        group.add(head);

        // Snout
        const snout = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12 * size, 0.15 * size, 0.25 * size, 10),
            new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 0.9 })
        );
        snout.position.set(0, 0 * size, 0.8 * size);
        snout.rotation.x = Math.PI / 2;
        group.add(snout);

        // Tusks
        if (speciesData.visual.hasTusks) {
            for (const side of [-1, 1]) {
                const tusk = new THREE.Mesh(
                    new THREE.ConeGeometry(0.03 * size, 0.15 * size, 6),
                    new THREE.MeshStandardMaterial({ color: 0xFFF8DC })
                );
                tusk.position.set(side * 0.12 * size, -0.05 * size, 0.85 * size);
                tusk.rotation.x = -0.5;
                tusk.rotation.z = side * 0.3;
                group.add(tusk);
            }
        }

        // Ears
        for (const side of [-1, 1]) {
            const ear = new THREE.Mesh(
                new THREE.ConeGeometry(0.08 * size, 0.12 * size, 6),
                new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.9 })
            );
            ear.position.set(side * 0.2 * size, 0.3 * size, 0.4 * size);
            ear.rotation.z = side * 0.3;
            group.add(ear);
        }

        // Legs
        const legPositions = [
            [-0.25, 0.3], [0.25, 0.3], [-0.25, -0.35], [0.25, -0.35]
        ];
        legPositions.forEach((pos, idx) => {
            const legPivot = new THREE.Group();
            legPivot.position.set(pos[0] * size, -0.3 * size, pos[1] * size);
            legPivot.userData.isLeg = true;
            legPivot.userData.legIndex = idx;

            const leg = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08 * size, 0.06 * size, 0.4 * size, 8),
                new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.9 })
            );
            leg.position.y = -0.2 * size;
            leg.castShadow = true;
            legPivot.add(leg);

            group.add(legPivot);
        });

        // Tail
        const tail = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02 * size, 0.03 * size, 0.15 * size, 6),
            new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.9 })
        );
        tail.position.set(0, 0.1 * size, -0.6 * size);
        tail.rotation.x = -0.5;
        tail.userData.isTail = true;
        group.add(tail);

        group.userData.species = 'boar';
        return group;
    }

    createBison(speciesData, visualOverrides = {}) {
        // Large, woolly herbivore
        const group = new THREE.Group();
        const colors = {
            body: visualOverrides.bodyColor || speciesData.visual.bodyColor,
            accent: visualOverrides.accentColor || speciesData.visual.accentColor
        };
        const size = (visualOverrides.sizeMultiplier || 1.0) * 1.5;

        // Large body
        const bodyGeo = new THREE.SphereGeometry(0.7 * size, 16, 12);
        bodyGeo.scale(1.3, 1.1, 1.0);
        const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({
            color: colors.body,
            roughness: 0.95
        }));
        body.position.y = 0.2 * size;
        body.castShadow = true;
        body.userData.isBody = true;
        group.add(body);

        // Hump
        const hump = new THREE.Mesh(
            new THREE.SphereGeometry(0.35 * size, 12, 10),
            new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 0.95 })
        );
        hump.position.set(0, 0.6 * size, 0.3 * size);
        hump.castShadow = true;
        group.add(hump);

        // Head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.35 * size, 14, 10),
            new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.95 })
        );
        head.position.set(0, 0.25 * size, 0.85 * size);
        head.castShadow = true;
        head.userData.isHead = true;
        group.add(head);

        // Muzzle
        const muzzle = new THREE.Mesh(
            new THREE.BoxGeometry(0.25 * size, 0.2 * size, 0.2 * size),
            new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 0.95 })
        );
        muzzle.position.set(0, 0.1 * size, 1.1 * size);
        group.add(muzzle);

        // Horns
        for (const side of [-1, 1]) {
            const horn = new THREE.Mesh(
                new THREE.ConeGeometry(0.06 * size, 0.3 * size, 8),
                new THREE.MeshStandardMaterial({ color: 0x3D3D3D })
            );
            horn.position.set(side * 0.3 * size, 0.45 * size, 0.7 * size);
            horn.rotation.z = side * 1.0;
            horn.rotation.x = 0.3;
            group.add(horn);
        }

        // Beard
        const beard = new THREE.Mesh(
            new THREE.ConeGeometry(0.15 * size, 0.25 * size, 8),
            new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 0.95 })
        );
        beard.position.set(0, -0.05 * size, 0.95 * size);
        beard.rotation.x = Math.PI;
        group.add(beard);

        // Legs
        const legPositions = [
            [-0.4, 0.35], [0.4, 0.35], [-0.4, -0.4], [0.4, -0.4]
        ];
        legPositions.forEach((pos, idx) => {
            const legPivot = new THREE.Group();
            legPivot.position.set(pos[0] * size, -0.45 * size, pos[1] * size);
            legPivot.userData.isLeg = true;
            legPivot.userData.legIndex = idx;

            const leg = new THREE.Mesh(
                new THREE.CylinderGeometry(0.1 * size, 0.12 * size, 0.6 * size, 8),
                new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.95 })
            );
            leg.position.y = -0.3 * size;
            leg.castShadow = true;
            legPivot.add(leg);

            // Hoof
            const hoof = new THREE.Mesh(
                new THREE.CylinderGeometry(0.1 * size, 0.12 * size, 0.1 * size, 8),
                new THREE.MeshStandardMaterial({ color: 0x2F2F2F })
            );
            hoof.position.y = -0.65 * size;
            legPivot.add(hoof);

            group.add(legPivot);
        });

        // Tail
        const tail = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04 * size, 0.06 * size, 0.4 * size, 6),
            new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.95 })
        );
        tail.position.set(0, 0 * size, -0.85 * size);
        tail.rotation.x = 0.4;
        tail.userData.isTail = true;
        group.add(tail);

        group.userData.species = 'bison';
        return group;
    }

    createTiger(speciesData, visualOverrides = {}) {
        // Similar to lion but with stripes
        const group = this.createLion(speciesData, { ...visualOverrides, features: [] });

        // Override colors for tiger
        const tigerColor = visualOverrides.bodyColor || speciesData.visual.bodyColor;
        group.traverse((child) => {
            if (child.isMesh && child.material) {
                if (child.userData.isBody || child.userData.isHead) {
                    child.material = new THREE.MeshStandardMaterial({
                        color: tigerColor,
                        roughness: 0.85
                    });
                }
            }
        });

        group.userData.species = 'tiger';
        group.userData.hasStripes = true;
        return group;
    }

    createHyena(speciesData, visualOverrides = {}) {
        // Similar to wolf but with spots and different proportions
        const group = this.createWolf(speciesData, visualOverrides);

        // Adjust for hyena's characteristic sloped back
        group.traverse((child) => {
            if (child.userData.isBody) {
                child.rotation.z = 0.15; // Sloped back
            }
        });

        group.userData.species = 'hyena';
        group.userData.hasSpots = true;
        return group;
    }
}

// Singleton instance
export const creatureVisuals = new CreatureVisuals();
