export interface BaseRepository<T, CreateInput, UpdateInput, WhereInput> {
  findById(id: string): Promise<T | null>;
  findMany(where?: WhereInput, skip?: number, take?: number): Promise<T[]>;
  create(data: CreateInput): Promise<T>;
  update(id: string, data: UpdateInput): Promise<T>;
  delete(id: string): Promise<T>;
  count(where?: WhereInput): Promise<number>;
}

export interface PaginationOptions {
  skip?: number;
  take?: number;
}

export interface SortOptions<T> {
  orderBy?: Record<keyof T, 'asc' | 'desc'>;
}
