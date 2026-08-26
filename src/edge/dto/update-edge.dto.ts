import { PartialType } from '@nestjs/swagger';
import { BaseEdgeDto } from './create-edge.dto';

export class UpdateEdgeDto extends PartialType(BaseEdgeDto) {}
