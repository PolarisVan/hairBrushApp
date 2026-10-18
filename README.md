# BrushLab: hairbrush configurator

An animated 3D configurator for two kinds of order:

- **Upgrade my brush.** The customer enters their brush's measurements. The imported `ExoSkeletonV4.STL` reshapes live to fit the brush head. It starts on its own; a printed handle that pins onto its end is one of the upgrades.
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

- `CONFIG.exo`: where the exoskeleton touches the brush, in mm in the STL's own axes: the inner faces of the top hook and the side hooks, the gap under the hook lips, and the handle joint. The reference brush size is worked out from these. If you change the STL in CAD, update these so the fitting and the preview line up.
- `COLORS`, `FINISHES`, `DESIGNS`, `BRISTLES`, `UPGRADES`: the options people can pick.

To swap in a new STL, replace `ExoSkeletonV4.STL` or change `CONFIG.stlPath`.

### Model versions

- `ExoSkeletonV1.STL`: the original CAD export.
- `ExoSkeletonV2.STL`: one centred top hook instead of two.
- `ExoSkeletonV3.STL`: 54% less material. The body is 3.2 mm thick instead of 7.6 mm, and the cross-arms are 6 mm wide instead of 12.7 mm. The faces the brush touches are unchanged, and the small 2D hook is removed.
- `ExoSkeletonV4.STL` (used by the app): V3 without the half-circle cradle. The end is 30 mm wide, with a solid 14 mm joint block and a Ø4.3 × 10.5 mm pin hole in its end face.
- `Handle.STL`: a flat handle, 30 mm wide at the joint (flush with the exoskeleton end), tapering to 26 mm with a rounded tip, 7.62 mm thick and 110 mm long. It has the same Ø4.3 × 10.5 mm hole in its joint face.
- `Pin.STL`: a Ø4.0 × 20 mm pin with chamfered ends. It goes 10 mm into each hole, with 0.15 mm clearance all round and 0.5 mm spare depth at each end.
- `HangingHook.STL`: that 2D hook as a separate part. It's the **Hanging hook** upgrade, and it's added to the fitted STL when chosen.

## How fitting works

The exoskeleton only fits the brush **head**. Each measurement moves the part that touches it, and the hooks keep their shape:

- **Head length** sets the distance from the top hook (the tip of the head) to the 30 mm joint end (the base of the head). The cross-arms stay at the head's widest point, and the plate in between stretches.
- **Head width** slides the side hooks out or in so their inner faces meet the sides of the head.
- **Head edge thickness** raises or lowers every hook lip so the gap under it matches the rim.
- **Handle length** (on the Upgrades step, once the pin-on handle is added) stretches the printed handle. Its first 15 mm at the joint, with the pin hole, never stretches.
- The joint block and the pin hole move with the base of the head and never stretch.

On the Review step, **Download STL** exports one file with the three parts laid out side by side for printing: the fitted exoskeleton (with the hanging hook if chosen), plus the handle and the pin if the pin-on handle was added. Check clearances before printing.
