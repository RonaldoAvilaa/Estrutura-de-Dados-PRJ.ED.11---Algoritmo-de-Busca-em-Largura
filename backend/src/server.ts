import express from "express";
import cors from "cors";
import { pool } from "./database";
import { bfs } from "./bfs";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "API PRJ.ED.11 - Rotas Aéreas com BFS"
  });
});

app.get("/airports", async (req, res) => {
  const result = await pool.query(`
    SELECT 
      code,
      name,
      city,
      ST_Y(location::geometry) AS lat,
      ST_X(location::geometry) AS lng
    FROM airports
    ORDER BY city;
  `);

  res.json(result.rows);
});

app.get("/routes/bfs", async (req, res) => {
  const origin = String(req.query.origin || "").toUpperCase();
  const destination = String(req.query.destination || "").toUpperCase();

  if (!origin || !destination) {
    return res.status(400).json({
      error: "Informe origem e destino."
    });
  }

  // Busca todas as rotas do banco
  const routesResult = await pool.query(`
    SELECT origin_code, destination_code
    FROM routes;
  `);

  // Monta o grafo
  const graph: Record<string, string[]> = {};

  for (const route of routesResult.rows) {
    if (!graph[route.origin_code]) {
      graph[route.origin_code] = [];
    }

    graph[route.origin_code].push(route.destination_code);
  }

  // Executa a BFS
  const path = bfs(graph, origin, destination);

  if (!path) {
    return res.status(404).json({
      error: "Rota não encontrada."
    });
  }

  // Busca os aeroportos da rota encontrada
  const airportsResult = await pool.query(
    `
    SELECT
      code,
      name,
      city,
      ST_Y(location::geometry) AS lat,
      ST_X(location::geometry) AS lng
    FROM airports
    WHERE code = ANY($1)
    `,
    [path]
  );

  const airports = path.map((code) =>
    airportsResult.rows.find((airport) => airport.code === code)
  );

  // Calcula a distância total da rota encontrada
  let totalDistance = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const distanceResult = await pool.query(
      `
      SELECT distance_km
      FROM routes
      WHERE origin_code = $1
      AND destination_code = $2
      `,
      [path[i], path[i + 1]]
    );

    totalDistance += Number(distanceResult.rows[0].distance_km);
  }

  res.json({
    algorithm: "Busca em Largura (BFS)",
    origin,
    destination,
    path,
    flights: path.length - 1,
    stops: Math.max(path.length - 2, 0),
    totalDistanceKm: Number(totalDistance.toFixed(2)),
    airports
  });
});

app.listen(3000, () => {
  console.log("Backend rodando em http://localhost:3000");
});