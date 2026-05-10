import { Controller, Get, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TemplateFavouritesService } from './template-favourites.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';

@ApiTags('Template Favourites')
@Controller('templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TemplateFavouritesController {
  constructor(private readonly favouritesService: TemplateFavouritesService) {}

  @Get('favourites')
  @ApiOperation({ summary: 'Get all favourited templates' })
  findAll(@GetUser() user: any) {
    return this.favouritesService.findAll(user.id);
  }

  @Get(':templateId/favourite')
  @ApiOperation({ summary: 'Check if template is favourited' })
  isFavourite(@Param('templateId') templateId: string, @GetUser() user: any) {
    return this.favouritesService.isFavourite(user.id, templateId);
  }

  @Post(':templateId/favourite')
  @ApiOperation({ summary: 'Add template to favourites' })
  add(@Param('templateId') templateId: string, @GetUser() user: any) {
    return this.favouritesService.add(user.id, templateId);
  }

  @Delete(':templateId/favourite')
  @ApiOperation({ summary: 'Remove template from favourites' })
  remove(@Param('templateId') templateId: string, @GetUser() user: any) {
    return this.favouritesService.remove(user.id, templateId);
  }
}
