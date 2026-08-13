import {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  Table,
} from 'sequelize-typescript';
import { PermissionLevel } from 'src/utils/enums';
import { Application } from './application.model';
import { Permission } from './permission.model';

@Table({
  tableName: 'features',
  timestamps: true,
  underscored: true,
})
export class Feature extends Model<
  InferAttributes<Feature>,
  InferCreationAttributes<Feature>
> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: CreationOptional<number>;

  @ForeignKey(() => Application)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  application_id!: number;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: true,
  })
  slug!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description?: string;

  @Column({
    type: DataType.ENUM(...Object.values(PermissionLevel)),
    allowNull: false,
  })
  default_value: PermissionLevel;

  @BelongsTo(() => Application)
  application?: Application;

  @HasMany(() => Permission)
  permissions?: Permission[];
}
