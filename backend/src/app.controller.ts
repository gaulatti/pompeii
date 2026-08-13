import { Controller, Get, Req } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  kickoff(@Req() req: any) {
    return this.appService.kickoff(req.user);
  }
}
