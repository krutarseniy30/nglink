import { mdiRefresh, mdiShare } from '@mdi/js';
import Dialog from '@nextgis/dialog';
import NgwMap from '@nextgis/ngw-maplibre-gl';

import { showInput, urlRuntime } from '../common';
import { SidebarControl } from '../map-controls/scalebar-control';
import { appBlock, dataInput } from '../pages/home';
import { state } from '../state';
import { toggleBlock } from '../utils/dom';
import { makeIcon } from '../utils/makeIcon';

import { createShareContent } from './share';

import { heatmapIcon } from './heatmapIcon';

import type { PathPaint } from '@nextgis/paint';
import type { FitOptions } from '@nextgis/webmap';
import type { GeoJSON, Geometry } from 'geojson';

import './map.css';

import {
  addHeatmapLayer,
  addGeoJsonLayer,
  fitMaplibreLayer,
} from '../utils/layerUtils';
import {
  addPaintControl,
  updatePaintControlOnHeatmapToggle,
} from './paintControl';

export const mapBlock = document.getElementById('map') as HTMLElement;

export let ngwMap: NgwMap | undefined;

export function showMap(geojson: GeoJSON, url?: string): Promise<void> {
  return new Promise((resolve) => {
    toggleBlock(appBlock, false);
    toggleBlock(mapBlock, true);

    const padding = state.getVal('fitPadding');
    const maxZoom = state.getVal('fitMaxZoom');
    const qmsId = state.getVal('qmsId');

    const bbox = state.getVal('bbox');

    const heatmap = state.getVal('heatmap');

    NgwMap.create({
      target: mapBlock,
      qmsId,
      osm: !qmsId ? true : undefined,
      bounds: bbox,
    }).then(async (ngwMap_) => {
      ngwMap = ngwMap_;

      const map = ngwMap.mapAdapter.map!;

      const waitForIdle = () =>
        new Promise<void>((done) => {
          if (map.loaded() && map.areTilesLoaded()) {
            done();
          } else {
            const checkIdle = () => {
              if (map.areTilesLoaded()) {
                map.off('idle', checkIdle);
                done();
              }
            };
            map.on('idle', checkIdle);
          }
        });

      const updateBboxState = () => {
        state.set('bbox', ngwMap?.getBounds());
      };
      ngwMap.emitter.on('moveend', updateBboxState);
      ngwMap.emitter.on('zoomend', updateBboxState);
      if (url) {
        urlRuntime.set('u', url);
      }
      ngwMap.addControl('BUTTON', 'top-left', {
        html: makeIcon(mdiRefresh),
        title: 'Refresh',
        onClick: () => {
          dataInput.value = '';
          showInput();
        },
      });

      ngwMap.addControl('BUTTON', 'top-left', {
        html: makeIcon(mdiShare),
        title: 'Share URL',
        onClick: () => {
          const dialog = new Dialog();
          dialog.updateContent(createShareContent(geojson, url));
          dialog.show();
        },
      });

      const isPointGeom = ({ type }: Geometry): boolean =>
        type === 'Point' || type === 'MultiPoint';
      function hasPointData(geojson: GeoJSON): boolean {
        if (geojson.type === 'FeatureCollection') {
          return geojson.features.some((feature) => {
            return isPointGeom(feature.geometry);
          });
        } else if (geojson.type === 'Feature') {
          return isPointGeom(geojson.geometry);
        }
        return isPointGeom(geojson);
      }

      const isPointData = hasPointData(geojson);

      if (isPointData) {
        ngwMap.addControl('BUTTON', 'top-left', {
          html: heatmapIcon,
          title: 'Toggle Heatmap',
          onClick: async () => {
            const currentHeatmap = state.getVal('heatmap');
            const newHeatmap = !currentHeatmap;
            state.set('heatmap', newHeatmap);
            toggleHeatmap(geojson, newHeatmap);
            updatePaintControlOnHeatmapToggle(ngwMap_, newHeatmap);
          },
        });
      }

      function clearLayer() {
        const map = ngwMap_.mapAdapter.map;

        if (!map) return;

        if (map.getLayer('heatmap-layer')) map.removeLayer('heatmap-layer');
        if (map.getSource('heatmap-source')) map.removeSource('heatmap-source');
        if (ngwMap_.getLayer('layer')) ngwMap_.removeLayer('layer');
      }

      async function toggleHeatmap(geojson: GeoJSON, enabled: boolean) {
        clearLayer();

        if (enabled) {
          const opacity = state.getVal('opacity');
          return addHeatmapLayer({ geojson, ngwMap: ngwMap_, opacity });
        } else {
          return addGeoJsonLayer({
            geojson,
            ngwMap: ngwMap_,
            color: state.getVal('color'),
            fillOpacity: state.getVal('opacity'),
            strokeColor: state.getVal('strokeColor'),
            strokeOpacity: state.getVal('strokeOpacity'),
          });
        }
      }

      await waitForIdle();

      const layer = await toggleHeatmap(geojson, !!(heatmap && isPointData));

      if (!bbox && layer) {
        const fitOptions: FitOptions = {};
        const offset = state.getVal('fitOffset');
        if (offset) {
          fitOptions.offset = offset;
        }
        if (padding !== undefined) {
          fitOptions.padding = padding;
        }
        if (maxZoom !== undefined) {
          fitOptions.maxZoom = maxZoom;
        }
        if (typeof layer === 'string') {
          fitMaplibreLayer({ ngwMap, sourceId: layer, fitOptions });
        } else {
          ngwMap?.fitLayer(layer, fitOptions);
        }
      }
      await waitForIdle();

      addPaintControl(ngwMap, !!(heatmap && isPointData));

      new SidebarControl({ ngwMap });

      // Never delete this flag because it is used in generateImage for workaround
      // to make sure that ngwMap is initialized before making screenshot.
      window.mapLoaded = true;
      resolve();
    });

    state.subscribe((state) => {
      const paint = {} as PathPaint;

      for (const value of Object.values(state)) {
        if (value.paintName && value.value !== undefined) {
          paint[value.paintName as keyof PathPaint] = value.value as any;
        }
      }

      const currentHeatmap = state.heatmap?.value;

      if (currentHeatmap && paint.fillOpacity !== undefined) {
        ngwMap?.mapAdapter.map?.setPaintProperty(
          'heatmap-layer',
          'heatmap-opacity',
          paint.fillOpacity,
        );
      } else {
        ngwMap?.updateLayerPaint('layer', paint);
      }
    });
  });
}

// this is a workaround to make showMap available for generateImage
declare global {
  interface Window {
    showMap: typeof showMap;
    mapLoaded?: boolean;
  }
}
window.showMap = showMap;
