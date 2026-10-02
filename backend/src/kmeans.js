// Minimal, dependency-free k-means (Lloyd's algorithm with k-means++ seeding)
// used to cluster farmers by their spending pattern across expense
// categories. No external ML library is needed for this dataset size.

function distanceSq(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return sum;
}

function meanVector(vectors) {
  const dim = vectors[0].length;
  const mean = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) mean[i] += v[i];
  }
  return mean.map((s) => s / vectors.length);
}

// Deterministic PRNG so the same input data always clusters the same way
// (no hidden randomness in what is effectively a scheduled batch job).
function seededRandom(seed) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

/**
 * Clusters `points` (array of equal-length numeric feature vectors) into
 * `k` groups using Lloyd's k-means algorithm with k-means++ initialisation.
 * Returns { assignments, centroids } where assignments[i] is the cluster
 * index of points[i].
 */
export function kmeans(points, k, { maxIterations = 100, seed = 42 } = {}) {
  if (!points.length) return { assignments: [], centroids: [] };
  const effectiveK = Math.max(1, Math.min(k, points.length));
  const rand = seededRandom(seed);

  // k-means++: pick the first centroid at random, then each subsequent one
  // with probability proportional to squared distance from the nearest
  // existing centroid, so starting points are well spread out.
  const centroids = [points[Math.floor(rand() * points.length)]];
  while (centroids.length < effectiveK) {
    const distances = points.map((p) => Math.min(...centroids.map((c) => distanceSq(p, c))));
    const total = distances.reduce((a, b) => a + b, 0);
    if (total === 0) {
      centroids.push(points[Math.floor(rand() * points.length)]);
      continue;
    }
    let threshold = rand() * total;
    let chosen = points[points.length - 1];
    for (let i = 0; i < points.length; i++) {
      threshold -= distances[i];
      if (threshold <= 0) {
        chosen = points[i];
        break;
      }
    }
    centroids.push(chosen);
  }

  let assignments = new Array(points.length).fill(-1);
  for (let iter = 0; iter < maxIterations; iter++) {
    const nextAssignments = points.map((p) => {
      let best = 0;
      let bestDist = Infinity;
      centroids.forEach((c, ci) => {
        const d = distanceSq(p, c);
        if (d < bestDist) {
          bestDist = d;
          best = ci;
        }
      });
      return best;
    });

    const changed = nextAssignments.some((a, i) => a !== assignments[i]);
    assignments = nextAssignments;

    for (let ci = 0; ci < effectiveK; ci++) {
      const members = points.filter((_, i) => assignments[i] === ci);
      if (members.length) centroids[ci] = meanVector(members);
    }

    if (!changed && iter > 0) break;
  }

  return { assignments, centroids };
}
