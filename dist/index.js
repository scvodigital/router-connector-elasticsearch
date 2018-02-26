"use strict";
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
var elasticsearch_1 = require("elasticsearch");
var hbs = require('clayhandlebars')();
var scvo_router_1 = require("scvo-router");
var RouterTask = /** @class */ (function () {
    function RouterTask(handlebarsHelpers) {
        this.name = "elasticsearch";
        scvo_router_1.Helpers.register(hbs);
        Object.keys(handlebarsHelpers).forEach(function (name) {
            hbs.registerHelper(name, handlebarsHelpers[name]);
        });
    }
    RouterTask.prototype.execute = function (config, routeMatch) {
        return __awaiter(this, void 0, void 0, function () {
            var data, connectionStringCompiled, connectionString, client;
            return __generator(this, function (_a) {
                data = {};
                connectionStringCompiled = hbs.compile(config.connectionStringTemplate);
                connectionString = connectionStringCompiled(routeMatch);
                client = new elasticsearch_1.Client({
                    host: connectionString,
                    apiVersion: config.apiVersion
                });
                if (Array.isArray(config.queryTemplates)) {
                    data = this.multiQuery(client, config.queryTemplates, routeMatch);
                }
                else {
                    data = this.singleQuery(client, config.queryTemplates, routeMatch);
                }
                return [2 /*return*/, data];
            });
        });
    };
    RouterTask.prototype.singleQuery = function (client, queryTemplate, routeMatch) {
        return __awaiter(this, void 0, void 0, function () {
            var queryCompiled, queryJson, query, payload, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        queryCompiled = hbs.compile(queryTemplate.template);
                        queryJson = queryCompiled(routeMatch);
                        query = JSON.parse(queryJson);
                        payload = {
                            index: queryTemplate.index,
                            type: queryTemplate.type,
                            body: query
                        };
                        return [4 /*yield*/, client.search(payload)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response];
                }
            });
        });
    };
    RouterTask.prototype.multiQuery = function (client, queryTemplates, routeMatch) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var bulk, payload, multiResponse, responseMap;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        bulk = [];
                        queryTemplates.forEach(function (queryTemplate) {
                            var queryCompiled = hbs.compile(queryTemplate.template);
                            var queryJson = queryCompiled(routeMatch);
                            var body = JSON.parse(queryJson);
                            var head = {
                                index: queryTemplate.index,
                                type: queryTemplate.type
                            };
                            var paginationDetails = {
                                from: body.from || 0,
                                size: body.size || 10
                            };
                            bulk.push(head);
                            bulk.push(body);
                            queryTemplate.paginationDetails.from = body.from;
                            queryTemplate.paginationDetails.size = body.size;
                        });
                        payload = {
                            body: bulk
                        };
                        return [4 /*yield*/, client.msearch(payload)];
                    case 1:
                        multiResponse = _a.sent();
                        responseMap = {};
                        multiResponse.responses.forEach(function (response, i) {
                            var name = queryTemplates[i].name;
                            var paginationDetails = queryTemplates[i].paginationDetails;
                            var pagination = _this.getPagination(paginationDetails.from, paginationDetails.size, response.hits.total);
                            response.pagination = pagination;
                            responseMap[name] = response;
                        });
                        return [2 /*return*/, responseMap];
                }
            });
        });
    };
    RouterTask.prototype.getPagination = function (from, size, totalResults) {
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
        // Move range backwards until none of the numbers are greater than totalPages
        var rangeMax = pageRange[pageRange.length - 1];
        var negativeShift = rangeMax > totalPages ? rangeMax - totalPages : 0;
        pageRange = pageRange.map(function (p) { return p - negativeShift; });
        // Prune everything that appears outside of our 1 to totalPages range
        pageRange = pageRange.filter(function (p) { return p >= 1 && p <= totalPages; });
        var pages = [];
        pageRange.forEach(function (page) {
            var distance = Math.abs(currentPage - page);
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
    };
    return RouterTask;
}());
exports.RouterTask = RouterTask;
//# sourceMappingURL=index.js.map