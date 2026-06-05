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