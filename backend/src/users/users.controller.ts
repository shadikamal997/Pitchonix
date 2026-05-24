import { Controller, Get, Patch, Delete, Body, UseGuards, HttpCode, HttpStatus, BadRequestException, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@GetUser() user: any) {
    return this.usersService.findById(user.id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search collaborators (mention autocomplete + reviewer picker)' })
  async search(
    @GetUser() user: any,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    const n = limit ? Math.max(1, Math.min(20, parseInt(limit, 10) || 8)) : 8;
    return this.usersService.searchCollaborators(user.id, q || '', n, workspaceId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile (name, email)' })
  @ApiBody({ schema: { properties: { name: { type: 'string' }, email: { type: 'string' } } } })
  async updateProfile(@GetUser() user: any, @Body() dto: { name?: string; email?: string }) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Change current user password' })
  @ApiBody({ schema: { properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string' } } } })
  async changePassword(
    @GetUser() user: any,
    @Body() dto: { currentPassword: string; newPassword: string },
  ) {
    if (!dto.currentPassword || !dto.newPassword) {
      throw new BadRequestException('currentPassword and newPassword are required');
    }
    if (dto.newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }
    return this.usersService.changePassword(user.id, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete current user account' })
  async deleteAccount(@GetUser() user: any) {
    return this.usersService.deleteAccount(user.id);
  }
}
