import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { BusinessService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { AuthService } from '../auth/auth.service';
import { RegisterBusinessDto } from '../auth/dto/register-business.dto';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('businesses')
export class BusinessController {
  constructor(
    private readonly businessService: BusinessService,
    private readonly authService: AuthService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  findAll() {
    return this.businessService.findAll();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.businessService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  @Permissions('business.create')
  create(@Body() dto: CreateBusinessDto) {
    return this.businessService.create(dto);
  }

  @Public()
  @Post('register')
  register(@Body() dto: RegisterBusinessDto) {
    return this.authService.registerBusiness(dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id')
  @Permissions('business.update')
  update(@Param('id') id: string, @Body() dto: UpdateBusinessDto) {
    return this.businessService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':id/profile')
  profile(@Param('id') id: string) {
    return this.businessService.profile(id);
  }
}
