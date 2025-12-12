import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface LeaderboardEntry {
    userId: string;
    userName: string;
    averageScore: number;
    totalTests: number;
    rank: number;
}

@Injectable()
export class LeaderboardService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get global leaderboard rankings
     */
    async getGlobalLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
        // Get all test attempts with user info
        const attempts = await this.prisma.testAttempt.findMany({
            where: {
                completedAt: {
                    not: null,
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                    },
                },
            },
        });

        // Group by user and calculate stats
        const userStats = new Map<
            string,
            {
                userId: string;
                userName: string;
                totalScore: number;
                totalTests: number;
            }
        >();

        for (const attempt of attempts) {
            const userId = attempt.user.id;
            const userName = attempt.user.email.split("@")[0]; // Use email prefix as name

            if (!userStats.has(userId)) {
                userStats.set(userId, {
                    userId,
                    userName,
                    totalScore: 0,
                    totalTests: 0,
                });
            }

            const stats = userStats.get(userId)!;
            stats.totalScore += attempt.percentage || 0;
            stats.totalTests += 1;
        }

        // Calculate averages and create leaderboard entries
        const leaderboard: LeaderboardEntry[] = Array.from(userStats.values())
            .map((stats) => ({
                userId: stats.userId,
                userName: stats.userName,
                averageScore: Math.round(stats.totalScore / stats.totalTests),
                totalTests: stats.totalTests,
                rank: 0, // Will be set after sorting
            }))
            .sort((a, b) => b.averageScore - a.averageScore) // Sort by average score descending
            .slice(0, limit);

        // Assign ranks
        leaderboard.forEach((entry, index) => {
            entry.rank = index + 1;
        });

        return leaderboard;
    }

    /**
     * Get user's rank and stats
     */
    async getUserRank(userId: string): Promise<{
        rank: number;
        averageScore: number;
        totalTests: number;
        percentile: number;
    }> {
        const leaderboard = await this.getGlobalLeaderboard(1000); // Get more entries for accurate percentile

        const userEntry = leaderboard.find((entry) => entry.userId === userId);

        if (!userEntry) {
            return {
                rank: 0,
                averageScore: 0,
                totalTests: 0,
                percentile: 0,
            };
        }

        const percentile = Math.round(((leaderboard.length - userEntry.rank + 1) / leaderboard.length) * 100);

        return {
            rank: userEntry.rank,
            averageScore: userEntry.averageScore,
            totalTests: userEntry.totalTests,
            percentile,
        };
    }

    /**
     * Get leaderboard for a specific PDF/test
     */
    async getPdfLeaderboard(pdfId: string, limit: number = 10): Promise<LeaderboardEntry[]> {
        const attempts = await this.prisma.testAttempt.findMany({
            where: {
                pdfId,
                completedAt: {
                    not: null,
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                percentage: "desc",
            },
            take: limit,
        });

        return attempts.map((attempt, index) => ({
            userId: attempt.user.id,
            userName: attempt.user.email.split("@")[0],
            averageScore: Math.round(attempt.percentage || 0),
            totalTests: 1, // For PDF-specific leaderboard, this is just the single attempt
            rank: index + 1,
        }));
    }
}
