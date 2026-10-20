// Panel and page animations cancel independently. Repeated input targets the
// latest requested spread; no delayed callback can resurrect a closed book.
export class ProjectBook {
  constructor(panel) {
    this.events=new AbortController();const options={signal:this.events.signal};
    this.panel = panel;
    this.spread = panel.querySelector('.book-spread');
    this.sheet = panel.querySelector('.book-turn');
    this.page = 0;
    this.revision = 0;
    this.turnRevision = 0;
    this.animations = new Set();
    this.status = 'closed';
    this.tabs = [...panel.querySelectorAll('[data-book-page]')];
    this.mediaFrame = panel.querySelector('.book-media');
    this.image = panel.querySelector('#project-image');
    this.mediaRevision = 0;
    panel.querySelector('#book-media-retry').addEventListener('click',()=>{
      if(!this.mediaSource)return;
      this.showMedia('loading');this.watchMedia();this.image.removeAttribute('src');this.image.src=this.mediaSource;
    },options);
    this.tabs.forEach(button => button.addEventListener('click', () => this.turn(Number(button.dataset.bookPage)),options));
    panel.querySelector('#book-prev').addEventListener('click',()=>this.turn(this.page-1),options);
    panel.querySelector('#book-next').addEventListener('click',()=>this.turn(this.page+1),options);
    panel.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault(); this.turn(this.page + (event.key === 'ArrowRight' ? 1 : -1));
      }
      if (event.key === 'Tab') {
        const targets = [...panel.querySelectorAll('button:not(:disabled),a[href]')].filter(el => el.getClientRects().length);
        const first = targets[0], last = targets.at(-1);
        if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    },options);
  }

  get duration() { return matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 360; }
  dispose(){this.events.abort();this.reset();this.image.onload=this.image.onerror=null;}
  cancel() {
    this.revision++; this.turnRevision++;
    for (const animation of this.animations) animation.cancel();
    this.animations.clear();
    this.sheet.replaceChildren(); this.sheet.hidden = true;
  }
  cancelTurn() {
    this.turnRevision++;
    for (const animation of this.animations) if (animation.effect?.target === this.sheet) animation.cancel();
    this.sheet.replaceChildren(); this.sheet.hidden = true;
  }
  presentation() {
    const style = getComputedStyle(this.panel);
    return {opacity:style.opacity, transform:style.transform};
  }
  async animate(element, frames, duration = this.duration) {
    const animation = element.animate(frames, {duration, easing:'cubic-bezier(.22,.75,.25,1)', fill:'both'});
    this.animations.add(animation);
    try { await animation.finished; } catch { return false; }
    finally { this.animations.delete(animation); animation.cancel(); }
    return true;
  }

  async open(project,{keepFocus=false}={}) {
    const wasOpen = !this.panel.hidden;
    // Browsing from one exhibit to the next must not jump focus back to Close.
    // The same header controls remain in DOM while content/camera changes.
    const preserveFocus = keepFocus && wasOpen && this.panel.contains(document.activeElement);
    const current = wasOpen ? this.presentation() : {opacity:0, transform:'perspective(1500px) translateY(20px) rotateY(-3deg) scale(.985)'};
    this.cancel(); const revision = this.revision;
    this.project = project; this.page = 0; this.status = 'opening';
    this.panel.hidden = false; this.panel.inert = false;
    this.render();
    if(!preserveFocus)this.panel.querySelector('#project-close').focus({preventScroll:true});
    const opening = this.animate(this.panel, [current, {opacity:1, transform:'none'}], this.duration);
    // A quiet content crossfade signals a new case study; it never replaces
    // the existing book turn, interrupts mouse controls or blocks navigation.
    const changing = preserveFocus ? this.animate(this.spread,
      [{opacity:.38,transform:'translateY(5px)'},{opacity:1,transform:'none'}],
      this.duration*.62) : Promise.resolve();
    await Promise.all([opening,changing]);
    if (revision === this.revision && this.status === 'opening') this.status = 'open';
  }

  async close() {
    if (this.panel.hidden) return true;
    this.mediaRevision++;
    const current = this.presentation();
    this.cancel(); const revision = this.revision;
    this.status = 'closing'; this.panel.inert = true;
    await this.animate(this.panel, [current,{opacity:0, transform:'perspective(1500px) translateY(12px) rotateY(-2deg) scale(.985)'}], this.duration * .65);
    if (revision !== this.revision) return false;
    this.panel.hidden = true; this.panel.inert = false; this.status = 'closed';
    return true;
  }

  reset() { this.mediaRevision++;this.cancel(); this.panel.hidden = true; this.panel.inert = false; this.status = 'closed'; }

  watchMedia() {
    const revision=++this.mediaRevision;
    this.image.onload=()=>this.mediaLoaded(revision);
    this.image.onerror=()=>{if(revision===this.mediaRevision&&this.mediaSource&&this.image.complete&&!this.image.naturalWidth)this.showMedia('error');};
    return revision;
  }

  showMedia(state) {
    this.mediaFrame.dataset.state=state;
    this.mediaFrame.setAttribute('aria-busy',String(state==='loading'));
    this.image.hidden=state!=='loaded';
    this.panel.querySelector('.book-empty').hidden=state!=='empty';
    this.panel.querySelector('.book-media-status').hidden=state==='loaded'||state==='empty';
    this.panel.querySelector('#book-media-message').textContent=state==='error'?'这张画面暂时没有展开':'正在展开画面';
    const retry=this.panel.querySelector('#book-media-retry');
    if(state!=='error'&&document.activeElement===retry)this.tabs[this.page].focus({preventScroll:true});
    retry.hidden=state!=='error';
  }

  async mediaLoaded(revision) {
    const source=this.mediaSource;
    try{await this.image.decode();}catch{if(revision===this.mediaRevision&&source===this.mediaSource)this.showMedia('error');return;}
    if(revision===this.mediaRevision&&source&&source===this.mediaSource&&this.image.naturalWidth>0)this.showMedia('loaded');
  }

  setMedia(source,alt) {
    this.image.alt=alt;
    if(!source){this.mediaRevision++;this.mediaSource=null;this.image.onload=this.image.onerror=null;this.image.removeAttribute('src');this.showMedia('empty');return;}
    if(this.mediaSource===source){
      const revision=this.watchMedia();
      if(this.image.complete&&this.image.naturalWidth>0)this.mediaLoaded(revision);
      else if(this.image.complete)this.showMedia('error');
      return;
    }
    this.mediaSource=source;this.showMedia('loading');this.watchMedia();this.image.src=source;
  }

  async turn(requested) {
    if (this.panel.hidden || this.status === 'closing') return;
    const next = Math.max(0, Math.min(2, requested));
    if (next === this.page) return;
    const forward = next > this.page;
    const source = this.panel.querySelector(forward ? '.book-right' : '.book-left');
    const visible = {top:source.scrollTop,left:source.scrollLeft,page:this.page};
    const face = source.cloneNode(true);
    face.removeAttribute('id');
    face.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    face.querySelectorAll('a,button').forEach(el => el.setAttribute('tabindex', '-1'));
    this.cancelTurn(); const revision = this.turnRevision;
    this.status = 'turning'; this.page = next; this.render();
    this.sheet.dataset.direction = forward ? 'next' : 'previous';
    this.sheet.dataset.page = String(visible.page);
    this.sheet.replaceChildren(face); this.sheet.hidden = false;
    // Keep the outgoing viewport intact while the new spread starts at top.
    face.scrollTop = visible.top; face.scrollLeft = visible.left;
    // Paper remains opaque; the hidden reverse face reveals the new spread.
    await this.animate(this.sheet, [{transform:'rotateY(0deg)', opacity:1},{transform:`rotateY(${forward ? -172 : 172}deg)`, opacity:1}]);
    if (revision === this.turnRevision) { this.sheet.hidden = true; this.sheet.replaceChildren(); this.status = 'open'; }
  }

  render() {
    const p = this.project, panel = this.panel;
    const previousFocus = document.activeElement;
    const focusWasInside = panel.contains(previousFocus);
    const set = (id, value) => { panel.querySelector('#'+id).textContent = value || ''; };
    set('project-category', p.category || '作品 / 项目');
    set('project-title', p.name || p.title);
    set('project-summary', p.summary || p.description);
    set('book-section', ['作品概览','实现与细节','继续探索'][this.page]);
    set('book-page-label', `${String(this.page * 2 + 1).padStart(2,'0')} — ${String(this.page * 2 + 2).padStart(2,'0')} / 06`);
    panel.dataset.page = String(this.page);
    this.tabs.forEach((button, index) => { button.setAttribute('aria-pressed',String(index === this.page)); });
    const previous = panel.querySelector('#book-prev'), next = panel.querySelector('#book-next');
    // A focused native button drops focus to BODY when disabled. Hand focus to
    // this chapter first so keyboard reversal and the dialog's Tab loop survive.
    if ((previousFocus === previous && this.page === 0) || (previousFocus === next && this.page === 2)) {
      this.tabs[this.page].focus({preventScroll:true});
    }
    previous.disabled = this.page === 0;
    next.disabled = this.page === 2;
    const media = p.media?.[this.page === 1 && p.media.length > 1 ? 1 : 0];
    const src = media?.src || p.image || p.screenshot;
    this.setMedia(src,media?.alt || `${p.name || p.title} 的真实项目截图`);
    set('book-caption', src ? media?.caption || p.mediaNote || '真实组件截图，使用受控样例数据。' : '作品、研究与开源记录');
    const details = p.details || p.highlights || [];
    const selected = this.page === 0 ? details.slice(0, 2) : this.page === 1 ? details : [];
    panel.querySelector('#project-details').replaceChildren(...selected.map(detail => {
      const paragraph = document.createElement('p');
      paragraph.textContent = typeof detail === 'string' ? detail : detail.text || detail.title || '';
      return paragraph;
    }));
    const links = (p.links || []).filter(link => typeof link.url === 'string' && /^https?:\/\//.test(link.url));
    panel.querySelector('#project-links').replaceChildren(...links.map(link => {
      const a = document.createElement('a'); a.href = link.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.textContent = (link.label || link.title || '打开项目') + ' ↗'; return a;
    }));
    set('book-links-note', links.length ? '从这些真实项目入口，继续阅读代码、文档与贡献。' : '联系方式与简历尚未配置。');
    this.spread.querySelectorAll('.book-page').forEach(el => { el.scrollTop = 0; });
    this.spread.scrollTop = 0;
    // Arrow navigation may also replace the link that currently owns focus.
    if (focusWasInside && !panel.contains(document.activeElement)) this.tabs[this.page].focus({preventScroll:true});
  }
  get telemetry() { return {status:this.status, page:this.page, project:this.project?.id, animations:this.animations.size}; }
}
