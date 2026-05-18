import { Body, Controller, Get, Post, Patch, Param, UseGuards, Req } from '@nestjs/common';
import { ContactService, CreateContactMessageDto } from './contact.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Public()
  @Post()
  async submitContactMessage(@Body() dto: CreateContactMessageDto) {
    // Allow both authenticated and unauthenticated submissions
    return this.contactService.createContactMessage(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllMessages() {
    return this.contactService.getAllContactMessages();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getMessageById(@Param('id') id: string) {
    return this.contactService.getContactMessageById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  async updateMessageStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.contactService.updateContactStatus(id, status);
  }
}
