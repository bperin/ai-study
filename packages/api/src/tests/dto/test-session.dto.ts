import { ApiProperty } from '@nestjs/swagger';

export class TestSessionAnswerDto {
  @ApiProperty()
  questionId: string;

  @ApiProperty()
  questionNumber: number;

  @ApiProperty()
  questionText: string;

  @ApiProperty()
  selectedAnswer: number;

  @ApiProperty()
  correctAnswer: number;

  @ApiProperty()
  isCorrect: boolean;

  @ApiProperty()
  timeSpent: number;

  @ApiProperty()
  hintsUsed: number;
}

export class TestSessionStateDto {
  @ApiProperty()
  attemptId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  currentQuestionIndex: number;

  @ApiProperty()
  totalQuestions: number;

  @ApiProperty({ type: [TestSessionAnswerDto] })
  answers: TestSessionAnswerDto[];

  @ApiProperty()
  correctCount: number;

  @ApiProperty()
  incorrectCount: number;

  @ApiProperty()
  currentStreak: number;

  @ApiProperty()
  longestStreak: number;

  @ApiProperty()
  startTime: Date;

  @ApiProperty()
  totalTimeSpent: number;
}
