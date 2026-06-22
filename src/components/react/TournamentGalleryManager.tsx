import { useEffect, useState } from 'react';
import { ImageUploader } from './ImageUploader';
import { AdminButton } from './AdminButton';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { showAdminToast } from '../../lib/admin-toast';

type Photo = {
  id: string;
  url: string;
  caption: string | null;
  sortOrder: number;
};

type TournamentInfo = {
  slug: string;
  name: string;
};

export function TournamentGalleryManager() {
  const [tournament, setTournament] = useState<TournamentInfo | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pendingUrl, setPendingUrl] = useState('');
  const [pendingCaption, setPendingCaption] = useState('');
  const { run, isLoading } = useAsyncAction();

  async function load() {
    const [tRes, pRes] = await Promise.all([
      fetch('/api/tournament'),
      fetch('/api/tournament/photos'),
    ]);
    const tData = await tRes.json();
    const pData = await pRes.json();
    if (tData.tournament) {
      setTournament({ slug: tData.tournament.slug, name: tData.tournament.name });
    }
    setPhotos(pData.photos ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function addPhoto() {
    if (!pendingUrl.trim()) {
      showAdminToast('Sube o selecciona una imagen primero', 'error');
      return;
    }

    await run('add-photo', async () => {
      const res = await fetch('/api/tournament/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: pendingUrl, caption: pendingCaption }),
      });
      if (res.ok) {
        setPendingUrl('');
        setPendingCaption('');
        showAdminToast('Foto añadida a la galería', 'success');
        await load();
      } else {
        showAdminToast('Error al guardar la foto', 'error');
      }
    });
  }

  async function updateCaption(id: string, caption: string) {
    await fetch('/api/tournament/photos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, caption }),
    });
    await load();
  }

  async function removePhoto(id: string) {
    if (!confirm('¿Eliminar esta foto de la galería?')) return;
    await run(`delete-${id}`, async () => {
      const res = await fetch('/api/tournament/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        showAdminToast('Foto eliminada', 'success');
        await load();
      }
    });
  }

  async function movePhoto(id: string, direction: 'up' | 'down') {
    const index = photos.findIndex((p) => p.id === id);
    if (index < 0) return;
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= photos.length) return;

    const current = photos[index];
    const other = photos[swapIndex];

    await Promise.all([
      fetch('/api/tournament/photos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: current.id, sortOrder: other.sortOrder }),
      }),
      fetch('/api/tournament/photos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: other.id, sortOrder: current.sortOrder }),
      }),
    ]);
    await load();
  }

  if (!tournament) return <p className="text-muted">Cargando...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Galería del torneo</h1>
        <p className="mt-1 text-muted">{tournament.name}</p>
      </div>

      <div className="admin-card space-y-4 p-5">
        <ImageUploader
          label="Nueva foto"
          value={pendingUrl}
          onChange={setPendingUrl}
          tournamentSlug={tournament.slug}
        />
        <label className="block">
          <span className="text-sm font-medium">Descripción (opcional)</span>
          <input
            className="admin-input mt-1"
            value={pendingCaption}
            onChange={(e) => setPendingCaption(e.target.value)}
            placeholder="Ej: Entrega de premios"
          />
        </label>
        <AdminButton loading={isLoading('add-photo')} onClick={addPhoto}>
          Añadir a la galería
        </AdminButton>
      </div>

      <div className="space-y-4">
        <h2 className="font-display text-lg font-bold">Fotos publicadas ({photos.length})</h2>
        {photos.length === 0 ? (
          <p className="text-sm text-muted">No hay fotos en la galería pública.</p>
        ) : (
          photos.map((photo, index) => (
            <div key={photo.id} className="admin-card flex flex-col gap-4 p-4 sm:flex-row">
              <img
                src={photo.url}
                alt=""
                className="h-32 w-full rounded-xl object-cover sm:w-48"
              />
              <div className="flex flex-1 flex-col gap-3">
                <input
                  className="admin-input"
                  value={photo.caption ?? ''}
                  onChange={(e) =>
                    setPhotos((prev) =>
                      prev.map((p) =>
                        p.id === photo.id ? { ...p, caption: e.target.value } : p,
                      ),
                    )
                  }
                  onBlur={(e) => updateCaption(photo.id, e.target.value)}
                  placeholder="Descripción"
                />
                <div className="flex flex-wrap gap-2">
                  <AdminButton
                    variant="secondary"
                    disabled={index === 0}
                    onClick={() => movePhoto(photo.id, 'up')}
                  >
                    Subir
                  </AdminButton>
                  <AdminButton
                    variant="secondary"
                    disabled={index === photos.length - 1}
                    onClick={() => movePhoto(photo.id, 'down')}
                  >
                    Bajar
                  </AdminButton>
                  <AdminButton
                    variant="danger"
                    loading={isLoading(`delete-${photo.id}`)}
                    onClick={() => removePhoto(photo.id)}
                  >
                    Eliminar
                  </AdminButton>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
