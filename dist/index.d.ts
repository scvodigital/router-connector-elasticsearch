import { Client, SearchResponse } from 'elasticsearch';
import { IRouterTask, IRouteMatch } from 'scvo-router';
export declare class RouterTask implements IRouterTask {
    name: string;
    constructor(handlebarsHelpers: IHandlebarsHelpers);
    execute(config: IElasticsearchConfig, routeMatch: IRouteMatch): Promise<any>;
    singleQuery(client: Client, queryTemplate: IElasticsearchQueryTemplate, routeMatch: IRouteMatch): Promise<ISearchResponse<any>>;
    multiQuery(client: Client, queryTemplates: IElasticsearchQueryTemplate[], routeMatch: IRouteMatch): Promise<ISearchResponses<any>>;
    getPagination(from?: number, size?: number, totalResults?: number): IPagination;
}
export interface IElasticsearchConfig {
    connectionStringTemplate: string;
    apiVersion: string;
    queryTemplates: IElasticsearchQueryTemplate[] | IElasticsearchQueryTemplate;
}
export interface IElasticsearchQueryTemplate {
    name: string;
    index: string;
    type: string;
    template: string;
    paginationDetails?: IPaginationDetails;
}
export interface IHandlebarsHelpers {
    [name: string]: (...args: any[]) => any;
}
export interface ISearchResponse<T> extends SearchResponse<T> {
    pagination?: IPagination;
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
