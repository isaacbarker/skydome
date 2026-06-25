/*
    config.js - provides functions to load/save configuration from inputs
 */

import {aircraftManager, DEFAULT_CONFIG} from "./main.js";

// North alignment (user heading) config
export const northAlignmentInput = document.getElementById("north-alignment");
const northAlignmentOutput = document.getElementById("north-alignment-output");

if (localStorage.getItem("north-alignment")) {
    northAlignmentInput.value = localStorage.getItem("north-alignment");
}

northAlignmentOutput.innerHTML = `${("00" + northAlignmentInput.value).slice(-3)}°`;

export function updateNorthAlignment() {
    localStorage.setItem("north-alignment", northAlignmentInput.value);
    northAlignmentOutput.innerHTML = `${("00" + northAlignmentInput.value).slice(-3)}°`;
}

northAlignmentInput.oninput = () => {
    updateNorthAlignment();
}

export function getNorthAlignment() {
    return parseFloat(northAlignmentInput.value);
}

// Inverted (flip) config
const invertedInput = document.getElementById("inverted");

if (localStorage.getItem("inverted")) {
    invertedInput.value = localStorage.getItem("inverted");
}

invertedInput.oninput = () => {
    localStorage.setItem("inverted", invertedInput.value);
}

export function getInverted() {
    return invertedInput.checked;
}

// 3d Models or Sprite toggle config
const modelsInput = document.getElementById("models");

if (localStorage.getItem("models")) {
    modelsInput.value = localStorage.getItem("models");
}

modelsInput.oninput = () => {
    localStorage.setItem("models", modelsInput.value);
    // reset aircraft and reload with sprites
    aircraftManager.clearAircraft();
}

export function isUsingModels() {
    return modelsInput.checked;
}

// Sprite/model scale config
const scaleInput = document.getElementById("scale");

if (localStorage.getItem("scale")) {
    scaleInput.value = localStorage.getItem("scale");
}

scaleInput.oninput = () => {
    localStorage.setItem("scale", scaleInput.value);
}

export function getScale() {
    return parseFloat(scaleInput.value);
}

// FOV config
const fovInput = document.getElementById("fov");
const fovOutput = document.getElementById("fov-output");

if (localStorage.getItem("fov")) {
    fovInput.value = localStorage.getItem("fov");
}

fovOutput.innerHTML = `${("00" + fovInput.value).slice(-3)}°`;

function updateFov() {
    localStorage.setItem("fov", fovInput.value);
    fovOutput.innerHTML = `${("00" + fovInput.value).slice(-3)}°`;
}

fovInput.oninput = () => {
    updateFov()
}

export function getFov() {
    return parseFloat(fovInput.value);
}

// reset to defaults config
const resetConfig = document.getElementById("reset")

resetConfig.onclick = () => {
    localStorage.clear();

    northAlignmentInput.value = DEFAULT_CONFIG.north_alignment;
    updateNorthAlignment();

    invertedInput.value = DEFAULT_CONFIG.inverted;

    modelsInput.value = DEFAULT_CONFIG.models;

    scaleInput.value = DEFAULT_CONFIG.scale;

    fovInput.value = DEFAULT_CONFIG.fov;
    updateFov();
}

// config hint
const configHint = document.getElementById("config-hint");

configHint.onmouseenter = () => {
    window.scrollTo(0, document.body.scrollHeight);
}

const configContainer = document.getElementById("config-container");

configContainer.onmouseleave = () => {
    window.scrollTo(0, 0);
}
