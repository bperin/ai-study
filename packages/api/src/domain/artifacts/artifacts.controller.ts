import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ArtifactsService } from './artifacts.service';
import { ArtifactDto } from './dto/artifact.dto';
import { CreateArtifactDto } from './dto/create-artifact.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ArtifactType, ArtifactStatus } from '@prisma/client';

@ApiTags('artifacts')
@Controller('artifacts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new artifact' })
  @ApiResponse({ status: 201, description: 'The artifact has been created', type: ArtifactDto })
  async create(@Body() createArtifactDto: CreateArtifactDto): Promise<ArtifactDto> {
    return this.artifactsService.createArtifact(createArtifactDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an artifact by ID' })
  @ApiResponse({ status: 200, description: 'The artifact', type: ArtifactDto })
  async findOne(@Param('id') id: string): Promise<ArtifactDto> {
    return this.artifactsService.findArtifactById(id);
  }

  @Get()
  @ApiOperation({ summary: 'Find artifacts by criteria' })
  @ApiResponse({ status: 200, description: 'List of artifacts', type: [ArtifactDto] })
  async findMany(@Query('type') type?: ArtifactType, @Query('status') status?: ArtifactStatus, @Query('documentId') documentId?: string, @Query('evalId') evalId?: string, @Query('evalItemId') evalItemId?: string, @Query('attemptId') attemptId?: string, @Query('userId') userId?: string, @Query('skip') skip?: number, @Query('take') take?: number): Promise<ArtifactDto[]> {
    return this.artifactsService.findArtifacts({
      type,
      status,
      documentId,
      evalId,
      evalItemId,
      attemptId,
      userId,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get('document/:documentId/intents')
  @ApiOperation({ summary: 'Get the latest intents for a document' })
  @ApiResponse({ status: 200, description: 'Document intents', type: Object })
  async getDocumentIntents(@Param('documentId') documentId: string): Promise<any> {
    return this.artifactsService.getDocumentIntents(documentId);
  }
}
