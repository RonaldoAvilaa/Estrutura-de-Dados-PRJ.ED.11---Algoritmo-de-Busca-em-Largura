import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";

type Airport = {
  code: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
};

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Elemento #app não encontrado.");
}

app.innerHTML = `
  <div class="page">
    <header class="hero">
      <div>
        <span class="tag">PRJ.ED.11</span>
        <h1>Rotas Aéreas com Busca em Largura</h1>
        <p>
          Sistema que encontra a rota com o menor número de escalas usando BFS.
        </p>
      </div>
      <div class="plane">✈️</div>
    </header>

    <section class="card form-card">
      <div class="field">
        <label>Origem</label>
        <select id="origin"></select>
      </div>

      <div class="field">
        <label>Destino</label>
        <select id="destination"></select>
      </div>

      <button id="search">Buscar Rota</button>
    </section>

    <section id="result" class="card result-card">
      Carregando aeroportos...
    </section>

    <section class="map-card">
      <div id="map"></div>
    </section>
  </div>
`;

const map = L.map("map").setView([-14.235, -51.9253], 4);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

let routeLine: L.Polyline | null = null;
let planeMarker: L.Marker | null = null;

const planeIcon = L.divIcon({
  html: "✈️",
  className: "plane-marker",
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

async function loadAirports() {
  const resultDiv = document.querySelector<HTMLDivElement>("#result")!;

  try {
    const response = await fetch("http://localhost:3000/airports");
    const airports: Airport[] = await response.json();

    const originSelect = document.querySelector<HTMLSelectElement>("#origin")!;
    const destinationSelect =
      document.querySelector<HTMLSelectElement>("#destination")!;

    airports.forEach((airport) => {
      const optionOrigin = document.createElement("option");
      optionOrigin.value = airport.code;
      optionOrigin.textContent = `${airport.code} - ${airport.city}`;

      const optionDestination = document.createElement("option");
      optionDestination.value = airport.code;
      optionDestination.textContent = `${airport.code} - ${airport.city}`;

      originSelect.appendChild(optionOrigin);
      destinationSelect.appendChild(optionDestination);

      L.marker([airport.lat, airport.lng])
        .addTo(map)
        .bindPopup(`<strong>${airport.code}</strong><br>${airport.city}`);
    });

    originSelect.value = "GRU";
    destinationSelect.value = "MAO";

    resultDiv.innerHTML = `
      <h3>Pronto para buscar</h3>
      <p>Selecione a origem e o destino para encontrar a rota com menos escalas.</p>
    `;
  } catch (error) {
    console.error(error);
    resultDiv.innerHTML =
      "Erro ao carregar aeroportos. Verifique se o backend está rodando.";
  }
}

document
  .querySelector<HTMLButtonElement>("#search")!
  .addEventListener("click", async () => {
    const origin = document.querySelector<HTMLSelectElement>("#origin")!.value;
    const destination =
      document.querySelector<HTMLSelectElement>("#destination")!.value;

    const resultDiv = document.querySelector<HTMLDivElement>("#result")!;

    try {
      const response = await fetch(
        `http://localhost:3000/routes/bfs?origin=${origin}&destination=${destination}`
      );

      const data = await response.json();

      if (!response.ok) {
        resultDiv.innerHTML = `<strong>Erro:</strong> ${data.error}`;
        return;
      }

      if (routeLine) {
        map.removeLayer(routeLine);
      }

      if (planeMarker) {
        map.removeLayer(planeMarker);
      }

      const coordinates = data.airports.map((airport: Airport) => [
        airport.lat,
        airport.lng
      ]);

      routeLine = L.polyline(coordinates, {
        color: "#2563eb",
        weight: 5,
        opacity: 0.9
      }).addTo(map);

      const lastAirport = data.airports[data.airports.length - 1];

      planeMarker = L.marker([lastAirport.lat, lastAirport.lng], {
        icon: planeIcon
      }).addTo(map);

      map.fitBounds(routeLine.getBounds(), {
        padding: [40, 40]
      });

      resultDiv.innerHTML = `
        <h3>✈️ Rota Encontrada</h3>

        <div class="route-path">
          ${data.path.join(" → ")}
        </div>

        <div class="stats">
          <div>
            <span>Algoritmo</span>
            <strong>${data.algorithm}</strong>
          </div>

          <div>
            <span>Conexões</span>
            <strong>${data.flights}</strong>
          </div>

          <div>
            <span>Escalas</span>
            <strong>${data.stops}</strong>
          </div>

          <div>
            <span>Distância</span>
            <strong>${data.totalDistanceKm} km</strong>
          </div>
        </div>
      `;
    } catch (error) {
      console.error(error);
      resultDiv.innerHTML =
        "Erro ao buscar rota. Verifique se o backend está rodando.";
    }
  });

loadAirports();