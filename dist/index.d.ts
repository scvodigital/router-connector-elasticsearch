import { Client, SearchResponse, ConfigOptions } from 'elasticsearch';
import { IRouterTask, IRouteMatch, IRouteTask } from '@scvo/router';
export declare class ElasticsearchRouterTask implements IRouterTask {
    name: string;
    constructor(handlebarsHelpers: IHandlebarsHelpers);
    execute(routeMatch: IRouteMatch, task: IRouteTask<IElasticsearchTaskConfig>): Promise<any>;
    singleQuery(client: Client, task: IRouteTask<IElasticsearchTaskConfig>, routeMatch: IRouteMatch): Promise<ISearchResponse<any>>;
    multiQuery(client: Client, task: IRouteTask<IElasticsearchTaskConfig>, routeMatch: IRouteMatch): Promise<ISearchResponses<any>>;
    getPagination(from?: number, size?: number, totalResults?: number): IPagination;
}
export interface IElasticsearchTaskConfig {
    connectionStringTemplate: string;
    elasticsearchConfig: ConfigOptions;
    queryTemplates: IElasticsearchQueryTemplate[] | IElasticsearchQueryTemplate;
}
export interface IElasticsearchQueryTemplate {
    name: string;
    index: string;
    type: string;
    template: string;
    paginationDetails?: IPaginationDetails;
    noResultsRoute?: string;
}
export interface IHandlebarsHelpers {
    [name: string]: (...args: any[]) => any;
}
export interface ISearchResponse<T> extends SearchResponse<T> {
    pagination?: IPagination;
    request?: any;
}
export interface ISearchResponses<T> {
    [name: string]: ISearchResponse<T>;
}
export interface IPagination {
    from?: number;
    size?: number;
    totalResults?: number;
    totalPages?: number;
    currentPage?: number;
    nextPage?: number;
    prevPage?: number;
    pageRange?: IPaginationPage[];
}
export interface IPaginationPage {
    pageNumber: number;
    distance: number;
}
export interface IPaginationDetails {
    from: number;
    size: number;
}
