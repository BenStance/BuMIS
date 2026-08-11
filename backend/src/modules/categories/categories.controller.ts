import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Permissions('category.view')
  findAll(@CurrentUser() user: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    return this.categoriesService.findAll(user as never, query);
  }

  @Get(':id')
  @Permissions('category.view')
  findOne(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.categoriesService.findOne(id, user as never);
  }

  @Post()
  @Permissions('category.create')
  create(@Body() dto: CreateCategoryDto, @CurrentUser() user: Record<string, unknown>) {
    return this.categoriesService.create(dto, user as never);
  }

  @Patch(':id')
  @Permissions('category.update')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto, @CurrentUser() user: Record<string, unknown>) {
    return this.categoriesService.update(id, dto, user as never);
  }

  @Delete(':id')
  @Permissions('category.delete')
  remove(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.categoriesService.remove(id, user as never);
  }
}
