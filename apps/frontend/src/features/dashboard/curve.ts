/** Shape-preserving cubic interpolation of already scaled chart coordinates. */
export function curvePath(points: readonly (readonly number[])[]) {
  const samples: { x: number; y: number }[] = [];
  for (const point of points) {
    const x = point[0],
      y = point[1];
    if (
      x === undefined ||
      y === undefined ||
      !Number.isFinite(x) ||
      !Number.isFinite(y)
    )
      return "";
    const previous = samples.at(-1);
    if (previous && x < previous.x) return "";
    if (previous && x === previous.x) {
      if (y !== previous.y) return "";
      continue; // Fixed-size animation geometry pads its final observation.
    }
    samples.push({ x, y });
  }
  if (!samples.length) return "";
  const first = samples[0]!;
  if (samples.length === 1) return `M${first.x},${first.y}`;
  const widths: number[] = [],
    slopes: number[] = [];
  for (let i = 0; i < samples.length - 1; i++) {
    const width = samples[i + 1]!.x - samples[i]!.x;
    const slope = (samples[i + 1]!.y - samples[i]!.y) / width;
    if (!Number.isFinite(width) || !Number.isFinite(slope)) return "";
    widths.push(width);
    slopes.push(slope);
  }
  const tangents = samples.map((_, i) => {
    if (i === 0) return slopes[0]!;
    if (i === samples.length - 1) return slopes.at(-1)!;
    const before = slopes[i - 1]!,
      after = slopes[i]!;
    if (before === 0 || after === 0 || Math.sign(before) !== Math.sign(after))
      return 0;
    const left = 2 * widths[i]! + widths[i - 1]!;
    const right = widths[i]! + 2 * widths[i - 1]!;
    return (left + right) / (left / before + right / after);
  });
  // Limit shared tangents, preserving continuity without inventing extrema.
  for (let i = 0; i < slopes.length; i++) {
    const slope = slopes[i]!;
    if (slope === 0) {
      tangents[i] = tangents[i + 1] = 0;
      continue;
    }
    const a = tangents[i]! / slope,
      b = tangents[i + 1]! / slope;
    const magnitude = Math.hypot(a, b);
    if (magnitude > 3) {
      tangents[i] = (3 / magnitude) * a * slope;
      tangents[i + 1] = (3 / magnitude) * b * slope;
    }
  }
  let path = `M${first.x},${first.y}`;
  for (let i = 0; i < samples.length - 1; i++) {
    const from = samples[i]!,
      to = samples[i + 1]!,
      third = widths[i]! / 3;
    path += ` C${from.x + third},${from.y + tangents[i]! * third} ${to.x - third},${to.y - tangents[i + 1]! * third} ${to.x},${to.y}`;
  }
  return path;
}
