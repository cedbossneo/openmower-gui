import MapboxDraw from '@mapbox/mapbox-gl-draw';
import type {ControlPosition} from 'react-map-gl';
import {useControl} from 'react-map-gl';
import {useEffect} from "react";
import DirectSelectWithBoxMode from '../modes/DirectSelectWithBoxMode';

type DrawControlProps = ConstructorParameters<typeof MapboxDraw>[0] & {
    position?: ControlPosition;
    features?: any[];
    editMode?: boolean;

    onCreate: (evt: any) => void;
    onUpdate: (evt: any) => void;
    onCombine: (evt: any) => void;
    onDelete: (evt: any) => void;
};

export default function DrawControl(props: DrawControlProps) {
    const mp = useControl<MapboxDraw>(
        () => new MapboxDraw({
            ...props,
            modes: {
                ...MapboxDraw.modes,
                direct_select: DirectSelectWithBoxMode
            }
        }),
        ({ map }) => {
            map.on('draw.create', props.onCreate);
            map.on('draw.update', props.onUpdate);
            map.on('draw.combine', props.onCombine);
            map.on('draw.delete', props.onDelete);

        },
        ({map}) => {
            map.off('draw.create', props.onCreate);
            map.off('draw.update', props.onUpdate);
            map.off('draw.combine', props.onCombine);
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
                mp.deleteAll();
                props.features.forEach((f) => {
                    mp.add(f);
                })
            }
        }
    }, [mp, props.features]);
    useEffect(() => {
        if (mp) {
            if (!props.editMode) {
                mp.changeMode('simple_select');
            } else {
                mp.changeMode('draw_polygon');
            }
        }
    }, [mp, props.editMode]);
    return null;
}

DrawControl.defaultProps = {
    onCreate: () => {
    },
    onUpdate: () => {
    },
    onDelete: () => {
    },
    onCombine: () => {
    },
};
