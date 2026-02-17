// ==================== TYPES ====================

export interface UnifiedMod {
  id: string;
  source: 'modrinth' | 'curseforge';
  title: string;
  description: string;
  iconUrl: string;
  downloads: number;
  author: string;
  slug: string;
  categories: string[];
  cfId?: number;
}

export interface UnifiedFile {
  id: string;
  name: string;
  filename: string;
  url: string;
  size: number;
  gameVersions: string[];
  loaders: string[];
  downloads: number;
  datePublished: string;
  releaseType: 'release' | 'beta' | 'alpha';
}

// ==================== MODRINTH ====================

interface ModrinthHit {
  project_id: string;
  slug: string;
  title: string;
  description: string;
  categories: string[];
  downloads: number;
  icon_url: string;
  author: string;
  versions: string[];
}

interface ModrinthSearchResult {
  hits: ModrinthHit[];
  total_hits: number;
}

interface ModrinthVersionFile {
  url: string;
  filename: string;
  size: number;
  primary: boolean;
}

interface ModrinthVersion {
  id: string;
  name: string;
  version_number: string;
  game_versions: string[];
  loaders: string[];
  files: ModrinthVersionFile[];
  date_published: string;
  downloads: number;
  version_type: string;
}

const MODRINTH_API = 'https://api.modrinth.com/v2';
const MODRINTH_HEADERS = { 'User-Agent': 'MCModParser/1.0.0' };

export async function searchModrinth(
  query: string,
  gameVersion: string,
  loader: string,
  offset = 0
): Promise<{ mods: UnifiedMod[]; total: number }> {
  const facets: string[][] = [['project_type:mod']];
  if (gameVersion) facets.push([`versions:${gameVersion}`]);
  if (loader) facets.push([`categories:${loader}`]);

  const params = new URLSearchParams({
    query,
    limit: '20',
    offset: String(offset),
    facets: JSON.stringify(facets),
  });

  const res = await fetch(`${MODRINTH_API}/search?${params}`, {
    headers: MODRINTH_HEADERS,
  });
  if (!res.ok) throw new Error(`Modrinth: ${res.status} ${res.statusText}`);
  const data: ModrinthSearchResult = await res.json();

  return {
    mods: data.hits.map((h) => ({
      id: h.project_id,
      source: 'modrinth' as const,
      title: h.title,
      description: h.description,
      iconUrl: h.icon_url || '',
      downloads: h.downloads,
      author: h.author || 'Unknown',
      slug: h.slug,
      categories: h.categories,
    })),
    total: data.total_hits,
  };
}

export async function getModrinthVersions(
  projectId: string,
  gameVersion: string,
  loader: string
): Promise<UnifiedFile[]> {
  const params = new URLSearchParams();
  if (loader) params.set('loaders', JSON.stringify([loader]));
  if (gameVersion) params.set('game_versions', JSON.stringify([gameVersion]));

  const res = await fetch(
    `${MODRINTH_API}/project/${projectId}/version?${params}`,
    { headers: MODRINTH_HEADERS }
  );
  if (!res.ok) throw new Error(`Modrinth: ${res.status}`);
  const versions: ModrinthVersion[] = await res.json();

  return versions.map((v) => {
    const file = v.files.find((f) => f.primary) || v.files[0];
    return {
      id: v.id,
      name: v.name,
      filename: file?.filename || '',
      url: file?.url || '',
      size: file?.size || 0,
      gameVersions: v.game_versions,
      loaders: v.loaders,
      downloads: v.downloads,
      datePublished: v.date_published,
      releaseType: v.version_type as 'release' | 'beta' | 'alpha',
    };
  });
}

/** Get ALL versions of a Modrinth project (unfiltered) to check available game versions */
async function getModrinthAllVersions(projectId: string): Promise<UnifiedFile[]> {
  const res = await fetch(`${MODRINTH_API}/project/${projectId}/version`, {
    headers: MODRINTH_HEADERS,
  });
  if (!res.ok) return [];
  const versions: ModrinthVersion[] = await res.json();
  return versions.map((v) => {
    const file = v.files.find((f) => f.primary) || v.files[0];
    return {
      id: v.id,
      name: v.name,
      filename: file?.filename || '',
      url: file?.url || '',
      size: file?.size || 0,
      gameVersions: v.game_versions,
      loaders: v.loaders,
      downloads: v.downloads,
      datePublished: v.date_published,
      releaseType: v.version_type as 'release' | 'beta' | 'alpha',
    };
  });
}

// ==================== CURSEFORGE ====================

interface CFAuthor {
  name: string;
}

interface CFCategory {
  name: string;
}

interface CFLogo {
  url: string;
}

interface CFMod {
  id: number;
  name: string;
  summary: string;
  logo: CFLogo | null;
  downloadCount: number;
  categories: CFCategory[];
  slug: string;
  authors: CFAuthor[];
  latestFilesIndexes?: CFLatestFileIndex[];
}

interface CFLatestFileIndex {
  gameVersion: string;
  modLoader?: number;
}

interface CFSearchResult {
  data: CFMod[];
  pagination: { totalCount: number };
}

interface CFFileData {
  id: number;
  displayName: string;
  fileName: string;
  fileLength: number;
  downloadUrl: string | null;
  gameVersions: string[];
  releaseType: number;
  dateCreated: string;
  downloadCount: number;
}

const CF_API = 'https://api.curseforge.com/v1';

function loaderToCFType(loader: string): number | undefined {
  const map: Record<string, number> = {
    forge: 1,
    fabric: 4,
    quilt: 5,
    neoforge: 6,
  };
  return map[loader];
}

function cfModToUnified(m: CFMod): UnifiedMod {
  return {
    id: String(m.id),
    source: 'curseforge' as const,
    title: m.name,
    description: m.summary,
    iconUrl: m.logo?.url || '',
    downloads: m.downloadCount,
    author: m.authors?.[0]?.name || 'Unknown',
    slug: m.slug,
    categories: m.categories.map((c) => c.name),
    cfId: m.id,
  };
}

export async function searchCurseForge(
  query: string,
  gameVersion: string,
  loader: string,
  apiKey: string,
  offset = 0
): Promise<{ mods: UnifiedMod[]; total: number }> {
  const params = new URLSearchParams({
    gameId: '432',
    searchFilter: query,
    pageSize: '20',
    index: String(offset),
    classId: '6',
    sortField: '2',
    sortOrder: 'desc',
  });
  if (gameVersion) params.set('gameVersion', gameVersion);
  const lt = loaderToCFType(loader);
  if (lt !== undefined) params.set('modLoaderType', String(lt));

  const res = await fetch(`${CF_API}/mods/search?${params}`, {
    headers: { 'x-api-key': apiKey, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`CurseForge: ${res.status} ${res.statusText}`);
  const data: CFSearchResult = await res.json();

  return {
    mods: data.data.map(cfModToUnified),
    total: data.pagination.totalCount,
  };
}

/** Search CurseForge by slug specifically */
async function searchCurseForgeBySlug(
  slug: string,
  apiKey: string
): Promise<UnifiedMod | null> {
  try {
    const params = new URLSearchParams({
      gameId: '432',
      slug: slug,
      classId: '6',
    });
    const res = await fetch(`${CF_API}/mods/search?${params}`, {
      headers: { 'x-api-key': apiKey, Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data: CFSearchResult = await res.json();
    if (data.data.length > 0) {
      const exact = data.data.find(m => m.slug.toLowerCase() === slug.toLowerCase());
      return cfModToUnified(exact || data.data[0]);
    }
    return null;
  } catch {
    return null;
  }
}

export async function getCurseForgeFiles(
  modId: number,
  gameVersion: string,
  loader: string,
  apiKey: string
): Promise<UnifiedFile[]> {
  const params = new URLSearchParams({ pageSize: '50' });
  if (gameVersion) params.set('gameVersion', gameVersion);
  const lt = loaderToCFType(loader);
  if (lt !== undefined) params.set('modLoaderType', String(lt));

  const res = await fetch(`${CF_API}/mods/${modId}/files?${params}`, {
    headers: { 'x-api-key': apiKey, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`CurseForge: ${res.status}`);
  const json = await res.json();
  const files: CFFileData[] = json.data;

  const knownLoaders = ['Forge', 'Fabric', 'NeoForge', 'Quilt'];

  return files.map((f) => {
    const loaders = f.gameVersions.filter((v) => knownLoaders.includes(v));
    const gv = f.gameVersions.filter((v) => !knownLoaders.includes(v));
    const rtMap: Record<number, 'release' | 'beta' | 'alpha'> = {
      1: 'release',
      2: 'beta',
      3: 'alpha',
    };
    return {
      id: String(f.id),
      name: f.displayName,
      filename: f.fileName,
      url: f.downloadUrl || '',
      size: f.fileLength,
      gameVersions: gv,
      loaders: loaders.map((l) => l.toLowerCase()),
      downloads: f.downloadCount,
      datePublished: f.dateCreated,
      releaseType: rtMap[f.releaseType] || 'release',
    };
  });
}

/** Get ALL files from CurseForge (no filters) to check available versions */
async function getCurseForgeAllFiles(
  modId: number,
  apiKey: string
): Promise<UnifiedFile[]> {
  const params = new URLSearchParams({ pageSize: '50' });
  const res = await fetch(`${CF_API}/mods/${modId}/files?${params}`, {
    headers: { 'x-api-key': apiKey, Accept: 'application/json' },
  });
  if (!res.ok) return [];
  const json = await res.json();
  const files: CFFileData[] = json.data;
  const knownLoaders = ['Forge', 'Fabric', 'NeoForge', 'Quilt'];
  return files.map((f) => {
    const loaders = f.gameVersions.filter((v) => knownLoaders.includes(v));
    const gv = f.gameVersions.filter((v) => !knownLoaders.includes(v));
    const rtMap: Record<number, 'release' | 'beta' | 'alpha'> = {
      1: 'release',
      2: 'beta',
      3: 'alpha',
    };
    return {
      id: String(f.id),
      name: f.displayName,
      filename: f.fileName,
      url: f.downloadUrl || '',
      size: f.fileLength,
      gameVersions: gv,
      loaders: loaders.map((l) => l.toLowerCase()),
      downloads: f.downloadCount,
      datePublished: f.dateCreated,
      releaseType: rtMap[f.releaseType] || 'release',
    };
  });
}

// ==================== VERSION VALIDATION ====================

/** Check if a file supports the target game version (STRICT) */
function fileMatchesVersion(file: UnifiedFile, gameVersion: string): boolean {
  if (!gameVersion) return true;
  return file.gameVersions.some((v) => v === gameVersion);
}

/** Check if a file supports the target loader */
function fileMatchesLoader(file: UnifiedFile, loader: string): boolean {
  if (!loader) return true;
  return file.loaders.some((l) => l.toLowerCase() === loader.toLowerCase());
}

/** Pick the best file that STRICTLY matches version and loader */
function pickBestFile(
  files: UnifiedFile[],
  gameVersion: string,
  loader: string
): UnifiedFile | undefined {
  // Step 1: Filter by EXACT version match
  let filtered = gameVersion
    ? files.filter((f) => fileMatchesVersion(f, gameVersion))
    : [...files];

  // Step 2: Filter by loader
  if (loader && filtered.length > 0) {
    const loaderFiltered = filtered.filter((f) => fileMatchesLoader(f, loader));
    if (loaderFiltered.length > 0) {
      filtered = loaderFiltered;
    }
    // If no loader match, still use version-matched files
  }

  if (filtered.length === 0) return undefined;

  // Step 3: Prefer release > beta > alpha
  const release = filtered.find((f) => f.releaseType === 'release');
  if (release) return release;
  const beta = filtered.find((f) => f.releaseType === 'beta');
  if (beta) return beta;
  return filtered[0];
}

/** Extract unique game versions from a list of files */
function extractAvailableVersions(files: UnifiedFile[]): string[] {
  const versions = new Set<string>();
  files.forEach((f) => f.gameVersions.forEach((v) => versions.add(v)));
  // Sort versions naturally (newest first)
  return Array.from(versions).sort((a, b) => {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const va = pa[i] || 0;
      const vb = pb[i] || 0;
      if (va !== vb) return vb - va;
    }
    return 0;
  });
}

// ==================== SEARCH QUERY NORMALIZATION ====================

/** Generate multiple search term variations for better matching */
function generateSearchVariations(nameOrSlug: string): string[] {
  const variations = new Set<string>();
  const original = nameOrSlug.trim();
  variations.add(original);

  // Replace hyphens with spaces: "fabric-api" -> "fabric api"
  variations.add(original.replace(/-/g, ' '));

  // Replace underscores with spaces
  variations.add(original.replace(/_/g, ' '));

  // Replace spaces with hyphens: "fabric api" -> "fabric-api"
  variations.add(original.replace(/\s+/g, '-'));

  // Remove common prefixes/suffixes
  const cleaned = original
    .replace(/^(mod-|mod_|the-|the_)/i, '')
    .replace(/(-mod|_mod|-fabric|-forge|-neoforge|-quilt)$/i, '');
  if (cleaned !== original && cleaned.length > 2) {
    variations.add(cleaned);
  }

  // CamelCase split: "JustEnoughItems" -> "Just Enough Items"
  const camelSplit = original.replace(/([a-z])([A-Z])/g, '$1 $2');
  if (camelSplit !== original) {
    variations.add(camelSplit);
  }

  // Common abbreviations
  const abbreviations: Record<string, string> = {
    'jei': 'just enough items',
    'rei': 'roughly enough items',
    'emi': 'emi',
    'nei': 'not enough items',
    'wthit': 'what the hell is that',
  };
  const lower = original.toLowerCase();
  if (abbreviations[lower]) {
    variations.add(abbreviations[lower]);
  }

  return Array.from(variations).filter((v) => v.length > 0);
}

// ==================== BATCH / IMPORT ====================

export interface ImportResult {
  query: string;
  status: 'found' | 'not_found' | 'error' | 'version_mismatch';
  mod?: UnifiedMod;
  file?: UnifiedFile;
  error?: string;
  /** Available versions if version mismatch */
  availableVersions?: string[];
  /** Target version that was requested */
  targetVersion?: string;
}

/** Get a Modrinth project by slug or ID */
export async function getModrinthProject(slugOrId: string): Promise<UnifiedMod | null> {
  try {
    const res = await fetch(`${MODRINTH_API}/project/${encodeURIComponent(slugOrId)}`, {
      headers: MODRINTH_HEADERS,
    });
    if (!res.ok) return null;
    const p = await res.json();
    return {
      id: p.id,
      source: 'modrinth' as const,
      title: p.title,
      description: p.description || '',
      iconUrl: p.icon_url || '',
      downloads: p.downloads || 0,
      author: p.team || 'Unknown',
      slug: p.slug,
      categories: p.categories || [],
    };
  } catch {
    return null;
  }
}

/** Batch get Modrinth projects by IDs */
export async function getModrinthProjects(ids: string[]): Promise<UnifiedMod[]> {
  if (ids.length === 0) return [];
  const res = await fetch(`${MODRINTH_API}/projects?ids=${JSON.stringify(ids)}`, {
    headers: MODRINTH_HEADERS,
  });
  if (!res.ok) return [];
  const projects = await res.json();
  return projects.map((p: Record<string, unknown>) => ({
    id: p.id as string,
    source: 'modrinth' as const,
    title: p.title as string,
    description: (p.description as string) || '',
    iconUrl: (p.icon_url as string) || '',
    downloads: (p.downloads as number) || 0,
    author: (p.team as string) || 'Unknown',
    slug: p.slug as string,
    categories: (p.categories as string[]) || [],
  }));
}

/** Try to find a mod on Modrinth with STRICT version validation */
async function tryModrinth(
  nameOrSlug: string,
  gameVersion: string,
  loader: string,
  autoPickFile: boolean
): Promise<ImportResult | null> {
  // 1. Try direct slug/ID lookup
  let mod = await getModrinthProject(nameOrSlug);

  // 2. If not found by slug, search with filters
  if (!mod) {
    const variations = generateSearchVariations(nameOrSlug);
    for (const variation of variations) {
      try {
        const result = await searchModrinth(variation, '', '', 0);
        if (result.mods.length > 0) {
          // Try exact match first
          const exact = result.mods.find(
            (m) =>
              m.slug.toLowerCase() === nameOrSlug.toLowerCase() ||
              m.title.toLowerCase() === nameOrSlug.toLowerCase() ||
              m.slug.toLowerCase() === variation.toLowerCase()
          );
          mod = exact || result.mods[0];
          break;
        }
      } catch {
        continue;
      }
    }
  }

  if (!mod) return null;

  // 3. STRICT VERSION VALIDATION
  if (autoPickFile && gameVersion) {
    try {
      // First try with both version and loader filters
      let files = await getModrinthVersions(mod.id, gameVersion, loader);
      let file = pickBestFile(files, gameVersion, loader);

      // If no match with loader, try just version
      if (!file && loader) {
        files = await getModrinthVersions(mod.id, gameVersion, '');
        file = pickBestFile(files, gameVersion, '');
      }

      if (file) {
        return { query: nameOrSlug, status: 'found', mod, file, targetVersion: gameVersion };
      }

      // No files for this version — check what versions ARE available
      const allFiles = await getModrinthAllVersions(mod.id);
      const availableVersions = extractAvailableVersions(allFiles);

      return {
        query: nameOrSlug,
        status: 'version_mismatch',
        mod,
        availableVersions,
        targetVersion: gameVersion,
        error: `Мод найден на Modrinth, но нет файлов для MC ${gameVersion}`,
      };
    } catch {
      // If file fetch fails, return mod without file
      return { query: nameOrSlug, status: 'found', mod, targetVersion: gameVersion };
    }
  } else if (autoPickFile) {
    // No version specified, just pick latest
    try {
      const files = await getModrinthVersions(mod.id, '', loader);
      const file = pickBestFile(files, '', loader);
      return { query: nameOrSlug, status: 'found', mod, file };
    } catch {
      return { query: nameOrSlug, status: 'found', mod };
    }
  }

  return { query: nameOrSlug, status: 'found', mod, targetVersion: gameVersion };
}

/** Try to find a mod on CurseForge with STRICT version validation */
async function tryCurseForge(
  nameOrSlug: string,
  gameVersion: string,
  loader: string,
  apiKey: string,
  autoPickFile: boolean
): Promise<ImportResult | null> {
  if (!apiKey) return null;

  let mod: UnifiedMod | null = null;

  // 1. Try slug search first (most precise)
  const slugVariations = [
    nameOrSlug,
    nameOrSlug.replace(/\s+/g, '-'),
    nameOrSlug.replace(/_/g, '-'),
  ];

  for (const slugVar of slugVariations) {
    mod = await searchCurseForgeBySlug(slugVar, apiKey);
    if (mod) break;
  }

  // 2. If not found by slug, try search with different query variations
  if (!mod) {
    const variations = generateSearchVariations(nameOrSlug);
    for (const variation of variations) {
      try {
        // Search with filters first
        let result = await searchCurseForge(variation, gameVersion, loader, apiKey, 0);
        if (result.mods.length > 0) {
          const exact = result.mods.find(
            (m) =>
              m.slug.toLowerCase() === nameOrSlug.toLowerCase() ||
              m.title.toLowerCase() === nameOrSlug.toLowerCase() ||
              m.slug.toLowerCase() === variation.replace(/\s+/g, '-').toLowerCase()
          );
          mod = exact || result.mods[0];
          break;
        }

        // Try without version/loader filters
        result = await searchCurseForge(variation, '', '', apiKey, 0);
        if (result.mods.length > 0) {
          const exact = result.mods.find(
            (m) =>
              m.slug.toLowerCase() === nameOrSlug.toLowerCase() ||
              m.title.toLowerCase() === nameOrSlug.toLowerCase() ||
              m.slug.toLowerCase() === variation.replace(/\s+/g, '-').toLowerCase()
          );
          mod = exact || result.mods[0];
          break;
        }
      } catch {
        continue;
      }
    }
  }

  if (!mod || !mod.cfId) return null;

  // 3. STRICT VERSION VALIDATION
  if (autoPickFile && gameVersion) {
    try {
      // Get files with version + loader
      let files = await getCurseForgeFiles(mod.cfId, gameVersion, loader, apiKey);
      let file = pickBestFile(files, gameVersion, loader);

      // Try just version without loader
      if (!file && loader) {
        files = await getCurseForgeFiles(mod.cfId, gameVersion, '', apiKey);
        file = pickBestFile(files, gameVersion, '');
      }

      if (file) {
        return { query: nameOrSlug, status: 'found', mod, file, targetVersion: gameVersion };
      }

      // No files for this version — get all files to report available versions
      const allFiles = await getCurseForgeAllFiles(mod.cfId, apiKey);
      const availableVersions = extractAvailableVersions(allFiles);

      return {
        query: nameOrSlug,
        status: 'version_mismatch',
        mod,
        availableVersions,
        targetVersion: gameVersion,
        error: `Мод найден на CurseForge, но нет файлов для MC ${gameVersion}`,
      };
    } catch {
      return { query: nameOrSlug, status: 'found', mod, targetVersion: gameVersion };
    }
  } else if (autoPickFile) {
    try {
      const files = await getCurseForgeFiles(mod.cfId, '', loader, apiKey);
      const file = pickBestFile(files, '', loader);
      return { query: nameOrSlug, status: 'found', mod, file };
    } catch {
      return { query: nameOrSlug, status: 'found', mod };
    }
  }

  return { query: nameOrSlug, status: 'found', mod, targetVersion: gameVersion };
}

/** Universal multi-source mod resolver with STRICT version validation */
export async function resolveModMultiSource(
  nameOrSlug: string,
  gameVersion: string,
  loader: string,
  autoPickFile: boolean,
  cfApiKey: string
): Promise<ImportResult> {
  try {
    // ===== STEP 1: Try Modrinth =====
    const modrinthResult = await tryModrinth(nameOrSlug, gameVersion, loader, autoPickFile);

    // If found with correct version on Modrinth, return immediately
    if (modrinthResult && modrinthResult.status === 'found' && modrinthResult.file) {
      return modrinthResult;
    }

    // ===== STEP 2: Try CurseForge =====
    if (cfApiKey) {
      const cfResult = await tryCurseForge(nameOrSlug, gameVersion, loader, cfApiKey, autoPickFile);

      // If found with correct version on CF, return it
      if (cfResult && cfResult.status === 'found' && cfResult.file) {
        return cfResult;
      }

      // ===== STEP 3: Handle version mismatches =====
      // If both found but version mismatch, combine info
      if (modrinthResult?.status === 'version_mismatch' && cfResult?.status === 'version_mismatch') {
        // Merge available versions from both sources
        const allVersions = new Set([
          ...(modrinthResult.availableVersions || []),
          ...(cfResult.availableVersions || []),
        ]);
        const sortedVersions = Array.from(allVersions).sort((a, b) => {
          const pa = a.split('.').map(Number);
          const pb = b.split('.').map(Number);
          for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
            if ((pa[i] || 0) !== (pb[i] || 0)) return (pb[i] || 0) - (pa[i] || 0);
          }
          return 0;
        });

        return {
          query: nameOrSlug,
          status: 'version_mismatch',
          mod: modrinthResult.mod,
          availableVersions: sortedVersions,
          targetVersion: gameVersion,
          error: `Мод найден, но нет файлов для MC ${gameVersion}. Доступные версии: ${sortedVersions.slice(0, 8).join(', ')}${sortedVersions.length > 8 ? '...' : ''}`,
        };
      }

      // One found but version mismatch, other not found
      if (modrinthResult?.status === 'version_mismatch') {
        return modrinthResult;
      }
      if (cfResult?.status === 'version_mismatch') {
        return cfResult;
      }

      // Found on Modrinth without file (e.g. file fetch error)
      if (modrinthResult?.status === 'found') {
        return modrinthResult;
      }
      // Found on CF without file
      if (cfResult?.status === 'found') {
        return cfResult;
      }
    } else {
      // No CF key — just return Modrinth result
      if (modrinthResult) {
        return modrinthResult;
      }
    }

    // ===== STEP 4: Nothing found =====
    return {
      query: nameOrSlug,
      status: 'not_found',
      error: cfApiKey
        ? 'Мод не найден ни на Modrinth, ни на CurseForge'
        : 'Мод не найден на Modrinth. Добавьте API ключ CurseForge для расширенного поиска',
    };
  } catch (err) {
    return {
      query: nameOrSlug,
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/** Parse modlist file content */
export interface ParsedModList {
  format: string;
  mods: string[];
  gameVersion?: string;
  loader?: string;
}

export function parseModListFile(content: string, filename: string): ParsedModList {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  // Try JSON formats
  if (ext === 'json') {
    try {
      const json = JSON.parse(content);

      // Our own export format
      if (json.mods && Array.isArray(json.mods)) {
        if (json.mods[0]?.title) {
          return {
            format: 'MC Mod Parser Export',
            mods: json.mods.map((m: { slug?: string; title?: string }) => m.slug || m.title || ''),
            gameVersion: json.gameVersion,
            loader: json.loader,
          };
        }
        // Simple array of strings
        if (typeof json.mods[0] === 'string') {
          return {
            format: 'JSON mod list',
            mods: json.mods,
            gameVersion: json.gameVersion,
            loader: json.loader,
          };
        }
      }

      // CurseForge manifest.json (from modpack export)
      if (json.minecraft && json.files && Array.isArray(json.files)) {
        const cfIds = json.files.map((f: { projectID?: number }) => String(f.projectID || ''));
        const mcVer = json.minecraft?.version;
        const loaderInfo = json.minecraft?.modLoaders?.[0]?.id || '';
        let loaderName = '';
        if (loaderInfo.includes('forge')) loaderName = 'forge';
        if (loaderInfo.includes('fabric')) loaderName = 'fabric';
        if (loaderInfo.includes('neoforge')) loaderName = 'neoforge';
        if (loaderInfo.includes('quilt')) loaderName = 'quilt';
        return {
          format: 'CurseForge Manifest',
          mods: cfIds.filter(Boolean),
          gameVersion: mcVer,
          loader: loaderName,
        };
      }

      // Modrinth mrpack index (modrinth.index.json)
      if (json.dependencies && json.files && Array.isArray(json.files)) {
        const slugs = json.files.map((f: { path?: string }) => {
          const p = f.path || '';
          return p.replace(/^mods\//, '').replace(/\.jar$/, '').replace(/-[\d.]+.*$/, '');
        });
        const deps = json.dependencies || {};
        const mcVer = deps['minecraft'] || '';
        let loaderName = '';
        if (deps['fabric-loader']) loaderName = 'fabric';
        if (deps['forge']) loaderName = 'forge';
        if (deps['neoforge']) loaderName = 'neoforge';
        if (deps['quilt-loader']) loaderName = 'quilt';
        return {
          format: 'Modrinth Index',
          mods: slugs.filter(Boolean),
          gameVersion: mcVer,
          loader: loaderName,
        };
      }

      // Ferium / packwiz style
      if (Array.isArray(json)) {
        return {
          format: 'JSON Array',
          mods: json.map((item: string | { slug?: string; name?: string }) =>
            typeof item === 'string' ? item : item.slug || item.name || ''
          ).filter(Boolean),
        };
      }

      throw new Error('Неизвестный формат JSON');
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new Error('Ошибка парсинга JSON');
      }
      throw err;
    }
  }

  // CSV format
  if (ext === 'csv') {
    const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
    // Skip header if present
    const startIdx = lines[0]?.toLowerCase().includes('mod') || lines[0]?.includes(',') ? 1 : 0;
    const mods = lines.slice(startIdx).map((line) => {
      const parts = line.split(',');
      return parts[0].trim().replace(/^["']|["']$/g, '');
    }).filter(Boolean);
    return { format: 'CSV', mods };
  }

  // Plain text (default) — one mod per line
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('//'));

  // Handle "- mod_name" list format
  const mods = lines.map((l) => l.replace(/^[-*•]\s*/, '').trim()).filter(Boolean);

  return { format: 'Text list', mods };
}

// ==================== HELPERS ====================

export const GAME_VERSIONS = [
  '1.21.11', '1.21.5', '1.21.4', '1.21.3', '1.21.2', '1.21.1', '1.21',
  '1.20.6', '1.20.4', '1.20.3', '1.20.2', '1.20.1', '1.20',
  '1.19.4', '1.19.3', '1.19.2', '1.19.1', '1.19',
  '1.18.2', '1.18.1', '1.18',
  '1.17.1', '1.17',
  '1.16.5', '1.16.4', '1.16.3', '1.16.2', '1.16.1',
  '1.15.2', '1.14.4', '1.12.2', '1.12',
  '1.10.2', '1.9.4', '1.8.9', '1.7.10',
];

export const LOADERS = [
  { value: 'fabric', label: 'Fabric' },
  { value: 'forge', label: 'Forge' },
  { value: 'neoforge', label: 'NeoForge' },
  { value: 'quilt', label: 'Quilt' },
];

export function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}
