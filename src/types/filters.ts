export enum QueryMode {
  SENSITIVE = 'SENSITIVE',
  INSENSITIVE = 'INSENSITIVE',
}

export type StringFilter = {
  equals?: string;
  in?: string[];
  notIn?: string[];
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  not?: string;
  mode?: QueryMode;
};

export type BooleanFilter = {
  equals?: boolean;
  not?: boolean;
};

export type NumberFilter = {
  equals?: number;
  in?: number[];
  notIn?: number[];
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
  not?: number;
};

export type DateFilter = {
  equals?: Date;
  in?: Date[];
  notIn?: Date[];
  lt?: Date;
  lte?: Date;
  gt?: Date;
  gte?: Date;
  not?: Date;
};
