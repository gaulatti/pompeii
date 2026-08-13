import {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { Column, DataType, HasMany, Model, Table } from 'sequelize-typescript';
import { AccessLog } from './access.log.model';
import { Login } from './login.model';
import { Membership } from './membership.model';
import { RoleAssignment } from './role-assignment.model';

@Table({
  tableName: 'users',
  timestamps: true,
  underscored: true,
  paranoid: true,
})
export class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: CreationOptional<number>;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: true,
  })
  email!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: true,
  })
  slug!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  last_name!: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  is_active!: CreationOptional<boolean>;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  last_seen_at!: CreationOptional<Date | null>;

  @HasMany(() => Login)
  logins?: Login[];

  @HasMany(() => AccessLog)
  accessLogs?: AccessLog[];

  @HasMany(() => Membership)
  memberships?: Membership[];

  @HasMany(() => RoleAssignment)
  roleAssignments?: RoleAssignment[];
}
