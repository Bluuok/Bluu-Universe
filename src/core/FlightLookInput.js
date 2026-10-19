/**
 * Sole owner of flight mouse input: Pointer Lock relative movement and the
 * unlocked right-button drag fallback. It does not own keyboard, movement,
 * camera transforms or flight velocity.
 *
 * DOM target injection keeps lock/drag lifecycles independently testable.
 * The user gesture reaches requestPointerLock synchronously (before any await).
 */
export class FlightLookInput {
  constructor({
    canvas,
    doc = document,
    win = window,
    canLook = () => true,
    onLook,
    onStart = () => {},
    onCaptured = () => {},
    onReleased = () => {},
    onError = () => {},
  }) {
    this.canvas = canvas;
    this.doc = doc;
    this.win = win;
    this.canLook = canLook;
    this.onLook = onLook;
    this.onStart = onStart;
    this.onCaptured = onCaptured;
    this.onReleased = onReleased;
    this.onError = onError;
    this.drag = null;
    this.wasLocked = doc.pointerLockElement === canvas;

    this.contextMenu = event => event.preventDefault();
    this.down = event => {
      if (event.button !== 2 || this.locked || !this.canLook()) return;
      event.preventDefault();
      this.onStart();
      this.drag = {id:event.pointerId,x:event.clientX,y:event.clientY};
      try {canvas.setPointerCapture?.(event.pointerId);}
      catch {this.clearDrag();}
    };
    this.move = event => {
      if (!this.drag || event.pointerId !== this.drag.id) return;
      if (!(event.buttons & 2)) {this.clearDrag();return;}
      if (this.locked || !this.canLook()) {this.clearDrag();return;}
      const dx = event.clientX - this.drag.x;
      const dy = event.clientY - this.drag.y;
      this.drag.x = event.clientX;
      this.drag.y = event.clientY;
      this.emit(dx, dy);
    };
    this.up = event => {
      if (this.drag?.id === event.pointerId) this.clearDrag();
    };
    this.mousemove = event => {
      // Pointer Lock guarantees mousemove with relative movementX/Y on document.
      // Do not also consume pointermove: some browsers emit both events.
      if (!this.locked || !this.canLook()) return;
      this.emit(event.movementX,event.movementY);
    };
    this.change = () => {
      const locked = this.locked, previous = this.wasLocked;
      this.wasLocked = locked;
      this.clearDrag();
      if (locked && !this.canLook()) {this.release();return;}
      if (locked !== previous) this.onCaptured(locked);
      if (previous && !locked) this.onReleased();
    };
    this.error = () => this.onError();
    this.blur = () => this.clearDrag();

    canvas.addEventListener('contextmenu',this.contextMenu);
    canvas.addEventListener('pointerdown',this.down);
    canvas.addEventListener('pointermove',this.move);
    canvas.addEventListener('pointerup',this.up);
    canvas.addEventListener('pointercancel',this.up);
    canvas.addEventListener('lostpointercapture',this.up);
    doc.addEventListener('mousemove',this.mousemove);
    doc.addEventListener('pointerlockchange',this.change);
    doc.addEventListener('pointerlockerror',this.error);
    win.addEventListener('blur',this.blur);
  }

  get locked() {return this.doc.pointerLockElement === this.canvas;}

  emit(dx,dy) {
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || (!dx && !dy)) return;
    this.onLook(dx,dy);
  }

  async request() {
    if (!this.canLook() || !this.canvas.requestPointerLock) throw new Error('Pointer Lock unavailable');
    if (this.locked) return;
    this.onStart();
    this.canvas.focus?.({preventScroll:true});
    // Preserve transient user activation: no asynchronous operation before
    // the native request. await also handles browsers returning undefined.
    await this.canvas.requestPointerLock();
  }

  release() {
    this.clearDrag();
    if (this.locked) this.doc.exitPointerLock?.();
  }

  clearDrag() {
    if (!this.drag) return;
    const id = this.drag.id;
    this.drag = null;
    try {
      if (this.canvas.hasPointerCapture?.(id)) this.canvas.releasePointerCapture(id);
    } catch { /* Pointer may already have been cancelled by the browser. */ }
  }

  dispose() {
    this.release();
    this.canvas.removeEventListener('contextmenu',this.contextMenu);
    this.canvas.removeEventListener('pointerdown',this.down);
    this.canvas.removeEventListener('pointermove',this.move);
    this.canvas.removeEventListener('pointerup',this.up);
    this.canvas.removeEventListener('pointercancel',this.up);
    this.canvas.removeEventListener('lostpointercapture',this.up);
    this.doc.removeEventListener('mousemove',this.mousemove);
    this.doc.removeEventListener('pointerlockchange',this.change);
    this.doc.removeEventListener('pointerlockerror',this.error);
    this.win.removeEventListener('blur',this.blur);
  }
}
