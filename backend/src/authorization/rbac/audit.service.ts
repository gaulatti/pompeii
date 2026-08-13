import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { AdministrativeAuditLog } from 'src/models/administrative-audit-log.model';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AdministrativeAuditLog)
    private readonly logs: typeof AdministrativeAuditLog,
  ) {}

  record(input: {
    actorUserId?: number;
    action: string;
    targetType: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.logs.create({
      actor_user_id: input.actorUserId ?? null,
      action: input.action,
      target_type: input.targetType,
      target_id: input.targetId ?? null,
      metadata: input.metadata ?? {},
    });
  }

  list(limit = 100) {
    return this.logs.findAll({
      limit: Math.min(Math.max(limit, 1), 500),
      order: [['created_at', 'DESC']],
    });
  }
}
