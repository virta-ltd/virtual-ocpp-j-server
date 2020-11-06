import { IdTagInfoStatusEnum } from './IdTagInfoStatusEnum';

export class IdTagInfo {
  expiryDate?: string;
  parentIdTag?: string;
  status: IdTagInfoStatusEnum;
}
