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

type BfsResult = {
  algorithm: string;
  origin: string;
  destination: string;
  path: string[];
  flights: number;
  stops: number;
  totalDistanceKm: number;
  airports: Airport[];
};

type AlternativeRoute = {
  rank: number;
  path: string[];
  stops: number;
  flights: number;
  totalDistanceKm: number;
  isBfsChoice: boolean;
};

type AlternativesResult = {
  origin: string;
  destination: string;
  routes: AlternativeRoute[];
};

const app = document.querySelector<HTMLDivElement>("#app")!;
if (!app) throw new Error("Elemento #app não encontrado.");

app.innerHTML = `
  <div class="page">
    <header class="hero">
      <div>
        <span class="project-code">PRJ.ED.11</span>
        <h1>Sistema de Rotas Aéreas</h1>
        <p>
          Busca de rotas com menor número de escalas utilizando BFS.
        </p>
      </div>
    </header>

    <section class="card form-card">
      <div class="field">
        <label for="origin">Origem</label>
        <select id="origin"></select>
      </div>
      <div class="field">
        <label for="destination">Destino</label>
        <select id="destination"></select>
      </div>
      <button id="search">Buscar Rota</button>
    </section>

    <section id="result" class="card result-card">
      <p style="color:#64748b;margin:0">Selecione origem e destino para encontrar a rota com menos escalas.</p>
    </section>

    <section id="alt-section" style="display:none" class="card alt-card">
      <h3>Comparativo de Rotas Alternativas</h3>
      <p class="alt-subtitle">
        Outras opções disponíveis para o mesmo destino.
      </p>
      <div id="alt-content"></div>
    </section>

    <section class="map-card">
      <div id="map"></div>
    </section>
  </div>
`;

// ── Mapa ──────────────────────────────────────────────────────────────────────
const map = L.map("map").setView([-14.235, -51.9253], 4);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap",
}).addTo(map);

let routeLine: L.Polyline | null = null;
let planeMarker: L.Marker | null = null;
let altLines: L.Polyline[] = [];

const planeIcon = L.divIcon({
  html: "✈️",
  className: "plane-marker",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function clearMap() {
  if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
  if (planeMarker) { map.removeLayer(planeMarker); planeMarker = null; }
  altLines.forEach(l => map.removeLayer(l));
  altLines = [];
}

// ── Aeroportos ────────────────────────────────────────────────────────────────
const airportCache: Record<string, Airport> = {};

async function loadAirports() {
  const resultDiv = document.querySelector<HTMLDivElement>("#result")!;
  try {
    const response = await fetch("http://localhost:3000/airports");
    const airports: Airport[] = await response.json();

    const originSel = document.querySelector<HTMLSelectElement>("#origin")!;
    const destSel   = document.querySelector<HTMLSelectElement>("#destination")!;

    airports.forEach((a) => {
      airportCache[a.code] = a;

      const o = new Option(`${a.code} — ${a.city}`, a.code);
      const d = new Option(`${a.code} — ${a.city}`, a.code);
      originSel.appendChild(o);
      destSel.appendChild(d);

      L.marker([a.lat, a.lng])
        .addTo(map)
        .bindPopup(`<strong>${a.code}</strong><br>${a.name}<br>${a.city}`);
    });

    originSel.value = "GRU";
    destSel.value   = "MAO";

  } catch {
    resultDiv.innerHTML =
      "<strong style='color:#ef4444'>Erro:</strong> Backend não encontrado. Suba o Docker e o backend.";
  }
}

function renderPathChips(path: string[]) {
  return path
    .map((code, i) =>
      i < path.length - 1
        ? `<span class="chip">${code}</span><span class="chip-arrow">→</span>`
        : `<span class="chip">${code}</span>`
    )
    .join(" ");
}

// ── Resultado principal ───────────────────────────────────────────────────────
function renderBfsResult(data: BfsResult) {
  const resultDiv = document.querySelector<HTMLDivElement>("#result")!;

  const bfsRationale =
    data.stops === 0
      ? `O BFS encontrou um voo direto de <strong>${data.origin}</strong> para <strong>${data.destination}</strong>.
         Como a busca explora nível por nível, qualquer rota direta sempre será encontrada antes de rotas com escalas.`
      : `O BFS explora o grafo de aeroportos <em>nível a nível</em>:
         primeiro verifica todos os destinos com 1 salto, depois 2, e assim por diante.
         Por isso, a primeira rota encontrada é <strong>sempre</strong> a que usa o menor número de escalas —
         neste caso, <strong>${data.stops} escala(s)</strong> passando por <strong>${data.path.slice(1, -1).join(", ")}</strong>.
         Se houver empate no número de voos, o sistema escolhe a opção com menor distância aérea estimada.`;

  resultDiv.innerHTML = `
    <h3>Rota encontrada</h3>

    <div class="route-path">
      ${renderPathChips(data.path)}
    </div>

    <div class="stats">
      <div class="stat-highlight">
        <span>Escalas (BFS)</span>
        <strong>${data.stops}</strong>
      </div>
      <div>
        <span>Conexões</span>
        <strong>${data.flights}</strong>
      </div>
      <div>
        <span>Distância aérea estimada</span>
        <strong>${data.totalDistanceKm.toLocaleString("pt-BR")} km</strong>
      </div>
    </div>

    <div class="bfs-explanation">
      <h4>Critério da busca</h4>
      <p>${bfsRationale}</p>
    </div>
  `;
}

// ── Tabela de alternativas ────────────────────────────────────────────────────
function renderAlternatives(data: AlternativesResult) {
  const section = document.querySelector<HTMLElement>("#alt-section")!;
  const content = document.querySelector<HTMLElement>("#alt-content")!;

  if (!data.routes || data.routes.length === 0) {
    section.style.display = "none";
    return;
  }

  const minDist  = Math.min(...data.routes.map(r => r.totalDistanceKm));
  const minStops = Math.min(...data.routes.map(r => r.stops));

  const rows = data.routes
    .map((r) => {
      const isShortest = r.totalDistanceKm === minDist;

      const shorterBadge =
        isShortest && !r.isBfsChoice
          ? `<span class="shorter-badge">Menor distância</span>`
          : isShortest && r.isBfsChoice
          ? `<span class="shorter-badge">Menor distância</span>`
          : "";

      const bfsBadge = r.isBfsChoice
        ? `<span class="bfs-badge">Rota escolhida</span>`
        : "";

      const stopsClass = r.stops === minStops ? "stops-bfs" : "stops-more";

      return `
        <tr class="${r.isBfsChoice ? "row-bfs" : "row-other"}">
          <td>
            <div class="path-chips">${renderPathChips(r.path)}</div>
            ${bfsBadge}
          </td>
          <td class="stops-cell ${stopsClass}">${r.stops}</td>
          <td>${r.totalDistanceKm.toLocaleString("pt-BR")} km ${shorterBadge}</td>
        </tr>
      `;
    })
    .join("");

  content.innerHTML = `
    <table class="alt-table">
      <thead>
        <tr>
          <th>Rota</th>
          <th>Escalas</th>
          <th>Distância aérea estimada</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  section.style.display = "block";
}

// ── Linhas alternativas no mapa ───────────────────────────────────────────────
function drawAlternativesOnMap(data: AlternativesResult) {
  data.routes.forEach((r) => {
    if (r.isBfsChoice) return; // rota BFS já está desenhada em azul

    const coords = r.path
      .map((code) => airportCache[code])
      .filter(Boolean)
      .map((a) => [a.lat, a.lng] as [number, number]);

    if (coords.length < 2) return;

    const line = L.polyline(coords, {
      color: "#94a3b8",
      weight: 2,
      opacity: 0.45,
      dashArray: "6 6",
    }).addTo(map);

    altLines.push(line);
  });
}

// ── Busca ─────────────────────────────────────────────────────────────────────
document.querySelector<HTMLButtonElement>("#search")!.addEventListener("click", async () => {
  const origin      = document.querySelector<HTMLSelectElement>("#origin")!.value;
  const destination = document.querySelector<HTMLSelectElement>("#destination")!.value;
  const btn         = document.querySelector<HTMLButtonElement>("#search")!;
  const resultDiv   = document.querySelector<HTMLDivElement>("#result")!;
  const altSection  = document.querySelector<HTMLElement>("#alt-section")!;

  if (origin === destination) {
    resultDiv.innerHTML = "<strong style='color:#ef4444'>Origem e destino não podem ser iguais.</strong>";
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<span class="loading-spinner"></span> Buscando...`;
  altSection.style.display = "none";
  clearMap();

  try {
    // Chamadas paralelas: rota BFS + alternativas
    const [bfsRes, altRes] = await Promise.all([
      fetch(`http://localhost:3000/routes/bfs?origin=${origin}&destination=${destination}`),
      fetch(`http://localhost:3000/routes/alternatives?origin=${origin}&destination=${destination}`),
    ]);

    const bfsData: BfsResult = await bfsRes.json();
    const altData: AlternativesResult = await altRes.json();

    if (!bfsRes.ok) {
      resultDiv.innerHTML = `<strong style="color:#ef4444">Erro:</strong> ${(bfsData as any).error}`;
      return;
    }

    // Renderiza resultado principal
    renderBfsResult(bfsData);

    // Renderiza tabela comparativa
    if (altRes.ok) {
      renderAlternatives(altData);
      drawAlternativesOnMap(altData);
    }

    // Desenha rota BFS no mapa
    const coords = bfsData.airports
      .filter(Boolean)
      .map((a) => [a.lat, a.lng] as [number, number]);

    routeLine = L.polyline(coords, {
      color: "#2563eb",
      weight: 5,
      opacity: 0.9,
    }).addTo(map);

    const last = bfsData.airports[bfsData.airports.length - 1];
    planeMarker = L.marker([last.lat, last.lng], { icon: planeIcon }).addTo(map);

    map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });

  } catch (err) {
    console.error(err);
    resultDiv.innerHTML =
      "<strong style='color:#ef4444'>Erro:</strong> Backend não respondeu. Verifique se está rodando em <code>http://localhost:3000</code>.";
  } finally {
    btn.disabled = false;
    btn.innerHTML = "Buscar Rota";
  }
});

loadAirports();
