import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EvalSessionsService } from './eval-sessions.service';
import { EvalSessionDto } from './dto/eval-session.dto';
import { CreateEvalSessionDto } from './dto/create-eval-session.dto';
import { UpdateEvalSessionDto } from './dto/update-eval-session.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('eval-sessions')
@Controller('eval-sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EvalSessionsController {
  constructor(private readonly evalSessionsService: EvalSessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new evaluation session' })
  @ApiResponse({ status: 201, description: 'The session has been created', type: EvalSessionDto })
  async create(@Body() createDto: CreateEvalSessionDto, @Request() req): Promise<EvalSessionDto> {
    // Use the authenticated user's ID
    createDto.userId = req.user.id;
    return this.evalSessionsService.createSession(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all evaluation sessions for the current user' })
  @ApiResponse({ status: 200, description: 'List of evaluation sessions', type: [EvalSessionDto] })
  async findAll(
    @Request() req,
    @Query('status') status?: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ): Promise<EvalSessionDto[]> {
    return this.evalSessionsService.getUserSessions(req.user.id, {
      status,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an evaluation session by ID' })
  @ApiResponse({ status: 200, description: 'The evaluation session', type: EvalSessionDto })
  async findOne(@Param('id') id: string): Promise<EvalSessionDto> {
    return this.evalSessionsService.getSessionById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an evaluation session' })
  @ApiResponse({ status: 200, description: 'The updated evaluation session', type: EvalSessionDto })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEvalSessionDto,
  ): Promise<EvalSessionDto> {
    return this.evalSessionsService.updateSession(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an evaluation session' })
  @ApiResponse({ status: 200, description: 'The deleted evaluation session', type: EvalSessionDto })
  async remove(@Param('id') id: string): Promise<EvalSessionDto> {
    return this.evalSessionsService.deleteSession(id);
  }
}
