import { NgwMap } from '@nextgis/ngw-map';
import { eachCoordinates } from '@nextgis/utils';
import {
  FitBoundsOptions,
  LngLatBounds,
  GeoJSONSource,
  Map,
  MapLibreEvent,
} from 'maplibre-gl';
import type { GeoJSON } from 'geojson';

interface LayerOptions {
  geojson: GeoJSON;
  ngwMap: NgwMap<Map>;
  opacity?: number;
  color?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeOpacity?: number;
}

export function fitMaplibreLayer({
  ngwMap,
  sourceId,
  fitOptions,
}: {
  ngwMap: NgwMap<Map>;
  sourceId: string;
  fitOptions?: FitBoundsOptions;
}) {
  const map = ngwMap.mapAdapter.map;
  if (!map) {
    throw new Error('Map is undenfined');
  }

  const fit = async (
    e: MapLibreEvent & {
      isSourceLoaded: boolean;
      sourceId: string;
    },
  ) => {
    if (e.isSourceLoaded && e.sourceId === sourceId) {
      const source = map.getSource<GeoJSONSource>(sourceId);
      if (!source) {
        map.off('sourcedata', fit);
        return;
      }
      const features = await source.getData();

      if (features) {
        const bounds = new LngLatBounds();

        eachCoordinates(features, (coord) => {
          bounds.extend([coord[0], coord[1]]);
        });

        map.fitBounds(bounds, { ...fitOptions, duration: 0 });
        map.off('sourcedata', fit);
      }
    }
  };

  map.on('sourcedata', fit);
}

export function addHeatmapLayer({ geojson, ngwMap, opacity }: LayerOptions) {
  const map = ngwMap.mapAdapter.map;

  if (!map) {
    throw new Error('Map is undenfined');
  }
  const source = 'heatmap-source';
  map.addSource(source, {
    type: 'geojson',
    data: geojson,
  });

  map.addLayer({
    id: 'heatmap-layer',
    type: 'heatmap',
    source: source,
    paint: {
      'heatmap-weight': 1,
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0,
        'rgba(33,102,172,0)',
        0.2,
        'rgb(103,169,207)',
        0.4,
        'rgb(209,229,240)',
        0.6,
        'rgb(253,219,199)',
        0.8,
        'rgb(239,138,98)',
        1,
        'rgb(178,24,43)',
      ],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20],
      'heatmap-opacity': opacity,
    },
  });
  return source;
}

export async function addGeoJsonLayer({
  geojson,
  ngwMap,
  color,
  fillOpacity,
  strokeColor,
  strokeOpacity,
}: LayerOptions) {
  return ngwMap.addGeoJsonLayer({
    data: JSON.parse(JSON.stringify(geojson)),
    id: 'layer',
    paint: {
      color,
      fillOpacity,
      strokeColor,
      strokeOpacity,
    },
    selectedPaint: {
      color: 'orange',
      fillOpacity: 0.8,
      strokeOpacity: 1,
    },
    selectable: true,
    popupOnSelect: true,
    popupOptions: {
      createPopupContent: (e) => {
        const element = document.createElement('table');
        const properties = e.feature.properties || {};
        element.innerHTML = '<tbody>';
        Object.entries(properties).forEach(([key, value]) => {
          element.innerHTML += `<tr><th>${key}</th><td>${value}</td></tr>`;
        });
        element.innerHTML += '</tbody>';
        return element;
      },
    },
  });
}
