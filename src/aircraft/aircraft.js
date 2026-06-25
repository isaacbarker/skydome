/*
    aircraft.js - Aircraft wrapper class, representing an aircraft, which handles:
    location interpolation
    3d model match-making
 */

import * as THREE from 'three';
import {Text} from 'troika-three-text'
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import {OBJLoader} from "three/addons/loaders/OBJLoader.js";

import planeSvg from "../assets/plane.svg"
import modelManifest from "../assets/file_manifest.json"
import modelMatching from "../assets/model_matching.json"

import {llaToAER} from "../coords.js";
import {feetToMetres, degToRad} from "../helpers.js";
import {getInverted, getNorthAlignment, getScale, isUsingModels} from "../config.js";

// load svg texture for sprite
const map = new THREE.TextureLoader().load(planeSvg);
map.colorSpace = THREE.SRGBColorSpace;

export class Aircraft {

    // initiate aircraft with cosmetic data and append first position for interpolation
    constructor(aircraft, refLocation, scene, maxHistoryLength=1000) {
        this.callsign = aircraft.flight || "UNKNOWN";
        this.aircraftType = aircraft.t || "UNKNOWN";

        this.positions = [];

        this.currentPosition = {
            lat: aircraft.lat,
            lng: aircraft.lon,
            alt: aircraft.alt_baro,
            hdg: aircraft.true_heading,
            t: Date.now() / 1000
        };

        this.addPositionUpdate(
            aircraft.lat,
            aircraft.lon,
            aircraft.alt_baro,
            aircraft.true_heading || 0,
            aircraft.gs || 0
        );

        this.previousPosition = {};
        this.nextPosition = {};

        this.refLocation = refLocation;

        // load 3d model or sprite depending on config
        this.scene = scene;

        if (isUsingModels()) {
            // create model for 3d rendering

            // do model matching

            // do aircraft type overwrites to account for older CSL
            let aircraftType = this.aircraftType

            if (modelMatching.hasOwnProperty(this.aircraftType)) {
                aircraftType = modelMatching[this.aircraftType];
            }

            const airline = this.callsign.substring(0,3)
            let modelLabel = `${aircraftType}_${airline}.obj`

            if (!modelManifest.hasOwnProperty(modelLabel)) {
                // fall back to default aircraft
                modelLabel = modelMatching["default"]
            }

            const baseURL = new URL(modelManifest[modelLabel], window.location.href);
            const basePath = baseURL.href.substring(0, baseURL.href.lastIndexOf('/') + 1);

            // load mtl and material
            const mtlLoader = new MTLLoader();
            mtlLoader.setResourcePath(basePath);
            mtlLoader.setPath(basePath);
            mtlLoader.setMaterialOptions({
                side: THREE.DoubleSide
            })

            mtlLoader.load(`${modelLabel.split(".")[0]}.mtl`, (materials) => {

                materials.preload();

                const objLoader = new OBJLoader();
                objLoader.setMaterials(materials);
                objLoader.setPath(basePath);
                objLoader.setResourcePath(basePath);

                objLoader.load(`${modelLabel}`, (object) => {

                    // add obj to scene
                    this.obj = object;
                    this.obj.visible = false;
                    const scale = 0.05;
                    this.obj.scale.set(scale, scale, scale);
                    this.scene.add(this.obj);

                }, undefined, (err) => {
                    console.error("OBJ failed to load", err);
                });

            }, undefined, (err) => {
                console.error("MTL failed to load", err);
            });


        } else {
            // load sprite for 3d rendering
            const material = new THREE.SpriteMaterial({map: map, transparent: true});
            this.sprite = new THREE.Sprite(material);
            const scale = 2;
            this.sprite.scale.set(scale, scale, 1);
            this.scene.add(this.sprite);
        }

        // add text
        this.text = new Text();
        this.scene.add(this.text);
        this.text.text = this.getLabelText();
        this.text.fontSize = 0.3;
        this.text.material.depthWrite = false;
        this.text.material.transparent = true;
        this.text.anchorY = 'middle';
        this.text.rotation.x = Math.PI / 2;
        this.text.glyphGeometryDetail = 24;
        this.text.sync();

        // store location history
        this.maxHistoryLength = maxHistoryLength;
    }

    getLabelText() {
        // render label text for displaying flight details
        const aer = llaToAER(
            this.currentPosition.lat,
            this.currentPosition.lng,
            feetToMetres(this.currentPosition.alt),
            this.refLocation.lat,
            this.refLocation.lng,
            this.refLocation.alt,
        );
        return `${this.callsign}\n${this.aircraftType}\nE:${Math.round(aer.x)}° A:${Math.round(aer.y)}° R:${Math.round(aer.z/1000)}km`
    }

    addPositionUpdate(lat, lng, alt, hdg, gs) {
        // push further position updates and trim history
        const position = {
            lat: lat,
            lng: lng,
            alt: alt,
            hdg: hdg,
            gs: gs,
            t: Date.now() / 1000 // timestamp in s
        }

        this.positions.push(position);

        if (this.positions.length > this.maxHistoryLength) {
            this.positions.shift();
        }

        // set next target for interpolation
        this.nextPosition = position;
        this.currentPosition.hdg = this.nextPosition.hdg;
        this.previousPosition = this.currentPosition;

    }

    getNextPosition() {
        // fetch the next position update
        return this.nextPosition;
    }

    getPreviousPosition() {
        // fetch last position update
        return this.previousPosition;
    }

    getCurrentPosition() {
        // get current interpolated position
        return this.currentPosition;
    }

    update(aircraft) {
        // update aircraft stats from api
        this.addPositionUpdate(
            aircraft.lat,
            aircraft.lon,
            aircraft.alt_baro,
            aircraft.true_heading || 0,
            aircraft.gs || 0
        )
    }

    getPosition() {
        // update aircraft stats from api from next and current position
        const prevPosition = this.getPreviousPosition();
        const nextPosition = this.getNextPosition();

        const T = nextPosition.t - prevPosition.t;
        const t = ((Date.now() / 1000) - T) - prevPosition.t;

        const lat = prevPosition.lat + (t / T) * (nextPosition.lat - prevPosition.lat);
        const lng = prevPosition.lng + (t / T) * (nextPosition.lng - prevPosition.lng);
        const alt = prevPosition.alt + (t / T) * (nextPosition.alt - prevPosition.alt);

        this.currentPosition = {
            lat: lat,
            lng: lng,
            alt: alt,
            hdg: this.positions[this.positions.length - 2].hdg,
            t: (Date.now() / 1000 - T)
        }

        return llaToAER(
             lat,
             lng,
             feetToMetres(alt),
             this.refLocation.lat,
             this.refLocation.lng,
             this.refLocation.alt
         );
    }

    draw() {

        // ensure there exists at least two data points to interpolate through & the object file is loaded
        if (this.positions.length < 2) {
            return;
        }

        const northAlignment = degToRad(getNorthAlignment());
        const inverted = getInverted() ? -1 : 1;
        const scale = getScale();

        // position object
        const position = this.getPosition();
        const spherical = new THREE.Spherical(
            Math.max(position.z, 10_000)/scale, // clamp to prevent oversize planes taking whole space
            Math.PI/2 - degToRad(position.x),
            (degToRad(position.y) + northAlignment) * inverted,
        )

        if (isUsingModels() && this.obj) {
            // position object and rotate
            this.obj.position.setFromSpherical(spherical);
            this.obj.rotation.y = inverted * (degToRad(this.currentPosition.hdg) + northAlignment) + Math.PI;
            this.obj.visible = true;
        } else if (!isUsingModels()) {
            // position sprite and rotate
            this.sprite.position.setFromSpherical(spherical);
            this.sprite.material.rotation = -inverted * (degToRad(this.currentPosition.hdg) + northAlignment);
        }

        // put text in correct position
        this.text.text = this.getLabelText();
        this.text.position.setFromSpherical(spherical);
        this.text.position.x += 1.6;
        this.text.sync();
    }
}