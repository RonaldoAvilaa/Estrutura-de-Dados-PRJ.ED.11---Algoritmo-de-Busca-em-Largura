import express from "express";
import cors from "cors";
import { pool } from "./database";
import { bfs, findAllRoutes } from "./bfs";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "API PRJ.ED.11 - Rotas Aéreas com BFS" });
});

app.get("/airports", async (req, res) => {
  const result = await pool.query(`
    SELECT
      code, name, city,
      ST_Y(location::geometry) AS lat,
      ST_X(location::geometry) AS lng
    FROM airports
    ORDER BY city;
  `);
  res.json(result.rows);
});

// Monta o grafo e recalcula cada distância pelas coordenadas do PostGIS.
async function buildGraph() {
  const routesResult = await pool.query(
    `SELECT
       routes.origin_code,
       routes.destination_code,
       ST_Distance(origin.location, destination.location) / 1000 AS distance_km
     FROM routes
     JOIN airports origin ON origin.code = routes.origin_code
     JOIN airports destination ON destination.code = routes.destination_code;`
  );

  const graph: Record<string, string[]> = {};
  const distMap: Record<string, number> = {};

  for (const r of routesResult.rows) {
    if (!graph[r.origin_code]) graph[r.origin_code] = [];
    graph[r.origin_code].push(r.destination_code);
    distMap[`${r.origin_code}-${r.destination_code}`] = Number(r.distance_km);
  }

  return { graph, distMap };
}

function calcPathDistance(path: string[], distMap: Record<string, number>) {
  let totalDistance = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const key = `${path[i]}-${path[i + 1]}`;
    totalDistance += distMap[key] || 0;
  }

  return Math.round(totalDistance);
}

function findBfsChoice(
  graph: Record<string, string[]>,
  origin: string,
  destination: string,
  distMap: Record<string, number>
) {
  const firstBfsPath = bfs(graph, origin, destination);
  if (!firstBfsPath) return null;

  const minimumFlights = firstBfsPath.length - 1;
  const minimumFlightRoutes = findAllRoutes(
    graph,
    origin,
    destination,
    minimumFlights
  ).filter((path) => path.length - 1 === minimumFlights);

  return minimumFlightRoutes.sort((a, b) => {
    const distanceA = calcPathDistance(a, distMap);
    const distanceB = calcPathDistance(b, distMap);
    return distanceA - distanceB;
  })[0];
}

async function getAirportsByPath(path: string[]) {
  const result = await pool.query(
    `SELECT code, name, city,
            ST_Y(location::geometry) AS lat,
            ST_X(location::geometry) AS lng
     FROM airports WHERE code = ANY($1)`,
    [path]
  );
  return path.map((code) => result.rows.find((a) => a.code === code));
}

// Rota principal BFS
app.get("/routes/bfs", async (req, res) => {
  const origin = String(req.query.origin || "").toUpperCase();
  const destination = String(req.query.destination || "").toUpperCase();

  if (!origin || !destination) {
    return res.status(400).json({ error: "Informe origem e destino." });
  }

  const { graph, distMap } = await buildGraph();
  const path = findBfsChoice(
    graph,
    origin,
    destination,
    distMap
  );

  if (!path) {
    return res.status(404).json({ error: "Rota não encontrada." });
  }

  const totalDistanceKm = calcPathDistance(path, distMap);
  const airports = await getAirportsByPath(path);

  res.json({
    algorithm: "Busca em Largura (BFS)",
    origin,
    destination,
    path,
    flights: path.length - 1,
    stops: Math.max(path.length - 2, 0),
    totalDistanceKm,
    airports,
  });
});

// Endpoint de comparativo: retorna todas as rotas alternativas com métricas
app.get("/routes/alternatives", async (req, res) => {
  const origin = String(req.query.origin || "").toUpperCase();
  const destination = String(req.query.destination || "").toUpperCase();

  if (!origin || !destination) {
    return res.status(400).json({ error: "Informe origem e destino." });
  }

  const { graph, distMap } = await buildGraph();
  const bfsPath = findBfsChoice(
    graph,
    origin,
    destination,
    distMap
  );

  if (!bfsPath) {
    return res.status(404).json({ error: "Nenhuma rota encontrada." });
  }

  const bfsDistanceKm = calcPathDistance(bfsPath, distMap);
  const bfsFlights = bfsPath.length - 1;
  const maxFlights = Math.min(bfsFlights + 2, 4);
  const maxReasonableDistance = bfsDistanceKm * 1.75;
  const bfsPathKey = bfsPath.join("-");

  const routes = findAllRoutes(graph, origin, destination, maxFlights)
    .map((path) => {
      return {
        path,
        totalDistanceKm: calcPathDistance(path, distMap),
        isBfsChoice: path.join("-") === bfsPathKey,
      };
    })
    .filter(
      (route) =>
        route.isBfsChoice ||
        route.totalDistanceKm <= maxReasonableDistance
    )
    .sort((a, b) => {
      if (a.isBfsChoice) return -1;
      if (b.isBfsChoice) return 1;

      const flightsDifference = a.path.length - b.path.length;
      if (flightsDifference !== 0) return flightsDifference;

      return a.totalDistanceKm - b.totalDistanceKm;
    })
    .slice(0, 3)
    .map((route, index) => {
      const { path, totalDistanceKm, isBfsChoice } = route;
      return {
        rank: index + 1,
        path,
        stops: Math.max(path.length - 2, 0),
        flights: path.length - 1,
        totalDistanceKm,
        isBfsChoice,
      };
    });

  res.json({ origin, destination, routes });
});

app.listen(3000, () => {
  console.log("Backend rodando em http://localhost:3000");
});
