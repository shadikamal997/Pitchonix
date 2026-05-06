import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BrandKitsService } from './brand-kits.service';
import { CreateBrandKitDto } from './dto/create-brand-kit.dto';
import { UpdateBrandKitDto } from './dto/update-brand-kit.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';

@ApiTags('Brand Kits')
@Controller('brand-kits')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BrandKitsController {
  constructor(private readonly brandKitsService: BrandKitsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new brand kit' })
  create(@GetUser() user: any, @Body() createBrandKitDto: CreateBrandKitDto) {
    return this.brandKitsService.create(user.id, createBrandKitDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user brand kits' })
  findAll(@GetUser() user: any) {
    return this.brandKitsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get brand kit by ID' })
  findOne(@Param('id') id: string, @GetUser() user: any) {
    return this.brandKitsService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update brand kit' })
  update(
    @Param('id') id: string,
    @GetUser() user: any,
    @Body() updateBrandKitDto: UpdateBrandKitDto,
  ) {
    return this.brandKitsService.update(id, user.id, updateBrandKitDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete brand kit' })
  remove(@Param('id') id: string, @GetUser() user: any) {
    return this.brandKitsService.remove(id, user.id);
  }
}
