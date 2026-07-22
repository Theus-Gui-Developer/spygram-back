import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import {
  IsIP,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { LeadStatusDto } from './dto/lead-status.dto';
import { SaveSearchDto } from './dto/save-search.dto';
import { LeadsService } from './leads.service';

class LeadStatusQueryDto {
  @IsString()
  action!: string;

  @IsIP()
  ip!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  fingerprint?: string;
}

@Controller('api/leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  checkStatus(@Query() query: LeadStatusQueryDto): Promise<LeadStatusDto> {
    if (query.action !== 'check_status_by_ip')
      throw new BadRequestException('Unsupported action');
    return this.leads.checkStatus(query.ip, query.fingerprint, query.username);
  }

  @Post()
  saveSearch(@Query('action') action: string, @Body() body: SaveSearchDto) {
    if (action !== 'save_search')
      throw new BadRequestException('Unsupported action');
    return this.leads.saveSearch(
      body.leadId,
      body.ip,
      body.fingerprint,
      body.profileData,
      body.resetWindow,
    );
  }
}
