import { useRef, useState } from 'react';
import { productsApi } from '../../api/products';

/** Carga masiva de productos desde un archivo .csv o .json. */
export function BulkUpload({ onDone }: { onDone: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setStatus('loading');
    setMessage(null);
    try {
      let created;
      if (file.name.toLowerCase().endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const products = Array.isArray(parsed) ? parsed : parsed.products;
        created = await productsApi.uploadJson(products);
      } else {
        created = await productsApi.uploadCsv(file);
      }
      setStatus('idle');
      setMessage(`${created.length} producto(s) cargado(s)/actualizado(s).`);
      onDone();
    } catch {
      setStatus('error');
      setMessage('No se pudo procesar el archivo. Revisa el formato.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-2xl border border-dashed border-panel-border p-4">
      <p className="mb-2 text-sm font-semibold text-text-primary">Carga masiva (CSV o JSON)</p>
      <p className="mb-3 text-xs text-text-muted">
        CSV con columnas: name, category, price, aliases (separados por &quot;|&quot;), active.
        JSON: un array de productos (o {'{'}"products": [...]{'}'}).
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        className="block w-full text-sm text-text-secondary file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:text-sm file:font-semibold file:text-white"
      />
      {status === 'loading' && <p className="mt-2 text-sm text-text-secondary">Procesando...</p>}
      {message && (
        <p className={`mt-2 text-sm ${status === 'error' ? 'text-status-error' : 'text-status-active'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
