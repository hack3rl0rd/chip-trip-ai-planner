import { useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

export interface GoogleMapPin {
  lat: number;
  lng: number;
  title: string;
}

interface Props {
  pins: GoogleMapPin[];
  routes?: Array<[number, number][]>;
  className?: string;
  onPinClick?: (index: number) => void;
}

const loader = new Loader({
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
  version: 'weekly',
});

const GoogleMap = ({ pins, routes, className, onPinClick }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const onPinClickRef = useRef(onPinClick);
  onPinClickRef.current = onPinClick;
  const routesRef = useRef(routes);
  routesRef.current = routes;

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let mounted = true;

    const center = pins.length > 0
      ? { lat: pins[0].lat, lng: pins[0].lng }
      : { lat: 16.0544, lng: 108.2022 };

    loader.load().then(() => {
      // Guard: nếu component đã unmount trước khi Maps load xong → bỏ qua
      // tránh IntersectionObserver error khi container không còn trong DOM
      if (!mounted || !container.isConnected) return;

      const { Map, Polyline, Marker, LatLngBounds, SymbolPath } = google.maps;

      const map = new Map(container, {
        center,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      const currentRoutes = routesRef.current;
      if (currentRoutes && currentRoutes.length > 0) {
        const lineSymbol: google.maps.Symbol = {
          path: 'M 0,-1 0,1',
          strokeOpacity: 1,
          scale: 3,
        };
        currentRoutes
          .filter(coords => coords.length > 1)
          .forEach(coords => {
            new Polyline({
              path: coords.map(([lng, lat]) => ({ lat, lng })),
              strokeOpacity: 0,
              icons: [{ icon: lineSymbol, offset: '0', repeat: '12px' }],
              strokeColor: '#f97316',
              map,
            });
          });
      }

      pins.forEach((pin, i) => {
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        const marker = new Marker({
          position: { lat: pin.lat, lng: pin.lng },
          map,
          title: pin.title,
          icon: {
            path: SymbolPath.CIRCLE,
            fillColor: i === 0 ? '#f97316' : '#6366f1',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            scale: 8,
          },
        });
        marker.addListener('click', () => onPinClickRef.current?.(i));
      });

      if (pins.length > 1) {
        const bounds = new LatLngBounds();
        pins.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
        map.fitBounds(bounds, 60);
      }
    }).catch(err => {
      if (mounted) console.error('Google Maps failed to load:', err);
    });

    return () => { mounted = false; };

    // pins/routes không trong deps — re-init gây flicker; data ổn định sau khi trip load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className={className ?? 'w-full h-full'} />;
};

export default GoogleMap;