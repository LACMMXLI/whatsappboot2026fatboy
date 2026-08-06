import { useCallback, useEffect, useState } from 'react';
import { productsApi } from '../../api/products';
import type { Product, ProductInput } from '../../types';
import { ProductRow } from './ProductRow';
import { ProductForm } from './ProductForm';
import { BulkUpload } from './BulkUpload';

export function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await productsApi.list();
      setProducts(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (input: ProductInput) => {
    if (editing && editing !== 'new') {
      await productsApi.update(editing.id, input);
    } else {
      await productsApi.create(input);
    }
    setEditing(null);
    await load();
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`¿Eliminar "${product.name}"?`)) return;
    await productsApi.remove(product.id);
    await load();
  };

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4 overflow-y-auto p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Menu / Productos</h1>
        {editing === null && (
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="h-12 rounded-xl bg-brand px-5 text-base font-semibold text-white"
          >
            + Nuevo producto
          </button>
        )}
      </div>

      {editing !== null && (
        <ProductForm
          initial={editing === 'new' ? undefined : editing}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(null)}
        />
      )}

      <BulkUpload onDone={load} />

      <div className="overflow-hidden rounded-2xl border border-panel-border bg-panel">
        {loading && <p className="p-4 text-sm text-text-muted">Cargando...</p>}
        {!loading && products.length === 0 && (
          <p className="p-4 text-sm text-text-muted">
            Todavia no hay productos. Cargalos con el formulario o la carga masiva.
          </p>
        )}
        {products.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            onEdit={() => setEditing(product)}
            onDelete={() => handleDelete(product)}
          />
        ))}
      </div>
    </div>
  );
}
