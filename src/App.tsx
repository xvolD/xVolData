import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Search, Download, ExternalLink, X, ChevronDown,
  Package, Layers, Trash2, FileDown, Copy, Check,
  AlertCircle, Loader2, Info, Star, Key, RefreshCw,
  Upload, FileText, CheckCircle2, XCircle, Clock,
  FolderOpen, Languages,
} from 'lucide-react';
import {
  type UnifiedMod, type UnifiedFile, type ImportResult,
  searchModrinth, getModrinthVersions,
  searchCurseForge, getCurseForgeFiles,
  resolveModMultiSource, parseModListFile,
  GAME_VERSIONS, LOADERS,
  formatDownloads, formatSize, formatDate,
} from './api';
import { cn } from './utils/cn';
import { type Language, LANGUAGES, getTranslation } from './i18n';

type Source = 'modrinth' | 'curseforge';

interface SelectedMod extends UnifiedMod {
  selectedFile?: UnifiedFile;
}

// ==================== COMPONENTS ====================

function SourceBadge({ source }: { source: Source }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
        source === 'modrinth'
          ? 'bg-emerald-500/20 text-emerald-400'
          : 'bg-orange-500/20 text-orange-400'
      )}
    >
      {source === 'modrinth' ? '◆' : '🔥'} {source === 'modrinth' ? 'Modrinth' : 'CurseForge'}
    </span>
  );
}

function ReleaseTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    release: 'bg-emerald-500/20 text-emerald-400',
    beta: 'bg-yellow-500/20 text-yellow-400',
    alpha: 'bg-red-500/20 text-red-400',
  };
  return (
    <span className={cn('rounded px-1.5 py-0.5 text-xs font-medium', colors[type] || colors.release)}>
      {type}
    </span>
  );
}

function SelectDropdown({
  value,
  onChange,
  options,
  placeholder,
  icon: Icon,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  icon: React.ElementType;
}) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full appearance-none rounded-lg border border-slate-700 bg-slate-800 pl-9 pr-8 text-sm text-slate-200 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function ModCard({
  mod,
  isSelected,
  onToggle,
  onViewVersions,
}: {
  mod: UnifiedMod;
  isSelected: boolean;
  onToggle: () => void;
  onViewVersions: () => void;
}) {
  return (
    <div className="group relative flex gap-3 rounded-xl border border-slate-700/60 bg-slate-800/80 p-4 transition-all hover:border-slate-600 hover:bg-slate-800">
      <div className="flex-shrink-0">
        {mod.iconUrl ? (
          <img
            src={mod.iconUrl}
            alt={mod.title}
            className="h-14 w-14 rounded-lg bg-slate-700 object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '';
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-700">
            <Package className="h-6 w-6 text-slate-500" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-white">{mod.title}</h3>
            <p className="text-xs text-slate-400">by {mod.author}</p>
          </div>
          <SourceBadge source={mod.source} />
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">
          {mod.description}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Download className="h-3 w-3" /> {formatDownloads(mod.downloads)}
          </span>
          {mod.categories.slice(0, 3).map((c) => (
            <span key={c} className="rounded bg-slate-700/60 px-1.5 py-0.5 text-xs text-slate-400">
              {c}
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={onViewVersions}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500"
          >
            <Layers className="h-3 w-3" /> Версии
          </button>
          <button
            onClick={onToggle}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition',
              isSelected
                ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            )}
          >
            {isSelected ? (
              <>
                <Trash2 className="h-3 w-3" /> Убрать
              </>
            ) : (
              <>
                <Star className="h-3 w-3" /> В список
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function VersionModal({
  mod,
  files,
  loading,
  error,
  onClose,
  onSelectFile,
  gameVersion,
  loader,
}: {
  mod: UnifiedMod;
  files: UnifiedFile[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onSelectFile: (mod: UnifiedMod, file: UnifiedFile) => void;
  gameVersion: string;
  loader: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-700 p-5">
          {mod.iconUrl ? (
            <img src={mod.iconUrl} alt="" className="h-10 w-10 rounded-lg" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700">
              <Package className="h-5 w-5 text-slate-500" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-white">{mod.title}</h2>
            <div className="flex items-center gap-2">
              <SourceBadge source={mod.source} />
              {gameVersion && <span className="text-xs text-slate-400">MC {gameVersion}</span>}
              {loader && <span className="text-xs text-slate-400">{loader}</span>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              <p className="mt-3 text-sm text-slate-400">Загрузка версий...</p>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-4 text-sm text-red-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
          {!loading && !error && files.length === 0 && (
            <div className="py-12 text-center">
              <Info className="mx-auto h-8 w-8 text-slate-600" />
              <p className="mt-3 text-sm text-slate-400">
                Файлы не найдены для выбранной версии и загрузчика
              </p>
            </div>
          )}
          {!loading && files.length > 0 && (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex flex-col gap-2 rounded-lg border border-slate-700/60 bg-slate-800/60 p-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-white">{file.name}</span>
                      <ReleaseTypeBadge type={file.releaseType} />
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {file.loaders.map((l) => (
                        <span key={l} className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-xs text-indigo-300">
                          {l}
                        </span>
                      ))}
                      {file.gameVersions.slice(0, 5).map((v) => (
                        <span key={v} className="rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-400">
                          {v}
                        </span>
                      ))}
                      {file.gameVersions.length > 5 && (
                        <span className="text-xs text-slate-500">+{file.gameVersions.length - 5}</span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      <span>{formatSize(file.size)}</span>
                      <span>{formatDate(file.datePublished)}</span>
                      <span>{formatDownloads(file.downloads)} загр.</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onSelectFile(mod, file)}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500"
                    >
                      <Star className="h-3 w-3" /> Выбрать
                    </button>
                    {file.url && (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-600"
                      >
                        <Download className="h-3 w-3" /> Скачать
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModListPanel({
  mods,
  onRemove,
  onExport,
  onClear,
}: {
  mods: SelectedMod[];
  onRemove: (id: string) => void;
  onExport: () => void;
  onClear: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyLinks = () => {
    const links = mods
      .filter((m) => m.selectedFile?.url)
      .map((m) => m.selectedFile!.url)
      .join('\n');
    if (links) {
      navigator.clipboard.writeText(links).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  if (mods.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/40 p-6 text-center">
        <Package className="mx-auto h-8 w-8 text-slate-600" />
        <p className="mt-2 text-sm text-slate-500">Добавьте моды в список</p>
        <p className="mt-1 text-xs text-slate-600">
          Нажмите «В список» на карточке мода или «Выбрать» в списке версий
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/80">
      <div className="flex items-center justify-between border-b border-slate-700 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <FileDown className="h-4 w-4 text-emerald-400" />
          Список модов ({mods.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleCopyLinks}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-700 px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-slate-600"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Готово!' : 'Ссылки'}
          </button>
          <button
            onClick={onExport}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs text-white transition hover:bg-emerald-500"
          >
            <Download className="h-3 w-3" /> Экспорт
          </button>
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-lg bg-red-600/20 px-2.5 py-1.5 text-xs text-red-400 transition hover:bg-red-600/30"
          >
            <Trash2 className="h-3 w-3" /> Очистить
          </button>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto p-2">
        {mods.map((mod) => (
          <div
            key={`${mod.source}-${mod.id}`}
            className="flex items-center gap-2 rounded-lg p-2 transition hover:bg-slate-700/50"
          >
            {mod.iconUrl ? (
              <img src={mod.iconUrl} alt="" className="h-8 w-8 rounded bg-slate-700 object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-700">
                <Package className="h-4 w-4 text-slate-500" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{mod.title}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <SourceBadge source={mod.source} />
                {mod.selectedFile && (
                  <>
                    <span className="truncate text-xs text-slate-500">{mod.selectedFile.name}</span>
                    {mod.selectedFile.gameVersions.length > 0 && (
                      <span className="rounded bg-emerald-500/10 px-1 py-0.5 text-xs text-emerald-400">
                        {mod.selectedFile.gameVersions[0]}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              {mod.selectedFile?.url && (
                <a
                  href={mod.selectedFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-white"
                  title="Скачать"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
              )}
              <a
                href={
                  mod.source === 'modrinth'
                    ? `https://modrinth.com/mod/${mod.slug}`
                    : `https://www.curseforge.com/minecraft/mc-mods/${mod.slug}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="rounded p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-white"
                title="Открыть на сайте"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <button
                onClick={() => onRemove(`${mod.source}-${mod.id}`)}
                className="rounded p-1.5 text-slate-400 transition hover:bg-red-600/20 hover:text-red-400"
                title="Удалить"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== IMPORT MODAL ====================

function ImportModal({
  onClose,
  onImportComplete,
  gameVersion,
  loader,
  cfApiKey,
}: {
  onClose: () => void;
  onImportComplete: (mods: SelectedMod[]) => void;
  gameVersion: string;
  loader: string;
  cfApiKey: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [parsedMods, setParsedMods] = useState<string[]>([]);
  const [fileFormat, setFileFormat] = useState('');
  const [fileName, setFileName] = useState('');
  const [detectedVersion, setDetectedVersion] = useState('');
  const [detectedLoader, setDetectedLoader] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [useManual, setUseManual] = useState(false);
  const [autoPickFiles, setAutoPickFiles] = useState(true);

  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [importDone, setImportDone] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef(false);

  const handleFileRead = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = parseModListFile(content, file.name);
        setParsedMods(parsed.mods);
        setFileFormat(parsed.format);
        setFileName(file.name);
        if (parsed.gameVersion) setDetectedVersion(parsed.gameVersion);
        if (parsed.loader) setDetectedLoader(parsed.loader);
        setUseManual(false);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Ошибка чтения файла');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileRead(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileRead(file);
  };

  const handleManualSubmit = () => {
    const lines = manualInput
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && !l.startsWith('//'))
      .map((l) => l.replace(/^[-*•]\s*/, '').trim())
      .filter(Boolean);
    setParsedMods(lines);
    setFileFormat('Ручной ввод');
    setFileName('');
    setUseManual(true);
  };

  const removeParsedMod = (index: number) => {
    setParsedMods((prev) => prev.filter((_, i) => i !== index));
  };

  const startImport = async () => {
    if (parsedMods.length === 0) return;

    setImporting(true);
    setImportDone(false);
    setImportProgress(0);
    setImportTotal(parsedMods.length);
    setImportResults([]);
    abortRef.current = false;

    const effectiveVersion = detectedVersion || gameVersion;
    const effectiveLoader = detectedLoader || loader;
    const results: ImportResult[] = [];

    for (let i = 0; i < parsedMods.length; i++) {
      if (abortRef.current) break;

      const modName = parsedMods[i];
      setImportProgress(i + 1);

      try {
        const result = await resolveModMultiSource(
          modName,
          effectiveVersion,
          effectiveLoader,
          autoPickFiles,
          cfApiKey
        );
        results.push(result);
        setImportResults([...results]);
      } catch (err) {
        results.push({
          query: modName,
          status: 'error',
          error: err instanceof Error ? err.message : 'Ошибка',
        });
        setImportResults([...results]);
      }

      // Small delay to avoid rate limiting
      if (i < parsedMods.length - 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    setImporting(false);
    setImportDone(true);
  };

  const handleAddAllFound = () => {
    const foundMods: SelectedMod[] = importResults
      .filter((r) => r.status === 'found' && r.mod)
      .map((r) => ({
        ...r.mod!,
        selectedFile: r.file,
      }));
    onImportComplete(foundMods);
  };

  const cancelImport = () => {
    abortRef.current = true;
  };

  const foundCount = importResults.filter((r) => r.status === 'found').length;
  const versionMismatchCount = importResults.filter((r) => r.status === 'version_mismatch').length;
  const notFoundCount = importResults.filter((r) => r.status === 'not_found').length;
  const errorCount = importResults.filter((r) => r.status === 'error').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-700 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-700">
            <Upload className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">Импорт модлиста</h2>
            <p className="text-xs text-slate-400">
              Загрузите файл или введите список модов вручную
              {cfApiKey ? (
                <span className="ml-1.5 inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-400">
                  ◆ Modrinth + 🔥 CurseForge
                </span>
              ) : (
                <span className="ml-1.5 inline-flex items-center gap-1 rounded bg-slate-700 px-1.5 py-0.5 text-slate-400">
                  ◆ Modrinth only
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[75vh] overflow-y-auto p-5">
          {/* Step 1: File upload or manual input */}
          {!importing && !importDone && (
            <>
              {/* Tabs */}
              <div className="mb-4 flex rounded-lg border border-slate-700 bg-slate-800 p-1">
                <button
                  onClick={() => setUseManual(false)}
                  className={cn(
                    'flex-1 rounded-md px-4 py-2 text-sm font-medium transition',
                    !useManual ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  )}
                >
                  <FolderOpen className="mr-1.5 inline h-4 w-4" />
                  Загрузить файл
                </button>
                <button
                  onClick={() => setUseManual(true)}
                  className={cn(
                    'flex-1 rounded-md px-4 py-2 text-sm font-medium transition',
                    useManual ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  )}
                >
                  <FileText className="mr-1.5 inline h-4 w-4" />
                  Ввести вручную
                </button>
              </div>

              {/* File upload zone */}
              {!useManual && (
                <div
                  className={cn(
                    'relative mb-4 rounded-xl border-2 border-dashed p-8 text-center transition-all',
                    dragOver
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
                  )}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.json,.csv,.toml,.cfg,.list"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <Upload className={cn('mx-auto h-10 w-10', dragOver ? 'text-violet-400' : 'text-slate-600')} />
                  <p className="mt-3 text-sm text-slate-300">
                    Перетащите файл сюда или{' '}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="font-medium text-violet-400 underline underline-offset-2 hover:text-violet-300"
                    >
                      выберите файл
                    </button>
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Поддерживаемые форматы: .txt, .json, .csv
                  </p>
                  <div className="mx-auto mt-3 max-w-md">
                    <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-600">
                      <span className="rounded bg-slate-800 px-2 py-1">Текст (по строкам)</span>
                      <span className="rounded bg-slate-800 px-2 py-1">JSON экспорт</span>
                      <span className="rounded bg-slate-800 px-2 py-1">CurseForge manifest</span>
                      <span className="rounded bg-slate-800 px-2 py-1">Modrinth index</span>
                      <span className="rounded bg-slate-800 px-2 py-1">CSV</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Manual input */}
              {useManual && (
                <div className="mb-4">
                  <textarea
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder={`Введите названия или slug модов, по одному на строку:\n\nsodium\nlithium\niris\nfabric-api\ncreate\n...`}
                    className="h-48 w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-slate-200 placeholder-slate-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50"
                  />
                  <button
                    onClick={handleManualSubmit}
                    disabled={!manualInput.trim()}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-40"
                  >
                    <FileText className="h-4 w-4" />
                    Распарсить
                  </button>
                </div>
              )}

              {/* Parsed file info */}
              {fileName && (
                <div className="mb-4 flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/60 p-3">
                  <FileText className="h-5 w-5 flex-shrink-0 text-violet-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{fileName}</p>
                    <p className="text-xs text-slate-400">Формат: {fileFormat}</p>
                  </div>
                  {detectedVersion && (
                    <span className="rounded bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-400">
                      MC {detectedVersion}
                    </span>
                  )}
                  {detectedLoader && (
                    <span className="rounded bg-indigo-500/20 px-2 py-1 text-xs font-medium text-indigo-300">
                      {detectedLoader}
                    </span>
                  )}
                </div>
              )}

              {/* Parsed mods list */}
              {parsedMods.length > 0 && (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Package className="h-4 w-4 text-violet-400" />
                      Найдено модов в списке: {parsedMods.length}
                    </h3>
                  </div>

                  <div className="mb-4 max-h-48 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800/60">
                    {parsedMods.map((mod, i) => (
                      <div
                        key={`${mod}-${i}`}
                        className="flex items-center justify-between border-b border-slate-700/50 px-3 py-2 last:border-b-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-700 text-xs text-slate-400">
                            {i + 1}
                          </span>
                          <span className="text-sm text-slate-300">{mod}</span>
                        </div>
                        <button
                          onClick={() => removeParsedMod(i)}
                          className="rounded p-1 text-slate-500 transition hover:bg-red-600/20 hover:text-red-400"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Options */}
                  <div className="mb-4 space-y-3 rounded-lg border border-slate-700 bg-slate-800/40 p-4">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={autoPickFiles}
                        onChange={(e) => setAutoPickFiles(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-violet-500 focus:ring-violet-500/50"
                      />
                      <div>
                        <span className="text-sm text-slate-300">Автоматически подбирать файлы</span>
                        <p className="text-xs text-slate-500">
                          Выберет последний release-файл для указанной версии и загрузчика
                        </p>
                      </div>
                    </label>

                    {(detectedVersion || detectedLoader) && (
                      <div className="rounded-lg bg-slate-900/60 p-3">
                        <p className="text-xs text-slate-400">
                          <Info className="mr-1 inline h-3 w-3" />
                          Будут использованы параметры из файла:
                          {detectedVersion && (
                            <span className="ml-1 font-medium text-emerald-400">MC {detectedVersion}</span>
                          )}
                          {detectedLoader && (
                            <span className="ml-1 font-medium text-indigo-300">{detectedLoader}</span>
                          )}
                          {!detectedVersion && gameVersion && (
                            <span className="ml-1 font-medium text-emerald-400">MC {gameVersion} (из фильтра)</span>
                          )}
                          {!detectedLoader && loader && (
                            <span className="ml-1 font-medium text-indigo-300">{loader} (из фильтра)</span>
                          )}
                        </p>
                      </div>
                    )}

                    {/* CurseForge fallback notice */}
                    {!cfApiKey && (
                      <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
                        <p className="text-xs text-orange-400">
                          <AlertCircle className="mr-1 inline h-3 w-3" />
                          <span className="font-medium">Совет:</span> Добавьте API ключ CurseForge для расширенного поиска.
                          Если мод не найден на Modrinth, он будет автоматически искаться на CurseForge.
                          <br />
                          <a
                            href="https://console.curseforge.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block font-medium text-orange-300 underline underline-offset-2 hover:text-orange-200"
                          >
                            Получить ключ → console.curseforge.com
                          </a>
                        </p>
                      </div>
                    )}

                    {cfApiKey && (
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                        <p className="text-xs text-emerald-400">
                          <CheckCircle2 className="mr-1 inline h-3 w-3" />
                          <span className="font-medium">Мультиисточник активен:</span> Поиск на Modrinth → CurseForge.
                          Если мод не найден на Modrinth, он будет автоматически найден на CurseForge.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Start import button */}
                  <button
                    onClick={startImport}
                    className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-violet-500 hover:to-emerald-500"
                  >
                    <Download className="mr-2 inline h-4 w-4" />
                    Начать импорт ({parsedMods.length} модов)
                  </button>
                </>
              )}

              {/* Example formats info */}
              {parsedMods.length === 0 && (
                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-800/30 p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-400">
                    <Info className="h-3.5 w-3.5" /> Примеры поддерживаемых форматов
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs font-medium text-slate-300">📄 Текстовый файл (.txt)</p>
                      <pre className="rounded bg-slate-900 p-2 text-xs text-slate-500">
{`sodium
lithium
iris
fabric-api
create`}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium text-slate-300">📋 JSON экспорт (.json)</p>
                      <pre className="rounded bg-slate-900 p-2 text-xs text-slate-500">
{`{
  "gameVersion": "1.20.1",
  "loader": "fabric",
  "mods": ["sodium", "lithium"]
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 2: Import progress */}
          {(importing || importDone) && (
            <>
              {/* Progress bar */}
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-slate-300">
                    {importing ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                        Поиск модов... {importProgress} / {importTotal}
                        {cfApiKey && (
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-500">
                            Modrinth → CurseForge
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        Импорт завершён
                      </span>
                    )}
                  </span>
                  {importing && (
                    <button
                      onClick={cancelImport}
                      className="rounded-lg bg-red-600/20 px-3 py-1 text-xs text-red-400 transition hover:bg-red-600/30"
                    >
                      Отменить
                    </button>
                  )}
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-300"
                    style={{ width: `${importTotal > 0 ? (importProgress / importTotal) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              {importResults.length > 0 && (
                <div className={`mb-4 grid gap-2 ${versionMismatchCount > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                  <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
                    <p className="text-lg font-bold text-emerald-400">{foundCount}</p>
                    <p className="text-xs text-emerald-500">Найдено</p>
                  </div>
                  {versionMismatchCount > 0 && (
                    <div className="rounded-lg bg-orange-500/10 p-3 text-center">
                      <p className="text-lg font-bold text-orange-400">{versionMismatchCount}</p>
                      <p className="text-xs text-orange-500">Не та версия</p>
                    </div>
                  )}
                  <div className="rounded-lg bg-yellow-500/10 p-3 text-center">
                    <p className="text-lg font-bold text-yellow-400">{notFoundCount}</p>
                    <p className="text-xs text-yellow-500">Не найдено</p>
                  </div>
                  <div className="rounded-lg bg-red-500/10 p-3 text-center">
                    <p className="text-lg font-bold text-red-400">{errorCount}</p>
                    <p className="text-xs text-red-500">Ошибки</p>
                  </div>
                </div>
              )}

              {/* Results list */}
              <div className="mb-4 max-h-64 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800/60">
                {importResults.map((result, i) => (
                  <div
                    key={`${result.query}-${i}`}
                    className="flex items-start gap-3 border-b border-slate-700/50 px-3 py-2.5 last:border-b-0"
                  >
                    {result.status === 'found' ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                    ) : result.status === 'version_mismatch' ? (
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-400" />
                    ) : result.status === 'not_found' ? (
                      <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-400" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                    )}

                    <div className="min-w-0 flex-1">
                      {result.status === 'version_mismatch' && result.mod ? (
                        <div>
                          <div className="flex items-center gap-2">
                            {result.mod.iconUrl && (
                              <img src={result.mod.iconUrl} alt="" className="h-6 w-6 rounded bg-slate-700 object-cover" />
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-orange-300">{result.mod.title}</p>
                              <div className="flex items-center gap-1.5">
                                <SourceBadge source={result.mod.source} />
                                <span className="text-xs text-orange-500">⚠ Нет файлов для MC {result.targetVersion}</span>
                              </div>
                            </div>
                          </div>
                          {result.availableVersions && result.availableVersions.length > 0 && (
                            <div className="mt-1.5 ml-8">
                              <p className="text-xs text-slate-500">
                                Доступные версии:{' '}
                                <span className="text-slate-400">
                                  {result.availableVersions.slice(0, 8).join(', ')}
                                  {result.availableVersions.length > 8 && ` и ещё ${result.availableVersions.length - 8}...`}
                                </span>
                              </p>
                            </div>
                          )}
                        </div>
                      ) : result.mod ? (
                        <div className="flex items-center gap-2">
                          {result.mod.iconUrl && (
                            <img src={result.mod.iconUrl} alt="" className="h-6 w-6 rounded bg-slate-700 object-cover" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">{result.mod.title}</p>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <SourceBadge source={result.mod.source} />
                              <span className="text-xs text-slate-500">запрос: {result.query}</span>
                              {result.file && (
                                <>
                                  <span className="truncate text-xs text-emerald-500">✓ {result.file.name}</span>
                                  {result.file.gameVersions.length > 0 && (
                                    <span className="rounded bg-emerald-500/10 px-1 py-0.5 text-xs text-emerald-400">
                                      MC {result.file.gameVersions.find(v => v === result.targetVersion) || result.file.gameVersions[0]}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-slate-300">{result.query}</p>
                          {result.error && (
                            <p className="text-xs text-red-400">{result.error}</p>
                          )}
                          {result.status === 'not_found' && !result.error && (
                            <p className="text-xs text-yellow-500">
                              {cfApiKey
                                ? 'Мод не найден ни на Modrinth, ни на CurseForge'
                                : 'Не найден на Modrinth. Добавьте CF API ключ для доп. поиска'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Show pending items */}
                {importing &&
                  parsedMods.slice(importProgress).map((mod, i) => (
                    <div
                      key={`pending-${mod}-${i}`}
                      className="flex items-center gap-3 border-b border-slate-700/50 px-3 py-2.5 opacity-40 last:border-b-0"
                    >
                      <Clock className="h-4 w-4 flex-shrink-0 text-slate-500" />
                      <span className="text-sm text-slate-500">{mod}</span>
                    </div>
                  ))}
              </div>

              {/* Actions */}
              {importDone && (
                <div className="space-y-3">
                  {/* Summary message */}
                  {versionMismatchCount > 0 && (
                    <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
                      <p className="text-xs text-orange-400">
                        <AlertCircle className="mr-1 inline h-3 w-3" />
                        <strong>{versionMismatchCount}</strong> мод(ов) не имеют файлов для MC {gameVersion || detectedVersion}.
                        Они НЕ будут добавлены в список. Проверьте доступные версии выше.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    {foundCount > 0 && (
                      <button
                        onClick={handleAddAllFound}
                        className="flex-1 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-emerald-500 hover:to-emerald-400"
                      >
                        <CheckCircle2 className="mr-2 inline h-4 w-4" />
                        Добавить найденные ({foundCount}) в список
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setImportDone(false);
                        setImporting(false);
                        setImportResults([]);
                        setParsedMods([]);
                      }}
                      className="rounded-lg bg-slate-700 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-600"
                    >
                      <RefreshCw className="mr-1.5 inline h-4 w-4" />
                      Заново
                    </button>
                  </div>

                  {foundCount === 0 && notFoundCount + versionMismatchCount + errorCount > 0 && (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center">
                      <p className="text-xs text-red-400">
                        Ни один мод не был найден с подходящими файлами.
                        Попробуйте изменить версию MC или загрузчик.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN APP ====================

export function App() {
  const [language, setLanguage] = useState<Language>('ru');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const t = (key: string) => getTranslation(language, key);
  
  const [source, setSource] = useState<Source>('modrinth');
  const [gameVersion, setGameVersion] = useState('1.20.1');
  const [loader, setLoader] = useState('fabric');
  const [query, setQuery] = useState('');
  const [cfApiKey, setCfApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const [results, setResults] = useState<UnifiedMod[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [selectedMods, setSelectedMods] = useState<SelectedMod[]>([]);

  const [versionModal, setVersionModal] = useState<{
    mod: UnifiedMod;
    files: UnifiedFile[];
    loading: boolean;
    error: string;
  } | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search
  const doSearch = useCallback(
    async (q: string, src: Source, gv: string, ld: string, key: string) => {
      if (!q.trim() && !gv) {
        setResults([]);
        setTotalResults(0);
        return;
      }

      setSearching(true);
      setSearchError('');

      try {
        let result: { mods: UnifiedMod[]; total: number };
        if (src === 'modrinth') {
          result = await searchModrinth(q, gv, ld);
        } else {
          if (!key) {
            throw new Error('Для CurseForge требуется API ключ. Нажмите на иконку ключа и введите ваш API ключ.');
          }
          result = await searchCurseForge(q, gv, ld, key);
        }
        setResults(result.mods);
        setTotalResults(result.total);
      } catch (err) {
        setSearchError(err instanceof Error ? err.message : 'Ошибка поиска');
        setResults([]);
        setTotalResults(0);
      } finally {
        setSearching(false);
      }
    },
    []
  );

  const handleSearch = useCallback(() => {
    doSearch(query, source, gameVersion, loader, cfApiKey);
  }, [query, source, gameVersion, loader, cfApiKey, doSearch]);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      doSearch(query, source, gameVersion, loader, cfApiKey);
    }, 500);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [query, source, gameVersion, loader, cfApiKey, doSearch]);

  // View versions
  const handleViewVersions = async (mod: UnifiedMod) => {
    setVersionModal({ mod, files: [], loading: true, error: '' });

    try {
      let files: UnifiedFile[];
      if (mod.source === 'modrinth') {
        files = await getModrinthVersions(mod.id, gameVersion, loader);
      } else {
        if (!cfApiKey) throw new Error('API ключ CurseForge не указан');
        files = await getCurseForgeFiles(mod.cfId!, gameVersion, loader, cfApiKey);
      }
      setVersionModal({ mod, files, loading: false, error: '' });
    } catch (err) {
      setVersionModal((prev) =>
        prev ? { ...prev, loading: false, error: err instanceof Error ? err.message : 'Ошибка' } : null
      );
    }
  };

  // Toggle mod in list
  const toggleMod = (mod: UnifiedMod) => {
    const key = `${mod.source}-${mod.id}`;
    setSelectedMods((prev) => {
      const exists = prev.find((m) => `${m.source}-${m.id}` === key);
      if (exists) return prev.filter((m) => `${m.source}-${m.id}` !== key);
      return [...prev, { ...mod }];
    });
  };

  const isModSelected = (mod: UnifiedMod) =>
    selectedMods.some((m) => `${m.source}-${m.id}` === `${mod.source}-${mod.id}`);

  // Select specific file for mod
  const handleSelectFile = (mod: UnifiedMod, file: UnifiedFile) => {
    setSelectedMods((prev) => {
      const key = `${mod.source}-${mod.id}`;
      const exists = prev.find((m) => `${m.source}-${m.id}` === key);
      if (exists) {
        return prev.map((m) =>
          `${m.source}-${m.id}` === key ? { ...m, selectedFile: file } : m
        );
      }
      return [...prev, { ...mod, selectedFile: file }];
    });
    setVersionModal(null);
  };

  // Remove mod
  const removeMod = (key: string) => {
    setSelectedMods((prev) => prev.filter((m) => `${m.source}-${m.id}` !== key));
  };

  // Import complete handler
  const handleImportComplete = (mods: SelectedMod[]) => {
    setSelectedMods((prev) => {
      const existingKeys = new Set(prev.map((m) => `${m.source}-${m.id}`));
      const newMods = mods.filter((m) => !existingKeys.has(`${m.source}-${m.id}`));
      return [...prev, ...newMods];
    });
    setShowImportModal(false);
  };

  // Export mod list
  const exportModList = () => {
    const data = {
      gameVersion,
      loader,
      mods: selectedMods.map((m) => ({
        title: m.title,
        source: m.source,
        slug: m.slug,
        file: m.selectedFile
          ? {
              name: m.selectedFile.name,
              filename: m.selectedFile.filename,
              url: m.selectedFile.url,
            }
          : null,
        url:
          m.source === 'modrinth'
            ? `https://modrinth.com/mod/${m.slug}`
            : `https://www.curseforge.com/minecraft/mc-mods/${m.slug}`,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modlist-${gameVersion}-${loader}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const gameVersionOptions = GAME_VERSIONS.map((v) => ({ value: v, label: v }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-200">
      {/* Background pattern */}
      <div className="pointer-events-none fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMDI5M2MiIGZpbGwtb3BhY2l0eT0iMC4yIj48cGF0aCBkPSJNMzYgMzBoLTZWMGg2djMwem0tNiAwSDB2LTZoMzB2NnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />

      {/* Header */}
      <header className="relative border-b border-slate-800 bg-slate-900/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-500/20">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white sm:text-xl">MC Mod Parser</h1>
              <p className="hidden text-xs text-slate-500 sm:block">
                Поиск модов Minecraft — Modrinth & CurseForge
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-xl transition hover:border-slate-600 hover:bg-slate-700"
                title="Change language"
              >
                {LANGUAGES.find(l => l.code === language)?.flag || '🌐'}
              </button>
              {showLangMenu && (
                <>
                  <div className="fixed inset-0 z-[100]" onClick={() => setShowLangMenu(false)} />
                  <div className="absolute right-0 top-full z-[101] mt-2 max-h-[70vh] w-48 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-2xl backdrop-blur-xl">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code);
                          setShowLangMenu(false);
                        }}
                        className={cn(
                          'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition',
                          language === lang.code
                            ? 'bg-emerald-600/20 text-emerald-400'
                            : 'text-slate-300 hover:bg-slate-800'
                        )}
                      >
                        <span className="text-xl">{lang.flag}</span>
                        <span className="font-medium">{lang.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Import button */}
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white shadow transition hover:bg-violet-500 sm:px-4"
              title="Импорт модлиста"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Импорт</span>
            </button>

            {/* Source Toggle */}
            <div className="flex rounded-lg border border-slate-700 bg-slate-800 p-1">
              <button
                onClick={() => setSource('modrinth')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition sm:px-4',
                  source === 'modrinth'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                ◆ Modrinth
              </button>
              <button
                onClick={() => setSource('curseforge')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition sm:px-4',
                  source === 'curseforge'
                    ? 'bg-orange-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                🔥 CurseForge
              </button>
            </div>
            {source === 'curseforge' && (
              <button
                onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                className={cn(
                  'rounded-lg p-2 transition',
                  cfApiKey
                    ? 'bg-emerald-600/20 text-emerald-400'
                    : 'bg-orange-600/20 text-orange-400 animate-pulse'
                )}
                title="API ключ CurseForge"
              >
                <Key className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* CurseForge API Key input */}
        {source === 'curseforge' && showApiKeyInput && (
          <div className="border-t border-slate-800 bg-slate-900/50 px-4 py-3 sm:px-6">
            <div className="mx-auto flex max-w-7xl items-center gap-2">
              <Key className="h-4 w-4 flex-shrink-0 text-orange-400" />
              <input
                type="password"
                value={cfApiKey}
                onChange={(e) => setCfApiKey(e.target.value)}
                placeholder="Введите CurseForge API ключ (получите на console.curseforge.com)"
                className="h-9 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-200 placeholder-slate-500 outline-none transition focus:border-orange-500"
              />
              {cfApiKey && (
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <Check className="h-3 w-3" /> Ключ установлен
                </span>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SelectDropdown
            value={gameVersion}
            onChange={setGameVersion}
            options={gameVersionOptions}
            placeholder="Версия игры"
            icon={Layers}
          />
          <SelectDropdown
            value={loader}
            onChange={setLoader}
            options={LOADERS}
            placeholder="Загрузчик"
            icon={Package}
          />
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Поиск модов... (напр. sodium, create, iris)"
              className="h-10 w-full rounded-lg border border-slate-700 bg-slate-800 pl-9 pr-20 text-sm text-slate-200 placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {searching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
              Найти
            </button>
          </div>
        </div>

        {/* Quick search suggestions */}
        {results.length === 0 && !searching && !searchError && (
          <div className="mb-6">
            <p className="mb-2 text-xs text-slate-500">Популярные моды:</p>
            <div className="flex flex-wrap gap-2">
              {['sodium', 'create', 'jei', 'iris', 'lithium', 'optifine', 'waystones', 'appleskin', 'jade', 'xaeros-minimap'].map(
                (tag) => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag)}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-400 transition hover:bg-slate-700 hover:text-white"
                  >
                    {tag}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Search Results */}
          <div className="xl:col-span-2">
            {(results.length > 0 || searching) && (
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  {searching ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Поиск...
                    </span>
                  ) : (
                    <>
                      Найдено: <span className="font-semibold text-white">{totalResults}</span> модов
                    </>
                  )}
                </p>
                {results.length > 0 && (
                  <button
                    onClick={handleSearch}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 transition hover:text-white"
                  >
                    <RefreshCw className="h-3 w-3" /> Обновить
                  </button>
                )}
              </div>
            )}

            {searchError && (
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                <div>
                  <p className="text-sm font-medium text-red-400">Ошибка поиска</p>
                  <p className="mt-1 text-xs text-red-400/80">{searchError}</p>
                </div>
              </div>
            )}

            {results.length > 0 && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {results.map((mod) => (
                  <ModCard
                    key={`${mod.source}-${mod.id}`}
                    mod={mod}
                    isSelected={isModSelected(mod)}
                    onToggle={() => toggleMod(mod)}
                    onViewVersions={() => handleViewVersions(mod)}
                  />
                ))}
              </div>
            )}

            {!searching && !searchError && results.length === 0 && query && (
              <div className="rounded-xl border border-slate-800 bg-slate-800/40 py-16 text-center">
                <Search className="mx-auto h-10 w-10 text-slate-600" />
                <p className="mt-3 text-sm text-slate-400">Ничего не найдено</p>
                <p className="mt-1 text-xs text-slate-600">Попробуйте изменить запрос или фильтры</p>
              </div>
            )}

            {!searching && !searchError && results.length === 0 && !query && (
              <div className="rounded-xl border border-slate-800 bg-slate-800/40 py-16 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600/20 to-emerald-800/20">
                  <Search className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-white">Поиск модов Minecraft</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                  Введите название мода, выберите версию игры и загрузчик для поиска.
                  Поддерживаются Modrinth и CurseForge.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" /> Выбор версий
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" /> Фильтр загрузчиков
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="h-3.5 w-3.5" /> Скачивание
                  </span>
                  <span className="flex items-center gap-1">
                    <Upload className="h-3.5 w-3.5" /> Импорт модлиста
                  </span>
                </div>

                {/* Import CTA */}
                <div className="mx-auto mt-8 max-w-md">
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="group mx-auto flex items-center gap-3 rounded-xl border border-violet-500/30 bg-violet-500/10 px-6 py-4 text-left transition hover:border-violet-500/50 hover:bg-violet-500/20"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/30 transition group-hover:bg-violet-600/50">
                      <Upload className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-violet-300">Импортировать модлист</p>
                      <p className="text-xs text-violet-400/70">
                        Загрузите .txt, .json или .csv файл со списком модов
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mod List Sidebar */}
          <div className="xl:col-span-1">
            <div className="sticky top-6">
              <ModListPanel
                mods={selectedMods}
                onRemove={removeMod}
                onExport={exportModList}
                onClear={() => setSelectedMods([])}
              />

              {/* Import shortcut card */}
              <div className="mt-4">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex w-full items-center gap-3 rounded-xl border border-dashed border-violet-500/30 bg-violet-500/5 p-4 text-left transition hover:border-violet-500/50 hover:bg-violet-500/10"
                >
                  <Upload className="h-5 w-5 flex-shrink-0 text-violet-400" />
                  <div>
                    <p className="text-sm font-medium text-violet-300">Импорт из файла</p>
                    <p className="text-xs text-slate-500">
                      .txt, .json, .csv — перетащите или выберите файл
                    </p>
                  </div>
                </button>
              </div>

              {/* Info panel */}
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-800/40 p-4">
                <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-400">
                  <Info className="h-3.5 w-3.5" /> Как использовать
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-500">
                  <li>1. Выберите версию Minecraft и загрузчик</li>
                  <li>2. Найдите нужные моды через поиск</li>
                  <li>3. Или импортируйте список модов из файла</li>
                  <li>4. Нажмите «Версии» для выбора файла</li>
                  <li>5. Экспортируйте или скачивайте</li>
                </ul>
                <div className="mt-3 rounded-lg bg-slate-900/60 p-2.5">
                  <p className="text-xs text-slate-600">
                    <span className="font-medium text-violet-400">Импорт</span> — загрузите .txt (по строкам), .json (экспорт, CurseForge manifest, Modrinth index) или .csv файл.
                  </p>
                </div>
                <div className="mt-2 rounded-lg bg-slate-900/60 p-2.5">
                  <p className="text-xs text-slate-600">
                    <span className="font-medium text-emerald-500">Modrinth</span> — открытый API, работает без ключа.
                    <br />
                    <span className="font-medium text-orange-500">CurseForge</span> — требуется API ключ с{' '}
                    <a
                      href="https://console.curseforge.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      console.curseforge.com
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Version Modal */}
      {versionModal && (
        <VersionModal
          mod={versionModal.mod}
          files={versionModal.files}
          loading={versionModal.loading}
          error={versionModal.error}
          onClose={() => setVersionModal(null)}
          onSelectFile={handleSelectFile}
          gameVersion={gameVersion}
          loader={loader}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImportComplete={handleImportComplete}
          gameVersion={gameVersion}
          loader={loader}
          cfApiKey={cfApiKey}
        />
      )}
    </div>
  );
}
