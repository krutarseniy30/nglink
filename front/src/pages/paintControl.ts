import Color from 'color';
import { state } from '../state';
import NgwMap from '@nextgis/ngw-maplibre-gl';

let currentPaintControl: any = null;

function removeExistingControls(ngwMap: NgwMap): void {
  if (currentPaintControl) {
    try {
      ngwMap.removeControl(currentPaintControl);
    } catch (e) {}
    currentPaintControl = null;
  }
}

export function addPaintControl(ngwMap: NgwMap, isHeatmap: boolean): void {
  removeExistingControls(ngwMap);

  const opacityInit = state.getVal('opacity');

  currentPaintControl = ngwMap.createControl(
    {
      onAdd: () => {
        const elem = document.createElement('div');

        if (isHeatmap) {
          elem.innerHTML = `
            <div id="style-control">
              <div class="color-control weight">
                <input class="alpha-select" type="range" min="0" max="1" step="0.01" value="1" />
                <label class="alpha-label" for="alpha-select">Opacity</label>
              </div>
            </div>
          `;
        } else {
          elem.innerHTML = `
            <div id="style-control">
              <div class="color-control weight">
                <input class="fill-color-select" type="color" />
                <input class="alpha-select" type="range" min="0" max="1" step="0.01" value="1" />
                <label class="fill-color-label" for="fill-color-select">Fill color</label>
              </div>
              <div class="color-control weight">
                <input class="stroke-color-select" type="color" />
                <input class="stroke-alpha-select" type="range" min="0" max="1" step="0.01" value="1" />
                <label class="stroke-color-label" for="stroke-color-select">Stroke color</label>
              </div>
              <div class="weight">
                <input class="weight-select" type="number" min="0" max="10" step="0" value="1" />
                <label class="weight-label" for="weight-select">Weight</label>
              </div>
            </div>
          `;
        }

        if (!isHeatmap) {
          const colorInputs = elem.querySelectorAll(
            '.fill-color-select, .stroke-color-select',
          ) as NodeListOf<HTMLInputElement>;
          colorInputs.forEach((colorInput) => {
            colorInput.style.width = '18%';
            colorInput.style.border = 'none';
            colorInput.style.background = '#fff';
            colorInput.style.margin = '0 7px';
            colorInput.style.cursor = 'pointer';
            colorInput.style.padding = '0';
          });
        }

        const alphaInputs = elem.querySelectorAll(
          '.alpha-select, .stroke-alpha-select',
        ) as NodeListOf<HTMLInputElement>;
        alphaInputs.forEach((alphaInput) => {
          alphaInput.value = String(opacityInit);
          alphaInput.style.width = '40px';
          alphaInput.style.cursor = 'pointer';
          alphaInput.style.height = '2px';
        });

        if (!isHeatmap) {
          const fillColorSelect = elem.querySelector(
            '.fill-color-select',
          ) as HTMLInputElement;
          fillColorSelect.value = Color(state.getVal('color')).hex();

          const strokeColorSelect = elem.querySelector(
            '.stroke-color-select',
          ) as HTMLInputElement;
          strokeColorSelect.value = Color(state.getVal('strokeColor')).hex();

          const weightInput = elem.querySelector(
            '.weight-select',
          ) as HTMLInputElement;
          weightInput.value = String(state.getVal('weight'));

          fillColorSelect.oninput = () => {
            state.set('color', fillColorSelect.value);
          };

          strokeColorSelect.oninput = () => {
            state.set('strokeColor', strokeColorSelect.value);
          };

          weightInput.oninput = () => {
            state.set('weight', Number(weightInput.value));
          };

          const strokeAlphaInput = elem.querySelector(
            '.stroke-alpha-select',
          ) as HTMLInputElement;
          strokeAlphaInput.value = String(state.getVal('strokeOpacity'));

          strokeAlphaInput.oninput = () => {
            state.set('strokeOpacity', Number(strokeAlphaInput.value));
          };
        }

        const alphaInput = elem.querySelector(
          '.alpha-select',
        ) as HTMLInputElement;
        alphaInput.value = String(state.getVal('opacity'));

        alphaInput.oninput = () => {
          state.set('opacity', Number(alphaInput.value));
        };

        return elem;
      },
      onRemove: () => {
        // No-op
      },
    },
    { bar: true, addClass: 'paint-control' },
  );

  ngwMap.addControl(currentPaintControl, 'top-right');
}

export function updatePaintControlOnHeatmapToggle(
  ngwMap: NgwMap,
  isHeatmap: boolean,
): void {
  removeExistingControls(ngwMap);

  addPaintControl(ngwMap, isHeatmap);
}
