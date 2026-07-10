import { MapContainer, TileLayer} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const drjl = () => {
  return (
    <MapContainer
      center={[39.9042, 116.4074]} // 类型自动推断为 LatLngTuple
      zoom={13}
      style={{ height: "100vh", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
    </MapContainer>
  );
};

export default drjl;
