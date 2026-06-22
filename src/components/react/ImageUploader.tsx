import { useCallback, useEffect, useRef, useState } from 'react';
import { convertHeicToJpgIfNeeded, optimizeImage, uploadImage, uploadTournamentGalleryImage } from '../../lib/image-upload';
import { showAdminToast } from '../../lib/admin-toast';

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  tournamentSlug?: string;
}

interface StoredImage {
  url: string;
  pathname: string;
}

type UploadStep = 'receiving' | 'heic' | 'optimizing' | 'uploading' | 'done';

const UPLOAD_STEP_LABELS: Record<UploadStep, string> = {
  receiving: 'Recibiendo imagen',
  heic: 'Transformando HEIC a JPG',
  optimizing: 'Optimizando imagen',
  uploading: 'Subiendo a la nube',
  done: 'Listo',
};

export function ImageUploader({
  value,
  onChange,
  label = 'Imagen',
  tournamentSlug,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<UploadStep>('receiving');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [mode, setMode] = useState<'upload' | 'url' | 'existing'>('upload');
  const [urlInput, setUrlInput] = useState(() => value ?? '');
  const [existingImages, setExistingImages] = useState<StoredImage[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUrlInput(value ?? '');
  }, [value]);

  const isHeicFile = useCallback(
    (f: File) =>
      /\.(heic|heif)$/i.test(f.name) ||
      ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'].includes(f.type),
    [],
  );

  const handleUpload = useCallback(
    async (file: File) => {
      const isImage = file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name);
      if (!isImage) {
        showAdminToast('Selecciona una imagen (JPG, PNG, WebP o HEIC).', 'error');
        return;
      }

      setUploading(true);
      setUploadStep('receiving');
      setUploadProgress(5);

      try {
        let forOptimization: File;
        if (isHeicFile(file)) {
          setUploadStep('heic');
          setUploadProgress(15);
          forOptimization = await convertHeicToJpgIfNeeded(file);
          setUploadProgress(35);
        } else {
          forOptimization = file;
          setUploadProgress(30);
        }

        setUploadStep('optimizing');
        setUploadProgress(40);
        const optimized = await optimizeImage(forOptimization);
        setUploadProgress(65);

        setUploadStep('uploading');
        setUploadProgress(70);
        const url = tournamentSlug
          ? await uploadTournamentGalleryImage(optimized, tournamentSlug)
          : await uploadImage(optimized);

        setUploadProgress(100);
        setUploadStep('done');
        onChange(url);
        showAdminToast('Imagen subida correctamente', 'success');
      } catch (e) {
        console.error(e);
        showAdminToast(e instanceof Error ? e.message : 'Error al subir la imagen', 'error');
      } finally {
        setUploading(false);
        setUploadProgress(0);
        setUploadStep('receiving');
      }
    },
    [onChange, tournamentSlug, isHeicFile],
  );

  const loadExistingImages = useCallback(async () => {
    setLoadingExisting(true);
    try {
      const res = await fetch('/api/upload');
      if (!res.ok) throw new Error('Failed to list');
      const data = await res.json();
      setExistingImages(data.images ?? []);
    } catch (e) {
      console.error(e);
      showAdminToast('Error al cargar imágenes', 'error');
      setExistingImages([]);
    } finally {
      setLoadingExisting(false);
    }
  }, []);

  useEffect(() => {
    if (mode === 'existing' && existingImages.length === 0 && !loadingExisting) {
      loadExistingImages();
    }
  }, [mode, existingImages.length, loadingExisting, loadExistingImages]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      const isImage = file && (file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name));
      if (isImage) handleUpload(file);
    },
    [handleUpload],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  return (
    <div>
      <span className="text-sm font-medium">{label}</span>

      <div className="mt-2 flex flex-wrap gap-2">
        {(['upload', 'url', 'existing'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={
              mode === m ? 'admin-chip admin-chip-active' : 'admin-chip admin-chip-inactive'
            }
          >
            {m === 'upload' ? 'Subir' : m === 'url' ? 'URL' : 'Existentes'}
          </button>
        ))}
      </div>

      {mode === 'upload' ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-3 cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${
            dragOver ? 'border-ink bg-bg' : 'border-border hover:border-ink/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            onChange={handleFileSelect}
            className="hidden"
          />
          {uploading ? (
            <div className="mx-auto max-w-sm text-left">
              <p className="text-sm font-medium text-ink">{UPLOAD_STEP_LABELS[uploadStep]}</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full bg-ink transition-all duration-500"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted">{uploadProgress}%</p>
            </div>
          ) : (
            <p className="text-sm text-muted">Arrastra una imagen o haz clic para seleccionar</p>
          )}
        </div>
      ) : mode === 'url' ? (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://..."
            className="admin-input flex-1"
          />
          <button
            type="button"
            onClick={() => onChange(urlInput)}
            className="admin-chip admin-chip-active px-4"
          >
            Aplicar
          </button>
        </div>
      ) : (
        <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-border p-4">
          {loadingExisting ? (
            <p className="py-4 text-center text-sm text-muted">Cargando imágenes...</p>
          ) : existingImages.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">
              No hay imágenes en el storage. Sube una desde &quot;Subir&quot;.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {existingImages.map((img) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => onChange(img.url)}
                  className={`aspect-square overflow-hidden rounded-lg border-2 transition ${
                    value === img.url ? 'border-ink ring-2 ring-ink/20' : 'border-border hover:border-ink/40'
                  }`}
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {value && (
        <div className="group relative mt-3">
          <img
            src={value}
            alt="Vista previa"
            className="max-h-48 w-full rounded-xl border border-border object-cover"
          />
          <button
            type="button"
            onClick={() => {
              onChange('');
              setUrlInput('');
            }}
            aria-label="Quitar imagen"
            className="absolute top-2 right-2 rounded-full bg-red-500 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100"
          >
            Quitar
          </button>
        </div>
      )}
    </div>
  );
}
