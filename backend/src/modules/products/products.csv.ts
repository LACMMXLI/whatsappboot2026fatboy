import { parse } from 'csv-parse/sync';
import { BadRequestException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';

interface CsvRow {
  name?: string;
  category?: string;
  price?: string;
  aliases?: string;
  active?: string;
}

/**
 * Parsea un CSV con columnas: name, category, price, aliases (separados por "|"), active.
 */
export function parseProductsCsv(fileContent: string): CreateProductDto[] {
  let rows: CsvRow[];
  try {
    rows = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (error) {
    throw new BadRequestException(
      `CSV invalido: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return rows.map((row, index) => {
    if (!row.name || !row.price) {
      throw new BadRequestException(
        `Fila ${index + 1} del CSV invalida: se requieren las columnas "name" y "price"`,
      );
    }
    const price = Number(row.price);
    if (Number.isNaN(price)) {
      throw new BadRequestException(
        `Fila ${index + 1} del CSV invalida: "price" debe ser numerico`,
      );
    }
    return {
      name: row.name,
      category: row.category || undefined,
      price,
      aliases: row.aliases
        ? row.aliases
            .split('|')
            .map((a) => a.trim())
            .filter(Boolean)
        : [],
      active: row.active ? row.active.toLowerCase() !== 'false' : true,
    };
  });
}
