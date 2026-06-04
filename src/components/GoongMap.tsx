import { useEffect, useRef } from 'react';

export interface GoongMapPin {
  lat: number;
  lng: number;
  title: string;
}

interface Props {
  pins: GoongMapPin[];
  routes?: Array<[number, number][]>;
  className?: string;
  onPinClick?: (index: number) => void;
}

const GOONG_MAPTILES_KEY = import.meta.env.VITE_GOONG_MAPTILES_KEY as string;

// Load Goong JS SDK from CDN (singleton promise)
let goongLoadPromise: Promise<void> | null = null;

function loadGoongSDK(): Promise<void> {
  if (goongLoadPromise) return goongLoadPromise;
  goongLoadPromise = new Promise((resolve, reject) => {
    // Load CSS
    if (!document.getElementById('goong-gl-css')) {
      const link = document.createElement('link');
      link.id = 'goong-gl-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css';
      document.head.appendChild(link);
    }
    // Load JS
    if (!document.getElementById('goong-gl-js')) {
      const script = document.createElement('script');
      script.id = 'goong-gl-js';
      script.src = 'https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    } else {
      resolve();
    }
  });
  return goongLoadPromise;
}

const GoongMap = ({ pins, routes, className, onPinClick }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const onPinClickRef = useRef(onPinClick);
  onPinClickRef.current = onPinClick;
  const routesRef = useRef(routes);
  routesRef.current = routes;

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let mounted = true;
    let mapInstance: any = null;

    const center = pins.length > 0
      ? [pins[0].lng, pins[0].lat]
      : [108.2022, 16.0544];

    loadGoongSDK().then(() => {
      if (!mounted || !container.isConnected) return;

      const goongjs = (window as any).goongjs;
      if (!goongjs) return;

      goongjs.accessToken = GOONG_MAPTILES_KEY;

      const map = new goongjs.Map({
        container,
        style: `https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_MAPTILES_KEY}`,
        center,
        zoom: 12,
      });

      mapInstance = map;

      map.on('load', () => {
        if (!mounted) return;

        const currentRoutes = routesRef.current;

        // Add route polylines as GeoJSON layers
        if (currentRoutes && currentRoutes.length > 0) {
          currentRoutes
            .filter(coords => coords.length > 1)
            .forEach((coords, idx) => {
              const sourceId = `route-${idx}`;
              const layerId = `route-layer-${idx}`;

              map.addSource(sourceId, {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    // coords is [lng, lat] pairs already in GeoJSON order
                    coordinates: coords,
                  },
                },
              });

              map.addLayer({
                id: layerId,
                type: 'line',
                source: sourceId,
                layout: {
                  'line-join': 'round',
                  'line-cap': 'round',
                },
                paint: {
                  'line-color': '#f97316',
                  'line-width': 3,
                  'line-dasharray': [2, 2],
                },
              });
            });
        }

        // Add markers for each pin
        pins.forEach((pin, i) => {
          // Create a custom HTML marker element
          const el = document.createElement('div');
          el.style.cssText = `
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background-color: ${i === 0 ? '#f97316' : '#6366f1'};
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            cursor: pointer;
          `;

          const marker = new goongjs.Marker({ element: el })
            .setLngLat([pin.lng, pin.lat])
            .addTo(map);

          // Add popup
          const popup = new goongjs.Popup({ offset: 15, closeButton: false })
            .setText(pin.title);
          marker.setPopup(popup);

          el.addEventListener('click', () => {
            onPinClickRef.current?.(i);
          });
        });

        // Fit bounds to all pins
        if (pins.length > 1) {
          const lngs = pins.map(p => p.lng);
          const lats = pins.map(p => p.lat);
          const bounds: [[number, number], [number, number]] = [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ];
          map.fitBounds(bounds, { padding: 60 });
        }
      });
    }).catch(err => {
      if (mounted) console.error('Goong Maps failed to load:', err);
    });

    return () => {
      mounted = false;
      if (mapInstance) {
        try { mapInstance.remove(); } catch { /* ignore */ }
      }
    };

    // pins/routes are stable after trip load; re-init causes flicker
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className={className ?? 'w-full h-full'} />;
};

export default GoongMap;