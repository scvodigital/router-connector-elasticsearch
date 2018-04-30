"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable:no-any */
var elasticsearch_1 = require("elasticsearch");
var hbs = require('clayhandlebars')();
var router_1 = require("@scvo/router");
var ElasticsearchRouterTask = /** @class */ (function (_super) {
    __extends(ElasticsearchRouterTask, _super);
    function ElasticsearchRouterTask(handlebarsHelpers) {
        var _this = _super.call(this) || this;
        _this.name = 'elasticsearch';
        router_1.Helpers.register(hbs);
        Object.keys(handlebarsHelpers).forEach(function (name) {
            hbs.registerHelper(name, handlebarsHelpers[name]);
        });
        return _this;
    }
    ElasticsearchRouterTask.prototype.execute = function (routeMatch, task) {
        return __awaiter(this, void 0, void 0, function () {
            var data, connectionStringCompiled, connectionString, configOptions, client;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        data = {};
                        connectionStringCompiled = hbs.compile(task.config.connectionStringTemplate);
                        connectionString = connectionStringCompiled(routeMatch);
                        configOptions = { host: connectionString, apiVersion: '5.6' };
                        Object.assign(configOptions, task.config.elasticsearchConfig || {});
                        client = new elasticsearch_1.Client(configOptions);
                        if (!Array.isArray(task.config.queryTemplates)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.multiQuery(client, task, routeMatch)];
                    case 1:
                        data = _a.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, this.singleQuery(client, task, routeMatch)];
                    case 3:
                        data = _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/, data];
                }
            });
        });
    };
    ElasticsearchRouterTask.prototype.singleQuery = function (client, task, routeMatch) {
        return __awaiter(this, void 0, void 0, function () {
            var queryTemplate, queryCompiled, queryJson, query, payload, response, err_1, queryError, pagination, err_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        queryTemplate = task.config.queryTemplates;
                        queryCompiled = void 0, queryJson = void 0, query = void 0;
                        try {
                            queryCompiled = hbs.compile(queryTemplate.template);
                        }
                        catch (err) {
                            err = new router_1.RouteTaskError(err, {
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
                        }
                        catch (err) {
                            err = new router_1.RouteTaskError(err, {
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
                        }
                        catch (err) {
                            err = new router_1.RouteTaskError(err, {
                                statusCode: 500,
                                sourceRoute: routeMatch,
                                task: task,
                                redirectTo: task.errorRoute || null,
                                data: { queryTemplate: queryTemplate, queryJson: queryJson }
                            });
                            throw err;
                        }
                        payload = {
                            index: queryTemplate.index,
                            type: queryTemplate.type,
                            body: query
                        };
                        response = null;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, client.search(payload)];
                    case 2:
                        response = _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _a.sent();
                        queryError = new router_1.RouteTaskError(err_1, {
                            statusCode: 500,
                            sourceRoute: routeMatch,
                            task: task,
                            redirectTo: task.errorRoute || null,
                            data: { payload: payload }
                        });
                        throw queryError;
                    case 4:
                        if (queryTemplate.noResultsRoute && (!response.hits || !response.hits.total)) {
                            console.log('No results route for response:', response);
                            throw new router_1.RouteTaskError(new Error('No results'), {
                                statusCode: 404,
                                sourceRoute: routeMatch,
                                task: task,
                                redirectTo: queryTemplate.noResultsRoute,
                                data: { payload: payload }
                            });
                        }
                        else if (!response.hits || !response.hits.total) {
                            console.log('No no results route for response', JSON.stringify(response, null, 4));
                            response.hits = {
                                max_score: 0,
                                hits: [],
                                total: 0
                            };
                        }
                        pagination = this.getPagination(query.from || 0, query.size || 10, response.hits.total);
                        response.pagination = pagination;
                        response.request = payload;
                        return [2 /*return*/, response];
                    case 5:
                        err_2 = _a.sent();
                        if (!(err_2 instanceof router_1.RouteTaskError)) {
                            err_2 = new router_1.RouteTaskError(err_2, {
                                statusCode: 500,
                                sourceRoute: routeMatch,
                                task: task,
                                redirectTo: task.errorRoute || null,
                                data: {}
                            });
                        }
                        throw err_2;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    ElasticsearchRouterTask.prototype.multiQuery = function (client, task, routeMatch) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var queryTemplates_1, bulk_1, payload, multiResponse, err_3, responseMap_1, err_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        queryTemplates_1 = task.config.queryTemplates;
                        bulk_1 = [];
                        queryTemplates_1.forEach(function (queryTemplate) {
                            var queryCompiled, queryJson, body, head;
                            try {
                                queryCompiled = hbs.compile(queryTemplate.template);
                            }
                            catch (err) {
                                err = new router_1.RouteTaskError(err, {
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
                            }
                            catch (err) {
                                err = new router_1.RouteTaskError(err, {
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
                            }
                            catch (err) {
                                err = new router_1.RouteTaskError(err, {
                                    statusCode: 500,
                                    sourceRoute: routeMatch,
                                    task: task,
                                    redirectTo: task.errorRoute || null,
                                    data: { queryTemplate: queryTemplate, queryJson: queryJson }
                                });
                                throw err;
                            }
                            head = { index: queryTemplate.index, type: queryTemplate.type };
                            var paginationDetails = { from: body.from || 0, size: body.size || 10 };
                            bulk_1.push(head);
                            bulk_1.push(body);
                            queryTemplate.paginationDetails = { from: body.from, size: body.size };
                        });
                        payload = { body: bulk_1 };
                        multiResponse = { responses: [] };
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, client.msearch(payload)];
                    case 2:
                        multiResponse = _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_3 = _a.sent();
                        err_3 = new router_1.RouteTaskError(err_3, {
                            statusCode: 500,
                            sourceRoute: routeMatch,
                            task: task,
                            redirectTo: task.errorRoute || null,
                            data: { payload: payload }
                        });
                        throw err_3;
                    case 4:
                        responseMap_1 = {};
                        if (!multiResponse.responses) {
                            return [2 /*return*/, {}];
                        }
                        multiResponse.responses.forEach(function (response, i) {
                            var name = queryTemplates_1[i].name;
                            var paginationDetails = queryTemplates_1[i].paginationDetails || { from: 0, size: 10 };
                            var noResultsRoute = queryTemplates_1[i].noResultsRoute;
                            responseMap_1[name] = response;
                            if (noResultsRoute && (!response.hits || !response.hits.total)) {
                                console.log('No results route for response', response);
                                throw new router_1.RouteTaskError(new Error('No results'), {
                                    statusCode: 404,
                                    sourceRoute: routeMatch,
                                    task: task,
                                    redirectTo: noResultsRoute,
                                    data: { queryTemplate: queryTemplates_1[i], response: response }
                                });
                            }
                            else if (!response.hits || !response.hits.total) {
                                console.log('No no results route for response', JSON.stringify(response, null, 4));
                                response.hits = {
                                    max_score: 0,
                                    hits: [],
                                    total: 0
                                };
                            }
                            var pagination = _this.getPagination(paginationDetails.from, paginationDetails.size, response.hits.total);
                            response.pagination = pagination;
                            response.request = bulk_1[i * 2 + 1];
                        });
                        return [2 /*return*/, responseMap_1];
                    case 5:
                        err_4 = _a.sent();
                        if (!(err_4 instanceof router_1.RouteTaskError)) {
                            err_4 = new router_1.RouteTaskError(err_4, {
                                statusCode: 500,
                                sourceRoute: routeMatch,
                                task: task,
                                redirectTo: task.errorRoute || null,
                                data: {}
                            });
                        }
                        throw err_4;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    ElasticsearchRouterTask.prototype.getPagination = function (from, size, totalResults) {
        if (from === void 0) { from = 0; }
        if (size === void 0) { size = 10; }
        if (totalResults === void 0) { totalResults = 0; }
        var totalPages = Math.ceil(totalResults / size);
        var currentPage = Math.floor(from / size) + 1;
        var nextPage = currentPage < totalPages ? Math.floor(currentPage + 1) : null;
        var prevPage = currentPage > 1 ? Math.floor(currentPage - 1) : null;
        // Setup an array (range) of 10 numbers surrounding our current page
        var pageRange = Array.from(new Array(9).keys(), function (p, i) { return i + (currentPage - 4); });
        // Move range forward until none of the numbers are less than 1
        var rangeMin = pageRange[0];
        var positiveShift = rangeMin < 1 ? 1 - rangeMin : 0;
        pageRange = pageRange.map(function (p) { return p + positiveShift; });
        // Move range backwards until none of the numbers are greater than
        // totalPages
        var rangeMax = pageRange[pageRange.length - 1];
        var negativeShift = rangeMax > totalPages ? rangeMax - totalPages : 0;
        pageRange = pageRange.map(function (p) { return p - negativeShift; });
        // Prune everything that appears outside of our 1 to totalPages range
        pageRange = pageRange.filter(function (p) { return p >= 1 && p <= totalPages; });
        var pages = [];
        pageRange.forEach(function (page) {
            pages.push({
                pageNumber: Math.floor(page),
                distance: Math.abs(currentPage - page),
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
    };
    return ElasticsearchRouterTask;
}(router_1.RouterTask));
exports.ElasticsearchRouterTask = ElasticsearchRouterTask;
/* tslint:enable:no-any */
//# sourceMappingURL=index.js.map