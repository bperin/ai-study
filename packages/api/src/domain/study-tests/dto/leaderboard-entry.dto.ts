import { ApiProperty } from '@nestjs/swagger';

export class LeaderboardEntryDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  userName: string;

  @ApiProperty()
  averageScore: number;

  @ApiProperty()
  totalTests: number;

  @ApiProperty()
  rank: number;

  static fromEntity(entity: any): LeaderboardEntryDto {
    return {
      userId: entity.userId,
      userName: entity.user?.email?.split('@')[0] || 'Unknown',
      averageScore: Math.round(entity.percentage || 0),
      totalTests: 1,
      rank: 0, // Rank is usually assigned in the service layer relative to the list
    };
  }
}
