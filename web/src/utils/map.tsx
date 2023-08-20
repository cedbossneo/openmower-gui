import {Quaternion} from "../types/ros.ts";

export const earth = 6378.137;  //radius of the earth in kilometer
export const pi = Math.PI;
export const meterInDegree = (1 / ((2 * pi / 360) * earth)) / 1000;  //1 meter in degree

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

export function drawLine(longitude: number, latitude: number, orientation: number, length: number): [number, number] {
    const endLongitude = longitude + Math.cos(orientation) * length;
    const endLatitude = latitude + Math.sin(orientation) * length;

    return [endLongitude, endLatitude];
}

export const transpose = (datumLon: number, datumLat: number, y: number, x: number) => {
    const new_latitude = datumLat + (y * meterInDegree);
    const new_longitude = datumLon + ((x * meterInDegree) / Math.cos(datumLat * (pi / 180)));
    return [new_longitude, new_latitude]
};
export const itranspose = (datumLon: number, datumLat: number, y: number, x: number) => {
    //Inverse the transpose function
    const new_latitude = (y - datumLat) / meterInDegree;
    const new_longitude = (x - datumLon) / (meterInDegree / Math.cos(datumLat * (pi / 180)));
    return [new_longitude, new_latitude]
};