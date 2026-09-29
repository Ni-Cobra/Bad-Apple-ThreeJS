"""Turn a camera solved by tools/tune.mjs (--look) into a key line for a camera path, with the target
moved to 1 m from the camera along the same view line (interpolating keys whose targets sit at different distances
turns the camera unevenly). A missing y is taken as 1.0 (a solve at a fixed height).
usage: python camkey.py T '{"x":..,"y":..,"z":..,"tx":..,"ty":..,"tz":..}'   (the JSON as tune.mjs prints it)"""
import sys, json, math

t, p = sys.argv[1], json.loads(sys.argv[2])
p.setdefault('y', 1.0)
d = [p['tx'] - p['x'], p['ty'] - p['y'], p['tz'] - p['z']]
L = math.sqrt(sum(v * v for v in d))
tg = [p['x'] + d[0] / L, p['y'] + d[1] / L, p['z'] + d[2] / L]
print(f"  [{t}, [{p['x']}, {p['y']}, {p['z']}, {tg[0]:.4f}, {tg[1]:.4f}, {tg[2]:.4f}]],")
