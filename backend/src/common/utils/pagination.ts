import { PaginationQueryDto } from '../dto/pagination-query.dto';

export const getPagination = (query: PaginationQueryDto) => {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 10);
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
  };
};

export const getPaginatedResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
) => ({
  data,
  meta: {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  },
});
