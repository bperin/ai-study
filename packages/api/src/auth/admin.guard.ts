import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.userId;

        if (!userId) {
            throw new ForbiddenException("User not authenticated");
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { isAdmin: true },
        });

        if (!user || !user.isAdmin) {
            throw new ForbiddenException("Admin access required");
        }

        return true;
    }
}
