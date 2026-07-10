import { Marker, Popup } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'

interface Shop {
  id: number;
  name: string;
  position: [number, number];
  type: string;
}

interface ShopMarkersProps {
  shops: Shop[];
}

const ShopMarkers = ({ shops }: ShopMarkersProps) => {
  return (
    <>
      {shops.map(shop => (
        <Marker key={shop.id} position={shop.position as LatLngExpression}>
          <Popup>{shop.name}</Popup>
        </Marker>
      ))}
    </>
  )
}

export default ShopMarkers
