import { useEffect, useState } from 'react';
import { publicApiUrl } from '../../lib/admin-api';

type Photo = {
  id: string;
  url: string;
  caption: string | null;
};

type Props = {
  slug: string;
};

export function TournamentGallery({ slug }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  useEffect(() => {
    fetch(publicApiUrl('/api/tournament/photos', slug))
      .then((r) => r.json())
      .then((data) => setPhotos(data.photos ?? []))
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!lightbox) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightbox(null);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [lightbox]);

  if (loading) {
    return <p className="text-muted">Cargando galería...</p>;
  }

  if (photos.length === 0) {
    return (
      <p className="rounded-3xl border border-dashed border-border px-6 py-12 text-center text-muted">
        Aún no hay fotos del torneo.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-bg"
            onClick={() => setLightbox(photo)}
          >
            <img
              src={photo.url}
              alt={photo.caption ?? 'Foto del torneo'}
              loading="lazy"
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
            {photo.caption && (
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-left text-xs text-white">
                {photo.caption}
              </span>
            )}
          </button>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-h-[90vh] max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightbox.url}
              alt={lightbox.caption ?? 'Foto del torneo'}
              className="max-h-[85vh] w-full rounded-2xl object-contain"
            />
            {lightbox.caption && (
              <p className="mt-3 text-center text-sm text-white/80">{lightbox.caption}</p>
            )}
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute top-2 right-2 rounded-full bg-black/60 px-3 py-1 text-sm text-white"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
