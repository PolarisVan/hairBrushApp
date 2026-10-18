# BrushLab: hairbrush configurator

An animated 3D configurator for two kinds of order:

- **Upgrade my brush.** The customer enters their brush's measurements. The imported `ExoSkeletonV2.STL` reshapes live to fit them, and they add upgrades that clip onto it.
- **Design a new one.** The customer picks a design (paddle, oval, round or slim), a size, bristles, upgrades and a finish.

## Run it

Double-click **`start.bat`**. It starts a small local server and opens http://localhost:5173.
You can also run `node server.js` yourself. Node.js is the only requirement; there is nothing to install.

You can't open `index.html` directly from the file system, because browsers block loading the STL and scripts from `file://` URLs.

## Files

| File | What it does |
| --- | --- |
| `index.html` | Page layout (top bar, side panel, 3D viewport) |
| `styles.css` | All styling. The panel turns into a bottom sheet on phones |
| `app.js` | Scene, STL loading and fitting, procedural brushes, upgrades, animations, UI |
| `server.js` / `start.bat` | Zero-dependency local server |

## Adjusting it

Everything you're likely to change is at the top of `app.js`:

- `CONFIG.referenceBrush`: the brush size the STL was modelled around. Measurements are scaled relative to this.
- `CONFIG.exo`: landmarks on the STL in mm, such as the cross-arm position, the neck where the plate narrows, and the top of the back plate. If you export a new version of the exoskeleton, update these so the brush preview and upgrades line up.
- `COLORS`, `FINISHES`, `DESIGNS`, `BRISTLES`, `UPGRADES`: options and prices.

To swap in a new STL, replace `ExoSkeletonV2.STL` or change `CONFIG.stlPath`.

## How fitting works

The exoskeleton is deformed vertex by vertex:

- The head side stretches with head length, and the handle side with total length.
- Width blends from head width to handle width across the neck.
- Only the hooks above the plate grow with thickness.

On the Review step, **Download fitted STL** exports that deformed mesh. It's a straight stretch of the original, so check clearances before printing.
