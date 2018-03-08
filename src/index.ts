import { 
    Client, MSearchParams, SearchResponse, 
    MSearchResponse, ConfigOptions 
} from 'elasticsearch';
const hbs = require('clayhandlebars')();

import { 
    IRouterTask, IRouteMatch, Helpers, 
    RouteTaskError, IRouteTask
} from '@scvo/router';

export class ElasticsearchRouterTask implements IRouterTask {
    name: string = "elasticsearch";

    constructor(handlebarsHelpers: IHandlebarsHelpers) {
        Helpers.register(hbs);
        Object.keys(handlebarsHelpers).forEach((name) => {
            hbs.registerHelper(name, handlebarsHelpers[name]);
        });
    }

    public async execute(routeMatch: IRouteMatch, task: IRouteTask<IElasticsearchTaskConfig>): Promise<any> {
        var data = {};

        var connectionStringCompiled = hbs.compile(task.config.connectionStringTemplate);
        var connectionString = connectionStringCompiled(routeMatch);   
        var configOptions: ConfigOptions = {
            host: connectionString,
            apiVersion: '5.6'
        };
        Object.assign(configOptions, task.config.elasticsearchConfig || { });

        var client = new Client(configOptions);

        if (Array.isArray(task.config.queryTemplates)) {
            data = await this.multiQuery(client, task, routeMatch); 
        } else {
            data = await this.singleQuery(client, task, routeMatch); 
        }

        return data; 
    }

    async singleQuery(client: Client, task: IRouteTask<IElasticsearchTaskConfig>, routeMatch: IRouteMatch): Promise<ISearchResponse<any>> {
        try {
            var queryTemplate = task.config.queryTemplates;
            var queryCompiled, queryJson, query;
            
            try {
                queryCompiled = hbs.compile(queryTemplate.template);
            } catch(err) {
                err = new RouteTaskError(err, {
                    statusCode: 500, 
                    sourceRoute: routeMatch, 
                    task: task, 
                    redirectTo: task.errorRoute || null, 
                    data: { queryTemplate: queryTemplate }
                });
                throw err;
            }

            try {
                queryJson = queryCompiled(routeMatch);
            } catch(err) {
                err = new RouteTaskError(err, {
                    statusCode: 500, 
                    sourceRoute: routeMatch, 
                    task: task, 
                    redirectTo: task.errorRoute || null, 
                    data: { queryTemplate: queryTemplate }
                });
                throw err;
            }

            try {
                query = JSON.parse(queryJson);
            } catch(err) {
                err = new RouteTaskError(err, {
                    statusCode: 500, 
                    sourceRoute: routeMatch, 
                    task: task, 
                    redirectTo: task.errorRoute || null, 
                    data: { queryTemplate: queryTemplate, queryJson: queryJson }
                });
                throw err;
            }
            
            var payload = {
                index: queryTemplate.index,
                type: queryTemplate.type,
                body: query
            };

            var response: ISearchResponse<any> = null;
            try {
                response = await client.search<any>(payload);
            } catch(err) {
                var queryError = new RouteTaskError(err, {
                    statusCode: 500, 
                    sourceRoute: routeMatch, 
                    task: task, 
                    redirectTo: task.errorRoute || null, 
                    data: { payload: payload }
                });
                throw queryError;
            }

            if (queryTemplate.noResultsRoute && response.hits.total === 0) {
                throw new RouteTaskError(new Error('No results'), {
                    statusCode: 404, 
                    sourceRoute: routeMatch, 
                    task: task, 
                    redirectTo: queryTemplate.noResultsRoute, 
                    data: { payload: payload }
                });
            }

            var pagination = this.getPagination(query.from || 0, query.size || 10, response.hits.total);
            response.pagination = pagination;
            response.request = payload;

            return response;
        } catch(err) {
            if (!(err instanceof RouteTaskError)) {
                err = new RouteTaskError(err, {
                    statusCode: 500, 
                    sourceRoute: routeMatch, 
                    task: task, 
                    redirectTo: task.errorRoute || null,
                    data: {}
                });
            }
            throw err;
        }
    }

    async multiQuery(client: Client, task: IRouteTask<IElasticsearchTaskConfig>, routeMatch: IRouteMatch): Promise<ISearchResponses<any>> {
        try {
            var queryTemplates = <IElasticsearchQueryTemplate[]>task.config.queryTemplates;
            var bulk = [];

            queryTemplates.forEach((queryTemplate) => {
                var queryCompiled, queryJson, body, head;
                
                try {
                    queryCompiled = hbs.compile(queryTemplate.template);
                } catch(err) {
                    err = new RouteTaskError(err, {
                        statusCode: 500, 
                        sourceRoute: routeMatch, 
                        task: task, 
                        redirectTo: task.errorRoute || null, 
                        data: { queryTemplate: queryTemplate }
                    });
                    throw err;
                }

                try {
                    queryJson = queryCompiled(routeMatch);
                } catch(err) {
                    err = new RouteTaskError(err, {
                        statusCode: 500, 
                        sourceRoute: routeMatch, 
                        task: task, 
                        redirectTo: task.errorRoute || null, 
                        data: { queryTemplate: queryTemplate }
                    });
                    throw err;
                }

                try {
                    body = JSON.parse(queryJson);
                } catch(err) {
                    err = new RouteTaskError(err, {
                        statusCode: 500, 
                        sourceRoute: routeMatch, 
                        task: task, 
                        redirectTo: task.errorRoute || null, 
                        data: { queryTemplate: queryTemplate, queryJson: queryJson }
                    });
                    throw err;
                }

                head = {
                    index: queryTemplate.index,
                    type: queryTemplate.type
                };
                var paginationDetails: IPaginationDetails = {
                    from: body.from || 0,
                    size: body.size || 10
                };
                bulk.push(head);
                bulk.push(body); 
                queryTemplate.paginationDetails = {
                    from: body.from,
                    size: body.size
                };
            });

            var payload: MSearchParams = {
                body: bulk          
            };

            var multiResponse: MSearchResponse<any> = null;
            try {
                multiResponse = await client.msearch(payload);
            } catch(err) {
                err = new RouteTaskError(err, {
                    statusCode: 500, 
                    sourceRoute: routeMatch, 
                    task: task, 
                    redirectTo: task.errorRoute || null, 
                    data: { payload: payload }
                });
                throw err;
            }
            var responseMap: ISearchResponses<any> = {};

            multiResponse.responses.forEach((response: ISearchResponse<any>, i: number) => {
                var name = queryTemplates[i].name;
                var paginationDetails = queryTemplates[i].paginationDetails;
                var noResultsRoute = queryTemplates[i].noResultsRoute;

                var pagination = this.getPagination(paginationDetails.from, paginationDetails.size, response.hits.total);
                response.pagination = pagination;
                response.request = bulk[i*2+1];

                responseMap[name] = response;

                if (noResultsRoute && response.hits.total === 0) {
                    throw new RouteTaskError(new Error('No results'), {
                        statusCode: 404, 
                        sourceRoute: routeMatch, 
                        task: task, 
                        redirectTo: noResultsRoute, 
                        data: { queryTemplate: queryTemplates[i], response: response }
                    });
                }
            });
            
            return responseMap;
        } catch(err) {
            if (!(err instanceof RouteTaskError)) {
                err = new RouteTaskError(err, {
                    statusCode: 500, 
                    sourceRoute: routeMatch, 
                    task: task, 
                    redirectTo: task.errorRoute || null
                });
            }
            throw err;
        }
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
