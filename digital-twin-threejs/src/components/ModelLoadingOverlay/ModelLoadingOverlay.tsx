import { useEffect, useState } from 'react';
import { BuildingPointCloud } from './BuildingPointCloud';
import './ModelLoadingOverlay.scss';

export type ModelLoadState = 'loading' | 'ready' | 'error';

export interface IModelLoadingOverlayProps {
  state: ModelLoadState;
}

export function ModelLoadingOverlay({ state }: IModelLoadingOverlayProps) {
  const [showPreview, setShowPreview] = useState(state === 'loading');
  useEffect(() => {
    if (state === 'loading') {
      setShowPreview(true);
      return;
    }
    // Release the temporary renderer after the overlay finishes its crossfade.
    const timer = window.setTimeout(() => setShowPreview(false), 500);
    return () => window.clearTimeout(timer);
  }, [state]);

  return (
    <div
      className="digital-twin-model-loader"
      data-state={state}
      role={state === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      aria-hidden={state === 'ready'}
      aria-label={state === 'loading' ? 'Loading 3D model and preparing view' : undefined}
    >
      {state === 'error' ? (
        <div className="digital-twin-model-loader__error">
          <span className="digital-twin-model-loader__error-title">Model unavailable</span>
          <p className="digital-twin-model-loader__error-copy">
            The 3D model could not be loaded. Check the model source and try again.
          </p>
        </div>
      ) : (
        <>
          {(showPreview || state === 'loading') && <BuildingPointCloud />}
          <span className="digital-twin-model-loader__status">Preparing model</span>
        </>
      )}
    </div>
  );
}
