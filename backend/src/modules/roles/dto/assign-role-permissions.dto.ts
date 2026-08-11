import { Transform } from 'class-transformer';
import { IsArray, Matches } from 'class-validator';

const SQL_GUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class AssignRolePermissionsDto {
  @IsArray()
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((item) => (typeof item === 'string' ? item.trim() : item))
      : value,
  )
  @Matches(SQL_GUID_PATTERN, { each: true, message: 'each value in permissionIds must be a valid identifier' })
  permissionIds!: string[];
}
