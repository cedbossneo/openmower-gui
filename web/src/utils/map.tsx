import {Quaternion} from "../types/ros.ts";
import {Converter} from 'usng.js'

// @ts-ignore
export var converter = new Converter();
export const earth = 6371008.8;  //radius of the earth in kilometer
export const pi = Math.PI;

export function getQuaternionFromHeading(heading: number): Quaternion {
    const q = {
        X: 0,
        Y: 0,
        Z: 0,
        W: 0,
    } as Quaternion
    q.W = Math.cos(heading / 2)
    q.Z = Math.sin(heading / 2)
    return q
}

export function drawLine(offsetX: number, offsetY: number, datum: [number, number, number], y: number, x: number, orientation: number): [number, number] {
    const endX = x + Math.cos(orientation);
    const endY = y + Math.sin(orientation);
    return transpose(offsetX, offsetY, datum, endY, endX);
}

export const transpose = (offsetX: number, offsetY: number, datum: [number, number, number], y: number, x: number): [number, number] => {
    let utMtoLL = converter.UTMtoLL(datum[1] + y + offsetY, datum[0] + x + offsetX, datum[2]);
    return [utMtoLL.lon, utMtoLL.lat]
};
export const itranspose = (offsetX: number, offsetY: number, datum: [number, number, number], y: number, x: number): [number, number] => {
    //Inverse the transpose function
    const coords: [number, number, number] = [0, 0, 0]
    converter.LLtoUTM(y, x, coords)
    return [coords[0] - datum[0] - offsetX, coords[1] - datum[1] - offsetY]
};