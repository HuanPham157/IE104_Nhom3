/** Tham số đường dẫn (:id) và query string mà controller chuyển cho service. */
export type RouteParams = { id: string };
export type RouteQuery = Record<string, string | undefined>;
