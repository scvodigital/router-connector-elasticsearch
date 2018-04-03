/* tslint:disable:no-any */
import {Client, ConfigOptions, MSearchParams, MSearchResponse, SearchResponse} from 'elasticsearch';

const hbs = require('clayhandlebars')();

import {RouterTask, RouteMatch, Helpers, RouteTaskError, RouteTaskConfiguration} from '@scvo/router';

export class ElasticsearchRouterTask extends RouterTask {
  name = 'elasticsearch';

  constructor(handlebarsHelpers: HandlebarsHelpers) {
    super();
    Helpers.register(hbs);
    Object.keys(handlebarsHelpers).forEach((name) => {
      hbs.registerHelper(name, handlebarsHelpers[name]);
    });
  }

  async execute(routeMatch: RouteMatch, task: RouteTaskConfiguration):
      Promise<any> {
    let data = {};

    const connectionStringCompiled =
        hbs.compile(task.config.connectionStringTemplate);
    const connectionString = connectionStringCompiled(routeMatch);
    const configOptions:
        ConfigOptions = {host: connectionString, apiVersion: '5.6'};
    Object.assign(configOptions, task.config.elasticsearchConfig || {});

    const client = new Client(configOptions);

    if (Array.isArray(task.config.queryTemplates)) {
      data = await this.multiQuery(client, task, routeMatch);
    } else {
      data = await this.singleQuery(client, task, routeMatch);
    }

    return data;
  }

  async singleQuery(
      client: Client, task: RouteTaskConfiguration,
      routeMatch: RouteMatch): Promise<RouterSearchResponse<any>> {
    try {
      const queryTemplate = task.config.queryTemplates;
      let queryCompiled, queryJson, query;

      try {
        queryCompiled = hbs.compile(queryTemplate.template);
      } catch (err) {
        err = new RouteTaskError(err, {
          statusCode: 500,
          sourceRoute: routeMatch,
          task,
          redirectTo: task.errorRoute || null,
          data: {queryTemplate}
        });
        throw err;
      }

      try {
        queryJson = queryCompiled(routeMatch);
      } catch (err) {
        err = new RouteTaskError(err, {
          statusCode: 500,
          sourceRoute: routeMatch,
          task,
          redirectTo: task.errorRoute || null,
          data: {queryTemplate}
        });
        throw err;
      }

      try {
        query = JSON.parse(queryJson);
      } catch (err) {
        err = new RouteTaskError(err, {
          statusCode: 500,
          sourceRoute: routeMatch,
          task,
          redirectTo: task.errorRoute || null,
          data: {queryTemplate, queryJson}
        });
        throw err;
      }

      const payload = {
        index: queryTemplate.index,
        type: queryTemplate.type,
        body: query
      };

      let response: RouterSearchResponse<any>|null = null;
      try {
        response = await client.search<any>(payload);
      } catch (err) {
        const queryError = new RouteTaskError(err, {
          statusCode: 500,
          sourceRoute: routeMatch,
          task,
          redirectTo: task.errorRoute || null,
          data: {payload}
        });
        throw queryError;
      }

      if (queryTemplate.noResultsRoute && response.hits.total === 0) {
        throw new RouteTaskError(new Error('No results'), {
          statusCode: 404,
          sourceRoute: routeMatch,
          task,
          redirectTo: queryTemplate.noResultsRoute,
          data: {payload}
        });
      }

      const pagination = this.getPagination(
          query.from || 0, query.size || 10, response.hits.total);
      response.pagination = pagination;
      response.request = payload;

      return response;
    } catch (err) {
      if (!(err instanceof RouteTaskError)) {
        err = new RouteTaskError(err, {
          statusCode: 500,
          sourceRoute: routeMatch,
          task,
          redirectTo: task.errorRoute || null,
          data: {}
        });
      }
      throw err;
    }
  }

  async multiQuery(
      client: Client, task: RouteTaskConfiguration,
      routeMatch: RouteMatch): Promise<RouterSearchResponseMap<any>> {
    try {
      const queryTemplates =
          task.config.queryTemplates as ElasticsearchQueryTemplate[];
      const bulk: any[] = [];

      queryTemplates.forEach((queryTemplate) => {
        let queryCompiled, queryJson, body, head;

        try {
          queryCompiled = hbs.compile(queryTemplate.template);
        } catch (err) {
          err = new RouteTaskError(err, {
            statusCode: 500,
            sourceRoute: routeMatch,
            task,
            redirectTo: task.errorRoute || null,
            data: {queryTemplate}
          });
          throw err;
        }

        try {
          queryJson = queryCompiled(routeMatch);
        } catch (err) {
          err = new RouteTaskError(err, {
            statusCode: 500,
            sourceRoute: routeMatch,
            task,
            redirectTo: task.errorRoute || null,
            data: {queryTemplate}
          });
          throw err;
        }

        try {
          body = JSON.parse(queryJson);
        } catch (err) {
          err = new RouteTaskError(err, {
            statusCode: 500,
            sourceRoute: routeMatch,
            task,
            redirectTo: task.errorRoute || null,
            data: {queryTemplate, queryJson}
          });
          throw err;
        }

        head = {index: queryTemplate.index, type: queryTemplate.type};
        const paginationDetails:
            PaginationDetails = {from: body.from || 0, size: body.size || 10};
        bulk.push(head);
        bulk.push(body);
        queryTemplate.paginationDetails = {from: body.from, size: body.size};
      });

      const payload: MSearchParams = {body: bulk};

      let multiResponse: MSearchResponse<any> = {responses: []};
      try {
        multiResponse = await client.msearch(payload);
      } catch (err) {
        err = new RouteTaskError(err, {
          statusCode: 500,
          sourceRoute: routeMatch,
          task,
          redirectTo: task.errorRoute || null,
          data: {payload}
        });
        throw err;
      }
      const responseMap: RouterSearchResponseMap<any> = {};

      if (!multiResponse.responses) {
        return {};
      }

      multiResponse.responses.forEach(
          (response: RouterSearchResponse<any>, i: number) => {
            const name = queryTemplates[i].name;
            const paginationDetails =
                queryTemplates[i].paginationDetails || {from: 0, size: 10};
            const noResultsRoute = queryTemplates[i].noResultsRoute;

            const pagination = this.getPagination(
                paginationDetails.from, paginationDetails.size,
                response.hits.total);
            response.pagination = pagination;
            response.request = bulk[i * 2 + 1];

            responseMap[name] = response;

            if (noResultsRoute && response.hits.total === 0) {
              throw new RouteTaskError(new Error('No results'), {
                statusCode: 404,
                sourceRoute: routeMatch,
                task,
                redirectTo: noResultsRoute,
                data: {queryTemplate: queryTemplates[i], response}
              });
            }
          });
      return responseMap;
    } catch (err) {
      if (!(err instanceof RouteTaskError)) {
        err = new RouteTaskError(err, {
          statusCode: 500,
          sourceRoute: routeMatch,
          task,
          redirectTo: task.errorRoute || null,
          data: {}
        });
      }
      throw err;
    }
  }

  getPagination(from = 0, size = 10, totalResults = 0): Pagination {
    const totalPages = Math.ceil(totalResults / size);
    const currentPage = Math.floor(from / size) + 1;

    const nextPage =
        currentPage < totalPages ? Math.floor(currentPage + 1) : null;
    const prevPage = currentPage > 1 ? Math.floor(currentPage - 1) : null;

    // Setup an array (range) of 10 numbers surrounding our current page
    let pageRange =
        Array.from(new Array(9).keys(), (p, i) => i + (currentPage - 4));

    // Move range forward until none of the numbers are less than 1
    const rangeMin = pageRange[0];
    const positiveShift = rangeMin < 1 ? 1 - rangeMin : 0;
    pageRange = pageRange.map(p => p + positiveShift);

    // Move range backwards until none of the numbers are greater than
    // totalPages
    const rangeMax = pageRange[pageRange.length - 1];
    const negativeShift = rangeMax > totalPages ? rangeMax - totalPages : 0;
    pageRange = pageRange.map(p => p - negativeShift);

    // Prune everything that appears outside of our 1 to totalPages range
    pageRange = pageRange.filter(p => p >= 1 && p <= totalPages);

    const pages: PaginationPage[] = [];

    pageRange.forEach((page: number) => {
      pages.push({
        pageNumber: Math.floor(page),
        distance: Math.abs(currentPage - page),
      });
    });

    const pagination = {
      from,
      size,
      totalResults,
      totalPages,
      currentPage,
      nextPage,
      prevPage,
      pageRange: pages
    };

    return pagination;
  }
}

export interface ElasticsearchTaskConfig {
  connectionStringTemplate: string;
  elasticsearchConfig: ConfigOptions;
  queryTemplates: ElasticsearchQueryTemplate[]|ElasticsearchQueryTemplate;
}

export interface ElasticsearchQueryTemplate {
  name: string;
  index: string;
  type: string;
  template: string;
  paginationDetails?: PaginationDetails;
  noResultsRoute?: string;
}

export interface HandlebarsHelpers { [name: string]: (...args: any[]) => any; }

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
  nextPage?: number|null;
  prevPage?: number|null;
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
/* tslint:enable:no-any */
