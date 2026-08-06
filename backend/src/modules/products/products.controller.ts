import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BusinessId } from '../../common/decorators/business-id.decorator';
import { ProductsService } from './products.service';
import { CreateProductDto, UploadProductsDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { parseProductsCsv } from './products.csv';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar productos del negocio' })
  findAll(@BusinessId() businessId: string) {
    return this.productsService.findAll(businessId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar productos activos por nombre o alias' })
  search(@BusinessId() businessId: string, @Query('q') q: string) {
    return this.productsService.search(businessId, q ?? '');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un producto por id' })
  findOne(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.productsService.findOne(businessId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un producto' })
  create(@BusinessId() businessId: string, @Body() dto: CreateProductDto) {
    return this.productsService.create(businessId, dto);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    description:
      'JSON con { "products": [...] } o archivo CSV (columnas: name, category, price, aliases separados por "|", active)',
    type: UploadProductsDto,
  })
  @ApiOperation({
    summary:
      'Cargar/actualizar el catalogo de productos en lote (JSON o CSV), sin reiniciar el servicio',
  })
  async upload(
    @BusinessId() businessId: string,
    @Body() body: UploadProductsDto | CreateProductDto[] | undefined,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let items: CreateProductDto[];

    if (file) {
      items = parseProductsCsv(file.buffer.toString('utf-8'));
    } else if (Array.isArray(body)) {
      items = body;
    } else if (body && Array.isArray((body as UploadProductsDto).products)) {
      items = (body as UploadProductsDto).products;
    } else {
      throw new BadRequestException(
        'Debes enviar un archivo CSV (campo "file") o un JSON con { "products": [...] }',
      );
    }

    if (items.length === 0) {
      throw new BadRequestException('La lista de productos esta vacia');
    }

    return this.productsService.bulkUpsert(businessId, items);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un producto' })
  update(
    @BusinessId() businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(businessId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un producto' })
  remove(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.productsService.remove(businessId, id);
  }
}
