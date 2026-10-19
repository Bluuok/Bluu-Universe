# PR 2 — Portfolio exhibition flow, without changing the universe

## Motivation and constraints

The existing repository contains a carefully constructed, paper-bound project
notebook with images, page turns, async decode/retry and camera returns. Keep
those mechanics. A wholesale replacement with a generic Apple imitation would
break the Starhaven art direction and erase tested behaviour.

The audited transition gaps:

1. Catalog is a text-only list, so visitors cannot tell what the projects do.
2. A reader must close the notebook to move between projects.
3. Changing a project while the notebook is open must preserve keyboard focus
   and must not let old page animations or image requests win.

## Implemented

- Editorial catalog rows, with real existing `/assets/projects/` image previews
  where available, titles, categories, concise descriptions, indexed order,
  and deterministic decorative fallback where no screenshot exists.
- A small adjacent-project navigator in the *existing* notebook heading:
  previous/next wrap across the exact registry order, plus current/total.
  Distinguish this from the notebook's own three-chapter navigation.
- Switching preserves ROOM/SPACE origin, existing exhibit framing and the
  notebook's own image/turn cancellation path. Header navigator keeps keyboard
  focus instead of dumping it back on the Close button.
- A subtle, cancellable spread crossfade signals a different case study.
  No new fullscreen overlays, postprocess passes, WebGL renderer, animation
  dependency, downloads, images or 3D models.
- Catalog focus restoration and no catalog opening behind the project dialog.

## External references

- Apple Human Interface Guidelines, Motion:
  https://developer.apple.com/design/human-interface-guidelines/motion/
  Motion should communicate states, be optional/cancellable, avoid gratuitous
  attention grabbing, and respect reduce-motion.
- Codrops FullscreenLayoutPageTransitions (MIT):
  https://github.com/codrops/FullscreenLayoutPageTransitions
  Grid/portfolio context-to-detail-to-next-case idea; no third-party code
  copied into this project.
- GSAP Flip documentation: https://gsap.com/docs/v3/Plugins/Flip/
  Reviewed but not installed or used: the present paper-book element/camera
  cannot safely be moved between unrelated DOM contexts without disrupting
  the existing cancellation and state rules.
- MDN View Transition API:
  https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API
  Reviewed but not added: full-document capture of a live WebGL canvas can
  freeze or flash the universe, contrary to the uninterrupted scene objective.

The new DOM/CSS/JS in PR2 is native code based on these interaction patterns.
Existing asset licenses and permission requirements remain unchanged.

## Test / acceptance

```sh
npm ci
node tests/portfolio-navigation-check.mjs
npm run build
```

Manual browser acceptance (do not claim these tests pass unless executed):

- SPACE -> catalog -> first project -> next -> next -> previous -> close ->
  camera/flight return, then ROOM -> exhibit -> next project -> return -> exit.
- Previous from first and next from last wrap; names, counter, labels and
  content must remain synchronized.
- 6 rapid adjacent-project switches, close during open/turn, same image
  request A -> B -> A, image request failures/retry.
- Keyboard Tab / Shift+Tab inside the dialog, Enter on navigation, Escape
  return, restore focus to catalog toggle or room exhibit.
- Reduced-motion setting and desktop window widths 900/1024/1440.
- Confirm HTML/CSS does not obscure the astronaut/scene and no camera
  orientation or flight-controller logic was changed.

Integration scope: the incoming phone-only 700px layout is removed under the
latest desktop-browser requirement. Existing desktop two-page layout is kept.
PR1/PR2/PR3 are reviewed together in the local integration candidate.
