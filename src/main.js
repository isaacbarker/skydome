/*
    main.js - SkyDome initiator:
    initiates AircraftManager
    manages user position permission
    sets up THREE.js render loop
 */

import * as THREE from 'three';

import {getUserPosition} from "./helpers.js";
import {AircraftManager} from "./aircraft/aircraftManager.js";
import {getFov} from "./config.js";

// constants
const MIN_ELEVATION = 10; // minimum degree of elevation
const FURTHEST_AIRCRAFT_ALTITUDE = 20_000 // maximum altitude of furthest aircraft (ft)
const API_POLL_INTERVAL = 2000;
const DEFAULT_LAT = 51.1172;
const DEFAULT_LON =  -0.5358;
const DEFAULT_ALT = 20;
const DEFAULT_HEADING = 0;
const DEFAULT_LOC = {
    lat: DEFAULT_LAT,
    lng: DEFAULT_LON,
    alt: DEFAULT_ALT,
    heading: DEFAULT_HEADING,
}
export const DEFAULT_CONFIG = {
    north_alignment: 0,
    inverted: false,
    models: true,
    scale: 1500,
    fov: 120
}

// get user location or fallback to default
let location = {};

try {
    const position = await getUserPosition();

    if (position) {
        location.lat = position.coords.latitude;
        location.lng = position.coords.longitude;

        // get altitude if available if not fall back on default
        if (position.coords.altitude) {
            location.alt = position.coords.altitude;
        } else {
            location.alt = DEFAULT_ALT;
        }

        // get heading if available if not fall back on default
        if (position.coords.heading) {
            location.heading = position.coords.heading;
        } else {
            location.heading = DEFAULT_HEADING;
        }

    } else {
        // default
        location = DEFAULT_LOC;
    }

} catch (error) {
    // default
    location = DEFAULT_LOC;
}


// initate three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    100,
    window.innerWidth / window.innerHeight,
    0.1,
    10_000
)

camera.position.set(0, 0, 0);
camera.lookAt(0, 1, 0);

// add scene lighting
const ambientLight = new THREE.AmbientLight( 0xfffffff, 1 );
scene.add( ambientLight );

const pointLight = new THREE.PointLight( 0xffffff, 0.8 );
scene.add( pointLight );

// initiate renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setAnimationLoop(animate)
document.getElementById("canvas__wrapper").appendChild(renderer.domElement);

// initiate aircraft manager
export const aircraftManager = new AircraftManager(
    location,
    scene,
    MIN_ELEVATION,
    FURTHEST_AIRCRAFT_ALTITUDE,
    API_POLL_INTERVAL
)
await aircraftManager.startAircraftPolling();

// animation loop
function animate(time) {
    renderer.render(scene, camera);

    // update fov
    if (getFov() !== camera.fov) {
        camera.fov = parseFloat(document.getElementById("fov").value);
        camera.updateProjectionMatrix();
    }

    // render aircraft
    aircraftManager.drawAircraft();
}

// handle window resize
function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // update camera
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    // update renderer
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

window.addEventListener('resize', onWindowResize);

// add centre dot
const dot = document.createElement("div");
dot.style.position = "absolute";
dot.style.left = "50%";
dot.style.top = "50%";
dot.style.width = "6px";
dot.style.height = "6px";
dot.style.background = "white";
dot.style.borderRadius = "50%";
dot.style.transform = "translate(-50%, -50%)";
dot.style.pointerEvents = "none";

document.body.appendChild(dot);