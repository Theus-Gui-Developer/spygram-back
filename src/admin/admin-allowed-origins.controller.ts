import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AllowedOriginsService } from '../allowed-origins/allowed-origins.service';
import {
  CreateAllowedOriginDto,
  ListAllowedOriginsQueryDto,
  UpdateAllowedOriginDto,
} from './dto/allowed-origin-admin.dto';

@Controller('internal/allowed-origins')
export class AdminAllowedOriginsController {
  constructor(private readonly service: AllowedOriginsService) {}

  @Get()
  list(@Query() query: ListAllowedOriginsQueryDto) {
    return this.service.list(query.page, query.limit, query.search);
  }

  @Post()
  create(@Body() body: CreateAllowedOriginDto) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAllowedOriginDto,
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
