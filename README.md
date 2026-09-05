# 3D Inflated Shape Generator (Chroma Key)

A custom Google Flow tool that transforms any 2D reference shape — logos, letters, icons, or custom artwork — into a premium, soft-inflated 3D render with realistic plastic materials, rendered on a solid chroma-key background for clean compositing.

## What It Does

Upload a flat reference image (a logo, letterform, or custom shape), and the tool preserves its exact silhouette and geometry while applying a fully customizable soft-inflated plastic material treatment on top — powered by Nano Banana Pro (Gemini 3 Pro Image). The result is a chroma-keyed still image ready to drop straight into a compositing pipeline for transparent PNG extraction.

## Core Features

**Shape-locked reference input.** Drag in or select a reference image, and the tool explicitly instructs the model to preserve its exact shape, silhouette, proportions, and contours — the material transformation happens on top of that locked geometry, not as a reinterpretation of it.

**Interior cutout preservation.** A dedicated toggle tells the model to keep interior holes and negative space (like the center of a letter O, A, or D) fully open and hollow, preventing the common failure mode where inflation swallows enclosed gaps and turns a torus-like shape into a solid blob.

**Material transparency modes.** A three-way toggle between Opaque, Semi-translucent, and Fully Clear governs how the plastic behaves optically — from a solid gloss finish to a fully transparent film with realistic light refraction and reflection, matching the look of sealed inflatable plastic packaging.

**Full-spectrum color picker.** A grid/spectrum/sliders color picker with an eyedropper (for sampling colors directly off the reference image), an opacity slider, and persistent saved-swatch slots for reusing favorite colors across sessions. Colors are automatically converted to the nearest named hue (e.g., "vivid flame orange") and paired with their hex code for reliable model interpretation. The color field is automatically omitted from the prompt when transparency is set to Fully Clear.

**Banded inflation controls.** Four sliders — Puffiness, Fold Density, Asymmetry, and Gloss/Sheen — each map their 0–100% value to descriptive natural-language phrases rather than raw numbers, ensuring the low and high ends of each range produce genuinely distinct visual results instead of converging on the same middling look.

**Chroma-key output environment.** Every render is generated on a solid, flat, gradient-free pure green (#00FF00) or pure blue (#0000FF) background, purpose-built for downstream background removal via chroma-key scripts (like a Multiply/Screen glass-masking workflow or automated HSV keying) to produce a true transparent-background PNG.

**Live prompt preview.** A read-only panel shows the exact locked prompt string being assembled in real time from all current field and slider values, so you can see precisely what's being sent to the model before generating.

**One-click compositing export.** Download the generated render directly, pre-named based on the shape label, ready to hand off to your chroma-key extraction step.

## Typical Workflow

1. Upload a reference image of the shape you want to inflate.
2. Toggle "has interior cutout" on if the shape includes holes (letters, rings, etc.).
3. Set material transparency (Opaque / Semi-translucent / Fully Clear) and pick a color if applicable.
4. Adjust Puffiness, Fold Density, Asymmetry, and Gloss to taste.
5. Choose your chroma background color.
6. Generate, review the shape-locked result, and download for compositing.
7. Run the output through a chroma-key removal script to produce a final transparent PNG asset.

## Under the Hood

Built as a custom React/TypeScript tool inside Google Flow's Tool Builder, using Nano Banana Pro for image-conditioned generation. The prompt-construction logic dynamically assembles a single natural-language instruction string from all panel inputs — including conditional shape-lock and cutout-preservation clauses that only activate when relevant — rather than exposing raw parameter values directly to the model.
