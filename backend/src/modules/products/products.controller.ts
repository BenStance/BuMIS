import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Permissions('product.view')
  findAll(@CurrentUser() user: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    return this.productsService.findAll(user as never, query);
  }

  @Get('low-stock')
  @Permissions('product.view')
  lowStock(@CurrentUser() user: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    return this.productsService.lowStock(user as never, query);
  }

  @Get(':id')
  @Permissions('product.view')
  findOne(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.productsService.findOne(id, user as never);
  }

  @Get(':id/history')
  @Permissions('product.view')
  history(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.productsService.history(id, user as never);
  }

  @Post()
  @Permissions('product.create')
  create(@Body() dto: CreateProductDto, @CurrentUser() user: Record<string, unknown>) {
    return this.productsService.create(dto, user as never);
  }

  @Patch(':id')
  @Permissions('product.update')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto, @CurrentUser() user: Record<string, unknown>) {
    return this.productsService.update(id, dto, user as never);
  }

  @Delete(':id')
  @Permissions('product.delete')
  remove(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.productsService.remove(id, user as never);
  }
}
