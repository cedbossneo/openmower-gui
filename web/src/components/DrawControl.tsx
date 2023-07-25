import MapboxDraw from '@mapbox/mapbox-gl-draw';
import type {ControlPosition} from 'react-map-gl';
import {useControl} from 'react-map-gl';
import {useEffect} from "react";

type DrawControlProps = ConstructorParameters<typeof MapboxDraw>[0] & {
    position?: ControlPosition;
    features?: any[];

    onCreate: (evt: any) => void;
    onUpdate: (evt: any) => void;
    onDelete: (evt: any) => void;
};

export default function DrawControl(props: DrawControlProps) {
    const mp = useControl<MapboxDraw>(
        () => new MapboxDraw(props),
        ({map}) => {
            map.on('draw.create', props.onCreate);
            map.on('draw.update', props.onUpdate);
            map.on('draw.delete', props.onDelete);
        },
        ({map}) => {
            map.off('draw.create', props.onCreate);
            map.off('draw.update', props.onUpdate);
            map.off('draw.delete', props.onDelete);
        }
        ,
        {
            position: props.position,
        }
    );
    useEffect(() => {
        if (mp) {
            if (props.features) {
                props.features.forEach((f) => {
                    mp.delete(f.id);
                    mp.add(f);
                })
            }
        }
    }, [mp, props.features]);
    return null;
}

DrawControl.defaultProps = {
    onCreate: () => {
    },
    onUpdate: () => {
    },
    onDelete: () => {
    }
};