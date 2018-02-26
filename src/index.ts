import { Client, MSearchParams, SearchResponse, MSearchResponse, ConfigOptions } from 'elasticsearch';
const hbs = require('clayhandlebars')();

import { IRouterTask, IRouteMatch, Helpers } from 'scvo-router';

export class RouterTask implements IRouterTask {
    name: string = "elasticsearch";

    constructor(handlebarsHelpers: IHandlebarsHelpers) {
        Helpers.register(hbs);
        Object.keys(handlebarsHelpers).forEach((name) => {
            hbs.registerHelper(name, handlebarsHelpers[name]);
        });
    }

    public async execute(config: IElasticsearchConfig, routeMatch: IRouteMatch): Promise<any> {
        var data = {};

        var connectionStringCompiled = hbs.compile(config.connectionStringTemplate);
        var connectionString = connectionStringCompiled(routeMatch);   
        var client = new Client({
            host: connectionString,
            apiVersion: config.apiVersion          
        });

        if (Array.isArray(config.queryTemplates)) {
            data = this.multiQuery(client, config.queryTemplates, routeMatch); 
        } else {
            data = this.singleQuery(client, config.queryTemplates, routeMatch); 
        }

        return data; 
    }

    async singleQuery(client: Client, queryTemplate: IElasticsearchQueryTemplate, routeMatch: IRouteMatch): Promise<ISearchResponse<any>> {
        var queryCompiled = hbs.compile(queryTemplate.template);
        var queryJson = queryCompiled(routeMatch);
        var query = JSON.parse(queryJson);
        var payload = {
            index: queryTemplate.index,
            type: queryTemplate.type,
            body: query
        };
        console.log('#### ELASTICSEARCH.singleQuery() -> Query:', JSON.stringify(payload, null, 4));
        var response: ISearchResponse<any> = await client.search<any>(payload);
        console.log('#### ELASTICSEARCH.singleQuery() -> Response:', JSON.stringify(response, null, 4));

        return response;
    }

    async multiQuery(client: Client, queryTemplates: IElasticsearchQueryTemplate[], routeMatch: IRouteMatch): Promise<ISearchResponses<any>> {
        var bulk = [];

        queryTemplates.forEach((queryTemplate) => {
            var queryCompiled = hbs.compile(queryTemplate.template);
            var queryJson = queryCompiled(routeMatch);
            var body = JSON.parse(queryJson);
            var head = {
                index: queryTemplate.index,
                type: queryTemplate.type
            };
            var paginationDetails: IPaginationDetails = {
                from: body.from || 0,
                size: body.size || 10
            };
            bulk.push(head);
            bulk.push(body); 
            queryTemplate.paginationDetails.from = body.from;
            queryTemplate.paginationDetails.size = body.size;
        });

        var payload: MSearchParams = {
            body: bulk          
        };

        console.log('#### ELASTICSEARCH.multiQuery() -> Query:', JSON.stringify(payload, null, 4));
        var multiResponse: MSearchResponse<any> = await client.msearch(payload);
        console.log('#### ELASTICSEARCH.multiQuery() -> Response:', JSON.stringify(multiResponse, null, 4));
        var responseMap: ISearchResponses<any> = {};

        multiResponse.responses.forEach((response: ISearchResponse<any>, i: number) => {
            var name = queryTemplates[i].name;
            var paginationDetails = queryTemplates[i].paginationDetails;

            var pagination = this.getPagination(paginationDetails.from, paginationDetails.size, response.hits.total);
            response.pagination = pagination;

            responseMap[name] = response;
        });
        
        return responseMap;
    }

    getPagination(from: number = 0, size: number = 10, totalResults: number = 0): IPagination {
        var totalPages = Math.ceil(totalResults / size);
        var currentPage = Math.floor(from / size) + 1;

        var nextPage = currentPage < totalPages ? Math.floor(currentPage + 1) : null;
        var prevPage = currentPage > 1 ? Math.floor(currentPage - 1) : null;

        // Setup an array (range) of 10 numbers surrounding our current page
        var pageRange = Array.from(new Array(9).keys(), (p, i) => i + (currentPage - 4));

        // Move range forward until none of the numbers are less than 1
        var rangeMin = pageRange[0];
        var positiveShift = rangeMin < 1 ? 1 - rangeMin : 0;
        pageRange = pageRange.map(p => p + positiveShift);

        // Move range backwards until none of the numbers are greater than totalPages
        var rangeMax = pageRange[pageRange.length - 1];
        var negativeShift = rangeMax > totalPages ? rangeMax - totalPages : 0;
        pageRange = pageRange.map(p => p - negativeShift);

        // Prune everything that appears outside of our 1 to totalPages range
        pageRange = pageRange.filter(p => p >= 1 && p <= totalPages);

        var pages = [];

        pageRange.forEach((page: number) => {
            var distance: number = Math.abs(currentPage - page);
            pages.push({
                pageNumber: Math.floor(page),
                distance: distance,
            });
        });

        var pagination = {
            from: from,
            size: size,
            totalResults: totalResults,

            totalPages: totalPages,
            currentPage: currentPage,

            nextPage: nextPage,
            prevPage: prevPage,

            pageRange: pages
        };

        return pagination;
    }
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
    from ? : number;
    size ? : number;
    totalResults ? : number;
    totalPages ? : number;
    currentPage ? : number;
    nextPage ? : number;
    prevPage ? : number;
    pageRange ? : IPaginationPage[];
}

export interface IPaginationPage {
    pageNumber: number;
    distance: number;
}

export interface IPaginationDetails {
    from: number;
    size: number;
}
