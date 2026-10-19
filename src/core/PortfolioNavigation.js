// Project navigation is a data-only layer. It deliberately does not own the
// 3D camera, SPACE / ROOM state, or the notebook's own page navigation.
export function getProjectNeighbours(registry, id) {
  const ids = Object.keys(registry);
  const index = ids.indexOf(id);
  if (index < 0 || ids.length === 0) return null;
  return {
    current: id,
    index,
    total: ids.length,
    previous: ids[(index - 1 + ids.length) % ids.length],
    next: ids[(index + 1) % ids.length],
  };
}

export function projectCover(project) {
  const candidates = [project.media?.[0]?.src, project.image, project.screenshot];
  // Do not expose arbitrary external image URLs supplied by content notes.
  return candidates.find(value => typeof value === 'string' &&
    /^\/assets\/projects\/[a-z0-9_.-]+\.(png|jpe?g|webp)$/i.test(value)) || null;
}

export function buildPortfolioCatalog(container, registry, onSelect) {
  const entries = Object.entries(registry);
  const fragment = document.createDocumentFragment();
  entries.forEach(([id, project], index) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'catalog-item';
    card.dataset.projectId = id;
    card.setAttribute('aria-label', `查看作品：${project.name || project.title || id}`);

    const sequence = document.createElement('span');
    sequence.className = 'catalog-item-index';
    sequence.textContent = String(index + 1).padStart(2, '0');

    const preview = document.createElement('span');
    preview.className = 'catalog-item-preview';
    const cover = projectCover(project);
    if (cover) {
      const img = document.createElement('img');
      img.src = cover;
      img.alt = ''; // Descriptive title is adjacent; this is decorative.
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', () => {
        img.remove();
        preview.classList.add('catalog-item-preview--empty');
      }, {once:true});
      preview.append(img);
    } else {
      preview.classList.add('catalog-item-preview--empty');
    }
    const monogram = document.createElement('span');
    monogram.className = 'catalog-item-monogram';
    monogram.setAttribute('aria-hidden', 'true');
    monogram.textContent = '✳';
    preview.append(monogram);

    const copy = document.createElement('span');
    copy.className = 'catalog-item-copy';
    const kind = document.createElement('small');
    kind.textContent = project.category || '作品档案';
    const name = document.createElement('strong');
    name.textContent = project.name || project.title || id;
    const summary = document.createElement('span');
    summary.className = 'catalog-item-summary';
    summary.textContent = project.summary || project.description || '探索项目详情';
    copy.append(kind, name, summary);
    const arrow = document.createElement('span');
    arrow.className = 'catalog-item-arrow';
    arrow.textContent = '↗';
    arrow.setAttribute('aria-hidden', 'true');

    card.append(sequence, preview, copy, arrow);
    card.addEventListener('click', () => onSelect(id));
    fragment.append(card);
  });
  container.replaceChildren(fragment);
  return entries.length;
}
