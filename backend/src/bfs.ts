export function bfs(
  graph: Record<string, string[]>,
  origin: string,
  destination: string
): string[] | null {
  const queue: string[][] = [[origin]];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];

    if (current === destination) {
      return path;
    }

    if (!visited.has(current)) {
      visited.add(current);

      const neighbors = graph[current] || [];

      for (const neighbor of neighbors) {
        const newPath = [...path, neighbor];
        queue.push(newPath);
      }
    }
  }

  return null;
}

/**
 * Encontra todas as rotas entre origem e destino até um limite de saltos.
 * Usado para o comparativo: evidencia que o BFS escolhe menor nº de escalas,
 * evitando exibir caminhos excessivamente longos no comparativo.
 */
export function findAllRoutes(
  graph: Record<string, string[]>,
  origin: string,
  destination: string,
  maxHops: number = 6
): string[][] {
  const results: string[][] = [];

  function dfs(current: string, path: string[], visited: Set<string>) {
    if (path.length > maxHops + 1) return;

    if (current === destination) {
      results.push([...path]);
      return;
    }

    for (const neighbor of (graph[current] || [])) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        path.push(neighbor);
        dfs(neighbor, path, visited);
        path.pop();
        visited.delete(neighbor);
      }
    }
  }

  const visited = new Set<string>([origin]);
  dfs(origin, [origin], visited);

  // A ordenação por distância e o limite de alternativas são aplicados pela API.
  return results.sort((a, b) => a.length - b.length);
}
