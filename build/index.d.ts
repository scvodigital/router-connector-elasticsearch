import { Client, ConfigOptions, SearchResponse } from 'elasticsearch';
import { RouterTask, RouteMatch, RouteTaskConfiguration } from '@scvo/router';
export declare class ElasticsearchRouterTask extends RouterTask {
    name: string;
    constructor(handlebarsHelpers: HandlebarsHelpers);
    execute(routeMatch: RouteMatch, task: RouteTaskConfiguration): Promise<any>;
    singleQuery(client: Client, task: RouteTaskConfiguration, routeMatch: RouteMatch): Promise<RouterSearchResponse<any>>;
    multiQuery(client: Client, task: RouteTaskConfiguration, routeMatch: RouteMatch): Promise<RouterSearchResponseMap<any>>;
    getPagination(from?: number, size?: number, totalResults?: number): Pagination;
}
export interface ElasticsearchTaskConfig {
    connectionStringTemplate: string;
    elasticsearchConfig: ConfigOptions;
    queryTemplates: ElasticsearchQueryTemplate[] | ElasticsearchQueryTemplate;
}
export interface ElasticsearchQueryTemplate {
    name: string;
    index: string;
    type: string;
    template: string;
    paginationDetails?: PaginationDetails;
    noResultsRoute?: string;
}
export interface HandlebarsHelpers {
    [name: string]: (...args: any[]) => any;
}
export interface RouterSearchResponse<T> extends SearchResponse<T> {
    pagination?: Pagination;
    request?: any;
}
export interface RouterSearchResponseMap<T> {
    [name: string]: RouterSearchResponse<T>;
}
export interface Pagination {
    from?: number;
    size?: number;
    totalResults?: number;
    totalPages?: number;
    currentPage?: number;
    nextPage?: number | null;
    prevPage?: number | null;
    pageRange?: PaginationPage[];
}
export interface PaginationPage {
    pageNumber: number;
    distance: number;
}
export interface PaginationDetails {
    from: number;
    size: number;
}
